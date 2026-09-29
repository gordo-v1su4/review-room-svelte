import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../../../convex/_generated/dataModel';
import { internal } from '../../../../../../../convex/_generated/api';
import { db, posterKey, sealOriginal, sealPoster, removeUploadStaging } from '$lib/server/personal';
import { dispatchMediaJob } from '$lib/server/media-jobs';
import { automationBearer, automationError } from '$lib/server/automation-http';

export const POST: RequestHandler = async (event) => {
  let claimed = false;
  let finalizingAt = 0;
  let keyDigest = '';
  const sessionId = event.params.sessionId as Id<'uploadSessions'>;
  try {
    keyDigest = automationBearer(event);
    const body = await event.request.json();
    if (!Number.isSafeInteger(body?.posterSizeBytes) || !Number.isFinite(body.durationSec) ||
      !Number.isSafeInteger(body.width) || !Number.isSafeInteger(body.height)) {
      return json({ error: 'Provide posterSizeBytes, durationSec, width and height' }, { status: 400 });
    }
    const session = await db().mutation(internal.automation.claimUpload, { keyDigest, sessionId });
    if (session.status === 'complete' && session.completedAssetId) {
      const dispatch = session.completedJobId ? await dispatchMediaJob(session.completedJobId, 1)
        : { dispatched: false as const, reason: 'Legacy upload has no media job' };
      return json({ assetId: session.completedAssetId, jobId: session.completedJobId, ...dispatch },
        { headers: { 'cache-control': 'private, no-store' } });
    }
    claimed = true;
    finalizingAt = session.finalizingAt ?? 0;
    const original = await sealOriginal(session.objectKey, session.mimeType, session.sizeBytes, session.sha256);
    await sealPoster(session.objectKey, body.posterSizeBytes);
    const result = await db().mutation(internal.automation.finalizeUpload, {
      keyDigest, sessionId, verifiedSizeBytes: original.sizeBytes, etag: original.etag,
      posterKey: posterKey(session.objectKey), durationSec: body.durationSec,
      width: body.width, height: body.height,
    });
    claimed = false;
    try { await removeUploadStaging(session.objectKey); }
    catch { console.error('Automation upload staging cleanup failed'); }
    const { assetId, jobId } = typeof result === 'string' ? { assetId: result, jobId: undefined } : result;
    const dispatch = jobId ? await dispatchMediaJob(jobId, 1)
      : { dispatched: false as const, reason: 'Trigger processing is not configured' };
    return json({ assetId, jobId, ...dispatch }, { headers: { 'cache-control': 'private, no-store' } });
  } catch (cause) {
    if (claimed && keyDigest) {
      try { await db().mutation(internal.automation.failUpload, { keyDigest, sessionId, finalizingAt }); }
      catch { /* Revocation can prevent recovery; the session expires. */ }
    }
    return automationError(cause);
  }
};
