import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';

export const get = internalQuery({
  args: { jobId:v.id('storageDeletionJobs') },
  handler: (ctx, {jobId}) => ctx.db.get(jobId)
});
export const complete = internalMutation({
  args: { jobId:v.id('storageDeletionJobs') },
  handler: async (ctx,{jobId}) => { if(await ctx.db.get(jobId)) await ctx.db.delete(jobId); }
});
export const retry = internalMutation({
  args: { jobId:v.id('storageDeletionJobs') },
  handler: async (ctx,{jobId}) => {
    const job=await ctx.db.get(jobId); if(!job) return;
    await ctx.db.patch(jobId,{attempt:job.attempt+1});
    await ctx.scheduler.runAfter(Math.min(3600000,30000*2**Math.min(job.attempt,7)),internal.storageDeletionWorker.run,{jobId});
  }
});
