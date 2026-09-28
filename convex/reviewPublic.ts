import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getReviewLink, getReviewerSession } from "./lib/reviewAccess";

const annotationToolValidator = v.optional(
  v.union(
    v.literal("pen"),
    v.literal("arrow"),
    v.literal("rect"),
    v.literal("circle"),
  ),
);

const annotationStrokeValidator = v.object({
  id: v.string(),
  color: v.string(),
  width: v.number(),
  tool: annotationToolValidator,
  points: v.array(
    v.object({
      x: v.number(),
      y: v.number(),
    }),
  ),
});

export const getProjectByToken = query({
  args: { token: v.string(), accessKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { link, project } = await getReviewLink(ctx, args.token, args.accessKey);
    return {
      project: { id: project._id, title: project.title, description: project.description },
      link: { canDownload: link.canDownload, appearance: link.appearance },
    };
  },
});

export const listVideosByToken = query({
  args: { token: v.string(), accessKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { link } = await getReviewLink(ctx, args.token, args.accessKey);
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", link.projectId))
      .collect();
    return videos
      .filter((video) => video.status !== "archived" && video.processingStatus === "ready")
      .sort((a, b) => a.order - b.order)
      .map((video) => ({
        id: video._id, title: video.title, assetCode: video.assetCode,
        assetClass: video.assetClass, mimeType: video.mimeType, sizeBytes: video.sizeBytes,
        status: video.status, viewed: video.viewed, rating: video.rating,
        isSelect: video.isSelect, commentCount: video.commentCount,
        durationSec: video.durationSec, width: video.width, height: video.height,
        order: video.order, downloadEnabled: link.canDownload && video.downloadEnabled,
        annotationStrokes: video.annotationStrokes,
      }));
  },
});

export const getReviewerName = query({
  args: { token: v.string(), accessKey: v.string() },
  handler: async (ctx, args) => {
    await getReviewLink(ctx, args.token, args.accessKey);
    return (await getReviewerSession(ctx, args.token, args.accessKey)).displayName;
  },
});

async function reviewerNameForToken(ctx: QueryCtx | MutationCtx, token: string, accessKey?: string) {
  return accessKey ? (await getReviewerSession(ctx, token, accessKey)).displayName : "Reviewer";
}

async function withReactionSummaries(ctx: QueryCtx, comments: Doc<"comments">[]) {
  return await Promise.all(
    comments.map(async (comment) => {
      const reactions = await ctx.db
        .query("commentReactions")
        .withIndex("by_comment", (q) => q.eq("commentId", comment._id))
        .collect();
      return {
        ...comment,
        reactions: {
          thumbs_up: reactions.filter((r) => r.emoji === "thumbs_up").length,
          thumbs_down: reactions.filter((r) => r.emoji === "thumbs_down").length,
          fire: reactions.filter((r) => r.emoji === "fire").length,
          heart: reactions.filter((r) => r.emoji === "heart").length,
        },
      };
    }),
  );
}

export const setReviewerName = mutation({
  args: { token: v.string(), accessKey: v.string(), displayName: v.string() },
  handler: async (ctx, args) => {
    await getReviewLink(ctx, args.token, args.accessKey);
    const session = await getReviewerSession(ctx, args.token, args.accessKey);
    const displayName = args.displayName.trim().slice(0, 100);
    if (!displayName) throw new Error("Reviewer name required");
    await ctx.db.patch(session._id, { displayName });
  },
});

export const clientMarkViewed = mutation({
  args: { token: v.string(), accessKey: v.optional(v.string()), videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const link = (await getReviewLink(ctx, args.token, args.accessKey)).link;
    const video = await ctx.db.get(args.videoId);
    if (!video || video.projectId !== link.projectId || video.status === "archived" || video.processingStatus !== "ready") {
      throw new Error("Video not found");
    }
    if (!video.viewed) {
      await ctx.db.patch(args.videoId, {
        viewed: true,
      });
    }
  },
});

export const clientSetRating = mutation({
  args: { token: v.string(), accessKey: v.optional(v.string()), videoId: v.id("videos"), rating: v.number() },
  handler: async (ctx, args) => {
    const link = (await getReviewLink(ctx, args.token, args.accessKey)).link;
    const video = await ctx.db.get(args.videoId);
    if (!video || video.projectId !== link.projectId || video.status === "archived" || video.processingStatus !== "ready") {
      throw new Error("Video not found");
    }
    const rating = Math.max(0, Math.min(5, Math.round(args.rating)));
    await ctx.db.patch(args.videoId, { rating, updatedAt: Date.now() });
  },
});

export const clientToggleSelect = mutation({
  args: { token: v.string(), accessKey: v.optional(v.string()), videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const link = (await getReviewLink(ctx, args.token, args.accessKey)).link;
    const video = await ctx.db.get(args.videoId);
    if (!video || video.projectId !== link.projectId || video.status === "archived" || video.processingStatus !== "ready") {
      throw new Error("Video not found");
    }
    await ctx.db.patch(args.videoId, {
      isSelect: !video.isSelect,
      updatedAt: Date.now(),
    });
  },
});

