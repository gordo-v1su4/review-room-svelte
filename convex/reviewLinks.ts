import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getProjectForAdmin, getProjectForOwner } from "./lib/access";

const reviewAppearanceValidator = v.object({
  gridSize: v.union(v.literal("sm"), v.literal("md"), v.literal("lg")),
  aspectRatio: v.union(
    v.literal("video"),
    v.literal("square"),
    v.literal("portrait"),
  ),
  thumbnailScale: v.union(v.literal("fit"), v.literal("fill")),
  showCardInfo: v.boolean(),
});

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPasscode(passcode: string) {
  const data = new TextEncoder().encode(passcode);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await getProjectForOwner(ctx, args.projectId);
    return await ctx.db
      .query("reviewLinks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    passcode: v.optional(v.string()),
    canDownload: v.boolean(),
    appearance: v.optional(reviewAppearanceValidator),
  },
  handler: async (ctx, args) => {
    await getProjectForAdmin(ctx, args.projectId);
    const token = randomToken();
    const passcodeHash = args.passcode
      ? await hashPasscode(args.passcode)
      : undefined;
    const linkId = await ctx.db.insert("reviewLinks", {
      projectId: args.projectId,
      token,
      passcodeHash,
      canDownload: args.canDownload,
      appearance: args.appearance,
      createdAt: Date.now(),
    });
    return { linkId, token, url: `/review/${token}` };
  },
});

export const verifyPasscode = mutation({
  args: { token: v.string(), passcode: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("reviewLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!link?.passcodeHash) return { ok: true };
    const hash = await hashPasscode(args.passcode);
    return { ok: hash === link.passcodeHash };
  },
});
