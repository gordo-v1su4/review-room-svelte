import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from './_generated/api';
import { getReviewLink, passcodeDigest, randomSecret } from "./lib/reviewAccess";
import { createPersonalProject, updatePersonalProject, createPersonalFolder, renamePersonalFolder, beginPersonalUpload, finalizePersonalUpload } from './lib/personalCommands';

const OWNER_EMAIL = "owner@review-room.invalid";
type Ctx = QueryCtx | MutationCtx;

export async function owner(ctx: Ctx) {
  const user = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", OWNER_EMAIL)).unique();
  if (!user) throw new Error("Personal owner has not been provisioned");
  const profile = await ctx.db.query("appUsers").withIndex("by_auth_user", (q) => q.eq("authUserId", user._id)).unique();
  if (!profile || profile.role !== "admin") throw new Error("Personal owner unavailable");
  return profile;
}

async function ownedProject(ctx: Ctx, projectId: Id<"projects">, allowArchived = false) {
  const profile = await owner(ctx);
  const project = await ctx.db.get(projectId);
  if (!project || project.createdBy !== profile._id || (!allowArchived && project.archived)) throw new Error("Project unavailable");
  return { profile, project };
}

export const bootstrapOwner = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", OWNER_EMAIL)).unique();
    if (existing) return (await owner(ctx))._id;
    const authUserId = await ctx.db.insert("users", { email: OWNER_EMAIL, name: "Owner" });
    return await ctx.db.insert("appUsers", { authUserId, name: "Owner", role: "admin" });
  },
});

