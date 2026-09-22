import { eq } from "drizzle-orm";
import { courses } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import { isCourseProduct, type ShopierProduct } from "../shopier/api.ts";
import { courseSlug } from "./slug.ts";

export type ProductSource = { listProducts(): Promise<{ products: ShopierProduct[]; ids: Set<string> }> };

async function linkCourse(db: Database, product: ShopierProduct) {
  const slug = courseSlug(product.title) || `egitim-${product.id}`;
  const [taken] = await db.select({ id: courses.id }).from(courses).where(eq(courses.slug, slug)).limit(1);
  const [row] = await db.insert(courses).values({ slug: taken ? `${slug}-${product.id}` : slug, shopierProductId: product.id, status: "published" })
    .onConflictDoNothing().returning({ id: courses.id });
  return !!row;
}

/** product.created / product.updated webhook: link a new course product; details are read live. */
export async function applyShopierProduct(db: Database, product: ShopierProduct): Promise<"added" | "changed" | "ignored"> {
  const [course] = await db.select({ id: courses.id }).from(courses).where(eq(courses.shopierProductId, product.id)).limit(1);
  if (course) return "changed";
  return isCourseProduct(product) && await linkCourse(db, product) ? "added" : "ignored";
}

/** Links new course products and archives courses whose product is gone; owner-archived courses stay archived. */
export async function syncCatalogFromShopier(db: Database, shopier: ProductSource) {
  const { products, ids } = await shopier.listProducts();
  const linked = await db.select({ id: courses.id, productId: courses.shopierProductId, status: courses.status }).from(courses);
  const known = new Set(linked.map(course => course.productId));
  const result = { added: 0, archived: 0 };
  for (const course of linked) {
    if (course.status === "archived" || ids.has(course.productId)) continue;
    await db.update(courses).set({ status: "archived" }).where(eq(courses.id, course.id));
    result.archived++;
  }
  for (const product of products) {
    if (!known.has(product.id) && isCourseProduct(product) && await linkCourse(db, product)) result.added++;
  }
  return result;
}
