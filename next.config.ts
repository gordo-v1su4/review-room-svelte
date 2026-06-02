import type { NextConfig } from "next";

/**
 * Mirror VITE_* into NEXT_PUBLIC_* at build time so a pindeck-style .env.local
 * works without duplicating every Convex variable.
 */
function mirrorVitePublicEnv() {
  const pairs: [string, string][] = [
    ["NEXT_PUBLIC_CONVEX_URL", "VITE_CONVEX_URL"],
    ["NEXT_PUBLIC_CONVEX_SITE_URL", "VITE_CONVEX_SITE_URL"],
  ];
  for (const [nextKey, viteKey] of pairs) {
    if (!process.env[nextKey] && process.env[viteKey]) {
      process.env[nextKey] = process.env[viteKey];
    }
  }
}

mirrorVitePublicEnv();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_CONVEX_URL:
      process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.VITE_CONVEX_URL ?? "",
    NEXT_PUBLIC_CONVEX_SITE_URL:
      process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
      process.env.VITE_CONVEX_SITE_URL ??
      "",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "s3.v1su4.dev" },
      { protocol: "https", hostname: "**.serving.cloud" },
    ],
  },
};

export default nextConfig;
