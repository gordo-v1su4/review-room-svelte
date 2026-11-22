// How long an owner sign-in lasts. The browser cookie lifetime and the signed
// server-side expiry come from the same choice so they never disagree.

const DAY = 24 * 60 * 60;

export const KEEP_SIGNED_IN_CHOICES = [
  { value: 'session', label: 'This session' },
  { value: '30d', label: '30 days' },
  { value: '60d', label: '60 days' }
] as const;

export type KeepSignedIn = (typeof KEEP_SIGNED_IN_CHOICES)[number]['value'];

/** Server-side cap for a "this session only" sign-in (unchanged from before the choice existed). */
export const SESSION_ONLY_SECONDS = 7 * DAY;

const SECONDS: Record<KeepSignedIn, number> = { session: SESSION_ONLY_SECONDS, '30d': 30 * DAY, '60d': 60 * DAY };

/** Anything unrecognised falls back to the shortest option. */
export function keepSignedInChoice(value: unknown): KeepSignedIn {
  return value === '30d' || value === '60d' ? value : 'session';
}

export interface OwnerSessionCookie {
  value: string;
  options: { path: '/'; httpOnly: true; secure: boolean; sameSite: 'lax'; maxAge?: number };
}

/**
 * The signed cookie for a new owner session. "session" omits max-age so the
 * browser drops it on restart; 30d/60d persist for exactly that long. The
 * signed expiry inside the value is what the server enforces either way.
 */
export function ownerSessionCookie(choice: KeepSignedIn, nowSeconds: number, sign: (value: string) => string, secure: boolean): OwnerSessionCookie {
  const seconds = SECONDS[choice];
  const expiry = String(Math.floor(nowSeconds) + seconds);
  const options: OwnerSessionCookie['options'] = { path: '/', httpOnly: true, secure, sameSite: 'lax' };
  if (choice !== 'session') options.maxAge = seconds;
  return { value: `${expiry}.${sign(expiry)}`, options };
}

/** True while the cookie's signed expiry is in the future and its signature verifies. */
export function ownerSessionValid(value: string | undefined, nowSeconds: number, verify: (expiry: string, mac: string) => boolean): boolean {
  if (!value) return false;
  const [expiry, mac, extra] = value.split('.');
  if (!expiry || !mac || extra !== undefined || !/^\d+$/.test(expiry)) return false;
  return Number(expiry) > nowSeconds && verify(expiry, mac);
}
