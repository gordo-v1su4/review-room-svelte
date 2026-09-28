import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { requireOwner } from '$lib/server/owner-auth';
import { db, mediaResponse, personal } from '$lib/server/personal';

export const GET: RequestHandler = async ({ params, cookies, request }) => {
  requireOwner(cookies);
  const media = await db().query(personal.ownerMedia, {
    assetId: params.assetId as Id<'videos'>, poster: false
  });
  if (!media?.key) throw error(404, 'Media unavailable');
  return await mediaResponse(media.key, media.mimeType, request.headers.get('range') ?? undefined);
};
