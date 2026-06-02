import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Google from "@auth/core/providers/google";
import GitHub from "@auth/core/providers/github";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Google, GitHub],
});

export const loggedInAppUser = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) return null;
    return await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
  },
});

export const loggedInAuthUser = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) return null;
    return await ctx.db.get(authUserId);
  },
});

export const ensureAdminProfile = mutation({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (existing) return existing._id;

    const authUser = await ctx.db.get(authUserId);
    const name =
      args.name ??
      authUser?.name ??
      authUser?.email?.split("@")[0] ??
      "Admin";

    return await ctx.db.insert("appUsers", {
      authUserId,
      name,
      role: "admin",
    });
  },
});
