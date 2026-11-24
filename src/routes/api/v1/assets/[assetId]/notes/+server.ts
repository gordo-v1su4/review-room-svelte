import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../../../convex/_generated/dataModel';
import { internal } from '../../../../../../../convex/_generated/api';
import { db } from '$lib/server/personal';
import { automationBearer, automationError } from '$lib/server/automation-http';

/** Reviewer notes on one asset, oldest first. Notes belong to the asset, not to a version. */
export const GET: RequestHandler = async event => {
  try {
    const result = await db().mutation(internal.automation.assetNotes, {
      keyDigest: automationBearer(event), assetId: event.params.assetId as Id<'videos'>,
    });
    return json(result, { headers: { 'cache-control': 'private, no-store' } });
  } catch (cause) { return automationError(cause); }
};
