import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { demoCourseImage, demoCourses } from "./demo-courses";

export type CatalogCourse = {
  slug: string;
  title: string;
  description: string;
  image: string;
  priceKurus: number;
  accessDurationDays: number;
  /** Null for presentation-only demo courses: nothing can be bought. */
  shopierUrl: string | null;
  category?: string;
  details?: string[];
  modules?: string[];
};

const fallbackImage = demoCourseImage("academy-art-v1.png");
const fromDemo = (course: (typeof demoCourses)[number]): CatalogCourse => ({
  slug: course.slug, title: course.title, description: course.description, image: demoCourseImage(course.image),
  priceKurus: course.price * 100, accessDurationDays: 365, shopierUrl: null, category: course.category,
  details: [`${course.lessons} ders`, course.duration], modules: course.modules,
});

/** Without a database (local preview, first deploys) the page shows the labelled demo showcase. */
export const isCatalogLive = () => !!process.env.DATABASE_URL;

export async function listCatalog(): Promise<CatalogCourse[]> {
  if (!isCatalogLive()) return demoCourses.map(fromDemo);
  const rows = await getDatabase().select().from(courses).where(eq(courses.status, "published")).orderBy(asc(courses.createdAt));
  return rows.map(row => ({
    slug: row.slug, title: row.title, description: row.description, image: row.cover ?? fallbackImage,
    priceKurus: row.priceKurus, accessDurationDays: row.accessDurationDays, shopierUrl: row.shopierUrl,
  }));
}

export async function getCatalogCourse(slug: string): Promise<CatalogCourse | null> {
  if (!isCatalogLive()) {
    const demo = demoCourses.find(course => course.slug === slug);
    return demo ? fromDemo(demo) : null;
  }
  const [row] = await getDatabase().select().from(courses).where(and(eq(courses.slug, slug), eq(courses.status, "published"))).limit(1);
  return row ? {
    slug: row.slug, title: row.title, description: row.description, image: row.cover ?? fallbackImage,
    priceKurus: row.priceKurus, accessDurationDays: row.accessDurationDays, shopierUrl: row.shopierUrl,
  } : null;
}

export const formatPrice = (kurus: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: kurus % 100 ? 2 : 0 }).format(kurus / 100);

export function formatAccess(days: number) {
  if (days % 365 === 0) return `${days / 365 === 1 ? 12 : (days / 365) * 12} ay erişim`;
  if (days % 30 === 0) return `${days / 30} ay erişim`;
  return `${days} gün erişim`;
}
