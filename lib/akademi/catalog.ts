import "server-only";
import { cache } from "react";
import { and, asc, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { getShopier } from "@/lib/shopier";
import { isCourseProduct, productDetails, type ShopierProduct } from "@/lib/shopier/api";
import { normalizeSlug } from "@/lib/route-slug";
import { descriptionHtml, descriptionText } from "@/lib/shopier/description";

const fallbackCover = "/images/akademi/academy-art-v1.png";

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

const isConfigured = () => !!process.env.DATABASE_URL && !!process.env.SHOPIER_API_TOKEN;
/** Development and Preview only: list hidden [TEST] products too. */
export const showHiddenProducts = () => process.env.SHOPIER_SHOW_HIDDEN_PRODUCTS === "true";

function toCatalogCourse(row: typeof courses.$inferSelect, product: ShopierProduct | undefined | null): CatalogCourse | null {
  const details = product && isCourseProduct(product, { includeHidden: showHiddenProducts() }) ? productDetails(product) : null;
  if (!details || details.currency !== "TRY") return null;
  return {
    slug: row.slug, title: details.title, summary: descriptionText(details.description), descriptionHtml: descriptionHtml(details.description), image: details.imageUrl ?? fallbackCover,
    priceKurus: details.priceKurus, compareAtPriceKurus: details.compareAtPriceKurus,
    accessDurationDays: row.accessDurationDays, shopierUrl: `https://www.shopier.com/${row.shopierProductId}`,
  };
}

/** Shopier products by id, from the tagged data cache; empty without a token. */
export const getProductsById = cache(async (): Promise<Map<string, ShopierProduct>> => {
  if (!process.env.SHOPIER_API_TOKEN) return new Map();
  const { products } = await getShopier().listProducts({ cached: true });
  return new Map(products.map(product => [product.id, product]));
});

export async function listCatalog(): Promise<CatalogCourse[]> {
  if (!isConfigured()) return [];
  const [rows, byId] = await Promise.all([
    getDatabase().select().from(courses).where(eq(courses.status, "published")).orderBy(asc(courses.createdAt)),
    getProductsById(),
  ]);
  return rows.flatMap(row => toCatalogCourse(row, byId.get(row.shopierProductId)) ?? []);
}

/** Accepts a raw route param; cached so metadata and page share one lookup. */
export const getCatalogCourse = cache(async (rawSlug: string): Promise<CatalogCourse | null> => {
  const slug = normalizeSlug(rawSlug);
  if (!slug || !isConfigured()) return null;
  const [row] = await getDatabase().select().from(courses).where(and(eq(courses.status, "published"), eq(courses.slug, slug))).limit(1);
  return row ? toCatalogCourse(row, await getShopier().getProduct(row.shopierProductId, { cached: true })) : null;
});

export const formatPrice = (kurus: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: kurus % 100 ? 2 : 0 }).format(kurus / 100);

export function formatAccess(days: number) {
  if (days % 365 === 0) return `${(days / 365) * 12} ay erişim`;
  if (days % 30 === 0) return `${days / 30} ay erişim`;
  return `${days} gün erişim`;
}
