import { error } from '@sveltejs/kit';
import { db, mediaResponse, personal } from './personal';

export async function ownerMediaResponse(assetId: string, poster: boolean, url: URL, request: Request) {
  const versionId = url.searchParams.get('versionId') ?? url.searchParams.get('version') ?? undefined;
  const media = await db().query(personal.ownerMedia, { assetId, poster, versionId });
  if (!media?.key) throw error(404, poster ? 'Poster unavailable' : 'Media unavailable');
  return mediaResponse(media.key, media.mimeType, request);
}
