import { and, asc, count, countDistinct, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { bundleItems, courses, shopierPurchases } from "../db/schema.ts";
import type { Database } from "../db/types.ts";
import { courseProductBlocker, isCourseProduct, isEditableProduct, parsePriceKurus, productDetails, type ShopierProduct } from "../shopier/api.ts";
import { descriptionHtml, descriptionMarkup, descriptionText } from "../shopier/description.ts";
import { normalizeSlug } from "../route-slug.ts";
import { courseSlug } from "./slug.ts";

// Catalog: the only module that decides what a sellable course is. Shopier owns title, description, image
// and price; the courses table links a product to a slug, an access duration and the owner's status.

/** Cache tag for everything the public catalog shows. Invalidate it whenever products or courses change. */
export const CATALOG_TAG = "akademi-catalog";

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
  /** Empty for an ordinary course. */
  includes: { slug: string; title: string }[];
};

/** Price and presentation of a product we can sell: a positive TRY price. */
function saleDetails(product: ShopierProduct) {
  const details = productDetails(product);
  return details && details.currency === "TRY" ? details : null;
}

/** A course is shown for sale when its row is published and its product is a sellable course product. */
function toCatalogCourse(row: typeof courses.$inferSelect, product: ShopierProduct | null | undefined, includes: CatalogCourse["includes"]): CatalogCourse | null {
  if (row.status !== "published" || !product || !isCourseProduct(product)) return null;
  const details = saleDetails(product);
  if (!details) return null;
  return {
    slug: row.slug, title: details.title, summary: descriptionText(details.description), descriptionHtml: descriptionHtml(details.description), image: details.imageUrl ?? fallbackCover,
    priceKurus: details.priceKurus, compareAtPriceKurus: details.compareAtPriceKurus,
    accessDurationDays: row.accessDurationDays, shopierUrl: `https://www.shopier.com/${row.shopierProductId}`, includes,
  };
}

/** Included courses per bundle; a course whose product is gone is left out. */
async function bundleContents(db: Database, bundleIds: string[], titleOf: (productId: string) => Promise<string | undefined> | string | undefined) {
  const contents = new Map<string, CatalogCourse["includes"]>();
  if (!bundleIds.length) return contents;
  const items = await db.select({ bundleId: bundleItems.bundleId, slug: courses.slug, productId: courses.shopierProductId }).from(bundleItems)
    .innerJoin(courses, eq(courses.id, bundleItems.courseId)).where(inArray(bundleItems.bundleId, bundleIds)).orderBy(asc(courses.createdAt));
  const titles = await Promise.all(items.map(item => titleOf(item.productId)));
  for (const [index, { bundleId, slug }] of items.entries()) {
    const title = titles[index];
    if (title) contents.set(bundleId, [...contents.get(bundleId) ?? [], { slug, title }]);
  }
  return contents;
}

export async function listCatalog(db: Database, products: ShopierProduct[]): Promise<CatalogCourse[]> {
  const byId = new Map(products.map(product => [product.id, product]));
  const rows = await db.select().from(courses).where(eq(courses.status, "published")).orderBy(asc(courses.createdAt));
  const contents = await bundleContents(db, rows.map(row => row.id), id => byId.get(id)?.title);
  return rows.flatMap(row => toCatalogCourse(row, byId.get(row.shopierProductId), contents.get(row.id) ?? []) ?? []);
}

/** Accepts a raw route param. */
export async function findCatalogCourse(db: Database, rawSlug: string, getProduct: (id: string) => Promise<ShopierProduct | null>) {
  const slug = normalizeSlug(rawSlug);
  if (!slug) return null;
  const [row] = await db.select().from(courses).where(and(eq(courses.status, "published"), eq(courses.slug, slug))).limit(1);
  if (!row) return null;
  const [product, contents] = await Promise.all([getProduct(row.shopierProductId), bundleContents(db, [row.id], async id => (await getProduct(id))?.title)]);
  return toCatalogCourse(row, product, contents.get(row.id) ?? []);
}

/** Product title and cover by id, whatever its sale state, so buyers still see courses no longer for sale. */
export function productCards(products: ShopierProduct[]): Record<string, { title: string; image: string }> {
  return Object.fromEntries(products.map(product => [product.id, { title: product.title, image: productDetails(product)?.imageUrl ?? fallbackCover }]));
}

