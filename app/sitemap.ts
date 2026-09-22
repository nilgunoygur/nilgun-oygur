import type { MetadataRoute } from "next";
import { pages } from "@/lib/content";
import { config } from "@/lib/config";
import { listCatalog } from "@/lib/akademi/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = config().siteUrl;
  const courses = (await listCatalog()).map(course => `/akademi/${course.slug}`);
  return [...Object.keys(pages), "/akademi", ...courses].map((path) => ({
    url: base + path,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
