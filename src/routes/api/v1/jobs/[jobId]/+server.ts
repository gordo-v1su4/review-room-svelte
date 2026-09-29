import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../../convex/_generated/dataModel';
import { internal } from '../../../../../../convex/_generated/api';
import { db } from '$lib/server/personal';
import { automationBearer, automationError } from '$lib/server/automation-http';

export const GET: RequestHandler = async (event) => {
  try {
    const keyDigest = automationBearer(event);
    const status = await db().mutation(internal.automation.jobStatus,
      { keyDigest, jobId: event.params.jobId as Id<'mediaJobs'> });
    return json(status, { headers: { 'cache-control': 'private, no-store' } });
  } catch (cause) { return automationError(cause); }
};
