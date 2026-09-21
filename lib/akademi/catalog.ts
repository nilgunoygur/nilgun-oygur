import "server-only";
import { cache } from "react";
import { and, asc, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { normalizeSlug } from "@/lib/route-slug";
import { demoCourseImage, demoCourses } from "./demo-courses";

export const defaultCourseCover = demoCourseImage("academy-art-v1.png");

export type CatalogCourse = {
  slug: string;
  title: string;
  description: string;
  image: string;
  priceKurus: number;
  compareAtPriceKurus: number | null;
  accessDurationDays: number;
  /** Null for demo showcase courses, which cannot be bought. */
  shopierUrl: string | null;
  category?: string;
  details?: string[];
  modules?: string[];
};

const fromDemo = (course: (typeof demoCourses)[number]): CatalogCourse => ({
  slug: course.slug, title: course.title, description: course.description, image: demoCourseImage(course.image),
  priceKurus: course.price * 100, compareAtPriceKurus: null, accessDurationDays: 365, shopierUrl: null,
  category: course.category, details: [`${course.lessons} ders`, course.duration], modules: course.modules,
});
const fromRow = (row: typeof courses.$inferSelect): CatalogCourse => ({
  slug: row.slug, title: row.title, description: row.description, image: row.cover ?? defaultCourseCover,
  priceKurus: row.priceKurus, compareAtPriceKurus: row.compareAtPriceKurus, accessDurationDays: row.accessDurationDays, shopierUrl: row.shopierUrl,
});

export const isCatalogLive = () => !!process.env.DATABASE_URL;

export async function listCatalog(): Promise<CatalogCourse[]> {
  if (!isCatalogLive()) return demoCourses.map(fromDemo);
  const rows = await getDatabase().select().from(courses).where(eq(courses.status, "published")).orderBy(asc(courses.createdAt));
  return rows.map(fromRow);
}

/** Accepts a raw route param; cached so metadata and page share one query. */
export const getCatalogCourse = cache(async (rawSlug: string): Promise<CatalogCourse | null> => {
  const slug = normalizeSlug(rawSlug);
  if (!slug) return null;
  if (!isCatalogLive()) {
    const demo = demoCourses.find(course => course.slug === slug);
    return demo ? fromDemo(demo) : null;
  }
  const [row] = await getDatabase().select().from(courses).where(and(eq(courses.slug, slug), eq(courses.status, "published"))).limit(1);
  return row ? fromRow(row) : null;
});

export const formatPrice = (kurus: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: kurus % 100 ? 2 : 0 }).format(kurus / 100);

export function formatAccess(days: number) {
  if (days % 365 === 0) return `${(days / 365) * 12} ay erişim`;
  if (days % 30 === 0) return `${days / 30} ay erişim`;
  return `${days} gün erişim`;
}
