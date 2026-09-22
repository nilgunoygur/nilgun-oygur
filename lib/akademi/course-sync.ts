import { eq, isNotNull } from "drizzle-orm";
import { courses } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import { isCourseProduct, productDetails, type ShopierProduct, type ShopierProductDetails } from "../shopier/api.ts";
import { courseSlug } from "./slug.ts";

type Course = typeof courses.$inferSelect;
export type ProductSource = { listProducts(): Promise<{ products: ShopierProduct[]; ids: Set<string> }> };

export const courseFieldsFromProduct = (product: ShopierProductDetails, fallbackCover: string | null) => ({
  title: product.title,
  description: product.description,
  cover: product.imageUrl ?? fallbackCover,
  priceKurus: product.priceKurus,
  compareAtPriceKurus: product.compareAtPriceKurus,
});

async function updateCourse(db: Database, course: Course, details: ShopierProductDetails) {
  const next = courseFieldsFromProduct(details, course.cover);
  if ((Object.keys(next) as (keyof typeof next)[]).every(key => next[key] === course[key])) return "unchanged" as const;
  await db.update(courses).set(next).where(eq(courses.id, course.id));
  return "updated" as const;
}

async function publishCourse(db: Database, productId: string, details: ShopierProductDetails) {
  const slug = courseSlug(details.title) || `egitim-${productId}`;
  const [taken] = await db.select({ id: courses.id }).from(courses).where(eq(courses.slug, slug)).limit(1);
  await db.insert(courses).values({
    ...courseFieldsFromProduct(details, null),
    slug: taken ? `${slug}-${productId}` : slug,
    shopierProductId: productId,
    shopierUrl: `https://www.shopier.com/${productId}`,
    status: "published",
  }).onConflictDoNothing();
}

/** product.created / product.updated webhook: update the linked course, or publish a new course product. */
export async function applyShopierProduct(db: Database, product: ShopierProduct): Promise<"updated" | "unchanged" | "added" | "ignored"> {
  const details = productDetails(product);
  if (!details || details.currency !== "TRY") return "ignored";
  const [course] = await db.select().from(courses).where(eq(courses.shopierProductId, product.id)).limit(1);
  if (course) return updateCourse(db, course, details);
  if (!isCourseProduct(product)) return "ignored";
  await publishCourse(db, product.id, details);
  return "added";
}

/**
 * Shopier is the catalog: new course products are published, linked courses are refreshed, and
 * courses whose product no longer exists are archived. Owner-archived courses are never revived.
 */
export async function syncCatalogFromShopier(db: Database, shopier: ProductSource) {
  const { products, ids } = await shopier.listProducts();
  const byId = new Map(products.map(product => [product.id, product]));
  const linked = await db.select().from(courses).where(isNotNull(courses.shopierProductId));
  const known = new Set(linked.map(course => course.shopierProductId));
  const result = { added: 0, updated: 0, unchanged: 0, archived: 0, skipped: 0 };
  for (const course of linked) {
    if (course.status === "archived") continue;
    if (!ids.has(course.shopierProductId!)) {
      await db.update(courses).set({ status: "archived" }).where(eq(courses.id, course.id));
      result.archived++;
      continue;
    }
    const product = byId.get(course.shopierProductId!);
    const details = product && productDetails(product);
    if (details?.currency === "TRY") result[await updateCourse(db, course, details)]++;
    else result.skipped++;
  }
  for (const product of products) {
    const details = productDetails(product);
    if (known.has(product.id) || !isCourseProduct(product) || details?.currency !== "TRY") continue;
    await publishCourse(db, product.id, details);
    result.added++;
  }
  return result;
}
