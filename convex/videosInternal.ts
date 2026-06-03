import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const setProcessingCompleteInternal = internalMutation({
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
