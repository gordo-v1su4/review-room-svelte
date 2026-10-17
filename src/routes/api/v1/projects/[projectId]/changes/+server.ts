import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../../../convex/_generated/dataModel';
import { internal } from '../../../../../../../convex/_generated/api';
import { db } from '$lib/server/personal';
import { automationBearer, automationError } from '$lib/server/automation-http';

/** Assets and versions changed after `since` (the previous response's cursor; 0 for everything). */
export const GET: RequestHandler = async (event) => {
  try {
    const since = event.url.searchParams.get('since') ?? '0';
    const folderId = event.url.searchParams.get('folderId') || undefined;
    if (!/^\d{1,16}$/.test(since)) return json({ error: 'since must be a cursor from a previous response, or 0' }, { status: 400 });
    const result = await db().mutation(internal.automation.changes, { keyDigest: automationBearer(event),
      projectId: event.params.projectId as Id<'projects'>, since: Number(since), ...(folderId ? { folderId: folderId as Id<'projectFolders'> } : {}) });
    return json(result, { headers: { 'cache-control': 'private, no-store' } });
  } catch (cause) { return automationError(cause); }
};
