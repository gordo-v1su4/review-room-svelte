import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db, personal } from '$lib/server/personal';
import { requireOwner } from '$lib/server/owner-auth';

export const load: PageServerLoad = async ({ cookies, setHeaders }) => {
  if (!env.REVIEW_ROOM_CONVEX_URL) return { snapshot: null };
  requireOwner(cookies);
  setHeaders({ 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' });
  return { snapshot: await db().query(personal.snapshot, {}) };
};
