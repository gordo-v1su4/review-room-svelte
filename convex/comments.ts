import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getProjectForAdmin } from "./lib/access";

const reactionEmojiValidator = v.union(
  v.literal("thumbs_up"),
  v.literal("thumbs_down"),
  v.literal("fire"),
  v.literal("heart"),
);

async function withReactionSummaries(
  ctx: QueryCtx,
  comments: Doc<"comments">[],
) {
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

async function displayNameForAdmin(
  ctx: QueryCtx | MutationCtx,
  admin: Doc<"appUsers">,
) {
  const authUser = await ctx.db.get(admin.authUserId);
  if (admin.name && admin.name.toLowerCase() !== "admin") return admin.name;
  return authUser?.name ?? authUser?.email?.split("@")[0] ?? admin.name ?? "User";
}

async function updateVideoCompletionState(
  ctx: MutationCtx,
  videoId: Doc<"comments">["videoId"],
) {
  const video = await ctx.db.get(videoId);
  if (!video) return;
  const comments = await ctx.db
    .query("comments")
    .withIndex("by_video", (q) => q.eq("videoId", videoId))
    .collect();
  const hasOpenComments = comments.some((comment) => !comment.completedAt);
  await ctx.db.patch(videoId, {
    feedbackNeedsAttention: hasOpenComments,
    feedbackAcknowledgedAt: hasOpenComments ? undefined : Date.now(),
    updatedAt: Date.now(),
  });
}

export const listByVideo = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) return [];
    await getProjectForAdmin(ctx, video.projectId);
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();
    return await withReactionSummaries(
      ctx,
      comments
        .map((comment) => ({
          ...comment,
          completedAt: comment.completedAt ?? video.feedbackAcknowledgedAt,
        }))
        .sort((a, b) => b.createdAt - a.createdAt),
    );
  },
});

export const latestByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await getProjectForAdmin(ctx, args.projectId);
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    const latest = new Map<
      string,
      {
        videoId: Doc<"comments">["videoId"];
        commentId: Doc<"comments">["_id"];
        authorName: string;
        authorRole: "admin" | "client";
        body: string;
        timecodeSec?: number;
        createdAt: number;
      }
    >();

    for (const comment of comments) {
      const key = comment.videoId;
      const current = latest.get(key);
      if (current && current.createdAt >= comment.createdAt) continue;
      latest.set(key, {
        videoId: comment.videoId,
        commentId: comment._id,
        authorName: comment.authorName,
        authorRole: comment.authorRole,
        body: comment.body,
        timecodeSec: comment.timecodeSec,
        createdAt: comment.createdAt,
      });
    }

    return Array.from(latest.values());
  },
});

export const add = mutation({
  args: {
    videoId: v.id("videos"),
    body: v.string(),
    timecodeSec: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");
    const { admin } = await getProjectForAdmin(ctx, video.projectId);
    const authorName = await displayNameForAdmin(ctx, admin);
    await ctx.db.insert("comments", {
      videoId: args.videoId,
      projectId: video.projectId,
      authorName,
      authorRole: admin.role === "admin" ? "admin" : "client",
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

export const toggleReaction = mutation({
  args: {
    commentId: v.id("comments"),
    emoji: reactionEmojiValidator,
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    const { admin } = await getProjectForAdmin(ctx, comment.projectId);
    const existing = await ctx.db
      .query("commentReactions")
      .withIndex("by_comment_user_emoji", (q) =>
        q
          .eq("commentId", args.commentId)
          .eq("appUserId", admin._id)
          .eq("emoji", args.emoji),
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return;
    }
    await ctx.db.insert("commentReactions", {
      commentId: args.commentId,
      videoId: comment.videoId,
      projectId: comment.projectId,
      appUserId: admin._id,
      emoji: args.emoji,
      createdAt: Date.now(),
    });
  },
});

export const toggleComplete = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    const { admin } = await getProjectForAdmin(ctx, comment.projectId);
    await ctx.db.patch(comment._id, {
      completedAt: comment.completedAt ? undefined : Date.now(),
      completedBy: comment.completedAt ? undefined : admin._id,
    });
    await updateVideoCompletionState(ctx, comment.videoId);
  },
});
