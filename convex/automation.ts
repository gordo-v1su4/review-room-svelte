import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { owner } from './personal';
import { createPersonalProject, updatePersonalProject, createPersonalFolder, renamePersonalFolder, beginPersonalUpload, finalizePersonalUpload } from './lib/personalCommands';

const actions = ['projects:create', 'projects:edit', 'folders:write', 'media:upload', 'media:read'] as const;
const request = { keyDigest: v.string(), requestKey: v.string(), bodyDigest: v.string() };

export const issue = internalMutation({
  args: { name: v.string(), keyDigest: v.string(), projectId: v.optional(v.id('projects')),
    actions: v.array(v.string()), expiresAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const profile = await owner(ctx);
    const name = args.name.trim();
    if (!name || name.length > 100 || !/^[a-f0-9]{64}$/.test(args.keyDigest) ||
      !args.actions.length || args.actions.some(action => !actions.includes(action as typeof actions[number])) ||
      (args.projectId && args.actions.includes('projects:create')) ||
      (args.expiresAt !== undefined && (!Number.isSafeInteger(args.expiresAt) ||
        args.expiresAt <= Date.now() || args.expiresAt > Date.now() + 365 * 86400000))) {
      throw new Error('Invalid automation credential');
    }
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project || project.createdBy !== profile._id || project.archived) throw new Error('Project unavailable');
    }
    if (await ctx.db.query('automationCredentials').withIndex('by_digest', q => q.eq('keyDigest', args.keyDigest)).unique()) {
      throw new Error('Credential already exists');
    }
    return await ctx.db.insert('automationCredentials', { name, keyDigest: args.keyDigest,
      projectId: args.projectId, actions: [...new Set(args.actions)], createdBy: profile._id,
      createdAt: Date.now(), expiresAt: args.expiresAt });
  },
});

export const revoke = internalMutation({
  args: { credentialId: v.id('automationCredentials') },
  handler: async (ctx, { credentialId }) => {
    const profile = await owner(ctx);
    const credential = await ctx.db.get(credentialId);
    if (!credential || credential.createdBy !== profile._id) throw new Error('Credential unavailable');
    if (!credential.revokedAt) await ctx.db.patch(credentialId, { revokedAt: Date.now() });
    return credentialId;
  },
});

export const credentials = internalQuery({
  args: {},
  handler: async (ctx) => {
    const profile = await owner(ctx);
    const all = await ctx.db.query('automationCredentials').collect();
    return all.filter(item => item.createdBy === profile._id).map(({ keyDigest: _digest, ...item }) => item);
  },
});

export const audit = internalQuery({
  args: { credentialId: v.id('automationCredentials') },
  handler: async (ctx, { credentialId }) => {
    const profile = await owner(ctx);
    const credential = await ctx.db.get(credentialId);
    if (!credential || credential.createdBy !== profile._id) throw new Error('Credential unavailable');
    return await ctx.db.query('automationAudit').withIndex('by_credential', q => q.eq('credentialId', credentialId))
      .order('desc').take(200);
  },
});

async function authorize(ctx: MutationCtx, keyDigest: string, action: string, projectId?: Id<'projects'>) {
  const credential = await ctx.db.query('automationCredentials').withIndex('by_digest', q => q.eq('keyDigest', keyDigest)).unique();
  if (!credential || credential.revokedAt || (credential.expiresAt && credential.expiresAt <= Date.now())) throw new Error('Automation credential unavailable');
  if (!credential.actions.includes(action) || (credential.projectId && credential.projectId !== projectId)) throw new Error('Automation scope denied');
  if (action === 'projects:create' && credential.projectId) throw new Error('Automation scope denied');
  await ctx.db.patch(credential._id, { lastUsedAt: Date.now() });
  return credential;
}

