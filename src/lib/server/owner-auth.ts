import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { error, redirect } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';

const COOKIE = 'rr_owner';
const LIFETIME = 7 * 24 * 60 * 60;

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

export function passwordMatches(password: string) {
  if (!env.REVIEW_ROOM_OWNER_PASSWORD) throw error(503, 'Owner access is not configured');
  return equal(signature(password), signature(env.REVIEW_ROOM_OWNER_PASSWORD));
}

export function startOwnerSession(cookies: Cookies) {
  const expiry = Math.floor(Date.now() / 1000) + LIFETIME;
  const value = `${expiry}.${signature(String(expiry))}`;
  cookies.set(COOKIE, value, { path: '/', httpOnly: true, secure: !dev, sameSite: 'lax', maxAge: LIFETIME });
}

export function ownerSignedIn(cookies: Cookies) {
  const value = cookies.get(COOKIE);
  if (!value) return false;
  const [expiry, mac] = value.split('.');
  return Boolean(expiry && mac && Number(expiry) > Date.now() / 1000 && equal(signature(expiry), mac));
}

export function requireOwner(cookies: Cookies) {
  if (!ownerSignedIn(cookies)) redirect(303, '/studio/sign-in');
}

export function endOwnerSession(cookies: Cookies) { cookies.delete(COOKIE, { path: '/' }); }
