import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { reserveAssetNumber } from './assetNumber';
import { isLockedFolder } from './folderLock';

/**
 * Storage keys still used by assets outside `deletingAssetIds`. A copy shares its original's
 * stored bytes, so deleting either one must leave those keys in place for the other.
 */
export async function sharedStorageKeys(ctx: MutationCtx, keys: Iterable<string>, deletingAssetIds: ReadonlySet<string>) {
  const shared = new Set<string>();
  for (const key of keys) {
    const users = [
      ...await ctx.db.query('assetVersions').withIndex('by_original_key', q => q.eq('originalKey', key)).collect(),
      ...await ctx.db.query('assetVersions').withIndex('by_poster_key', q => q.eq('posterKey', key)).collect(),
      ...await ctx.db.query('mediaJobs').withIndex('by_thumbnail_key', q => q.eq('thumbnailKey', key)).collect(),
      ...await ctx.db.query('mediaJobs').withIndex('by_sprite_key', q => q.eq('spriteKey', key)).collect(),
    ];
    if (users.some(user => !deletingAssetIds.has(user.assetId))) shared.add(key);
  }
  return shared;
}

export type CopySource = { assetId: Id<'videos'>; versionId?: Id<'assetVersions'> };

/**
 * Copy assets (their current version, or a chosen version) into an ordinary folder for Trailer Feed submission.
 * Each copy is a new asset pointing at the same stored original, poster and sprite; it keeps its code and
 * creative metadata and records where it came from. Review state and comments start fresh.
 */
export async function copyAssetsToFolder(ctx: MutationCtx, ownerId: Id<'appUsers'>, projectId: Id<'projects'>, folderId: Id<'projectFolders'> | undefined, sources: CopySource[]) {
  const project = await ctx.db.get(projectId);
  if (!project || project.createdBy !== ownerId || project.archived) throw new Error('Project unavailable');
  if (!sources.length || sources.length > 50) throw new Error('Select 1–50 assets to copy');
  const folder = folderId && await ctx.db.get(folderId);
  if (folderId && (!folder || folder.projectId !== projectId)) throw new Error('Folder unavailable');
  if (folder && isLockedFolder(folder)) throw new Error('Copy into an ordinary folder; locked folders are managed by Creative Studio Pro');
  const now = Date.now();
  const copies: Id<'videos'>[] = [];
  for (const source of sources) {
    const asset = await ctx.db.get(source.assetId);
    if (!asset || asset.projectId !== projectId || asset.status === 'archived') throw new Error('Asset unavailable');
    const version = await ctx.db.get(source.versionId ?? asset.currentVersionId!);
    if (!version || version.assetId !== asset._id) throw new Error('Version unavailable');
    if (version.processingState !== 'ready') throw new Error('Wait for processing to finish before copying');
    const job = await ctx.db.query('mediaJobs').withIndex('by_version', q => q.eq('versionId', version._id)).unique();
    const number = await reserveAssetNumber(ctx, project.createdBy);
    const copyId = await ctx.db.insert('videos', {
      projectId, folderId, assetClass: asset.assetClass, assetNumber: number, assetCode: asset.assetCode, title: asset.title,
      originalFilename: asset.originalFilename, storageKey: version.originalKey, thumbnailKey: job?.thumbnailKey ?? version.posterKey, spriteKey: job?.spriteKey,
      mimeType: version.mimeType, sizeBytes: version.sizeBytes, durationSec: job?.durationSec ?? asset.durationSec, width: job?.width ?? asset.width, height: job?.height ?? asset.height,
      status: 'awaiting_review', viewed: false, rating: 0, isSelect: false, commentCount: 0, tags: [...asset.tags], downloadEnabled: false,
      order: number, uploadedBy: ownerId, uploadedAt: now, updatedAt: now, processingStatus: 'ready',
      copiedFromAssetId: asset._id, copiedFromVersionId: version._id, copiedAt: now,
    });
    const copyVersion = await ctx.db.insert('assetVersions', {
      assetId: copyId, version: version.version, originalKey: version.originalKey, posterKey: version.posterKey, mimeType: version.mimeType,
      sizeBytes: version.sizeBytes, etag: version.etag, processingState: 'ready',
      ...(version.creativeMetadata ? { creativeMetadata: version.creativeMetadata, metadataUpdatedAt: now } : {}), createdAt: now,
    });
    if (job?.status === 'ready') await ctx.db.insert('mediaJobs', { assetId: copyId, versionId: copyVersion, status: 'ready', stage: 'finalize', attempt: job.attempt,
      durationSec: job.durationSec, width: job.width, height: job.height, thumbnailKey: job.thumbnailKey, spriteKey: job.spriteKey, createdAt: now, updatedAt: now });
    await ctx.db.patch(copyId, { currentVersionId: copyVersion });
    copies.push(copyId);
  }
  await ctx.db.patch(projectId, { updatedAt: now });
  return { assetIds: copies };
}
