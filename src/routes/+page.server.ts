import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db, personal } from '$lib/server/personal';
import { requireOwner } from '$lib/server/owner-auth';

export const load: PageServerLoad = async ({ cookies, setHeaders, depends, url, untrack }) => {
  depends('app:workspace');
  if (!env.REVIEW_ROOM_CONVEX_URL) return { snapshot: null };
  // Untracked: the workspace writes its address into the query string and must not refetch the snapshot for it.
  untrack(() => requireOwner(cookies, url));
  setHeaders({ 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' });
  return { snapshot: await db().query(personal.snapshot, {}) };
};
