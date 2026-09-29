import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../../convex/_generated/dataModel';
import { internal } from '../../../../../../convex/_generated/api';
import { db } from '$lib/server/personal';
import { automationError, automationRequest } from '$lib/server/automation-http';

export const PATCH: RequestHandler = async (event) => {
  try {
    const body = await event.request.json();
    const fields = Object.fromEntries(['title', 'description', 'clientName', 'brandColor']
      .filter(key => body?.[key] !== undefined).map(key => [key, body[key]]));
    if (!Object.keys(fields).length || Object.values(fields).some(value => typeof value !== 'string')) {
      return json({ error: 'Provide string project fields to update' }, { status: 400 });
    }
    const auth = automationRequest(event, { projectId: event.params.projectId, ...fields });
    const projectId = await db().mutation(internal.automation.editProject,
      { ...auth, projectId: event.params.projectId as Id<'projects'>, ...fields });
    return json({ projectId }, { headers: { 'cache-control': 'no-store' } });
  } catch (cause) { return automationError(cause); }
};
