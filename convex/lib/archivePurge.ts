import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import { sourceDeleted } from '../destinationRemovals';

async function queueKeys(ctx: MutationCtx, values: (string | undefined)[]) {
  const keys = [...new Set(values.filter((key): key is string => !!key))];
  if (keys.some(key => !key.startsWith('assets/'))) throw new Error('Unexpected storage key');
  if (!keys.length) return;
  const jobId = await ctx.db.insert('storageDeletionJobs', { keys, attempt: 0, createdAt: Date.now() });
  await ctx.scheduler.runAfter(0, internal.storageDeletionWorker.run, { jobId });
}

// One bounded dependency batch per transaction. Authorization is checked by the
// scheduled entry point against the owner captured by the initial request.
export async function purgeDependencyBatch(ctx: MutationCtx, projectId: Id<'projects'>) {
  const sessions = await ctx.db.query('uploadSessions').withIndex('by_project', q => q.eq('projectId', projectId)).take(50);
  if (sessions.length) {
    await queueKeys(ctx, sessions.flatMap(session => [session.objectKey, `${session.objectKey}.pending`, `${session.objectKey.slice(0, session.objectKey.lastIndexOf('/'))}/poster.jpg`, `${session.objectKey.slice(0, session.objectKey.lastIndexOf('/'))}/poster.jpg.pending`]));
    for (const session of sessions) await ctx.db.delete(session._id);
    return true;
  }
  const asset = await ctx.db.query('videos').withIndex('by_project', q => q.eq('projectId', projectId)).first();
  if (asset) {
    // Metadata can approach the document size limit. Capture external identities
    // before deleting a single bounded version, while it still exists.
    const versions = await ctx.db.query('assetVersions').withIndex('by_asset', q => q.eq('assetId', asset._id)).take(1);
    if (versions.length) {
      await sourceDeleted(ctx, asset, versions);
      await queueKeys(ctx, versions.flatMap(version => [version.originalKey, version.posterKey]));
      for (const version of versions) await ctx.db.delete(version._id);
      return true;
    }
    const jobs = await ctx.db.query('mediaJobs').withIndex('by_asset', q => q.eq('assetId', asset._id)).take(100);
    if (jobs.length) {
      await queueKeys(ctx, jobs.flatMap(job => [job.thumbnailKey, job.spriteKey]));
      for (const job of jobs) await ctx.db.delete(job._id);
      return true;
    }
    const comment = await ctx.db.query('comments').withIndex('by_video', q => q.eq('videoId', asset._id)).first();
    if (comment) {
      const reactions = await ctx.db.query('commentReactions').withIndex('by_comment', q => q.eq('commentId', comment._id)).take(100);
      for (const reaction of reactions) await ctx.db.delete(reaction._id);
      if (!reactions.length) await ctx.db.delete(comment._id);
      return true;
    }
    return false; // Caller disposes this asset using the existing publication cleanup.
  }
  const link = await ctx.db.query('reviewLinks').withIndex('by_project', q => q.eq('projectId', projectId)).first();
  if (link) {
    const sessions = await ctx.db.query('reviewerSessions').withIndex('by_token', q => q.eq('token', link.token)).take(100);
    for (const session of sessions) await ctx.db.delete(session._id);
    if (!sessions.length) await ctx.db.delete(link._id);
    return true;
  }
  const folders = await ctx.db.query('projectFolders').withIndex('by_project', q => q.eq('projectId', projectId)).take(100);
  if (folders.length) {
    await queueKeys(ctx, folders.map(folder => folder.coverImageKey));
    for (const folder of folders) await ctx.db.delete(folder._id);
    return true;
  }
  for (const table of ['projectMembers', 'projectAccessRules', 'collections', 'sourceImports'] as const) {
    const rows = await ctx.db.query(table).withIndex('by_project', q => q.eq('projectId', projectId)).take(100);
    if (rows.length) { for (const row of rows) await ctx.db.delete(row._id); return true; }
  }
  const preferences = await ctx.db.query('workspacePreferences').withIndex('by_project_user', q => q.eq('projectId', projectId)).take(100);
  if (preferences.length) { for (const row of preferences) await ctx.db.delete(row._id); return true; }
  return false;
}
