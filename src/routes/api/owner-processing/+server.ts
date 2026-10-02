import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../convex/_generated/dataModel';
import { requireOwner } from '$lib/server/owner-auth';
import { db, personal } from '$lib/server/personal';

export const POST: RequestHandler = async ({ cookies, request }) => {
  requireOwner(cookies);
  const body = await request.json();
  if (!Array.isArray(body?.assetIds) || body.assetIds.length > 50 ||
      body.assetIds.some((id: unknown) => typeof id !== 'string' || !id || id.length > 100)) {
    error(400, 'Expected at most 50 asset IDs');
  }
  const updates = await db().query(personal.processing, { assetIds: body.assetIds as Id<'videos'>[] });
  return json(updates, { headers: { 'cache-control': 'private, no-store' } });
};
