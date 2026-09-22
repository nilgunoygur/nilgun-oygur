import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  reactCompiler: true,
  images: { remotePatterns: [new URL("https://cdn.shopier.app/**")] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withBotId(nextConfig);
