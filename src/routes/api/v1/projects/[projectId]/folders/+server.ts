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
    if (body.parentFolderId !== undefined && (typeof body.parentFolderId !== 'string' || !body.parentFolderId.trim())) return json({ error: 'Parent folder ID must be a nonempty string' }, { status: 400 });
    const payload = { projectId: event.params.projectId as Id<'projects'>, title: body.title, parentFolderId: body.parentFolderId as Id<'projectFolders'> | undefined };
    const auth = automationRequest(event, payload);
    const folderId = await db().mutation(internal.automation.createFolder,
      { ...auth, ...payload });
    return json({ folderId }, { status: 201, headers: { 'cache-control': 'no-store' } });
  } catch (cause) { return automationError(cause); }
};
