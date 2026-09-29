import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { randomSecret } from './reviewAccess';
import { reserveAssetNumber } from './assetNumber';

function title(value: string, kind: string) {
  const normalized = value.trim();
  if (!normalized || normalized.length > 120) throw new Error(`${kind} title must be 1–120 characters`);
  return normalized;
}

export async function createPersonalProject(ctx: MutationCtx, ownerId: Id<'appUsers'>, input: { title: string; description?: string }) {
  const now = Date.now();
  return await ctx.db.insert('projects', {
    title: title(input.title, 'Project'), slug: `personal-${randomSecret().slice(0, 16)}`,
    description: input.description?.trim().slice(0, 2000),
    downloadEnabledByDefault: false, visibility: 'private', nextAssetNumber: 1,
    createdBy: ownerId, createdAt: now, updatedAt: now,
  });
}

export async function updatePersonalProject(ctx: MutationCtx, ownerId: Id<'appUsers'>, projectId: Id<'projects'>,
  input: { title?: string; description?: string; clientName?: string; brandColor?: string; archived?: boolean }) {
  const project = await ctx.db.get(projectId);
  if (!project || project.createdBy !== ownerId) throw new Error('Project unavailable');
  if (input.brandColor !== undefined && !/^#[0-9a-f]{6}$/i.test(input.brandColor)) throw new Error('Invalid brand color');
  await ctx.db.patch(projectId, {
    ...(input.title !== undefined ? { title: title(input.title, 'Project') } : {}),
    ...(input.description !== undefined ? { description: input.description.trim().slice(0, 2000) } : {}),
    ...(input.clientName !== undefined ? { clientName: input.clientName.trim().slice(0, 100) } : {}),
    ...(input.brandColor !== undefined ? { brandColor: input.brandColor.toLowerCase() } : {}),
    ...(input.archived !== undefined ? { archived: input.archived } : {}),
    updatedAt: Date.now(),
  });
  return projectId;
}

export async function createPersonalFolder(ctx: MutationCtx, ownerId: Id<'appUsers'>, projectId: Id<'projects'>, name: string) {
  const project = await ctx.db.get(projectId);
  if (!project || project.createdBy !== ownerId || project.archived) throw new Error('Project unavailable');
  const normalized = title(name, 'Folder');
  const folders = await ctx.db.query('projectFolders').withIndex('by_project', q => q.eq('projectId', projectId)).collect();
  if (folders.some(folder => folder.title.toLowerCase() === normalized.toLowerCase())) throw new Error('Folder already exists');
  const now = Date.now();
  return await ctx.db.insert('projectFolders', {
    projectId, title: normalized, order: Math.max(0, ...folders.map(folder => folder.order)) + 1,
    createdBy: ownerId, createdAt: now, updatedAt: now,
  });
}

export async function renamePersonalFolder(ctx: MutationCtx, ownerId: Id<'appUsers'>, folderId: Id<'projectFolders'>, name: string) {
  const folder = await ctx.db.get(folderId);
  if (!folder) throw new Error('Folder unavailable');
  const project = await ctx.db.get(folder.projectId);
  if (!project || project.createdBy !== ownerId || project.archived) throw new Error('Project unavailable');
  const normalized = title(name, 'Folder');
  const folders = await ctx.db.query('projectFolders').withIndex('by_project', q => q.eq('projectId', folder.projectId)).collect();
  if (folders.some(item => item._id !== folderId && item.title.toLowerCase() === normalized.toLowerCase())) throw new Error('Folder already exists');
  await ctx.db.patch(folderId, { title: normalized, updatedAt: Date.now() });
  return folderId;
}

export async function beginPersonalUpload(ctx: MutationCtx, ownerId: Id<'appUsers'>, input: {
  projectId: Id<'projects'>; folderId?: Id<'projectFolders'>; assetId?: Id<'videos'>;
  originalFilename: string; mimeType: string; sizeBytes: number;
  sha256?: string;
  automationCredentialId?: Id<'automationCredentials'>;
}) {
  const project = await ctx.db.get(input.projectId);
  if (!project || project.createdBy !== ownerId || project.archived) throw new Error('Project unavailable');
  if (!input.mimeType.startsWith('video/') || !Number.isSafeInteger(input.sizeBytes) ||
    input.sizeBytes < 1 || input.sizeBytes > 90 * 1024 ** 2) throw new Error('Unsupported upload');
  if (input.sha256 !== undefined && !/^[a-f0-9]{64}$/.test(input.sha256)) throw new Error('Invalid upload checksum');
  if (input.assetId) {
    const asset = await ctx.db.get(input.assetId);
    if (!asset || asset.projectId !== project._id || asset.status !== 'approved') throw new Error('Approved asset unavailable');
  }
  if (input.folderId) {
    const folder = await ctx.db.get(input.folderId);
    if (!folder || folder.projectId !== project._id) throw new Error('Folder unavailable');
  }
  const extension = input.originalFilename.match(/\.([a-zA-Z0-9]{1,8})$/)?.[1]?.toLowerCase() ?? 'mp4';
  const objectKey = `assets/${project._id}/${randomSecret()}/original.${extension}`;
  const now = Date.now();
  const sessionId = await ctx.db.insert('uploadSessions', {
    projectId: project._id, folderId: input.folderId, assetId: input.assetId,
    automationCredentialId: input.automationCredentialId, objectKey,
    originalFilename: input.originalFilename.slice(0, 240), mimeType: input.mimeType,
    sizeBytes: input.sizeBytes, sha256: input.sha256,
    status: 'pending', expiresAt: now + 60 * 60_000, createdAt: now,
  });
  return { sessionId, objectKey, expiresAt: now + 60 * 60_000 };
}

export type FinalizeUploadInput = {
  sessionId: Id<'uploadSessions'>; verifiedSizeBytes: number; etag?: string;
  posterKey: string; durationSec: number; width: number; height: number;
  processWithTrigger?: boolean;
};

export async function finalizePersonalUpload(ctx: MutationCtx, ownerId: Id<'appUsers'>, args: FinalizeUploadInput) {
  const session = await ctx.db.get(args.sessionId);
  if (!session) throw new Error('Upload session unavailable');
  const project = await ctx.db.get(session.projectId);
  if (!project || project.createdBy !== ownerId || project.archived) throw new Error('Project unavailable');
  if (session.status === 'complete' && session.completedAssetId) {
    return args.processWithTrigger
      ? { assetId: session.completedAssetId, jobId: session.completedJobId }
      : session.completedAssetId;
  }
  if (session.status !== 'finalizing' || session.expiresAt <= Date.now() ||
    session.sizeBytes !== args.verifiedSizeBytes) throw new Error('Upload verification failed');
  if (args.posterKey !== `${session.objectKey.slice(0, session.objectKey.lastIndexOf('/'))}/poster.jpg` ||
    !Number.isFinite(args.durationSec) || args.durationSec <= 0 || args.durationSec > 24 * 60 * 60 ||
    !Number.isSafeInteger(args.width) || args.width < 1 || args.width > 16384 ||
    !Number.isSafeInteger(args.height) || args.height < 1 || args.height > 16384) {
    throw new Error('Upload metadata invalid');
  }
  const now = Date.now();
  let assetId = session.assetId;
  let version = 1;
  if (assetId) {
    const existing = await ctx.db.get(assetId);
    if (!existing || existing.projectId !== project._id || existing.status !== 'approved') throw new Error('Approved asset unavailable');
    const versions = await ctx.db.query('assetVersions').withIndex('by_asset', q => q.eq('assetId', assetId!)).collect();
    version = Math.max(0, ...versions.map(item => item.version)) + 1;
  } else {
    const number = await reserveAssetNumber(ctx, project.createdBy);
    const assetCode = `VID_${new Date(now).toISOString().slice(0, 10).replaceAll('-', '')}_${String(number).padStart(5, '0')}`;
    assetId = await ctx.db.insert('videos', {
      projectId: project._id, folderId: session.folderId, assetClass: 'VID', assetNumber: number,
      assetCode, title: assetCode, originalFilename: session.originalFilename,
      storageKey: session.objectKey, mimeType: session.mimeType, sizeBytes: session.sizeBytes,
      status: 'awaiting_review', viewed: false, rating: 0, isSelect: false, commentCount: 0,
      tags: [], downloadEnabled: false, order: number, uploadedBy: ownerId,
      uploadedAt: now, updatedAt: now, processingStatus: args.processWithTrigger ? 'processing' : 'ready',
    });
    await ctx.db.patch(project._id, { nextAssetNumber: number + 1, updatedAt: now });
  }
  const versionId = await ctx.db.insert('assetVersions', {
    assetId, version, originalKey: session.objectKey, posterKey: args.posterKey,
    mimeType: session.mimeType, sizeBytes: session.sizeBytes, etag: args.etag,
    processingState: args.processWithTrigger ? 'processing' : 'ready', createdAt: now,
  });
  await ctx.db.patch(assetId, {
    currentVersionId: versionId, storageKey: session.objectKey, thumbnailKey: args.posterKey,
    originalFilename: session.originalFilename, mimeType: session.mimeType,
    sizeBytes: session.sizeBytes, processingStatus: args.processWithTrigger ? 'processing' : 'ready',
    updatedAt: now, durationSec: args.durationSec, width: args.width, height: args.height,
  });
  const jobId = args.processWithTrigger ? await ctx.db.insert('mediaJobs', {
    assetId, versionId, status: 'queued', stage: 'verify', attempt: 1,
    createdAt: now, updatedAt: now,
  }) : undefined;
  await ctx.db.patch(session._id, { status: 'complete', completedAssetId: assetId, completedJobId: jobId });
  return args.processWithTrigger ? { assetId, jobId } : assetId;
}
