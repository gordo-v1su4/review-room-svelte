import { v } from "convex/values";
import { action, internalQuery, mutation, query } from "./_generated/server";
import { internal } from './_generated/api';
import type { ApiFromModules, FunctionReturnType } from 'convex/server';
import { getProjectForOwner } from "./lib/access";
import { digest, passcodeDigest, randomSecret } from "./lib/reviewAccess";

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

function matches(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return difference === 0;
}

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await getProjectForOwner(ctx, args.projectId);
    const links = await ctx.db
      .query("reviewLinks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    return links.map(({ _id, token, canDownload, appearance, expiresAt, revokedAt, createdAt }) => ({
      _id, token, canDownload, appearance, expiresAt, revokedAt, createdAt,
    }));
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    passcode: v.optional(v.string()),
    canDownload: v.boolean(),
    appearance: v.optional(reviewAppearanceValidator),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await getProjectForOwner(ctx, args.projectId);
    if (args.expiresAt !== undefined && args.expiresAt <= Date.now()) throw new Error("Expiry must be in the future");
    const token = randomSecret();
    const passcodeSalt = args.passcode ? randomSecret() : undefined;
    const passcodeHash = args.passcode
      ? await passcodeDigest(args.passcode, passcodeSalt!)
      : undefined;
    const linkId = await ctx.db.insert("reviewLinks", {
      projectId: args.projectId,
      token,
      passcodeHash,
      passcodeSalt,
      canDownload: args.canDownload,
      appearance: args.appearance,
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });
    return { linkId, token, url: `/review/${token}` };
  },
});

export const verifyPasscode = mutation({
  args: { token: v.string(), passcode: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db.query("reviewLinks").withIndex("by_token", (q) => q.eq("token", args.token)).unique();
    if (!link || link.revokedAt || (link.expiresAt !== undefined && link.expiresAt <= Date.now())) return { ok: false };
    const project = await ctx.db.get(link.projectId);
    if (!project || project.archived) return { ok: false };
    const now = Date.now();
    if (link.lockedUntil && link.lockedUntil > now) return { ok: false };
    const hash = link.passcodeHash
      ? link.passcodeSalt ? await passcodeDigest(args.passcode, link.passcodeSalt) : await digest(args.passcode)
      : undefined;
    if (hash && !matches(hash, link.passcodeHash!)) {
      const failedAttempts = (link.failedAttempts ?? 0) + 1;
      await ctx.db.patch(link._id, { failedAttempts: failedAttempts >= 5 ? 0 : failedAttempts,
        lockedUntil: failedAttempts >= 5 ? now + 15 * 60_000 : undefined });
      return { ok: false };
    }
    await ctx.db.patch(link._id, { failedAttempts: 0, lockedUntil: undefined });
    const accessKey = randomSecret();
    await ctx.db.insert("reviewerSessions", {
      token: args.token, displayName: "Reviewer", accessKeyHash: await digest(accessKey),
      expiresAt: Math.min(now + 24 * 60 * 60_000, link.expiresAt ?? Infinity), createdAt: now,
    });
    return { ok: true, accessKey };
  },
});

export const accessState = internalQuery({
  args: { token: v.string(), checkedAt: v.number() },
  handler: async (ctx, args) => {
    const link = await ctx.db.query("reviewLinks").withIndex("by_token", (q) => q.eq("token", args.token)).unique();
    if (!link || link.revokedAt || (link.expiresAt !== undefined && link.expiresAt <= Date.now())) return { available: false };
    const project = await ctx.db.get(link.projectId);
    if (!project || project.archived) return { available: false };
    return { available: true, requiresPasscode: Boolean(link.passcodeHash) };
  },
});

export const getAccessState = action({
  args: { token: v.string() },
  handler: (ctx, args): Promise<FunctionReturnType<ApiFromModules<{ read: { get: typeof accessState } }>['read']['get']>> => ctx.runQuery(internal.reviewLinks.accessState, { ...args, checkedAt: Date.now() })
});

export const revoke = mutation({
  args: { linkId: v.id("reviewLinks") },
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link) throw new Error("Review link unavailable");
    await getProjectForOwner(ctx, link.projectId);
    await ctx.db.patch(link._id, { revokedAt: Date.now() });
  },
});

