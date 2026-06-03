/**
 * Next.js exposes only `NEXT_PUBLIC_*` to the browser.
 */
export function publicEnv(
  name: "CONVEX_URL" | "CONVEX_SITE_URL",
  options: { required?: boolean } = {},
): string {
  const value =
    name === "CONVEX_URL"
      ? process.env.NEXT_PUBLIC_CONVEX_URL
      : process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

  if (!value && options.required !== false) {
    throw new Error(
      `Missing Convex URL: set NEXT_PUBLIC_${name} in .env.local`,
    );
  }
  return value ?? "";
}

export function isSelfHostedConvexUrl(url: string) {
  return (
    url.includes("serving.cloud") ||
    url.includes("unfold.serving.cloud") ||
    url.includes("127.0.0.1")
  );
}