async function idempotent<T>(ctx: MutationCtx, credential: Doc<'automationCredentials'>,
  args: { requestKey: string; bodyDigest: string }, action: string, execute: () => Promise<T>): Promise<T> {
  if (!/^[a-zA-Z0-9._:-]{8,128}$/.test(args.requestKey) || !/^[a-f0-9]{64}$/.test(args.bodyDigest)) {
    throw new Error('Invalid idempotency key');
  }
  const prior = await ctx.db.query('automationRequests').withIndex('by_credential_key',
    q => q.eq('credentialId', credential._id).eq('requestKey', args.requestKey)).unique();
  if (prior) {
    if (prior.action !== action || prior.bodyDigest !== args.bodyDigest) throw new Error('Idempotency key reused with a different request');
    await ctx.db.insert('automationAudit', { credentialId: credential._id, action,
      requestKey: args.requestKey, outcome: 'replayed', createdAt: Date.now() });
    return JSON.parse(prior.result) as T;
  }
  const result = await execute();
  await ctx.db.insert('automationRequests', { credentialId: credential._id,
    requestKey: args.requestKey, action, bodyDigest: args.bodyDigest,
    result: JSON.stringify(result), createdAt: Date.now() });
  await ctx.db.insert('automationAudit', { credentialId: credential._id, action,
    requestKey: args.requestKey, targetId: typeof result === 'string' ? result : undefined,
    outcome: 'succeeded', createdAt: Date.now() });
  return result;
}

export const createProject = internalMutation({
  args: { ...request, title: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const credential = await authorize(ctx, args.keyDigest, 'projects:create');
    return await idempotent(ctx, credential, args, 'projects:create',
      () => createPersonalProject(ctx, credential.createdBy, args));
  },
});

export const editProject = internalMutation({
  args: { ...request, projectId: v.id('projects'), title: v.optional(v.string()),
    description: v.optional(v.string()), clientName: v.optional(v.string()), brandColor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const credential = await authorize(ctx, args.keyDigest, 'projects:edit', args.projectId);
    return await idempotent(ctx, credential, args, 'projects:edit',
      () => updatePersonalProject(ctx, credential.createdBy, args.projectId, args));
  },
});

export const catalog = internalMutation({
  args: { keyDigest: v.string(), projectId: v.optional(v.id('projects')) },
  handler: async (ctx, args) => {
    const record = await ctx.db.query('automationCredentials').withIndex('by_digest', q => q.eq('keyDigest', args.keyDigest)).unique();
    if (!record) throw new Error('Automation credential unavailable');
    const action = ['folders:write', 'media:read', 'projects:edit'].find(scope => record.actions.includes(scope));
    if (!action) throw new Error('Automation scope denied');
    const projectId = args.projectId ?? record.projectId;
    const credential = await authorize(ctx, args.keyDigest, action, projectId);
    const projects = (await ctx.db.query('projects').withIndex('by_creator', q => q.eq('createdBy', credential.createdBy)).collect()).filter(project => !project.archived && (!projectId || project._id === projectId));
    const folders = (await Promise.all(projects.map(project => ctx.db.query('projectFolders').withIndex('by_project', q => q.eq('projectId', project._id)).collect()))).flat();
    return { projects: projects.map(project => ({ id: project._id, title: project.title })), folders: folders.map(folder => ({ id: folder._id, projectId: folder.projectId, parentFolderId: folder.parentFolderId, title: folder.title })) };
  },
});

export const versionMetadata = internalMutation({
  args: { keyDigest: v.string(), versionId: v.id('assetVersions') },
  handler: async (ctx, { keyDigest, versionId }) => {
    const version = await ctx.db.get(versionId);
    const asset = version && await ctx.db.get(version.assetId);
    const credential = await authorize(ctx, keyDigest, 'media:read', asset?.projectId);
    const project = asset && await ctx.db.get(asset.projectId);
    if (!version || !asset || !project || project.archived || project.createdBy !== credential.createdBy) throw new Error('Version unavailable');
    return { versionId, assetId: asset._id, projectId: project._id, version: version.version,
      metadata: version.creativeMetadata ?? { model: '', prompt: '', sourceLabel: '', referenceImageVersionIds: [] },
      updatedAt: version.metadataUpdatedAt ?? null };
  },
});

export const createFolder = internalMutation({
  args: { ...request, projectId: v.id('projects'), title: v.string(), parentFolderId: v.optional(v.id('projectFolders')) },
  handler: async (ctx, args) => {
    const credential = await authorize(ctx, args.keyDigest, 'folders:write', args.projectId);
    return await idempotent(ctx, credential, args, 'folders:create',
      () => createPersonalFolder(ctx, credential.createdBy, args.projectId, args.title, args.parentFolderId));
  },
});

