import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../../convex/_generated/dataModel';
import { requireOwner } from '$lib/server/owner-auth';
import { db, personal } from '$lib/server/personal';

export const POST: RequestHandler = async ({ cookies, params }) => {
  requireOwner(cookies);
  await db().mutation(personal.ownerToggleCommentComplete, { commentId: params.commentId as Id<'comments'> });
  return json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
};