export const snapshot = internalQuery({
  args: {},
  handler: async (ctx) => {
    const profile = await owner(ctx);
    const projects = await ctx.db.query("projects").withIndex("by_creator", (q) => q.eq("createdBy", profile._id)).collect();
    const projectIds = new Set(projects.map((project) => project._id));
    const folders = (await Promise.all(projects.map((project) => ctx.db.query('projectFolders')
      .withIndex('by_project', q => q.eq('projectId', project._id)).collect()))).flat();
    const assets = (await Promise.all(projects.map((project) => ctx.db.query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", project._id)).collect()))).flat();
    const versions = (await Promise.all(assets.map((asset) => ctx.db.query("assetVersions")
      .withIndex("by_asset", (q) => q.eq("assetId", asset._id)).collect()))).flat();
    const mediaJobs = (await Promise.all(assets.map((asset) => ctx.db.query("mediaJobs")
      .withIndex("by_asset", (q) => q.eq("assetId", asset._id)).collect()))).flat();
    const comments = (await Promise.all(assets.map((asset) => ctx.db.query('comments')
      .withIndex('by_video', (q) => q.eq('videoId', asset._id)).collect()))).flat();
    const publications = (await ctx.db.query("publications").collect())
      .filter((publication) => assets.some((asset) => asset._id === publication.assetId));
    const showcases = await ctx.db.query("showcases").collect();
    const links = (await Promise.all(projects.map((project) => ctx.db.query("reviewLinks")
      .withIndex("by_project", (q) => q.eq("projectId", project._id)).collect()))).flat()
      .map(({ _id, projectId, token, canDownload, expiresAt, revokedAt, createdAt }) => ({
        _id, projectId, token, canDownload, expiresAt, revokedAt, createdAt,
      }));
    return { projects, folders, assets, versions, mediaJobs, comments, publications, showcases, links, projectIds: Array.from(projectIds) };
  },
});

// Observation exposes no storage keys, credentials or review-link tokens.
export const processing = internalQuery({
  args: { assetIds: v.array(v.id('videos')) },
  handler: async (ctx, { assetIds }) => {
    if (assetIds.length > 50) throw new Error('Too many assets');
    const profile = await owner(ctx);
    const updates = await Promise.all([...new Set(assetIds)].map(async assetId => {
      const asset = await ctx.db.get(assetId);
      if (!asset) return null;
      const project = await ctx.db.get(asset.projectId);
      if (!project || project.createdBy !== profile._id) return null;
      const currentVersion = asset.currentVersionId ? await ctx.db.get(asset.currentVersionId) : null;
      const version = currentVersion?.assetId === assetId ? currentVersion : null;
      const job = version
        ? await ctx.db.query('mediaJobs').withIndex('by_version', q => q.eq('versionId', version._id)).unique()
        : null;
      return {
        assetId, versionId: version?._id ?? null, versionNumber: version?.version ?? 0,
        updatedAt: Math.max(asset.updatedAt, job?.updatedAt ?? 0),
        ready: asset.processingStatus === 'ready' && version?.processingState === 'ready',
        hasPoster: !!version?.posterKey,
        duration: asset.durationSec, width: asset.width, height: asset.height,
        job: job ? { _id: job._id, assetId: job.assetId, versionId: job.versionId,
          attempt: job.attempt, status: job.status, stage: job.stage, runId: job.runId,
          createdAt: job.createdAt, updatedAt: job.updatedAt } : undefined
      };
    }));
    return updates.filter(update => update !== null);
  }
});

export const deleteSelectedAssets = internalMutation({
  args: {projectId:v.id('projects'),assetIds:v.array(v.id('videos'))},
  handler: async (ctx,{projectId,assetIds}) => {
    await ownedProject(ctx,projectId);
    const ids=[...new Set(assetIds)];
    if(!ids.length || ids.length>50) throw new Error('Invalid selection');
    const assets=await Promise.all(ids.map(id=>ctx.db.get(id)));
    if(assets.some(asset=>!asset || asset.projectId!==projectId)) throw new Error('Selection changed');
    const sessions=await ctx.db.query('uploadSessions').withIndex('by_project',q=>q.eq('projectId',projectId)).collect();
    if(sessions.some(session=>session.assetId && ids.includes(session.assetId) && ['pending','finalizing'].includes(session.status))) throw new Error('Replacement upload in progress');
    const keys=new Set<string>();
    const publicationIds=new Set<Id<'publications'>>();
    for(const asset of assets) {
      if(!asset) throw new Error('Asset unavailable');
      const jobs=await ctx.db.query('mediaJobs').withIndex('by_asset',q=>q.eq('assetId',asset._id)).collect();
      if(jobs.some(job=>job.status==='queued'||job.status==='running') || asset.processingStatus==='uploading'||asset.processingStatus==='processing') throw new Error('Processing in progress');
      const versions=await ctx.db.query('assetVersions').withIndex('by_asset',q=>q.eq('assetId',asset._id)).collect();
      for(const key of [asset.storageKey,asset.thumbnailKey,asset.spriteKey,...versions.flatMap(version=>[version.originalKey,version.posterKey]),...jobs.flatMap(job=>[job.thumbnailKey,job.spriteKey])]) if(key) keys.add(key);
      const publications=await ctx.db.query('publications').withIndex('by_asset',q=>q.eq('assetId',asset._id)).collect();
      for(const publication of publications) {publicationIds.add(publication._id); await ctx.db.delete(publication._id);}
      const comments=await ctx.db.query('comments').withIndex('by_video',q=>q.eq('videoId',asset._id)).collect();
      for(const comment of comments) {
        const reactions=await ctx.db.query('commentReactions').withIndex('by_comment',q=>q.eq('commentId',comment._id)).collect();
        for(const reaction of reactions) await ctx.db.delete(reaction._id);
        await ctx.db.delete(comment._id);
      }
      for(const version of versions) await ctx.db.delete(version._id);
      for(const job of jobs) await ctx.db.delete(job._id);
      await ctx.db.delete(asset._id);
    }
    for(const session of sessions) if((session.assetId && ids.includes(session.assetId))||(session.completedAssetId && ids.includes(session.completedAssetId))) {
      keys.add(`${session.objectKey}.pending`);
      keys.add(`${session.objectKey.slice(0,session.objectKey.lastIndexOf('/'))}/poster.jpg.pending`);
      await ctx.db.delete(session._id);
    }
    if(publicationIds.size) {
      const showcases=await ctx.db.query('showcases').collect();
      for(const showcase of showcases) if(showcase.publicationIds.some(id=>publicationIds.has(id))) await ctx.db.patch(showcase._id,{publicationIds:showcase.publicationIds.filter(id=>!publicationIds.has(id)),updatedAt:Date.now()});
    }
    if([...keys].some(key=>!key.startsWith('assets/'))) throw new Error('Unexpected storage key');
    if(keys.size) {
      const jobId=await ctx.db.insert('storageDeletionJobs',{keys:[...keys],attempt:0,createdAt:Date.now()});
      await ctx.scheduler.runAfter(0,internal.storageDeletionWorker.run,{jobId});
    }
    return {deletedAssetIds:ids};
  }
});

export const deleteUnpublishedAsset = internalMutation({
  args: {
    assetId: v.id('videos'),
    expectedTitle: v.string(),
    expectedVersionIds: v.array(v.id('assetVersions')),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset || asset.title !== args.expectedTitle) throw new Error('Asset changed');
    await ownedProject(ctx, asset.projectId);
    const publications = await ctx.db.query('publications')
      .withIndex('by_asset', q => q.eq('assetId', asset._id)).collect();
    const comments = await ctx.db.query('comments')
      .withIndex('by_video', q => q.eq('videoId', asset._id)).collect();
    if (publications.length || comments.length) throw new Error('Asset has review or publication history');
    const versions = await ctx.db.query('assetVersions')
      .withIndex('by_asset', q => q.eq('assetId', asset._id)).collect();
    if (versions.length !== args.expectedVersionIds.length ||
      versions.some(version => !args.expectedVersionIds.includes(version._id))) {
      throw new Error('Asset versions changed');
    }
    const sessions = await ctx.db.query('uploadSessions')
      .withIndex('by_project', q => q.eq('projectId', asset.projectId)).collect();
    for (const session of sessions) {
      if (session.assetId === asset._id || session.completedAssetId === asset._id) await ctx.db.delete(session._id);
    }
    for (const version of versions) await ctx.db.delete(version._id);
    const jobs = await ctx.db.query('mediaJobs').withIndex('by_asset', q => q.eq('assetId', asset._id)).collect();
    for (const job of jobs) await ctx.db.delete(job._id);
    await ctx.db.delete(asset._id);
    return { deletedAssetId: asset._id, deletedVersions: versions.length };
  },
});

export const createProject = internalMutation({
  args: { title: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const profile = await owner(ctx);
    return await createPersonalProject(ctx, profile._id, args);
  },
});

export const updateProject = internalMutation({
  args: { projectId: v.id("projects"), title: v.optional(v.string()), description: v.optional(v.string()),
    clientName: v.optional(v.string()), brandColor: v.optional(v.string()), archived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const profile = await owner(ctx);
    await updatePersonalProject(ctx, profile._id, args.projectId, args);
  },
});

export const createFolder = internalMutation({
  args: { projectId: v.id('projects'), title: v.string() },
  handler: async (ctx, args) => {
    const profile = await owner(ctx);
    return await createPersonalFolder(ctx, profile._id, args.projectId, args.title);
  },
});

export const renameFolder = internalMutation({
  args: { folderId: v.id('projectFolders'), title: v.string() },
  handler: async (ctx, args) => {
    const profile = await owner(ctx);
    return await renamePersonalFolder(ctx, profile._id, args.folderId, args.title);
  },
});

export const beginUpload = internalMutation({
  args: { projectId: v.id("projects"), folderId: v.optional(v.id('projectFolders')), assetId: v.optional(v.id("videos")), originalFilename: v.string(), mimeType: v.string(), sizeBytes: v.number() },
  handler: async (ctx, args) => {
    const profile = await owner(ctx);
    return await beginPersonalUpload(ctx, profile._id, args);
  },
});

export const uploadSession = internalQuery({
  args: { sessionId: v.id("uploadSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Upload session unavailable");
    await ownedProject(ctx, session.projectId);
    return session;
  },
});

export const claimUpload = internalMutation({
  args: { sessionId: v.id('uploadSessions') },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error('Upload session unavailable');
    await ownedProject(ctx, session.projectId);
    if (session.status === 'complete' && session.completedAssetId) return session;
    const now = Date.now();
    const stale = session.status === 'finalizing' &&
      (session.finalizingAt ?? session.createdAt) <= now - 10 * 60_000;
    if ((!stale && session.status !== 'pending') || session.expiresAt <= now) throw new Error('Upload session unavailable');
    await ctx.db.patch(session._id, { status: 'finalizing', finalizingAt: now });
    return { ...session, finalizingAt: now };
  },
});

export const failUpload = internalMutation({
  args: { sessionId: v.id('uploadSessions'), finalizingAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;
    await ownedProject(ctx, session.projectId, true);
    if (session.status === 'finalizing' &&
      (args.finalizingAt === undefined || session.finalizingAt === args.finalizingAt)) {
      await ctx.db.patch(session._id, { status: session.expiresAt > Date.now() ? 'pending' : 'failed' });
    }
  },
});

export const finalizeUpload = internalMutation({
  args: { sessionId: v.id("uploadSessions"), verifiedSizeBytes: v.number(), etag: v.optional(v.string()), posterKey: v.string(), durationSec: v.number(), width: v.number(), height: v.number(), processWithTrigger: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const profile = await owner(ctx);
    return await finalizePersonalUpload(ctx, profile._id, args);
  },
});

export const approveAsset = internalMutation({
  args: { assetId: v.id("videos") },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) throw new Error("Asset unavailable");
    await ownedProject(ctx, asset.projectId);
    if (asset.processingStatus !== "ready" || !asset.currentVersionId) throw new Error("Asset is not ready");
    await ctx.db.patch(asset._id, { status: "approved", approvedAt: Date.now(), updatedAt: Date.now() });
  },
});

