import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../../convex/_generated/dataModel';
import { db, mediaResponse, personal } from '$lib/server/personal';

export const GET: RequestHandler = async ({ params, cookies }) => {
  const accessKey = cookies.get(`rr_review_${params.token.slice(0, 24)}`);
  let media;
  try {
    media = await db().query(personal.reviewMedia, { token: params.token, accessKey,
      assetId: params.assetId as Id<'videos'>, poster: true });
  } catch { throw error(404, 'Poster unavailable'); }
  if (!media?.key) throw error(404, 'Poster unavailable');
  return await mediaResponse(media.key, 'image/jpeg');
};
