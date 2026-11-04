import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { internal } from '../../../../convex/_generated/api';
import { requireOwner } from '$lib/server/owner-auth';
import { db } from '$lib/server/personal';
import { env } from '$env/dynamic/private';
import { TriggerClient } from '@trigger.dev/sdk';
import type { Id } from '../../../../convex/_generated/dataModel';

async function reconcileTerminalIngest(items: { id: string; kind: string; state: string; updatedAt: number }[]) {
  if (!env.REVIEW_ROOM_TRIGGER_SECRET_KEY) return false;
  const stale = items.filter(item => item.kind === 'ingest' &&
    (item.state === 'queued' || item.state === 'running') && Date.now() - item.updatedAt > 120_000).slice(0, 5);
  if (!stale.length) return false;
  const trigger = new TriggerClient({ accessToken: env.REVIEW_ROOM_TRIGGER_SECRET_KEY, baseURL: 'https://trigger.v1su4.dev' });
  const results = await Promise.all(stale.map(async item => {
    try {
      const jobId = item.id.slice('ingest:'.length) as Id<'mediaJobs'>;
      const { job } = await db().query(internal.mediaJobs.get, { jobId });
      if (!job.runId || !['queued', 'running'].includes(job.status)) return false;
      const run = await trigger.runs.retrieve(job.runId);
      if (!run.isCompleted || !run.finishedAt || Date.now() - new Date(run.finishedAt).getTime() < 30_000) return false;
      if (run.isCancelled) return await db().mutation(internal.mediaJobs.cancel,
        { jobId, attempt: job.attempt, runId: job.runId });
      return await db().mutation(internal.mediaJobs.fail, { jobId, attempt: job.attempt, runId: job.runId,
        error: run.error?.message ?? 'Trigger run ended before media was ready' });
    } catch {
      console.error('Review Room ingest reconciliation failed');
      return false;
    }
  }));
  return results.some(Boolean);
}

export const POST: RequestHandler = async ({ cookies, request }) => {
  requireOwner(cookies);
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.observedIds) || body.observedIds.length > 100 || body.observedIds.some((id: unknown) => typeof id !== 'string' || id.length > 150)) throw error(400, 'Activity observation required');
  let activity = await db().query(internal.workActivity.list, { now: Date.now(), observedIds: body.observedIds });
  if (await reconcileTerminalIngest(activity.items)) {
    activity = await db().query(internal.workActivity.list, { now: Date.now(), observedIds: body.observedIds });
  }
  return json(activity, { headers: { 'cache-control': 'private, no-store' } });
};
