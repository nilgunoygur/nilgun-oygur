import type { MetadataRoute } from "next";
import { pages } from "@/lib/content";
import { listCatalog } from "@/lib/akademi/catalog";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const courses = (await listCatalog()).map(course => `/akademi/${course.slug}`);
  return [...Object.keys(pages), "/akademi", ...courses].map((path) => ({
    url: base + path,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