export const updateAssetReview = internalMutation({
  args: { assetId: v.id('videos'), status: v.optional(v.string()),
    rating: v.optional(v.number()), shortlisted: v.optional(v.boolean()),
    viewed: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) throw new Error('Asset unavailable');
    await ownedProject(ctx, asset.projectId);
    const patch: { status?: 'awaiting_review' | 'needs_changes' | 'approved'; rating?: number; isSelect?: boolean; viewed?: boolean; updatedAt: number } = { updatedAt: Date.now() };
    if (args.status !== undefined) {
      if (!['awaiting_review', 'needs_changes', 'approved'].includes(args.status)) throw new Error('Unsupported review status');
      if (args.status === 'approved' && (asset.processingStatus !== 'ready' || !asset.currentVersionId)) throw new Error('Asset is not ready');
      patch.status = args.status as typeof patch.status;
    }
    if (args.rating !== undefined) {
      if (!Number.isInteger(args.rating) || args.rating < 0 || args.rating > 5) throw new Error('Invalid rating');
      patch.rating = args.rating;
    }
    if (args.shortlisted !== undefined) patch.isSelect = args.shortlisted;
    if (args.viewed !== undefined) patch.viewed = args.viewed;
    await ctx.db.patch(asset._id, patch);
  },
});

export const ownerAddComment = internalMutation({
  args: { assetId: v.id('videos'), body: v.string(), timecodeSec: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) throw new Error('Asset unavailable');
    await ownedProject(ctx, asset.projectId);
    const body = args.body.trim().slice(0, 5000);
    if (!body) throw new Error('Comment required');
    if (args.timecodeSec !== undefined && (!Number.isFinite(args.timecodeSec) || args.timecodeSec < 0)) throw new Error('Invalid timecode');
    const id = await ctx.db.insert('comments', {
      videoId: asset._id, projectId: asset.projectId, authorName: 'Owner', authorRole: 'admin',
      body, timecodeSec: args.timecodeSec, createdAt: Date.now()
    });
    await ctx.db.patch(asset._id, { commentCount: asset.commentCount + 1,
      feedbackNeedsAttention: true, updatedAt: Date.now() });
    return id;
  },
});