/** Every linked course with its live Shopier title and price, and sales counts, for the owner panel. */
export async function ownerCatalog(db: Database, products: ShopierProduct[]) {
  const byId = new Map(products.map(product => [product.id, product]));
  const titleOf = (productId: string) => byId.get(productId)?.title ?? `Shopier ürünü ${productId}`;
  const [rows, recent, items, bundleSales] = await Promise.all([
    db.select({
      id: courses.id, slug: courses.slug, productId: courses.shopierProductId, status: courses.status, accessDurationDays: courses.accessDurationDays,
      sales: count(shopierPurchases.id), claimed: sql<number>`count(${shopierPurchases.userId})::int`,
    }).from(courses).leftJoin(shopierPurchases, eq(shopierPurchases.courseId, courses.id)).groupBy(courses.id).orderBy(desc(courses.createdAt)),
    db.select({ id: shopierPurchases.id, order: shopierPurchases.shopierOrderId, productId: courses.shopierProductId, bundleId: shopierPurchases.bundleId, email: shopierPurchases.buyerEmail, amount: shopierPurchases.amountKurus, at: shopierPurchases.purchasedAt, claimed: isNotNull(shopierPurchases.userId) })
      .from(shopierPurchases).innerJoin(courses, eq(courses.id, shopierPurchases.courseId)).orderBy(desc(shopierPurchases.purchasedAt)).limit(25),
    db.select().from(bundleItems),
    db.select({ bundleId: shopierPurchases.bundleId, orders: countDistinct(shopierPurchases.shopierOrderId) }).from(shopierPurchases).where(isNotNull(shopierPurchases.bundleId)).groupBy(shopierPurchases.bundleId),
  ]);
  const ordersOf = new Map(bundleSales.map(sale => [sale.bundleId, sale.orders]));
  return {
    courses: rows.map(row => {
      const product = byId.get(row.productId);
      const details = product ? saleDetails(product) : null;
      const includes = items.filter(item => item.bundleId === row.id).map(item => item.courseId);
      // A bundle's sales are its orders; the purchases themselves belong to the included courses.
      const orders = includes.length ? ordersOf.get(row.id) ?? 0 : null;
      return {
        ...row, sales: orders ?? row.sales, claimed: orders ?? row.claimed, title: titleOf(row.productId), includes, inBundle: items.some(item => item.courseId === row.id), priceKurus: details?.priceKurus ?? null, discounted: Boolean(product?.priceData.discount),
        blocker: !product ? "missing" as const : courseProductBlocker(product) ?? (details ? null : "unpriced" as const),
        // Raw Shopier values for the edit form.
        product: product && isEditableProduct(product) ? {
          description: descriptionMarkup(product.description), listPriceKurus: parsePriceKurus(product.priceData.price), image: details?.imageUrl ?? null,
          hidden: Boolean(product.customListing), inStock: product.stockStatus !== "outOfStock", url: product.url ?? null,
        } : null,
      };
    }),
    recentSales: recent.map(({ bundleId, ...sale }) => {
      const bundle = bundleId && rows.find(row => row.id === bundleId);
      return { ...sale, title: titleOf(sale.productId), bundle: bundle ? titleOf(bundle.productId) : null };
    }),
  };
}

/** Undefined when already linked. Without `settings`, a hidden product starts as a draft. */
export async function linkCourse(db: Database, product: Pick<ShopierProduct, "id" | "title" | "customListing">, settings?: { accessDurationDays: number; status: "draft" | "published" }) {
  const slug = courseSlug(product.title) || `egitim-${product.id}`;
  const [taken] = await db.select({ id: courses.id }).from(courses).where(eq(courses.slug, slug)).limit(1);
  const insert = db.insert(courses).values({ slug: taken ? `${slug}-${product.id}` : slug, shopierProductId: product.id, status: product.customListing ? "draft" : "published", ...settings });
  const [row] = await (settings ? insert.onConflictDoUpdate({ target: courses.shopierProductId, set: settings }) : insert.onConflictDoNothing()).returning({ id: courses.id });
  return row?.id;
}

/** product.created / product.updated: link a new course product. Returns whether the public catalog may have changed. */
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
