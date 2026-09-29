import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Google from "@auth/core/providers/google";
import GitHub from "@auth/core/providers/github";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  isPasswordResetEnabled,
  passwordResetEmail,
} from "./lib/passwordReset";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password(
      isPasswordResetEnabled() ? { reset: passwordResetEmail } : undefined,
    ),
    Google,
    GitHub,
  ],
});

export const oauthProviders = query({
  args: {},
  handler: async () => ({
    google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    github: Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET),
    passwordReset: isPasswordResetEnabled(),
  }),
});

export const ownerReady = query({
  args: {},
  handler: async (ctx) => {
    const address = process.env.AUTH_EMAIL_ALLOWLIST?.trim().toLowerCase();
    if (!address || !address.includes("@") || address.includes(",") || address.includes("*")) return false;
    const user = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", address)).unique();
    if (!user) return false;
    const profile = await ctx.db.query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", user._id)).unique();
    return profile?.role === "admin";
  },
});

function emailAllowed(email?: string) {
  const raw = process.env.AUTH_EMAIL_ALLOWLIST?.trim();
  // An unset allowlist must never turn account creation into admin access.
  if (!raw) return false;
  if (!email) return false;

  const normalizedEmail = email.toLowerCase();
  const domain = normalizedEmail.split("@")[1];
  const entries = raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return entries.some((entry) => {
    if (entry.includes("@") && !entry.startsWith("*@")) {
      return normalizedEmail === entry;
    }
    const normalizedDomain = entry.replace(/^\*@/, "").replace(/^@/, "");
    return domain === normalizedDomain;
  });
}

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

export const bootstrapOwner = internalMutation({
  args: { authUserId: v.id("users") },
  handler: async (ctx, args) => {
    const authUser = await ctx.db.get(args.authUserId);
    if (!authUser || !emailAllowed(authUser.email)) {
      throw new Error("This email is not allowed to access Review Room");
    }
    const existing = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", args.authUserId))
      .unique();
    if (existing) {
      if (existing.role !== "admin") {
        throw new Error("This email is not authorized to access Review Room");
      }
      return existing._id;
    }
    const name =
      authUser.name ??
      authUser?.email?.split("@")[0] ??
      "Admin";

    return await ctx.db.insert("appUsers", {
      authUserId: args.authUserId,
      name,
      role: "admin",
    });
  },
});

export const ensureAppProfile = mutation({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Not authenticated");
    const authUser = await ctx.db.get(authUserId);
    const existing = await ctx.db
      .query("appUsers")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", authUserId))
      .unique();
    if (existing) return existing._id;

    const name =
      args.name ??
      authUser?.name ??
      authUser?.email?.split("@")[0] ??
      "Client";

    return await ctx.db.insert("appUsers", {
      authUserId,
      name,
      role: "client",
    });
  },
});
