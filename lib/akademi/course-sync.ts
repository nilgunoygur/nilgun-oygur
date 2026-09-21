import { eq, isNotNull, ne, and } from "drizzle-orm";
import { courses } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import type { ShopierProduct } from "../shopier/api.ts";
import { fetchShopierProduct, fetchShopierStoreProducts, productDetailsFromModel, type ShopierProductDetails } from "../shopier/public-product.ts";
import { courseSlug } from "./slug.ts";

type Course = typeof courses.$inferSelect;
type SyncOutcome = "updated" | "unchanged" | "archived" | "unavailable" | "unsupported_currency";

export const courseFieldsFromProduct = (product: ShopierProductDetails, fallbackCover: string | null) => ({
  title: product.title,
  description: product.description,
  cover: product.imageUrl ?? fallbackCover,
  priceKurus: product.priceKurus,
  compareAtPriceKurus: product.compareAtPriceKurus,
});

/** Copies Shopier's details onto the course; a product deleted in Shopier archives it. */
async function syncCourse(db: Database, course: Course, fetcher: typeof fetch): Promise<SyncOutcome> {
  const lookup = await fetchShopierProduct(course.shopierProductId ?? "", fetcher);
  if (lookup.status === "gone") {
    await db.update(courses).set({ status: "archived" }).where(eq(courses.id, course.id));
    return "archived";
  }
  if (lookup.status === "error") return "unavailable";
  if (lookup.product.currency !== "TRY") return "unsupported_currency";
  const next = courseFieldsFromProduct(lookup.product, course.cover);
  if ((Object.keys(next) as (keyof typeof next)[]).every(key => next[key] === course[key])) return "unchanged";
  await db.update(courses).set(next).where(eq(courses.id, course.id));
  return "updated";
}

export async function syncCourseFromShopier(db: Database, courseId: string, fetcher: typeof fetch = fetch): Promise<SyncOutcome> {
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  return course ? syncCourse(db, course, fetcher) : "unavailable";
}

async function publishCourse(db: Database, productId: string, product: ShopierProductDetails) {
  const slug = courseSlug(product.title) || `egitim-${productId}`;
  const [taken] = await db.select({ id: courses.id }).from(courses).where(eq(courses.slug, slug)).limit(1);
  await db.insert(courses).values({
    ...courseFieldsFromProduct(product, null),
    slug: taken ? `${slug}-${productId}` : slug,
    shopierProductId: productId,
    shopierUrl: `https://www.shopier.com/${productId}`,
    status: "published",
  }).onConflictDoNothing();
}

/** Publishes a new course for a visible digital store product; returns false if it cannot be read. */
async function addDiscoveredCourse(db: Database, productId: string, fetcher: typeof fetch) {
  const lookup = await fetchShopierProduct(productId, fetcher);
  if (lookup.status !== "found" || lookup.product.currency !== "TRY") return false;
  await publishCourse(db, productId, lookup.product);
  return true;
}

/** product.created / product.updated webhook: update the linked course, or publish a new visible digital product. */
export async function applyShopierProduct(db: Database, model: ShopierProduct): Promise<"updated" | "unchanged" | "added" | "ignored"> {
  const product = productDetailsFromModel(model);
  if (!product || product.currency !== "TRY") return "ignored";
  const [course] = await db.select().from(courses).where(eq(courses.shopierProductId, model.id)).limit(1);
  if (course) {
    const next = courseFieldsFromProduct(product, course.cover);
    if ((Object.keys(next) as (keyof typeof next)[]).every(key => next[key] === course[key])) return "unchanged";
    await db.update(courses).set(next).where(eq(courses.id, course.id));
    return "updated";
  }
  if (model.type !== "digital" || model.customListing) return "ignored";
  await publishCourse(db, model.id, product);
  return "added";
}

/**
 * Shopier is the catalog: visible digital store products become published courses, linked
 * courses are refreshed, and deleted products are archived. Existing courses are never re-published.
 */
export async function syncCatalogFromShopier(db: Database, store: string, fetcher: typeof fetch = fetch) {
  const listed = await fetchShopierStoreProducts(store, fetcher);
  const known = new Set((await db.select({ id: courses.shopierProductId }).from(courses).where(isNotNull(courses.shopierProductId))).map(row => row.id));
  const added = await Promise.all(listed.filter(product => product.digital && !known.has(product.id)).map(product => addDiscoveredCourse(db, product.id, fetcher)));
  const linked = await db.select().from(courses).where(and(isNotNull(courses.shopierProductId), ne(courses.status, "archived")));
  const result: Record<SyncOutcome | "added" | "failed", number> = { added: added.filter(Boolean).length, updated: 0, unchanged: 0, archived: 0, unavailable: 0, unsupported_currency: 0, failed: 0 };
  for (const outcome of await Promise.allSettled(linked.map(course => syncCourse(db, course, fetcher)))) {
    result[outcome.status === "fulfilled" ? outcome.value : "failed"]++;
  }
  return result;
}
