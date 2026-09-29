import { TriggerClient } from '@trigger.dev/sdk';
import { env } from '$env/dynamic/private';
import type { Id } from '../../../convex/_generated/dataModel';
import { internal } from '../../../convex/_generated/api';
import { db } from './personal';

export async function dispatchMediaJob(jobId: Id<'mediaJobs'>, attempt: number) {
  const key = env.REVIEW_ROOM_TRIGGER_SECRET_KEY;
  if (!key) return { dispatched: false as const, reason: 'Trigger key unavailable' };
  const client = new TriggerClient({ accessToken: key, baseURL: 'https://trigger.v1su4.dev' });
  try {
    const run = await client.tasks.trigger('review-room-ingest', { jobId, attempt },
      { idempotencyKey: `${jobId}:${attempt}` });
    await db().mutation(internal.mediaJobs.recordDispatch, { jobId, attempt, runId: run.id });
    return { dispatched: true as const, runId: run.id };
  } catch (cause) {
    console.error('Review Room ingest dispatch failed', cause);
    return { dispatched: false as const, reason: 'Trigger dispatch failed' };
  }
}
