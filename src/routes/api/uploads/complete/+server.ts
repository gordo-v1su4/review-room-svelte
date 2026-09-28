import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { requireOwner } from '$lib/server/owner-auth';
import { db, personal, posterKey, removeUploadStaging, sealOriginal, sealPoster } from '$lib/server/personal';

export const POST: RequestHandler = async ({ cookies, request }) => {
  requireOwner(cookies);
  const { sessionId, posterSizeBytes, durationSec, width, height } = await request.json();
  const session = await db().mutation(personal.claimUpload, { sessionId: String(sessionId) as Id<'uploadSessions'> });
  try {
    const object = await sealOriginal(session.objectKey, session.mimeType, session.sizeBytes);
    await sealPoster(session.objectKey, Number(posterSizeBytes));
    const assetId = await db().mutation(personal.finalizeUpload, {
      sessionId: session._id, verifiedSizeBytes: object.sizeBytes, etag: object.etag,
      posterKey: posterKey(session.objectKey), durationSec: Number(durationSec), width: Number(width), height: Number(height)
    });
    try { await removeUploadStaging(session.objectKey); }
    catch { console.error('Upload staging cleanup failed'); }
    return json({ assetId }, { headers: { 'cache-control': 'no-store' } });
  } catch (cause) {
    await db().mutation(personal.failUpload, { sessionId: session._id });
    throw cause;
  }
};
