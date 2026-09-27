import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    // Keep noindex pages crawlable so search engines can read their directives.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/auth/", "/api/internal/", "/api/yonetim/"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
