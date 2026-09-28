import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../convex/_generated/dataModel';
import { requireOwner } from '$lib/server/owner-auth';
import { db, personal } from '$lib/server/personal';

export const POST: RequestHandler = async ({ cookies, request }) => {
  requireOwner(cookies);
  const body = await request.json();
  const id = await db().mutation(personal.ownerAddComment, {
    assetId: String(body.assetId) as Id<'videos'>,
    body: String(body.body),
    timecodeSec: body.timecodeSec === null ? undefined : body.timecodeSec
  });
  return json({ id }, { headers: { 'cache-control': 'no-store' } });
};
