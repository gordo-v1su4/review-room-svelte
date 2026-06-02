/**
 * Next.js exposes only `NEXT_PUBLIC_*` to the browser.
 * Pindeck uses `VITE_*` for the same values — we accept either so you can
 * copy homelab env without renaming.
 */
export function publicEnv(name: "CONVEX_URL" | "CONVEX_SITE_URL"): string {
  const nextKey =
    name === "CONVEX_URL"
      ? process.env.NEXT_PUBLIC_CONVEX_URL
      : process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  // VITE_* is inlined by next.config env mirror at build time
  const viteKey =
    name === "CONVEX_URL"
      ? process.env.VITE_CONVEX_URL
      : process.env.VITE_CONVEX_SITE_URL;

  const value = nextKey ?? viteKey;
  if (!value) {
    throw new Error(
      `Missing Convex URL: set NEXT_PUBLIC_${name} or VITE_${name} in .env.local`,
    );
  }
  return value;
}

export function isSelfHostedConvexUrl(url: string) {
  return (
    url.includes("serving.cloud") ||
    url.includes("unfold.serving.cloud") ||
    url.includes("127.0.0.1")
  );
}
