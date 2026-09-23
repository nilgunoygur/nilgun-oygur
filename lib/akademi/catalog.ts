import { and, asc, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { courses, shopierPurchases } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import { isCourseProduct, productDetails, type ShopierProduct } from "../shopier/api.ts";
import { descriptionHtml, descriptionText } from "../shopier/description.ts";
import { normalizeSlug } from "../route-slug.ts";
import { courseSlug } from "./slug.ts";

// Catalog: the only module that decides what a sellable course is. Shopier owns title, description, image
// and price; the courses table links a product to a slug, an access duration and the owner's status.

/** Cache tag for everything the public catalog shows. Invalidate it whenever products or courses change. */
export const CATALOG_TAG = "akademi-catalog";

export type CatalogOptions = { includeHidden: boolean };
export type ProductSource = { listProducts(): Promise<{ products: ShopierProduct[]; ids: Set<string> }> };

export const fallbackCover = "/images/akademi/academy-art-v1.png";

export type CatalogCourse = {
  slug: string;
  title: string;
  /** Plain text for cards and metadata. */
  summary: string;
  /** Allowlisted HTML for the course page. */
  descriptionHtml: string;
  image: string;
  priceKurus: number;
  compareAtPriceKurus: number | null;
  accessDurationDays: number;
  shopierUrl: string;
};

/** Price and presentation of a product we can sell: a positive TRY price. */
function saleDetails(product: ShopierProduct) {
  const details = productDetails(product);
  return details && details.currency === "TRY" ? details : null;
}

/** A course is shown for sale when its row is published and its product is a sellable course product. */
function toCatalogCourse(row: typeof courses.$inferSelect, product: ShopierProduct | null | undefined, { includeHidden }: CatalogOptions): CatalogCourse | null {
  if (row.status !== "published" || !product || !isCourseProduct(product, { includeHidden })) return null;
  const details = saleDetails(product);
  if (!details) return null;
  return {
    slug: row.slug, title: details.title, summary: descriptionText(details.description), descriptionHtml: descriptionHtml(details.description), image: details.imageUrl ?? fallbackCover,
    priceKurus: details.priceKurus, compareAtPriceKurus: details.compareAtPriceKurus,
    accessDurationDays: row.accessDurationDays, shopierUrl: `https://www.shopier.com/${row.shopierProductId}`,
  };
}

export async function listCatalog(db: Database, products: ShopierProduct[], options: CatalogOptions): Promise<CatalogCourse[]> {
  const byId = new Map(products.map(product => [product.id, product]));
  const rows = await db.select().from(courses).where(eq(courses.status, "published")).orderBy(asc(courses.createdAt));
  return rows.flatMap(row => toCatalogCourse(row, byId.get(row.shopierProductId), options) ?? []);
}

/** Accepts a raw route param. */
export async function findCatalogCourse(db: Database, rawSlug: string, getProduct: (id: string) => Promise<ShopierProduct | null>, options: CatalogOptions) {
  const slug = normalizeSlug(rawSlug);
  if (!slug) return null;
  const [row] = await db.select().from(courses).where(and(eq(courses.status, "published"), eq(courses.slug, slug))).limit(1);
  return row ? toCatalogCourse(row, await getProduct(row.shopierProductId), options) : null;
}

/** Product title and cover by id, whatever its sale state, so buyers still see courses no longer for sale. */
export function productCards(products: ShopierProduct[]): Record<string, { title: string; image: string }> {
  return Object.fromEntries(products.map(product => [product.id, { title: product.title, image: productDetails(product)?.imageUrl ?? fallbackCover }]));
}

/** Every linked course with its live Shopier title and price, and sales counts, for the owner panel. */
export async function ownerCatalog(db: Database, products: ShopierProduct[]) {
  const byId = new Map(products.map(product => [product.id, product]));
  const titleOf = (productId: string) => byId.get(productId)?.title ?? `Shopier ürünü ${productId}`;
  const [rows, recent] = await Promise.all([
    db.select({
      id: courses.id, slug: courses.slug, productId: courses.shopierProductId, status: courses.status, accessDurationDays: courses.accessDurationDays,
      sales: count(shopierPurchases.id), claimed: sql<number>`count(${shopierPurchases.userId})::int`,
    }).from(courses).leftJoin(shopierPurchases, eq(shopierPurchases.courseId, courses.id)).groupBy(courses.id).orderBy(desc(courses.createdAt)),
    db.select({ id: shopierPurchases.id, order: shopierPurchases.shopierOrderId, productId: courses.shopierProductId, email: shopierPurchases.buyerEmail, amount: shopierPurchases.amountKurus, at: shopierPurchases.purchasedAt, claimed: isNotNull(shopierPurchases.userId) })
      .from(shopierPurchases).innerJoin(courses, eq(courses.id, shopierPurchases.courseId)).orderBy(desc(shopierPurchases.purchasedAt)).limit(25),
  ]);
  return {
    courses: rows.map(row => {
      const product = byId.get(row.productId);
      return { ...row, title: titleOf(row.productId), priceKurus: product ? saleDetails(product)?.priceKurus ?? null : null, discounted: Boolean(product?.priceData.discount) };
    }),
    recentSales: recent.map(sale => ({ ...sale, title: titleOf(sale.productId) })),
  };
}

async function linkCourse(db: Database, product: ShopierProduct) {
  const slug = courseSlug(product.title) || `egitim-${product.id}`;
  const [taken] = await db.select({ id: courses.id }).from(courses).where(eq(courses.slug, slug)).limit(1);
  const [row] = await db.insert(courses).values({ slug: taken ? `${slug}-${product.id}` : slug, shopierProductId: product.id, status: "published" })
    .onConflictDoNothing().returning({ id: courses.id });
  return !!row;
}

/** product.created / product.updated: link a new course product. Returns whether the public catalog may have changed. */
export async function applyShopierProduct(db: Database, product: ShopierProduct, { includeHidden }: CatalogOptions): Promise<"added" | "changed" | "ignored"> {
  const [course] = await db.select({ id: courses.id }).from(courses).where(eq(courses.shopierProductId, product.id)).limit(1);
  if (course) return "changed";
  return isCourseProduct(product, { includeHidden }) && await linkCourse(db, product) ? "added" : "ignored";
}

/** Links new course products and archives courses whose product is gone; owner-archived courses stay archived. */
export async function syncCatalogFromShopier(db: Database, shopier: ProductSource, { includeHidden }: CatalogOptions) {
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
    if (!known.has(product.id) && isCourseProduct(product, { includeHidden }) && await linkCourse(db, product)) result.added++;
  }
  return result;
}
