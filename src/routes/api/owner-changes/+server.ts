import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../convex/_generated/dataModel';
import { requireOwner } from '$lib/server/owner-auth';
import { db, personal } from '$lib/server/personal';

/** What changed in one project since a cursor, for the open owner workspace (`$lib/live-refresh`). */
export const GET: RequestHandler = async ({ cookies, url }) => {
  requireOwner(cookies);
  const projectId = url.searchParams.get('projectId') ?? '', since = url.searchParams.get('since') ?? '', known = url.searchParams.get('known');
  if (!projectId || projectId.length > 100 || !/^\d{1,16}$/.test(since) || (known !== null && !/^\d{1,7}$/.test(known))) {
    error(400, 'Expected a project, a cursor and an optional asset count');
  }
  const changes = await db().query(personal.changes, { projectId: projectId as Id<'projects'>, since: Number(since), ...(known === null ? {} : { known: Number(known) }) });
  return json(changes, { headers: { 'cache-control': 'private, no-store' } });
};
