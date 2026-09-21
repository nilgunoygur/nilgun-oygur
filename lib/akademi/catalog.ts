import "server-only";
import { cache } from "react";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { normalizeSlug } from "@/lib/route-slug";

export const defaultCourseCover = "/images/akademi/academy-art-v1.png";

export type CatalogCourse = {
  slug: string;
  title: string;
  description: string;
  image: string;
  priceKurus: number;
  compareAtPriceKurus: number | null;
  accessDurationDays: number;
  shopierUrl: string;
};

const published = and(eq(courses.status, "published"), isNotNull(courses.shopierUrl));
const fromRow = (row: typeof courses.$inferSelect): CatalogCourse => ({
  slug: row.slug, title: row.title, description: row.description, image: row.cover ?? defaultCourseCover,
  priceKurus: row.priceKurus, compareAtPriceKurus: row.compareAtPriceKurus, accessDurationDays: row.accessDurationDays,
  shopierUrl: row.shopierUrl ?? "",
});

export async function listCatalog(): Promise<CatalogCourse[]> {
  if (!process.env.DATABASE_URL) return [];
  return (await getDatabase().select().from(courses).where(published).orderBy(asc(courses.createdAt))).map(fromRow);
}

/** Accepts a raw route param; cached so metadata and page share one query. */
export const getCatalogCourse = cache(async (rawSlug: string): Promise<CatalogCourse | null> => {
  const slug = normalizeSlug(rawSlug);
  if (!slug || !process.env.DATABASE_URL) return null;
  const [row] = await getDatabase().select().from(courses).where(and(published, eq(courses.slug, slug))).limit(1);
  return row ? fromRow(row) : null;
});

export const formatPrice = (kurus: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: kurus % 100 ? 2 : 0 }).format(kurus / 100);

export function formatAccess(days: number) {
  if (days % 365 === 0) return `${(days / 365) * 12} ay erişim`;
  if (days % 30 === 0) return `${days / 30} ay erişim`;
  return `${days} gün erişim`;
}