export const ownerToggleCommentComplete = internalMutation({
  args: { commentId: v.id('comments') },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error('Comment unavailable');
    const { profile } = await ownedProject(ctx, comment.projectId);
    await ctx.db.patch(comment._id, {
      completedAt: comment.completedAt ? undefined : Date.now(),
      completedBy: comment.completedAt ? undefined : profile._id
    });
    const comments = await ctx.db.query('comments').withIndex('by_video', q => q.eq('videoId', comment.videoId)).collect();
    const asset = await ctx.db.get(comment.videoId);
    if (asset) await ctx.db.patch(asset._id, { feedbackNeedsAttention: comments.some(item => item._id === comment._id ? !!comment.completedAt : !item.completedAt), updatedAt: Date.now() });
  },
});

export const createReviewLink = internalMutation({
  args: { projectId: v.id("projects"), passcode: v.optional(v.string()), expiresAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await ownedProject(ctx, args.projectId);
    if (args.expiresAt !== undefined && args.expiresAt <= Date.now()) throw new Error("Expiry must be in the future");
    const token = randomSecret();
    const passcodeSalt = args.passcode ? randomSecret() : undefined;
    const passcodeHash = args.passcode ? await passcodeDigest(args.passcode, passcodeSalt!) : undefined;
    const linkId = await ctx.db.insert("reviewLinks", {
      projectId: args.projectId, token, passcodeSalt, passcodeHash,
      canDownload: false, expiresAt: args.expiresAt, createdAt: Date.now(),
    });
    return { linkId, token };
  },
});

