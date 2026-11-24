/** Where sign-in sends someone back to. Only a path on this site is ever honoured. */
const signIn = '/studio/sign-in';
const base = 'http://return.invalid';

/**
 * A same-origin path (with its query) to return to after sign-in, or null.
 * It must start with a single `/`: `//host`, schemes, backslashes and control characters are refused,
 * and so is anything that normalises to another origin or back to sign-in.
 */
export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2000) return null;
  if (!value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return null;
  let url: URL;
  try { url = new URL(value, base); } catch { return null; }
  const path = url.pathname + url.search + url.hash;
  // `/..//host` normalises to `//host`, which a browser reads as another site.
  if (url.origin !== base || !path.startsWith('/') || path.startsWith('//')) return null;
  if (url.pathname === signIn || url.pathname.startsWith(`${signIn}/`)) return null;
  return path;
}

/** The sign-in address for someone who asked for `target`; plain when the target is the bare workspace. */
export function signInPath(target: string): string {
  const next = safeReturnPath(target);
  return next && next !== '/' ? `${signIn}?next=${encodeURIComponent(next)}` : signIn;
}

/** Where to go once signed in. */
export function afterSignIn(next: unknown): string { return safeReturnPath(next) ?? '/'; }
