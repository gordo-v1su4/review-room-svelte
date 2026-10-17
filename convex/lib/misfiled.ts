import type { MutationCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { codeFromFilename } from './shotCode';
import { isLockedFolder } from './folderLock';
import { findAssetByCode } from './personalCommands';

/**
 * A hand-dropped file in a locked folder is a take of the shot whose code its filename carries,
 * when that shot already lives in the folder. Its own `_v###` is ignored.
 */
export async function shotForDroppedFile(ctx: MutationCtx, projectId: Id<'projects'>, folder: Doc<'projectFolders'>, filename: string) {
  if (!isLockedFolder(folder)) return null;
  const parsed = codeFromFilename(filename);
  if (!parsed) return null;
  const shot = await findAssetByCode(ctx, projectId, parsed.code.code);
  return shot && shot.folderId === folder._id && !shot.misfiled ? shot : null;
}

async function ownedMisfiled(ctx: MutationCtx, ownerId: Id<'appUsers'>, assetId: Id<'videos'>) {
  const asset = await ctx.db.get(assetId);
  const project = asset && await ctx.db.get(asset.projectId);
  if (!asset || !project || project.createdBy !== ownerId || project.archived) throw new Error('Asset unavailable');
  if (!asset.misfiled) throw new Error('Asset is not misfiled');
  return asset;
}

/** Fix-up: the misfiled file is a take of `shotId`. Its versions join the shot as the next versions and the stray asset goes away. */
export async function fileAsTake(ctx: MutationCtx, ownerId: Id<'appUsers'>, assetId: Id<'videos'>, shotId: Id<'videos'>) {
  const stray = await ownedMisfiled(ctx, ownerId, assetId);
  const shot = await ctx.db.get(shotId);
  if (!shot || shot._id === stray._id || shot.projectId !== stray.projectId || shot.misfiled || shot.status === 'archived') throw new Error('Shot unavailable');
  if (shot.mimeType.startsWith('video/') !== stray.mimeType.startsWith('video/')) throw new Error('Upload class does not match the existing asset');
  if (await ctx.db.query('publications').withIndex('by_asset', q => q.eq('assetId', stray._id)).first()) throw new Error('Unpublish the misfiled item first');
  const existing = await ctx.db.query('assetVersions').withIndex('by_asset', q => q.eq('assetId', shot._id)).collect();
  const moving = (await ctx.db.query('assetVersions').withIndex('by_asset', q => q.eq('assetId', stray._id)).collect()).sort((a, b) => a.version - b.version);
  let next = Math.max(0, ...existing.map(version => version.version));
  for (const version of moving) await ctx.db.patch(version._id, { assetId: shot._id, version: ++next });
  for (const job of await ctx.db.query('mediaJobs').withIndex('by_asset', q => q.eq('assetId', stray._id)).collect()) await ctx.db.patch(job._id, { assetId: shot._id });
  for (const comment of await ctx.db.query('comments').withIndex('by_video', q => q.eq('videoId', stray._id)).collect()) {
    await ctx.db.patch(comment._id, { videoId: shot._id });
    for (const reaction of await ctx.db.query('commentReactions').withIndex('by_comment', q => q.eq('commentId', comment._id)).collect()) await ctx.db.patch(reaction._id, { videoId: shot._id });
  }
  for (const session of await ctx.db.query('uploadSessions').withIndex('by_project', q => q.eq('projectId', stray.projectId)).collect())
    if (session.completedAssetId === stray._id || session.assetId === stray._id) await ctx.db.patch(session._id, { ...(session.completedAssetId === stray._id ? { completedAssetId: shot._id } : {}), ...(session.assetId === stray._id ? { assetId: shot._id } : {}) });
  const now = Date.now();
  const newest = moving.at(-1);
  // The fixed take becomes the current version, exactly as a correctly named drop would have.
  await ctx.db.patch(shot._id, {
    ...(newest && stray.currentVersionId ? { currentVersionId: stray.currentVersionId, storageKey: stray.storageKey, thumbnailKey: stray.thumbnailKey, spriteKey: stray.spriteKey,
      mimeType: stray.mimeType, sizeBytes: stray.sizeBytes, durationSec: stray.durationSec, width: stray.width, height: stray.height, processingStatus: stray.processingStatus, originalFilename: stray.originalFilename } : {}),
    commentCount: shot.commentCount + stray.commentCount, updatedAt: now,
  });
  await ctx.db.delete(stray._id);
  await ctx.db.insert('removedAssets', { projectId: stray.projectId, assetId: stray._id, folderId: stray.folderId, mergedIntoAssetId: shot._id, reason: 'filed_as_take', removedAt: now });
  return { assetId: shot._id, versionIds: moving.map(version => version._id) };
}

/** Fix-up: move a misfiled item to another folder; there it is matched by filename again. */
export async function moveMisfiled(ctx: MutationCtx, ownerId: Id<'appUsers'>, assetId: Id<'videos'>, folderId: Id<'projectFolders'> | undefined) {
  const stray = await ownedMisfiled(ctx, ownerId, assetId);
  const folder = folderId && await ctx.db.get(folderId);
  if (folderId && (!folder || folder.projectId !== stray.projectId)) throw new Error('Folder unavailable');
  const shot = folder ? await shotForDroppedFile(ctx, stray.projectId, folder, stray.originalFilename) : null;
  if (shot) return { ...(await fileAsTake(ctx, ownerId, assetId, shot._id)), misfiled: false };
  const misfiled = !!folder && isLockedFolder(folder);
  await ctx.db.patch(stray._id, { folderId, misfiled: misfiled || undefined, updatedAt: Date.now() });
  return { assetId: stray._id, versionIds: [], misfiled };
}
