import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

async function getLink(ctx: QueryCtx, token: string) {
  const link = await ctx.db
    .query("reviewLinks")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!link) throw new Error("Invalid review link");
  if (link.expiresAt && link.expiresAt < Date.now()) {
    throw new Error("Review link expired");
  }
  return link;
}

export const getProjectByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const link = await getLink(ctx, args.token);
    const project = await ctx.db.get(link.projectId);
    if (!project || project.archived) throw new Error("Project not found");
    return { project, link };
  },
});

export const listVideosByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const link = await getLink(ctx, args.token);
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", link.projectId))
      .collect();
    return videos
      .filter((v) => v.status !== "archived")
      .sort((a, b) => a.order - b.order);
  },
});

export const getReviewerName = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("reviewerSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    return session?.displayName ?? null;
  },
});

async function reviewerNameForToken(ctx: QueryCtx | MutationCtx, token: string) {
  const session = await ctx.db
    .query("reviewerSessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  return session?.displayName ?? "Reviewer";
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
  args: { token: v.string(), displayName: v.string() },
  handler: async (ctx, args) => {
    await getLink(ctx, args.token);
    const existing = await ctx.db
      .query("reviewerSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { displayName: args.displayName });
      return;
    }
    await ctx.db.insert("reviewerSessions", {
      token: args.token,
      displayName: args.displayName,
      createdAt: Date.now(),
    });
  },
});

export const clientMarkViewed = mutation({
  args: { token: v.string(), videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const link = await getLink(ctx, args.token);
    const video = await ctx.db.get(args.videoId);
    if (!video || video.projectId !== link.projectId) {
      throw new Error("Video not found");
    }
    if (!video.viewed) {
      await ctx.db.patch(args.videoId, {
        viewed: true,
        updatedAt: Date.now(),
      });
    }
  },
});

export const clientSetRating = mutation({
  args: { token: v.string(), videoId: v.id("videos"), rating: v.number() },
  handler: async (ctx, args) => {
    const link = await getLink(ctx, args.token);
    const video = await ctx.db.get(args.videoId);
    if (!video || video.projectId !== link.projectId) {
      throw new Error("Video not found");
    }
    const rating = Math.max(0, Math.min(5, Math.round(args.rating)));
    await ctx.db.patch(args.videoId, { rating, updatedAt: Date.now() });
  },
});

export const clientToggleSelect = mutation({
  args: { token: v.string(), videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const link = await getLink(ctx, args.token);
    const video = await ctx.db.get(args.videoId);
    if (!video || video.projectId !== link.projectId) {
      throw new Error("Video not found");
    }
    await ctx.db.patch(args.videoId, {
      isSelect: !video.isSelect,
      updatedAt: Date.now(),
    });
  },
});

export const clientApprove = mutation({
  args: { token: v.string(), videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const link = await getLink(ctx, args.token);
    const video = await ctx.db.get(args.videoId);
    if (!video || video.projectId !== link.projectId) {
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

export const clientRequestChanges = mutation({
  args: { token: v.string(), videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const link = await getLink(ctx, args.token);
    const video = await ctx.db.get(args.videoId);
    if (!video || video.projectId !== link.projectId) {
      throw new Error("Video not found");
    }
    await ctx.db.patch(args.videoId, {
      status: "needs_changes",
      updatedAt: Date.now(),
    });
  },
});

export const listCommentsByVideo = query({
  args: { token: v.string(), videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const link = await getLink(ctx, args.token);
    const video = await ctx.db.get(args.videoId);
    if (!video || video.projectId !== link.projectId) {
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
    token: v.string(),
    videoId: v.id("videos"),
    body: v.string(),
    timecodeSec: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const link = await getLink(ctx, args.token);
    const video = await ctx.db.get(args.videoId);
    if (!video || video.projectId !== link.projectId) {
      throw new Error("Video not found");
    }
    const authorName = await reviewerNameForToken(ctx, args.token);
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
