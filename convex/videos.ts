import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getProjectForAdmin, requireAdmin } from "./lib/access";

const statusValidator = v.union(
  v.literal("awaiting_review"),
  v.literal("needs_changes"),
  v.literal("approved"),
  v.literal("final"),
  v.literal("archived"),
);

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await getProjectForAdmin(ctx, args.projectId);
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    return videos
      .filter((v) => v.status !== "archived")
      .sort((a, b) => a.order - b.order || b.uploadedAt - a.uploadedAt);
  },
});

export const getById = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");
    await getProjectForAdmin(ctx, video.projectId);
    return video;
  },
});

export const createFromUpload = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    originalFilename: v.string(),
    storageKey: v.string(),
    mimeType: v.string(),
    sizeBytes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { admin, project } = await getProjectForAdmin(ctx, args.projectId);
    const now = Date.now();
    const siblings = await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();
    const maxOrder = siblings.reduce((m, v) => Math.max(m, v.order), 0);
    const videoId = await ctx.db.insert("videos", {
      projectId: project._id,
      title: args.title,
      originalFilename: args.originalFilename,
      storageKey: args.storageKey,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      status: "awaiting_review",
      viewed: false,
      rating: 0,
      isSelect: false,
      commentCount: 0,
      tags: [],
      downloadEnabled: project.downloadEnabledByDefault,
      order: maxOrder + 1,
      uploadedBy: admin._id,
      uploadedAt: now,
      updatedAt: now,
      processingStatus: "processing",
    });
    await ctx.db.patch(project._id, { updatedAt: now });
    return videoId;
  },
});

export const updateMetadata = mutation({
  args: {
    videoId: v.id("videos"),
    title: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    status: v.optional(statusValidator),
    downloadEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");
    await getProjectForAdmin(ctx, video.projectId);
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) patch.title = args.title;
    if (args.tags !== undefined) patch.tags = args.tags;
    if (args.status !== undefined) {
      patch.status = args.status;
      if (args.status === "approved") patch.approvedAt = Date.now();
    }
    if (args.downloadEnabled !== undefined)
      patch.downloadEnabled = args.downloadEnabled;
    await ctx.db.patch(args.videoId, patch);
  },
});

export const markViewed = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video || video.viewed) return;
    await ctx.db.patch(args.videoId, {
      viewed: true,
      updatedAt: Date.now(),
    });
  },
});

export const setRating = mutation({
  args: { videoId: v.id("videos"), rating: v.number() },
  handler: async (ctx, args) => {
    const rating = Math.max(0, Math.min(5, Math.round(args.rating)));
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");
    await ctx.db.patch(args.videoId, { rating, updatedAt: Date.now() });
  },
});

export const toggleSelect = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");
    await ctx.db.patch(args.videoId, {
      isSelect: !video.isSelect,
      updatedAt: Date.now(),
    });
  },
});

export const approve = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.videoId, {
      status: "approved",
      approvedAt: now,
      updatedAt: now,
    });
  },
});

export const requestChanges = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      status: "needs_changes",
      updatedAt: Date.now(),
    });
  },
});

export const applySmartViewDrop = mutation({
  args: {
    videoId: v.id("videos"),
    status: v.optional(statusValidator),
    isSelect: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");
    await getProjectForAdmin(ctx, video.projectId);
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.status) {
      patch.status = args.status;
      if (args.status === "approved") patch.approvedAt = Date.now();
    }
    if (args.isSelect !== undefined) patch.isSelect = args.isSelect;
    await ctx.db.patch(args.videoId, patch);
  },
});

export const setProcessingComplete = mutation({
  args: {
    videoId: v.id("videos"),
    thumbnailKey: v.optional(v.string()),
    spriteKey: v.optional(v.string()),
    durationSec: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    error: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      thumbnailKey: args.thumbnailKey,
      spriteKey: args.spriteKey,
      durationSec: args.durationSec,
      width: args.width,
      height: args.height,
      processingStatus: args.error ? "error" : "ready",
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) return;
    await getProjectForAdmin(ctx, video.projectId);
    await ctx.db.patch(args.videoId, {
      status: "archived",
      updatedAt: Date.now(),
    });
  },
});
