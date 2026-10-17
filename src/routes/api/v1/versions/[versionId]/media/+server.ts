import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../../../convex/_generated/dataModel';
import { internal } from '../../../../../../../convex/_generated/api';
import { db, versionReadUrls } from '$lib/server/personal';
import { automationBearer, automationError } from '$lib/server/automation-http';

/** Short-lived signed read URLs for one ready version's original and poster (media:read). */
export const GET: RequestHandler = async event => {
  try {
    const keyDigest = automationBearer(event);
    const media = await db().mutation(internal.automation.versionMedia, { keyDigest, versionId: event.params.versionId as Id<'assetVersions'> });
    let signed;
    try { signed = await versionReadUrls(media); }
    catch (cause) {
      await db().mutation(internal.automation.auditVersionMediaRead, { keyDigest, versionId: media.versionId, outcome: 'failed' }).catch(() => undefined);
      throw cause;
    }
    await db().mutation(internal.automation.auditVersionMediaRead, { keyDigest, versionId: media.versionId, outcome: 'succeeded' });
    return json({ versionId: media.versionId, assetId: media.assetId, ...signed }, { headers: { 'cache-control': 'private, no-store' } });
  } catch (cause) {
    const response = automationError(cause);
    response.headers.set('cache-control', 'private, no-store');
    return response;
  }
};
