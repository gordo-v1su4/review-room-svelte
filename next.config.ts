import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL ?? "",
    NEXT_PUBLIC_CONVEX_SITE_URL:
      process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "s3.v1su4.dev" },
      { protocol: "https", hostname: "**.serving.cloud" },
    ],
  },
};

export default nextConfig;
