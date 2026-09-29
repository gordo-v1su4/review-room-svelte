import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../../../convex/_generated/dataModel';
import { internal } from '../../../../../../../convex/_generated/api';
import { db } from '$lib/server/personal';
import { automationError, automationRequest } from '$lib/server/automation-http';

export const POST: RequestHandler = async (event) => {
  try {
    const body = await event.request.json();
    if (typeof body?.title !== 'string') return json({ error: 'Folder title must be a string' }, { status: 400 });
    const auth = automationRequest(event, { projectId: event.params.projectId, title: body.title });
    const folderId = await db().mutation(internal.automation.createFolder,
      { ...auth, projectId: event.params.projectId as Id<'projects'>, title: body.title });
    return json({ folderId }, { status: 201, headers: { 'cache-control': 'no-store' } });
  } catch (cause) { return automationError(cause); }
};
