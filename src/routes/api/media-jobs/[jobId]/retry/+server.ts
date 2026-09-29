import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Id } from '../../../../../../convex/_generated/dataModel';
import { internal } from '../../../../../../convex/_generated/api';
import { requireOwner } from '$lib/server/owner-auth';
import { db } from '$lib/server/personal';
import { dispatchMediaJob } from '$lib/server/media-jobs';

export const POST: RequestHandler = async ({ cookies, params }) => {
  requireOwner(cookies);
  const jobId = params.jobId as Id<'mediaJobs'>;
  const { job } = await db().query(internal.mediaJobs.get, { jobId });
  if (job.status === 'ready') return json({ jobId, status: 'ready' });
  if (job.status === 'running') return json({ jobId, status: 'running', runId: job.runId });
  const attempt = job.status === 'error'
    ? (await db().mutation(internal.mediaJobs.retry, { jobId })).attempt
    : job.attempt;
  const dispatch = await dispatchMediaJob(jobId, attempt);
  return json({ jobId, status: 'queued', attempt, ...dispatch },
    { headers: { 'cache-control': 'no-store' } });
};
