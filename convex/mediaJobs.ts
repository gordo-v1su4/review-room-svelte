import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';

const jobArgs = { jobId: v.id('mediaJobs'), attempt: v.number(), runId: v.string() };

export const enqueueExistingVersion = internalMutation({
  args: { assetId: v.id('videos'), versionId: v.id('assetVersions') },
  handler: async (ctx, { assetId, versionId }) => {
    const asset = await ctx.db.get(assetId);
    const version = await ctx.db.get(versionId);
    if (!asset || !version || version.assetId !== assetId) throw new Error('Asset version unavailable');
    const existing = await ctx.db.query('mediaJobs').withIndex('by_version', q => q.eq('versionId', versionId)).unique();
    if (existing) return { jobId: existing._id, attempt: existing.attempt };
    const now = Date.now();
    const jobId = await ctx.db.insert('mediaJobs', { assetId, versionId,
      status: 'queued', stage: 'verify', attempt: 1, createdAt: now, updatedAt: now });
    return { jobId, attempt: 1 };
  },
});

export const get = internalQuery({
  args: { jobId: v.id('mediaJobs') },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error('Media job unavailable');
    const version = await ctx.db.get(job.versionId);
    const asset = await ctx.db.get(job.assetId);
    if (!version || !asset || version.assetId !== asset._id) throw new Error('Media job asset unavailable');
    return { job, version, asset };
  },
});

export const recordDispatch = internalMutation({
  args: jobArgs,
  handler: async (ctx, { jobId, attempt, runId }) => {
    const job = await ctx.db.get(jobId);
    if (!job || job.attempt !== attempt || job.status === 'ready') return false;
    if (job.runId && job.runId !== runId) return false;
    await ctx.db.patch(jobId, { runId, updatedAt: Date.now() });
    return true;
  },
});

export const markStage = internalMutation({
  args: { ...jobArgs, stage: v.union(v.literal('verify'), v.literal('derivatives'), v.literal('finalize')),
    durationSec: v.optional(v.number()), width: v.optional(v.number()), height: v.optional(v.number()),
    thumbnailKey: v.optional(v.string()), spriteKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.attempt !== args.attempt || job.status === 'ready' ||
        (job.runId && job.runId !== args.runId)) return false;
    await ctx.db.patch(job._id, {
      status: 'running', stage: args.stage, runId: args.runId, error: undefined,
      ...(args.durationSec !== undefined ? { durationSec: args.durationSec } : {}),
      ...(args.width !== undefined ? { width: args.width } : {}),
      ...(args.height !== undefined ? { height: args.height } : {}),
      ...(args.thumbnailKey !== undefined ? { thumbnailKey: args.thumbnailKey } : {}),
      ...(args.spriteKey !== undefined ? { spriteKey: args.spriteKey } : {}),
      updatedAt: Date.now(),
    });
    const asset = await ctx.db.get(job.assetId);
    if (asset?.currentVersionId === job.versionId) {
      await ctx.db.patch(asset._id, { processingStatus: 'processing', updatedAt: Date.now() });
    }
    return true;
  },
});

export const complete = internalMutation({
  args: { ...jobArgs, durationSec: v.number(), width: v.number(), height: v.number(),
    thumbnailKey: v.string(), spriteKey: v.string() },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.attempt !== args.attempt || job.runId !== args.runId) return false;
    if (job.status === 'ready') return true;
    if (job.status !== 'running' || job.stage !== 'finalize') return false;
    const version = await ctx.db.get(job.versionId);
    const asset = await ctx.db.get(job.assetId);
    if (!version || !asset || version.assetId !== asset._id) throw new Error('Media job asset unavailable');
    await ctx.db.patch(version._id, { processingState: 'ready' });
    // A newer upload can supersede this run. Never point the asset back to an older version.
    if (asset.currentVersionId === version._id) {
      await ctx.db.patch(asset._id, {
        thumbnailKey: args.thumbnailKey, spriteKey: args.spriteKey,
        durationSec: args.durationSec, width: args.width, height: args.height,
        processingStatus: 'ready', updatedAt: Date.now(),
      });
    }
    await ctx.db.patch(job._id, {
      status: 'ready', stage: 'finalize', error: undefined,
      durationSec: args.durationSec, width: args.width, height: args.height,
      thumbnailKey: args.thumbnailKey, spriteKey: args.spriteKey, updatedAt: Date.now(),
    });
    return true;
  },
});

export const fail = internalMutation({
  args: { ...jobArgs, error: v.string() },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.attempt !== args.attempt || job.status === 'ready' ||
        (job.runId && job.runId !== args.runId)) return false;
    await ctx.db.patch(job._id, { status: 'error', runId: args.runId,
      error: args.error.slice(0, 500), updatedAt: Date.now() });
    const asset = await ctx.db.get(job.assetId);
    if (asset?.currentVersionId === job.versionId) {
      await ctx.db.patch(asset._id, { processingStatus: 'error', updatedAt: Date.now() });
    }
    const version = await ctx.db.get(job.versionId);
    if (version) await ctx.db.patch(version._id, { processingState: 'error' });
    return true;
  },
});

export const retry = internalMutation({
  args: { jobId: v.id('mediaJobs') },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId);
    if (!job || job.status !== 'error') throw new Error('Media job is not retryable');
    const attempt = job.attempt + 1;
    await ctx.db.patch(jobId, { status: 'queued', stage: 'verify', attempt,
      runId: undefined, error: undefined, updatedAt: Date.now() });
    const version = await ctx.db.get(job.versionId);
    if (version) await ctx.db.patch(version._id, { processingState: 'processing' });
    const asset = await ctx.db.get(job.assetId);
    if (asset?.currentVersionId === job.versionId) {
      await ctx.db.patch(asset._id, { processingStatus: 'processing', updatedAt: Date.now() });
    }
    return { jobId, attempt };
  },
});
