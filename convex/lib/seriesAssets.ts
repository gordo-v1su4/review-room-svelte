import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';

/**
 * Make one version the asset's current version (Creative Studio Pro's "pick").
 * The asset's mirrored playback fields follow the chosen version.
 */
export async function setCurrentAssetVersion(ctx: MutationCtx, ownerId: Id<'appUsers'>, assetId: Id<'videos'>, versionId: Id<'assetVersions'>) {
  const asset = await ctx.db.get(assetId);
  const project = asset && await ctx.db.get(asset.projectId);
  if (!asset || !project || project.createdBy !== ownerId || project.archived) throw new Error('Asset unavailable');
  const version = await ctx.db.get(versionId);
  if (!version || version.assetId !== asset._id) throw new Error('Version unavailable');
  if (asset.currentVersionId === version._id) return { assetId, currentVersionId: versionId };
  const job = await ctx.db.query('mediaJobs').withIndex('by_version', q => q.eq('versionId', version._id)).unique();
  const ready = job?.status === 'ready';
  await ctx.db.patch(asset._id, {
    currentVersionId: version._id, storageKey: version.originalKey, mimeType: version.mimeType, sizeBytes: version.sizeBytes,
    thumbnailKey: (ready ? job.thumbnailKey : undefined) ?? version.posterKey, spriteKey: ready ? job.spriteKey : undefined,
    ...versionDimensions(version, ready ? job : null),
    processingStatus: version.processingState, updatedAt: Date.now(),
  });
  return { assetId, currentVersionId: versionId };
}

/** The chosen version's own duration and size; images never carry a duration. Legacy versions fall back to their ready job. */
export function versionDimensions(version: Doc<'assetVersions'>, job: Pick<Doc<'mediaJobs'>, 'durationSec' | 'width' | 'height'> | null) {
  const width = version.width ?? job?.width, height = version.height ?? job?.height;
  return {
    durationSec: version.mimeType.startsWith('image/') ? undefined : version.durationSec ?? job?.durationSec,
    ...(width !== undefined ? { width } : {}), ...(height !== undefined ? { height } : {}),
  };
}

/** Writes that land in the same millisecond as a read can commit after it; repeat that window rather than miss a change. */
const CURSOR_OVERLAP_MS = 2_000;

export type ChangeFeed = {
  cursor: string;
  assets: { assetId: Id<'videos'>; folderId: Id<'projectFolders'> | null; assetCode: string | null; title: string; status: Doc<'videos'>['status'];
    currentVersionId: Id<'assetVersions'> | null; misfiled: boolean; copiedFromAssetId: Id<'videos'> | null; updatedAt: number }[];
  versions: { versionId: Id<'assetVersions'>; assetId: Id<'videos'>; version: number; isCurrent: boolean; processingState: Doc<'assetVersions'>['processingState'];
    mimeType: string; createdAt: number; metadataUpdatedAt: number | null }[];
  /** Assets that no longer exist, e.g. a misfiled drop that became another shot's take. */
  removedAssets: { assetId: Id<'videos'>; folderId: Id<'projectFolders'> | null; mergedIntoAssetId: Id<'videos'> | null; reason: string; removedAt: number }[];
};

const versionChangedAt = (version: Doc<'assetVersions'>) => Math.max(version.createdAt, version.metadataUpdatedAt ?? 0, version.updatedAt ?? 0);

/** Assets (and their versions) in a project or one folder that changed after `since`. Items near the cursor may repeat: treat it as an upsert feed. */
export async function changesSince(ctx: QueryCtx | MutationCtx, projectId: Id<'projects'>, since: number, folderId?: Id<'projectFolders'>): Promise<ChangeFeed> {
  const assets = folderId
    ? await ctx.db.query('videos').withIndex('by_project_folder', q => q.eq('projectId', projectId).eq('folderId', folderId)).collect()
    : await ctx.db.query('videos').withIndex('by_project', q => q.eq('projectId', projectId)).collect();
  const after = since - CURSOR_OVERLAP_MS;
  let cursor = since;
  const feed: ChangeFeed = { cursor: '', assets: [], versions: [], removedAssets: [] };
  for (const removed of await ctx.db.query('removedAssets').withIndex('by_project_removed', q => q.eq('projectId', projectId).gt('removedAt', after)).collect()) {
    if (folderId && removed.folderId !== folderId) continue;
    cursor = Math.max(cursor, removed.removedAt);
    feed.removedAssets.push({ assetId: removed.assetId, folderId: removed.folderId ?? null, mergedIntoAssetId: removed.mergedIntoAssetId ?? null, reason: removed.reason, removedAt: removed.removedAt });
  }
  for (const asset of assets) {
    // Every version change counts (processing, filing a take), even when the asset itself did not change.
    const versions = await ctx.db.query('assetVersions').withIndex('by_asset', q => q.eq('assetId', asset._id)).collect();
    const changed = versions.filter(version => versionChangedAt(version) > after);
    if (asset.updatedAt <= after && !changed.length) continue;
    cursor = Math.max(cursor, asset.updatedAt, ...changed.map(versionChangedAt));
    feed.assets.push({ assetId: asset._id, folderId: asset.folderId ?? null, assetCode: asset.assetCode ?? null, title: asset.title, status: asset.status,
      currentVersionId: asset.currentVersionId ?? null, misfiled: !!asset.misfiled, copiedFromAssetId: asset.copiedFromAssetId ?? null, updatedAt: asset.updatedAt });
    for (const version of changed) {
      feed.versions.push({ versionId: version._id, assetId: asset._id, version: version.version, isCurrent: version._id === asset.currentVersionId,
        processingState: version.processingState, mimeType: version.mimeType, createdAt: version.createdAt, metadataUpdatedAt: version.metadataUpdatedAt ?? null });
    }
  }
  feed.assets.sort((a, b) => a.updatedAt - b.updatedAt);
  feed.cursor = String(cursor);
  return feed;
}
