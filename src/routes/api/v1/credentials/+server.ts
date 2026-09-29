import { randomBytes } from 'node:crypto';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { internal } from '../../../../../convex/_generated/api';
import { db } from '$lib/server/personal';
import { requireOwner } from '$lib/server/owner-auth';
import { digest } from '$lib/server/automation-http';

export const GET: RequestHandler = async ({ cookies }) => {
  requireOwner(cookies);
  return json({ credentials: await db().query(internal.automation.credentials, {}) },
    { headers: { 'cache-control': 'private, no-store' } });
};

export const POST: RequestHandler = async ({ cookies, request }) => {
  requireOwner(cookies);
  const body = await request.json();
  if (typeof body?.name !== 'string' || !Array.isArray(body.actions) ||
    body.actions.some((action: unknown) => typeof action !== 'string') ||
    (body.projectId !== undefined && typeof body.projectId !== 'string')) {
    return json({ error: 'Invalid credential request' }, { status: 400 });
  }
  const key = `rr_v1_${randomBytes(32).toString('base64url')}`;
  const credentialId = await db().mutation(internal.automation.issue, {
    name: body.name, keyDigest: digest(key), actions: body.actions,
    projectId: body.projectId as Id<'projects'> | undefined,
    expiresAt: body.expiresAt === undefined ? undefined : Number(body.expiresAt),
  });
  return json({ credentialId, key }, { status: 201, headers: { 'cache-control': 'private, no-store' } });
};
