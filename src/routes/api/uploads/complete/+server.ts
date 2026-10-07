import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { requireOwner } from '$lib/server/owner-auth';
import { db, personal, posterKey, removeUploadStaging, sealOriginal, sealPoster } from '$lib/server/personal';
import { dispatchMediaJob } from '$lib/server/media-jobs';

export const POST: RequestHandler = async ({ cookies, request }) => {
  requireOwner(cookies);
  const { sessionId, posterSizeBytes, durationSec, width, height } = await request.json();
  const session = await db().mutation(personal.claimUpload, { sessionId: String(sessionId) as Id<'uploadSessions'> });
  if (session.status === 'complete' && session.completedAssetId) {
    const dispatch = session.completedJobId
      ? await dispatchMediaJob(session.completedJobId, 1)
      : { dispatched: false as const, reason: 'Legacy upload has no media job' };
    const asset = await db().query(personal.uploadDescriptor, { assetId: session.completedAssetId });
    return json({ assetId: session.completedAssetId, jobId: session.completedJobId, asset, ...dispatch },
      { headers: { 'cache-control': 'no-store' } });
  }
  try {
    const object = await sealOriginal(session.objectKey, session.mimeType, session.sizeBytes);
    await sealPoster(session.objectKey, Number(posterSizeBytes));
    const result = await db().mutation(personal.finalizeUpload, {
      sessionId: session._id, verifiedSizeBytes: object.sizeBytes, etag: object.etag,
      posterKey: posterKey(session.objectKey), durationSec: Number(durationSec), width: Number(width), height: Number(height),
      processWithTrigger: !!env.REVIEW_ROOM_TRIGGER_SECRET_KEY,
    });
    const { assetId, jobId } = typeof result === 'string' ? { assetId: result, jobId: undefined } : result;
    try { await removeUploadStaging(session.objectKey); }
    catch { console.error('Upload staging cleanup failed'); }
    const dispatch = jobId ? await dispatchMediaJob(jobId, 1)
      : { dispatched: false as const, reason: 'Trigger processing is not configured' };
    const asset = await db().query(personal.uploadDescriptor, { assetId });
    return json({ assetId, jobId, asset, ...dispatch }, { headers: { 'cache-control': 'no-store' } });
  } catch (cause) {
    await db().mutation(personal.failUpload, { sessionId: session._id, finalizingAt: session.finalizingAt });
    throw cause;
  }
};