export const revokeReviewLink = internalMutation({
  args: { linkId: v.id("reviewLinks") },
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link) throw new Error("Review link unavailable");
    await ownedProject(ctx, link.projectId, true);
    await ctx.db.patch(link._id, { revokedAt: Date.now() });
  },
});

function normalizeOrigins(origins: string[]) {
  const normalized = origins.map((value) => {
    const url = new URL(value);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) throw new Error("HTTPS origin required");
    if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) throw new Error("Enter site origins only");
    return url.origin;
  });
  return Array.from(new Set(normalized)).slice(0, 12);
}

export const publishAsset = internalMutation({
  args: { assetId: v.id("videos"), versionId: v.id("assetVersions"), allowedOrigins: v.array(v.string()) },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) throw new Error("Asset unavailable");
    await ownedProject(ctx, asset.projectId);
    const version = await ctx.db.get(args.versionId);
    if (asset.status !== "approved" || !version || version.assetId !== asset._id || version.processingState !== "ready") throw new Error("Approved version required");
    const allowedOrigins = normalizeOrigins(args.allowedOrigins);
    if (!allowedOrigins.length) throw new Error("At least one allowed site is required");
    const now = Date.now();
    const slug = randomSecret().slice(0, 32);
    const publicationId = await ctx.db.insert("publications", { assetId: asset._id, versionId: version._id, slug, allowedOrigins, createdAt: now, updatedAt: now });
    return { publicationId, slug };
  },
});

export const replacePublication = internalMutation({
  args: { publicationId: v.id("publications"), versionId: v.id("assetVersions") },
  handler: async (ctx, args) => {
    const publication = await ctx.db.get(args.publicationId);
    if (!publication || publication.revokedAt) throw new Error("Publication unavailable");
    const asset = await ctx.db.get(publication.assetId);
    if (!asset) throw new Error("Asset unavailable");
    await ownedProject(ctx, asset.projectId);
    const version = await ctx.db.get(args.versionId);
    if (asset.status !== "approved" || !version || version.assetId !== asset._id || version.processingState !== "ready") throw new Error("Approved version required");
    await ctx.db.patch(publication._id, { versionId: version._id, updatedAt: Date.now() });
  },
});

export const revokePublication = internalMutation({
  args: { publicationId: v.id("publications") },
  handler: async (ctx, args) => {
    const publication = await ctx.db.get(args.publicationId);
    if (!publication) throw new Error("Publication unavailable");
    const asset = await ctx.db.get(publication.assetId);
    if (!asset) throw new Error("Asset unavailable");
    await ownedProject(ctx, asset.projectId);
    await ctx.db.patch(publication._id, { revokedAt: Date.now(), updatedAt: Date.now() });
  },
});

export const saveShowcase = internalMutation({
  args: { showcaseId: v.optional(v.id("showcases")), title: v.string(), publicationIds: v.array(v.id("publications")), allowedOrigins: v.array(v.string()) },
  handler: async (ctx, args) => {
    await owner(ctx);
    const title = args.title.trim().slice(0, 120);
    if (!title) throw new Error("Showcase title required");
    const allowedOrigins = normalizeOrigins(args.allowedOrigins);
    if (!allowedOrigins.length) throw new Error("At least one allowed site is required");
    const publicationIds = Array.from(new Set(args.publicationIds));
    for (const id of publicationIds) {
      const publication = await ctx.db.get(id);
      if (!publication || publication.revokedAt) throw new Error("Published video unavailable");
      if (allowedOrigins.some((origin) => !publication.allowedOrigins.includes(origin))) {
        throw new Error("Every showcase site must be allowed for every video");
      }
      const asset = await ctx.db.get(publication.assetId);
      if (!asset) throw new Error("Published video unavailable");
      await ownedProject(ctx, asset.projectId);
    }
    const now = Date.now();
    if (args.showcaseId) {
      const existing = await ctx.db.get(args.showcaseId);
      if (!existing || existing.revokedAt) throw new Error("Showcase unavailable");
      await ctx.db.patch(existing._id, { title, publicationIds, allowedOrigins, updatedAt: now });
      return { showcaseId: existing._id, slug: existing.slug };
    }
    const slug = randomSecret().slice(0, 32);
    const showcaseId = await ctx.db.insert("showcases", { title, slug, publicationIds, allowedOrigins, createdAt: now, updatedAt: now });
    return { showcaseId, slug };
  },
});

