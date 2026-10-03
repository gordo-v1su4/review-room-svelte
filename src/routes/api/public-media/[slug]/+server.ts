import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, mediaResponse, personal } from '$lib/server/personal';

export const GET: RequestHandler = async ({ params, request }) => {
  const media = await db().query(personal.publicationMedia, { slug: params.slug, poster: false });
  if (!media?.key) throw error(404, 'Media unavailable');
  return await mediaResponse(media.key, media.mimeType, request);
};
