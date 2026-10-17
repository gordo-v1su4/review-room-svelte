import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../../../convex/_generated/dataModel';
import { internal } from '../../../../../../../convex/_generated/api';
import { db } from '$lib/server/personal';
import { automationError, automationRequest } from '$lib/server/automation-http';

/** Creative Studio Pro's pick is Review Room's current version. */
export const PUT: RequestHandler = async (event) => {
  try {
    const body = await event.request.json();
    if (typeof body?.versionId !== 'string' || !body.versionId) return json({ error: 'versionId must be a nonempty string' }, { status: 400 });
    const payload = { assetId: event.params.assetId as Id<'videos'>, versionId: body.versionId as Id<'assetVersions'> };
    const auth = automationRequest(event, payload);
    const result = await db().mutation(internal.automation.setCurrentVersion, { ...auth, ...payload });
    return json(result, { headers: { 'cache-control': 'no-store' } });
  } catch (cause) { return automationError(cause); }
};
