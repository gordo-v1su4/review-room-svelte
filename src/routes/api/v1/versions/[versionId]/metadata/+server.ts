import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../../../convex/_generated/dataModel';
import { internal } from '../../../../../../../convex/_generated/api';
import { db } from '$lib/server/personal';
import { automationBearer, automationError } from '$lib/server/automation-http';

export const GET: RequestHandler = async event => {
  try {
    const result = await db().mutation(internal.automation.versionMetadata, {
      keyDigest: automationBearer(event), versionId: event.params.versionId as Id<'assetVersions'>,
    });
    return json(result, { headers: { 'cache-control': 'private, no-store' } });
  } catch (cause) { return automationError(cause); }
};
