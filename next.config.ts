import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

// The reference site published this post twice. Both spellings are listed because the path may arrive encoded.
const duplicateArticle = "/blog/biliçaltının-i-nsan-yaşamını-şekillendirmesindeki-önem";
const duplicateArticleTarget = "/blog/bilincaltinin-insan-yasamini-sekillendimesindeki-onem";

const nextConfig: NextConfig = {
  cacheComponents: true,
  reactCompiler: true,
  images: { remotePatterns: [new URL("https://cdn.shopier.app/**")] },
  async redirects() {
    return [duplicateArticle, encodeURI(duplicateArticle)].map(source => ({ source, destination: duplicateArticleTarget, permanent: true }));
  },
  async headers() {
    const emailAssetCache = [{ key: "Cache-Control", value: "public, max-age=604800" }];
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/email/:path*", headers: emailAssetCache },
      { source: "/fonts/:path*", headers: emailAssetCache },
    ];
  },
};

export default withBotId(nextConfig);