export const clientSaveAnnotations = mutation({
  args: {
    token: v.string(), accessKey: v.optional(v.string()),
    videoId: v.id("videos"),
    strokes: v.array(annotationStrokeValidator),
  },
  handler: async (ctx, args) => {
    const link = (await getReviewLink(ctx, args.token, args.accessKey)).link;
    const video = await ctx.db.get(args.videoId);
    if (!video || video.projectId !== link.projectId || video.status === "archived" || video.processingStatus !== "ready") {
      throw new Error("Video not found");
    }
    const strokes = normalizeStrokes(args.strokes);
    await ctx.db.patch(args.videoId, {
      annotationStrokes: strokes,
      annotatedAt: strokes.length ? Date.now() : undefined,
      updatedAt: Date.now(),
    });
  },
});

const clientStatusValidator = v.union(
  v.literal("awaiting_review"),
  v.literal("in_progress"),
  v.literal("needs_changes"),
  v.literal("approved"),
);

export const clientSetStatus = mutation({
  args: {
    token: v.string(), accessKey: v.optional(v.string()),
    videoId: v.id("videos"),
    status: clientStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = (await getReviewLink(ctx, args.token, args.accessKey)).link;
    const video = await ctx.db.get(args.videoId);
    if (!video || video.projectId !== link.projectId || video.status === "archived" || video.processingStatus !== "ready") {
      throw new Error("Video not found");
    }
    const now = Date.now();
    await ctx.db.patch(args.videoId, {
      status: args.status,
      approvedAt: args.status === "approved" ? now : video.approvedAt,
      updatedAt: now,
    });
    return null;
  },
});

export const clientApprove = mutation({
  args: { token: v.string(), accessKey: v.optional(v.string()), videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const link = (await getReviewLink(ctx, args.token, args.accessKey)).link;
    const video = await ctx.db.get(args.videoId);
    if (!video || video.projectId !== link.projectId || video.status === "archived" || video.processingStatus !== "ready") {
      throw new Error("Video not found");
    }
    const now = Date.now();
    await ctx.db.patch(args.videoId, {
      status: "approved",
      approvedAt: now,
      updatedAt: now,
    });
  },
});

const ANNOTATION_TOOLS = new Set(["pen", "arrow", "rect", "circle"]);

function normalizeStrokes(strokes: Array<{
  id: string;
  color: string;
  width: number;
  tool?: string;
  points: Array<{ x: number; y: number }>;
}>) {
  return strokes
    .slice(0, 120)
    .map((stroke) => {
      const tool =
        stroke.tool && ANNOTATION_TOOLS.has(stroke.tool) ? stroke.tool : "pen";
      const points = stroke.points
        .slice(0, 1500)
        .map((point) => ({
          x: Math.max(0, Math.min(1, point.x)),
          y: Math.max(0, Math.min(1, point.y)),
        }))
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
      return {
        id: stroke.id.slice(0, 80),
        color: /^#[0-9a-fA-F]{6}$/.test(stroke.color) ? stroke.color : "#ef4444",
        width: Math.max(2, Math.min(18, Math.round(stroke.width))),
        tool: tool as "pen" | "arrow" | "rect" | "circle",
        points,
      };
    })
    .filter((stroke) => stroke.points.length > 1);
}

export const clientRequestChanges = mutation({
  args: { token: v.string(), accessKey: v.optional(v.string()), videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const link = (await getReviewLink(ctx, args.token, args.accessKey)).link;
    const video = await ctx.db.get(args.videoId);
    if (!video || video.projectId !== link.projectId || video.status === "archived" || video.processingStatus !== "ready") {
      throw new Error("Video not found");
    }
    await ctx.db.patch(args.videoId, {
      status: "needs_changes",
      updatedAt: Date.now(),
    });
  },
});

export const listCommentsByVideo = query({
  args: { token: v.string(), accessKey: v.optional(v.string()), videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const link = (await getReviewLink(ctx, args.token, args.accessKey)).link;
    const video = await ctx.db.get(args.videoId);
    if (!video || video.projectId !== link.projectId || video.status === "archived" || video.processingStatus !== "ready") {
      throw new Error("Video not found");
    }
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();
    return await withReactionSummaries(
      ctx,
      comments.sort((a, b) => b.createdAt - a.createdAt),
    );
  },
});

export const clientAddComment = mutation({
  args: {
    token: v.string(), accessKey: v.optional(v.string()),
    videoId: v.id("videos"),
    body: v.string(),
    timecodeSec: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const link = (await getReviewLink(ctx, args.token, args.accessKey)).link;
    const video = await ctx.db.get(args.videoId);
    if (!video || video.projectId !== link.projectId || video.status === "archived" || video.processingStatus !== "ready") {
      throw new Error("Video not found");
    }
    const authorName = await reviewerNameForToken(ctx, args.token, args.accessKey);
    await ctx.db.insert("comments", {
      videoId: args.videoId,
      projectId: video.projectId,
      authorName,
      authorRole: "client",
      body: args.body,
      timecodeSec: args.timecodeSec,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.videoId, {
      commentCount: video.commentCount + 1,
      feedbackNeedsAttention: true,
      feedbackAcknowledgedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});