export const publicPublication = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const publication = await ctx.db.query("publications").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique();
    if (!publication || publication.revokedAt) return null;
    const asset = await ctx.db.get(publication.assetId);
    const version = await ctx.db.get(publication.versionId);
    const project = asset && await ctx.db.get(asset.projectId);
    if (!asset || !version || !project || project.archived || asset.status !== "approved" || version.processingState !== "ready") return null;
    return {
      id: publication._id, slug: publication.slug, title: asset.title, projectTitle: project.title,
      mimeType: version.mimeType, allowedOrigins: publication.allowedOrigins,
      hasPoster: Boolean(version.posterKey), updatedAt: publication.updatedAt,
    };
  },
});

export const publicShowcase = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const showcase = await ctx.db.query("showcases").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique();
    if (!showcase || showcase.revokedAt) return null;
    const items = await Promise.all(showcase.publicationIds.map(async (id) => {
      const publication = await ctx.db.get(id);
      if (!publication || publication.revokedAt) return null;
      const asset = await ctx.db.get(publication.assetId);
      const project = asset && await ctx.db.get(asset.projectId);
      const version = asset && await ctx.db.get(publication.versionId);
      if (!asset || !version || !project || project.archived || asset.status !== "approved" || version.processingState !== "ready") return null;
      return { slug: publication.slug, title: asset.title, projectTitle: project.title };
    }));
    return { title: showcase.title, slug: showcase.slug, allowedOrigins: showcase.allowedOrigins,
      items: items.filter((item) => item !== null) };
  },
});

export const publicationMedia = internalQuery({
  args: { slug: v.string(), poster: v.boolean() },
  handler: async (ctx, args) => {
    const publication = await ctx.db.query("publications").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique();
    if (!publication || publication.revokedAt) return null;
    const asset = await ctx.db.get(publication.assetId);
    const version = await ctx.db.get(publication.versionId);
    const project = asset && await ctx.db.get(asset.projectId);
    if (!asset || !version || !project || project.archived || asset.status !== "approved" || version.processingState !== "ready") return null;
    return { key: args.poster ? version.posterKey : version.originalKey, mimeType: args.poster ? "image/jpeg" : version.mimeType };
  },
});

export const reviewMedia = internalQuery({
  args: { token: v.string(), accessKey: v.optional(v.string()), assetId: v.id("videos"), poster: v.boolean(), checkedAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // Request time varies the query cache key so expiry is evaluated on each HTTP request.
    const { project } = await getReviewLink(ctx, args.token, args.accessKey);
    const asset = await ctx.db.get(args.assetId);
    if (!asset || asset.projectId !== project._id || asset.status === "archived" || asset.processingStatus !== "ready" || !asset.currentVersionId) return null;
    const version = await ctx.db.get(asset.currentVersionId);
    if (!version || version.processingState !== "ready") return null;
    return { key: args.poster ? version.posterKey : version.originalKey, mimeType: args.poster ? "image/jpeg" : version.mimeType };
  },
});

export const ownerMedia = internalQuery({
  args: { assetId: v.id("videos"), poster: v.boolean() },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) return null;
    await ownedProject(ctx, asset.projectId, true);
    if (asset.processingStatus !== "ready" || !asset.currentVersionId) return null;
    const version = await ctx.db.get(asset.currentVersionId);
    if (!version || version.processingState !== "ready") return null;
    return { key: args.poster ? version.posterKey : version.originalKey,
      mimeType: args.poster ? "image/jpeg" : version.mimeType };
  },
});
