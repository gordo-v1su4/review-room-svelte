import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  getProjectForAdmin,
  getProjectForEditor,
  getProjectForOwner,
} from "./lib/access";

const statusValidator = v.union(
  v.literal("not_started"),
  v.literal("in_progress"),
  v.literal("awaiting_review"),
  v.literal("needs_changes"),
  v.literal("approved"),
  v.literal("final"),
  v.literal("omitted"),
  v.literal("archived"),
);

const assetClassValidator = v.union(
  v.literal("VID"),
  v.literal("IMG"),
  v.literal("CTX"),
  v.literal("STB"),
);

const annotationStrokeValidator = v.object({
  id: v.string(),
  color: v.string(),
  width: v.number(),
  points: v.array(
    v.object({
      x: v.number(),
      y: v.number(),
    }),
  ),
});

function normalizeDateKey(value: string) {
  if (!/^\d{8}$/.test(value)) throw new Error("Upload date must be YYYYMMDD");
  return value;
}

function originalExtension(filename: string) {
  const match = filename.match(/\.([a-zA-Z0-9]{1,12})$/);
  return match ? `.${match[1].toLowerCase()}` : "";
}

async function getOrCreateDateFolder(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  adminId: Id<"appUsers">,
  dateKey: string,
) {
  const folders = await ctx.db
    .query("projectFolders")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();
  const existing = folders.find((folder) => folder.title === dateKey);
  if (existing) return existing._id;

  const maxOrder = folders.reduce(
    (max, folder) => Math.max(max, folder.order),
    0,
  );
  const now = Date.now();
  return await ctx.db.insert("projectFolders", {
    projectId,
    title: dateKey,
    order: maxOrder + 1,
    createdBy: adminId,
    createdAt: now,
    updatedAt: now,
  });
}

async function nextAssetNumber(
  ctx: MutationCtx,
  project: { _id: Id<"projects">; nextAssetNumber?: number },
) {
  if (typeof project.nextAssetNumber === "number" && project.nextAssetNumber > 0) {
    return project.nextAssetNumber;
  }
  const siblings = await ctx.db
    .query("videos")
    .withIndex("by_project", (q) => q.eq("projectId", project._id))
    .collect();
  const maxExisting = siblings.reduce(
    (max, video) => Math.max(max, video.assetNumber ?? video.order ?? 0),
    0,
  );
  return maxExisting + 1;
}

export const reserveAssetUpload = mutation({
  args: {
    projectId: v.id("projects"),
    folderId: v.optional(v.id("projectFolders")),
    originalFilename: v.string(),
    mimeType: v.string(),
    assetClass: assetClassValidator,
    uploadDateKey: v.string(),
  },
  handler: async (ctx, args) => {
    const { admin, project } = await getProjectForAdmin(ctx, args.projectId);
    const dateKey = normalizeDateKey(args.uploadDateKey);
    const number = await nextAssetNumber(ctx, project);
    const assetCode = `${args.assetClass}_${dateKey}_${String(number).padStart(5, "0")}`;
    let folderId = args.folderId;
    if (folderId) {
      const folder = await ctx.db.get(folderId);
      if (!folder || folder.projectId !== project._id) {
        throw new Error("Folder not found");
      }
    } else {
      folderId = await getOrCreateDateFolder(
        ctx,
        project._id,
        admin._id,
        dateKey,
      );
    }
    await ctx.db.patch(project._id, {
      nextAssetNumber: number + 1,
      updatedAt: Date.now(),
    });
    return {
      folderId,
      assetClass: args.assetClass,
      assetNumber: number,
      assetCode,
      uploadFilename: `${assetCode}${originalExtension(args.originalFilename)}`,
    };
  },
});

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

export const getUploader = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");
    await getProjectForAdmin(ctx, video.projectId);
    const uploader = await ctx.db.get(video.uploadedBy);

    return {
      name: uploader?.name ?? "Unknown uploader",
      role: uploader?.role ?? "admin",
      uploadedAt: video.uploadedAt,
    };
  },
});

export const createFromUpload = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    originalFilename: v.string(),
    storageKey: v.string(),
    mimeType: v.string(),
    folderId: v.optional(v.id("projectFolders")),
    assetClass: assetClassValidator,
    assetNumber: v.number(),
    assetCode: v.string(),
    sizeBytes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { admin, project } = await getProjectForAdmin(ctx, args.projectId);
    const now = Date.now();
    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder || folder.projectId !== project._id) {
        throw new Error("Folder not found");
      }
    }
    const siblings = await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();
    const maxOrder = siblings.reduce((m, v) => Math.max(m, v.order), 0);
    const videoId = await ctx.db.insert("videos", {
      projectId: project._id,
      folderId: args.folderId,
      assetClass: args.assetClass,
      assetNumber: args.assetNumber,
      assetCode: args.assetCode,
      title: args.assetCode,
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
      markedForDeletion: false,
      feedbackNeedsAttention: false,
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
    tags: v.optional(v.array(v.string())),
    status: v.optional(statusValidator),
    downloadEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");
    await getProjectForEditor(ctx, video.projectId);
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
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
    await getProjectForAdmin(ctx, video.projectId);
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
    await getProjectForAdmin(ctx, video.projectId);
    await ctx.db.patch(args.videoId, { rating, updatedAt: Date.now() });
  },
});

