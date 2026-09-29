import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getReviewLink, passcodeDigest, randomSecret } from "./lib/reviewAccess";
import { reserveAssetNumber } from './lib/assetNumber';

const OWNER_EMAIL = "owner@review-room.invalid";
type Ctx = QueryCtx | MutationCtx;

async function owner(ctx: Ctx) {
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
    return { projects, assets, versions, mediaJobs, comments, publications, showcases, links, projectIds: Array.from(projectIds) };
  },
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
    const title = args.title.trim().slice(0, 120);
    if (!title) throw new Error("Project title required");
    const now = Date.now();
    return await ctx.db.insert("projects", {
      title, slug: `personal-${randomSecret().slice(0, 16)}`, description: args.description?.trim().slice(0, 2000),
      downloadEnabledByDefault: false, visibility: "private", nextAssetNumber: 1,
      createdBy: profile._id, createdAt: now, updatedAt: now,
    });
  },
});

export const updateProject = internalMutation({
  args: { projectId: v.id("projects"), title: v.optional(v.string()), description: v.optional(v.string()),
    clientName: v.optional(v.string()), brandColor: v.optional(v.string()), archived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await ownedProject(ctx, args.projectId, true);
    const title = args.title?.trim().slice(0, 120);
    if (args.title !== undefined && !title) throw new Error("Project title required");
    if (args.brandColor !== undefined && !/^#[0-9a-f]{6}$/i.test(args.brandColor)) throw new Error('Invalid brand color');
    await ctx.db.patch(args.projectId, {
      ...(title !== undefined ? { title } : {}),
      ...(args.description !== undefined ? { description: args.description.trim().slice(0, 2000) } : {}),
      ...(args.clientName !== undefined ? { clientName: args.clientName.trim().slice(0, 100) } : {}),
      ...(args.brandColor !== undefined ? { brandColor: args.brandColor.toLowerCase() } : {}),
      ...(args.archived !== undefined ? { archived: args.archived } : {}),
      updatedAt: Date.now(),
    });
  },
});

export const beginUpload = internalMutation({
  args: { projectId: v.id("projects"), assetId: v.optional(v.id("videos")), originalFilename: v.string(), mimeType: v.string(), sizeBytes: v.number() },
  handler: async (ctx, args) => {
    const { project } = await ownedProject(ctx, args.projectId);
    if (!args.mimeType.startsWith("video/") || !Number.isSafeInteger(args.sizeBytes) || args.sizeBytes < 1 || args.sizeBytes > 90 * 1024 ** 2) {
      throw new Error("Unsupported upload");
    }
    if (args.assetId) {
      const asset = await ctx.db.get(args.assetId);
      if (!asset || asset.projectId !== project._id || asset.status !== "approved") throw new Error("Approved asset unavailable");
    }
    const extension = args.originalFilename.match(/\.([a-zA-Z0-9]{1,8})$/)?.[1]?.toLowerCase() ?? "mp4";
    const objectKey = `assets/${project._id}/${randomSecret()}/original.${extension}`;
    const now = Date.now();
    const sessionId = await ctx.db.insert("uploadSessions", {
      projectId: project._id, assetId: args.assetId, objectKey,
      originalFilename: args.originalFilename.slice(0, 240), mimeType: args.mimeType,
      sizeBytes: args.sizeBytes, status: "pending", expiresAt: now + 60 * 60_000, createdAt: now,
    });
    return { sessionId, objectKey, expiresAt: now + 60 * 60_000 };
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
    if (session.status !== 'pending' || session.expiresAt <= Date.now()) throw new Error('Upload session unavailable');
    await ctx.db.patch(session._id, { status: 'finalizing' });
    return session;
  },
});

export const failUpload = internalMutation({
  args: { sessionId: v.id('uploadSessions') },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;
    await ownedProject(ctx, session.projectId, true);
    if (session.status === 'finalizing') await ctx.db.patch(session._id, { status: 'failed' });
  },
});

export const finalizeUpload = internalMutation({
  args: { sessionId: v.id("uploadSessions"), verifiedSizeBytes: v.number(), etag: v.optional(v.string()), posterKey: v.string(), durationSec: v.number(), width: v.number(), height: v.number(), processWithTrigger: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Upload session unavailable");
    const { profile, project } = await ownedProject(ctx, session.projectId);
    if (session.status === "complete" && session.completedAssetId) {
      return args.processWithTrigger
        ? { assetId: session.completedAssetId, jobId: session.completedJobId }
        : session.completedAssetId;
    }
    if (session.status !== "finalizing" || session.expiresAt <= Date.now() || session.sizeBytes !== args.verifiedSizeBytes) {
      throw new Error("Upload verification failed");
    }
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
      if (!existing || existing.projectId !== project._id || existing.status !== "approved") throw new Error("Approved asset unavailable");
      const versions = await ctx.db.query("assetVersions").withIndex("by_asset", (q) => q.eq("assetId", assetId!)).collect();
      version = Math.max(0, ...versions.map((item) => item.version)) + 1;
    } else {
      const number = await reserveAssetNumber(ctx, project.createdBy);
      const assetCode = `VID_${new Date(now).toISOString().slice(0, 10).replaceAll("-", "")}_${String(number).padStart(5, "0")}`;
      assetId = await ctx.db.insert("videos", {
        projectId: project._id, assetClass: "VID", assetNumber: number,
        assetCode,
        title: assetCode, originalFilename: session.originalFilename,
        storageKey: session.objectKey, mimeType: session.mimeType, sizeBytes: session.sizeBytes,
        status: "awaiting_review", viewed: false, rating: 0, isSelect: false, commentCount: 0,
        tags: [], downloadEnabled: false, order: number, uploadedBy: profile._id,
        uploadedAt: now, updatedAt: now, processingStatus: args.processWithTrigger ? "processing" : "ready",
      });
      await ctx.db.patch(project._id, { nextAssetNumber: number + 1, updatedAt: now });
    }
    const versionId = await ctx.db.insert("assetVersions", {
      assetId, version, originalKey: session.objectKey, posterKey: args.posterKey,
      mimeType: session.mimeType, sizeBytes: session.sizeBytes, etag: args.etag,
      processingState: args.processWithTrigger ? "processing" : "ready", createdAt: now,
    });
    await ctx.db.patch(assetId, {
      currentVersionId: versionId, storageKey: session.objectKey, thumbnailKey: args.posterKey,
      originalFilename: session.originalFilename, mimeType: session.mimeType,
        sizeBytes: session.sizeBytes, processingStatus: args.processWithTrigger ? "processing" : "ready", updatedAt: now,
      durationSec: args.durationSec, width: args.width, height: args.height,
    });
    const jobId = args.processWithTrigger ? await ctx.db.insert('mediaJobs', {
      assetId, versionId, status: 'queued', stage: 'verify', attempt: 1,
      createdAt: now, updatedAt: now,
    }) : undefined;
    await ctx.db.patch(session._id, { status: "complete", completedAssetId: assetId, completedJobId: jobId });
    return args.processWithTrigger ? { assetId, jobId } : assetId;
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
  args: { token: v.string(), accessKey: v.optional(v.string()), assetId: v.id("videos"), poster: v.boolean() },
  handler: async (ctx, args) => {
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
