import { and, eq, isNotNull, ne } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { courses } from "../db/schema.ts";
import type * as schema from "../db/schema.ts";
import { fetchShopierProduct } from "../shopier/public-product.ts";

type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
export type SyncOutcome = "updated" | "unchanged" | "unavailable" | "unsupported_currency";

/** Copies title, description, image and price from the Shopier product page onto the course. */
export async function syncCourseFromShopier(db: Database, courseId: string, fetcher: typeof fetch = fetch): Promise<SyncOutcome> {
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course?.shopierProductId) return "unavailable";
  const product = await fetchShopierProduct(course.shopierProductId, fetcher);
  if (!product) return "unavailable";
  if (product.currency !== "TRY") return "unsupported_currency";
  const next = { title: product.title, description: product.description, cover: product.imageUrl ?? course.cover, priceKurus: product.priceKurus };
  if (next.title === course.title && next.description === course.description && next.cover === course.cover && next.priceKurus === course.priceKurus) return "unchanged";
  await db.update(courses).set(next).where(eq(courses.id, courseId));
  return "updated";
}

/** Refreshes every non-archived course linked to Shopier; one failure never stops the rest. */
export async function syncAllCoursesFromShopier(db: Database, fetcher: typeof fetch = fetch) {
  const linked = await db.select({ id: courses.id }).from(courses).where(and(isNotNull(courses.shopierProductId), ne(courses.status, "archived")));
  const result: Record<SyncOutcome | "failed", number> = { updated: 0, unchanged: 0, unavailable: 0, unsupported_currency: 0, failed: 0 };
  for (const course of linked) {
    try { result[await syncCourseFromShopier(db, course.id, fetcher)]++; } catch { result.failed++; }
  }
  return result;
}
