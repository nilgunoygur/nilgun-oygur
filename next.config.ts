import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Course covers may use images already uploaded to Shopier.
  images: { remotePatterns: [new URL("https://cdn.shopier.app/**")] },
};

export default nextConfig;
