import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../convex/_generated/dataModel';
import { requireOwner } from '$lib/server/owner-auth';
import { db, personal } from '$lib/server/personal';

export const POST: RequestHandler = async ({ cookies, request }) => {
  requireOwner(cookies);
  const body = await request.json();
  await db().mutation(personal.updateAssetReview, {
    assetId: String(body.assetId) as Id<'videos'>,
    status: body.status,
    rating: body.rating,
    shortlisted: body.shortlisted,
    viewed: body.viewed
  });
  return json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
};
