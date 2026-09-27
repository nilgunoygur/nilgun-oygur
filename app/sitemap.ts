import type { MetadataRoute } from "next";
import { pages } from "@/lib/content";
import { config } from "@/lib/config";
import { listCatalog } from "@/lib/akademi/server";
import { getPublicArticles } from "@/lib/articles";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = config().siteUrl;
  const [catalog, articles] = await Promise.all([listCatalog(), getPublicArticles()]);
  const courses = catalog.map(course => `/akademi/${course.slug}`);
  // Read the published collection so newly written posts appear and drafts disappear.
  const paths = new Set([...Object.keys(pages).filter(path => !path.startsWith("/blog/")), ...articles.map(article => article.href), "/akademi", ...courses]);
  return [...paths].map((path) => ({
    url: new URL(path, base).href,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
