import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../../../convex/_generated/dataModel';
import { internal } from '../../../../../../../convex/_generated/api';
import { db } from '$lib/server/personal';
import { automationError, automationRequest } from '$lib/server/automation-http';

export const PUT: RequestHandler = async (event) => {
  try {
    const body = await event.request.json();
    if (typeof body?.excluded !== 'boolean') return json({ error: 'excluded must be a boolean' }, { status: 400 });
    const versionId = event.params.versionId as Id<'assetVersions'>;
    const auth = automationRequest(event, { versionId, excluded: body.excluded });
    const result = await db().mutation(internal.automation.setVersionExcluded, { ...auth, versionId, excluded: body.excluded });
    return json(result, { headers: { 'cache-control': 'no-store' } });
  } catch (cause) { return automationError(cause); }
};
