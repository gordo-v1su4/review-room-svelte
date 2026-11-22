import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { error, redirect } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import { ownerSessionCookie, ownerSessionValid, type KeepSignedIn } from '$lib/session-lifetime';

const COOKIE = 'rr_owner';

function secret() {
  if (!env.REVIEW_ROOM_SESSION_SECRET) throw error(503, 'Owner session is not configured');
  return env.REVIEW_ROOM_SESSION_SECRET;
}

function signature(value: string) { return createHmac('sha256', secret()).update(value).digest('hex'); }
function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
const now = () => Date.now() / 1000;

export function passwordMatches(password: string) {
  if (!env.REVIEW_ROOM_OWNER_PASSWORD) throw error(503, 'Owner access is not configured');
  return equal(signature(password), signature(env.REVIEW_ROOM_OWNER_PASSWORD));
}

export function startOwnerSession(cookies: Cookies, keep: KeepSignedIn = 'session') {
  const cookie = ownerSessionCookie(keep, now(), signature, !dev);
  cookies.set(COOKIE, cookie.value, cookie.options);
}

export function ownerSignedIn(cookies: Cookies) {
  return ownerSessionValid(cookies.get(COOKIE), now(), (expiry, mac) => equal(signature(expiry), mac));
}

export function requireOwner(cookies: Cookies) {
  if (!ownerSignedIn(cookies)) redirect(303, '/studio/sign-in');
}

export function endOwnerSession(cookies: Cookies) { cookies.delete(COOKIE, { path: '/', httpOnly: true, secure: !dev, sameSite: 'lax' }); }
