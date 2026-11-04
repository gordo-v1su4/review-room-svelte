import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../../../convex/_generated/dataModel';
import { internal } from '../../../../../../../convex/_generated/api';
import { db } from '$lib/server/personal';
import { automationError, automationRequest } from '$lib/server/automation-http';

export const PUT: RequestHandler = async (event) => {
  try {
    const body = await event.request.json();
    if (!['awaiting_review', 'in_progress', 'needs_changes', 'approved'].includes(body?.status))
      return json({ error: 'Unsupported review status' }, { status: 400 });
    const assetId = event.params.assetId as Id<'videos'>;
    const auth = automationRequest(event, { assetId, status: body.status });
    const result = await db().mutation(internal.automation.setAssetReviewStatus, { ...auth, assetId, status: body.status });
    return json(result, { headers: { 'cache-control': 'no-store' } });
  } catch (cause) { return automationError(cause); }
};
