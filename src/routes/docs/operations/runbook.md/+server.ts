import type { RequestHandler } from './$types';
import { requireOwner } from '$lib/server/owner-auth';
import runbook from '../../../../../docs/deploy-app-vm-and-auth.md?raw';

export const GET: RequestHandler = ({ cookies }) => {
  requireOwner(cookies);
  return new Response(runbook, { headers: {
    'content-type': 'text/markdown; charset=utf-8',
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff',
    'x-robots-tag': 'noindex, nofollow',
  } });
};
