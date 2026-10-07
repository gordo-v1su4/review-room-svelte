import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../../../convex/_generated/dataModel';
import { internal } from '../../../../../../../convex/_generated/api';
import { db, mediaResponse } from '$lib/server/personal';

export const GET: RequestHandler = async ({ params, cookies, request }) => {
  let media;
  try {
    media = await db().query(internal.privateReview.download, { token: params.token, accessKey: cookies.get(`rr_review_${params.token.slice(0, 24)}`), assetId: params.assetId as Id<'videos'>, versionId: params.versionId as Id<'assetVersions'>, checkedAt: Date.now() });
  } catch { throw error(404, 'Download unavailable'); }
  if (!media) throw error(404, 'Download unavailable');
  const response = await mediaResponse(media.key, media.mimeType, request);
  response.headers.set('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(media.name).replace(/'/g, '%27')}`);
  return response;
};
