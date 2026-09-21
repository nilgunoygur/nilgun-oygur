import { and, eq, isNotNull, ne } from "drizzle-orm";
import { courses } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import { fetchShopierProduct, type ShopierProductDetails } from "../shopier/public-product.ts";

type Course = typeof courses.$inferSelect;
type SyncOutcome = "updated" | "unchanged" | "unavailable" | "unsupported_currency";

export const courseFieldsFromProduct = (product: ShopierProductDetails, fallbackCover: string | null) => ({
  title: product.title,
  description: product.description,
  cover: product.imageUrl ?? fallbackCover,
  priceKurus: product.priceKurus,
  compareAtPriceKurus: product.compareAtPriceKurus,
});

async function syncCourse(db: Database, course: Course, fetcher: typeof fetch): Promise<SyncOutcome> {
  const product = course.shopierProductId ? await fetchShopierProduct(course.shopierProductId, fetcher) : null;
  if (!product) return "unavailable";
  if (product.currency !== "TRY") return "unsupported_currency";
  const next = courseFieldsFromProduct(product, course.cover);
  if ((Object.keys(next) as (keyof typeof next)[]).every(key => next[key] === course[key])) return "unchanged";
  await db.update(courses).set(next).where(eq(courses.id, course.id));
  return "updated";
}

export async function syncCourseFromShopier(db: Database, courseId: string, fetcher: typeof fetch = fetch): Promise<SyncOutcome> {
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  return course ? syncCourse(db, course, fetcher) : "unavailable";
}

export async function syncAllCoursesFromShopier(db: Database, fetcher: typeof fetch = fetch) {
  const linked = await db.select().from(courses).where(and(isNotNull(courses.shopierProductId), ne(courses.status, "archived")));
  const result: Record<SyncOutcome | "failed", number> = { updated: 0, unchanged: 0, unavailable: 0, unsupported_currency: 0, failed: 0 };
  for (const outcome of await Promise.allSettled(linked.map(course => syncCourse(db, course, fetcher)))) {
    result[outcome.status === "fulfilled" ? outcome.value : "failed"]++;
  }
  return result;
}