export const toggleSelect = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");
    await getProjectForAdmin(ctx, video.projectId);
    await ctx.db.patch(args.videoId, {
      isSelect: !video.isSelect,
      updatedAt: Date.now(),
    });
  },
});

export const saveAnnotations = mutation({
  args: {
    videoId: v.id("videos"),
    strokes: v.array(annotationStrokeValidator),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");
    await getProjectForAdmin(ctx, video.projectId);
    const strokes = normalizeStrokes(args.strokes);
    await ctx.db.patch(args.videoId, {
      annotationStrokes: strokes,
      annotatedAt: strokes.length ? Date.now() : undefined,
      updatedAt: Date.now(),
    });
  },
});

export const approve = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");
    await getProjectForEditor(ctx, video.projectId);
    const now = Date.now();
    await ctx.db.patch(args.videoId, {
      status: "approved",
      approvedAt: now,
      updatedAt: now,
    });
  },
});

function normalizeStrokes(strokes: Array<{
  id: string;
  color: string;
  width: number;
  points: Array<{ x: number; y: number }>;
}>) {
  return strokes
    .slice(0, 120)
    .map((stroke) => ({
      id: stroke.id.slice(0, 80),
      color: /^#[0-9a-fA-F]{6}$/.test(stroke.color) ? stroke.color : "#ef4444",
      width: Math.max(2, Math.min(18, Math.round(stroke.width))),
      points: stroke.points
        .slice(0, 1500)
        .map((point) => ({
          x: Math.max(0, Math.min(1, point.x)),
          y: Math.max(0, Math.min(1, point.y)),
        }))
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y)),
    }))
    .filter((stroke) => stroke.points.length > 1);
}

export const requestChanges = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");
    await getProjectForEditor(ctx, video.projectId);
    await ctx.db.patch(args.videoId, {
      status: "needs_changes",
      updatedAt: Date.now(),
    });
  },
});

export const acknowledgeFeedback = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");
    const { admin } = await getProjectForAdmin(ctx, video.projectId);
    const now = Date.now();
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();
    for (const comment of comments) {
      if (!comment.completedAt) {
        await ctx.db.patch(comment._id, {
          completedAt: now,
          completedBy: admin._id,
        });
      }
    }
    await ctx.db.patch(args.videoId, {
      feedbackNeedsAttention: false,
      feedbackAcknowledgedAt: now,
      updatedAt: now,
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
    await getProjectForEditor(ctx, video.projectId);
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.status) {
      patch.status = args.status;
      if (args.status === "approved") patch.approvedAt = Date.now();
    }
    if (args.isSelect !== undefined) patch.isSelect = args.isSelect;
    await ctx.db.patch(args.videoId, patch);
  },
});

export const moveToFolder = mutation({
  args: {
    videoId: v.id("videos"),
    folderId: v.optional(v.id("projectFolders")),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");
    const { admin } = await getProjectForEditor(ctx, video.projectId);
    if (admin.role !== "admin") throw new Error("Admin required");

    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder || folder.projectId !== video.projectId) {
        throw new Error("Folder not found");
      }
    }

    await ctx.db.patch(args.videoId, {
      folderId: args.folderId,
      updatedAt: Date.now(),
    });
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
    fps: v.optional(v.number()),
    error: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");
    await getProjectForAdmin(ctx, video.projectId);
    await ctx.db.patch(args.videoId, {
      thumbnailKey: args.thumbnailKey,
      spriteKey: args.spriteKey,
      durationSec: args.durationSec,
      width: args.width,
      height: args.height,
      fps: args.fps,
      processingStatus: args.error ? "error" : "ready",
      updatedAt: Date.now(),
    });
  },
});

export const setMarkedForDeletion = mutation({
  args: { videoId: v.id("videos"), marked: v.boolean() },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");
    await getProjectForEditor(ctx, video.projectId);
    await ctx.db.patch(args.videoId, {
      markedForDeletion: args.marked,
      updatedAt: Date.now(),
    });
  },
});

export const startPreviewRefresh = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");
    await getProjectForEditor(ctx, video.projectId);
    await ctx.db.patch(args.videoId, {
      thumbnailKey: undefined,
      spriteKey: undefined,
      processingStatus: "processing",
      updatedAt: Date.now(),
    });
    return {
      storageKey: video.storageKey,
      previousThumbnailKey: video.thumbnailKey,
      previousSpriteKey: video.spriteKey,
    };
  },
});

export const markProcessingFailed = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) return;
    await getProjectForAdmin(ctx, video.projectId);
    await ctx.db.patch(args.videoId, {
      processingStatus: "error",
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) return;
    await getProjectForOwner(ctx, video.projectId);
    await ctx.db.patch(args.videoId, {
      status: "archived",
      updatedAt: Date.now(),
    });
  },
});

export const archiveByProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await getProjectForOwner(ctx, args.projectId);
    const now = Date.now();
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    const active = videos.filter((video) => video.status !== "archived");
    for (const video of active) {
      await ctx.db.patch(video._id, {
        status: "archived",
        updatedAt: now,
      });
    }
    await ctx.db.patch(args.projectId, { updatedAt: now });
    return { archived: active.length };
  },
});
