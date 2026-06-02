import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getProjectForAdmin } from "./lib/access";

export const listByVideo = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) return [];
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();
    return comments.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const add = mutation({
  args: {
    videoId: v.id("videos"),
    authorName: v.string(),
    authorRole: v.union(v.literal("admin"), v.literal("client")),
    body: v.string(),
    timecodeSec: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");
    if (args.authorRole === "admin") {
      await getProjectForAdmin(ctx, video.projectId);
    }
    await ctx.db.insert("comments", {
      videoId: args.videoId,
      projectId: video.projectId,
      authorName: args.authorName,
      authorRole: args.authorRole,
      body: args.body,
      timecodeSec: args.timecodeSec,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.videoId, {
      commentCount: video.commentCount + 1,
      updatedAt: Date.now(),
    });
  },
});
