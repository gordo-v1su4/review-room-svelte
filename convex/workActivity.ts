import { v } from 'convex/values';
import { internalQuery } from './_generated/server';
import { owner } from './personal';
import type { Doc } from './_generated/dataModel';

type Item = { id: string; kind: 'ingest' | 'transfer'; label: string; project: string; projectId: string;
  assetId?: string; state: 'queued' | 'running' | 'complete' | 'failed' | 'cancelled'; stage: string; updatedAt: number };

/** Thin, owner-scoped projection. No task payloads, storage keys or capabilities. */
export const list = internalQuery({
  args: { now: v.number(), observedIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    if (args.observedIds.length > 100 || !Number.isSafeInteger(args.now)) throw new Error('Invalid activity observation');
    const profile = await owner(ctx);
    const projects = await ctx.db.query('projects').withIndex('by_creator', q => q.eq('createdBy', profile._id)).take(51);
    const permitted = new Map(projects.filter(project => !project.archived).slice(0, 50).map(project => [project._id, project]));
    const rows = new Map<string, Item>();
    let truncated = projects.length > 50;
    const addIngest = async (asset: Doc<'videos'>, project: Doc<'projects'>, observedJob?: Doc<'mediaJobs'>) => {
      if (!asset.currentVersionId) return;
      const job = observedJob ?? await ctx.db.query('mediaJobs').withIndex('by_version', q => q.eq('versionId', asset.currentVersionId!)).unique();
      if (!job || job.versionId !== asset.currentVersionId) return;
      rows.set('ingest:' + job._id, { id: 'ingest:' + job._id, kind: 'ingest', label: asset.assetCode ?? asset.title,
        assetId: asset._id, projectId: project._id, project: project.title, updatedAt: job.updatedAt,
        state: job.status === 'ready' ? 'complete' : job.status === 'error' ? 'failed' : job.status === 'queued' ? 'queued' : 'running',
        stage: job.status === 'ready' ? 'Ready to review' : job.status === 'error' ? 'Processing needs attention' : job.status === 'queued' ? 'Queued for processing' : job.stage === 'verify' ? 'Checking media' : job.stage === 'derivatives' ? 'Preparing previews' : 'Finishing ingest' });
    };
    const addTransfer = async (job: Doc<'syncOutbox'>, project: Doc<'projects'>) => {
      // Older generations are history, not new errors or active work.
      const latest = await ctx.db.query('syncOutbox').withIndex('by_source_version', q => q.eq('connectionId', job.connectionId).eq('versionId', job.versionId)).order('desc').first();
      if (latest?._id !== job._id) return;
      const asset = await ctx.db.get(job.assetId);
      rows.set('transfer:' + job._id, { id: 'transfer:' + job._id, kind: 'transfer', label: asset?.assetCode ?? 'Media version',
        assetId: asset?._id, projectId: project._id, project: project.title, updatedAt: job.updatedAt,
        state: job.state === 'synced' ? 'complete' : job.state === 'sending' ? 'running' : job.state === 'queued' ? 'queued' : job.state === 'source_deleted' ? 'cancelled' : 'failed',
        stage: job.state === 'synced' ? 'Synced to Trailer Feed' : job.state === 'sending' ? 'Transferring to Trailer Feed' : job.state === 'queued' ? 'Queued for Trailer Feed' : job.state === 'disconnected' ? 'Destination disconnected' : job.state === 'source_deleted' ? 'Source removed' : 'Transfer needs attention' });
    };
    for (const project of permitted.values()) {
      for (const state of ['uploading', 'processing', 'error'] as const) {
        const assets = await ctx.db.query('videos').withIndex('by_project_processing', q => q.eq('projectId', project._id).eq('processingStatus', state)).take(101);
        truncated ||= assets.length > 100;
        for (const asset of assets.slice(0, 100)) if (asset.status !== 'archived') await addIngest(asset, project);
      }
      const recent = await ctx.db.query('videos').withIndex('by_project_uploadedAt', q => q.eq('projectId', project._id)).order('desc').take(20);
      for (const asset of recent) if (asset.status !== 'archived' && asset.updatedAt >= args.now - 8000) await addIngest(asset, project);
      for (const state of ['queued', 'sending', 'failed'] as const) {
        const jobs = await ctx.db.query('syncOutbox').withIndex('by_project_state', q => q.eq('projectId', project._id).eq('state', state)).take(101);
        truncated ||= jobs.length > 100;
        for (const job of jobs.slice(0, 100)) await addTransfer(job, project);
      }
      // Fast deliveries can finish between polls. Include fresh receipts too.
      const receipts = await ctx.db.query('syncOutbox').withIndex('by_project', q => q.eq('projectId', project._id)).order('desc').take(20);
      for (const job of receipts) if (job.updatedAt >= args.now - 8000 && job.state === 'synced') await addTransfer(job, project);
    }
    // Finish rows already observed even if they fall outside a recent-page boundary.
    for (const value of new Set(args.observedIds)) {
      if (value.startsWith('ingest:')) {
        const id = ctx.db.normalizeId('mediaJobs', value.slice(7));
        const job = id && await ctx.db.get(id);
        const asset = job && await ctx.db.get(job.assetId);
        const project = asset && permitted.get(asset.projectId);
        if (job && asset && project && asset.status !== 'archived') await addIngest(asset, project, job);
      } else if (value.startsWith('transfer:')) {
        const id = ctx.db.normalizeId('syncOutbox', value.slice(9));
        const job = id && await ctx.db.get(id);
        const project = job && permitted.get(job.projectId);
        if (job && project) await addTransfer(job, project);
      }
    }
    const rank = (item: Item) => item.state === 'running' ? 0 : item.state === 'queued' ? 1 : item.state === 'failed' ? 2 : 3;
    const all = [...rows.values()].sort((a, b) => rank(a) - rank(b) || b.updatedAt - a.updatedAt);
    truncated ||= all.length > 100;
    return { items: all.slice(0, 100), truncated };
  },
});