export const editFolder = internalMutation({
  args: { ...request, projectId: v.id('projects'), folderId: v.id('projectFolders'), title: v.string() },
  handler: async (ctx, args) => {
    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.projectId !== args.projectId) throw new Error('Folder unavailable');
    const credential = await authorize(ctx, args.keyDigest, 'folders:write', folder.projectId);
    return await idempotent(ctx, credential, args, 'folders:edit',
      () => renamePersonalFolder(ctx, credential.createdBy, args.folderId, args.title));
  },
});

export const beginUpload = internalMutation({
  args: { ...request, projectId: v.id('projects'), folderId: v.optional(v.id('projectFolders')),
    assetId: v.optional(v.id('videos')), originalFilename: v.string(), mimeType: v.string(), sizeBytes: v.number(), sha256: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const credential = await authorize(ctx, args.keyDigest, 'media:upload', args.projectId);
    return await idempotent(ctx, credential, args, 'media:upload:begin',
      () => beginPersonalUpload(ctx, credential.createdBy, { ...args, automationCredentialId: credential._id }));
  },
});

async function authorizedSession(ctx: MutationCtx, keyDigest: string, sessionId: Id<'uploadSessions'>) {
  const session = await ctx.db.get(sessionId);
  if (!session?.automationCredentialId) throw new Error('Upload session unavailable');
  const credential = await authorize(ctx, keyDigest, 'media:upload', session.projectId);
  if (credential._id !== session.automationCredentialId) throw new Error('Upload session unavailable');
  return { credential, session };
}

export const claimUpload = internalMutation({
  args: { keyDigest: v.string(), sessionId: v.id('uploadSessions') },
  handler: async (ctx, args) => {
    const { credential, session } = await authorizedSession(ctx, args.keyDigest, args.sessionId);
    if (session.status === 'complete' && session.completedAssetId) return session;
    const now = Date.now();
    const stale = session.status === 'finalizing' &&
      (session.finalizingAt ?? session.createdAt) <= now - 10 * 60_000;
    if ((!stale && session.status !== 'pending') || session.expiresAt <= now) throw new Error('Upload session unavailable');
    await ctx.db.patch(session._id, { status: 'finalizing', finalizingAt: now });
    await ctx.db.insert('automationAudit', { credentialId: credential._id, action: 'media:upload:claim',
      targetId: session._id, outcome: 'succeeded', createdAt: Date.now() });
    return { ...session, finalizingAt: now };
  },
});

export const failUpload = internalMutation({
  args: { keyDigest: v.string(), sessionId: v.id('uploadSessions'), finalizingAt: v.number() },
  handler: async (ctx, args) => {
    const { session } = await authorizedSession(ctx, args.keyDigest, args.sessionId);
    if (session.status === 'finalizing' && session.finalizingAt === args.finalizingAt) await ctx.db.patch(session._id,
      { status: session.expiresAt > Date.now() ? 'pending' : 'failed' });
  },
});

export const finalizeUpload = internalMutation({
  args: { keyDigest: v.string(), sessionId: v.id('uploadSessions'), verifiedSizeBytes: v.number(),
    etag: v.optional(v.string()), posterKey: v.string(), durationSec: v.number(),
    width: v.number(), height: v.number() },
  handler: async (ctx, args) => {
    const { credential, session } = await authorizedSession(ctx, args.keyDigest, args.sessionId);
    const result = await finalizePersonalUpload(ctx, credential.createdBy, { ...args, processWithTrigger: true });
    await ctx.db.insert('automationAudit', { credentialId: credential._id, action: 'media:upload:complete',
      targetId: typeof result === 'string' ? result : result.assetId,
      outcome: session.status === 'complete' ? 'replayed' : 'succeeded', createdAt: Date.now() });
    return result;
  },
});

export const jobStatus = internalMutation({
  args: { keyDigest: v.string(), jobId: v.id('mediaJobs') },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error('Media job unavailable');
    const asset = await ctx.db.get(job.assetId);
    if (!asset) throw new Error('Asset unavailable');
    const credential = await authorize(ctx, args.keyDigest, 'media:read', asset.projectId);
    await ctx.db.insert('automationAudit', { credentialId: credential._id, action: 'media:read',
      targetId: job._id, outcome: 'succeeded', createdAt: Date.now() });
    return { assetId: asset._id, jobId: job._id, status: job.status, stage: job.stage,
      attempt: job.attempt, runId: job.runId, error: job.error, updatedAt: job.updatedAt };
  },
});
