import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { internal } from '../../../../../convex/_generated/api';
import { db } from '$lib/server/personal';
import { automationError, automationRequest } from '$lib/server/automation-http';

export const POST: RequestHandler = async (event) => {
  try {
    const body = await event.request.json();
    const title = body?.title;
    const description = body?.description;
    if (typeof title !== 'string' || (description !== undefined && typeof description !== 'string')) {
      return json({ error: 'Project title and description must be strings' }, { status: 400 });
    }
    const auth = automationRequest(event, { title, description });
    const projectId = await db().mutation(internal.automation.createProject, { ...auth, title, description });
    return json({ projectId }, { status: 201, headers: { 'cache-control': 'no-store' } });
  } catch (cause) { return automationError(cause); }
};
