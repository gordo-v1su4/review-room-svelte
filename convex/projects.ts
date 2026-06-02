import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getProjectForAdmin, requireAdmin } from "./lib/access";

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "project"
  );
}

export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_creator", (q) => q.eq("createdBy", admin._id))
      .collect();
    const active = projects.filter((p) => !p.archived);
    const enriched = await Promise.all(
      active.map(async (project) => {
        const videos = await ctx.db
          .query("videos")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();
        const visible = videos.filter((v) => v.status !== "archived");
        return {
          ...project,
          videoCount: visible.length,
          awaitingReview: visible.filter(
            (v) => v.status === "awaiting_review" && !v.viewed,
          ).length,
          feedbackCount: visible.filter((v) => v.commentCount > 0).length,
        };
      }),
    );
    return enriched.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getById = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const { project } = await getProjectForAdmin(ctx, args.projectId);
    return project;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    clientName: v.optional(v.string()),
    description: v.optional(v.string()),
    brandColor: v.optional(v.string()),
    downloadEnabledByDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();
    let slug = slugify(args.title);
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (existing) slug = `${slug}-${now}`;
    return await ctx.db.insert("projects", {
      title: args.title,
      slug,
      clientName: args.clientName,
      description: args.description,
      brandColor: args.brandColor,
      downloadEnabledByDefault: args.downloadEnabledByDefault ?? false,
      createdBy: admin._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    clientName: v.optional(v.string()),
    description: v.optional(v.string()),
    bannerKey: v.optional(v.string()),
    brandColor: v.optional(v.string()),
    downloadEnabledByDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { project } = await getProjectForAdmin(ctx, args.projectId);
    const { projectId: _pid, ...patch } = args;
    await ctx.db.patch(project._id, { ...patch, updatedAt: Date.now() });
  },
});

export const archive = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const { project } = await getProjectForAdmin(ctx, args.projectId);
    await ctx.db.patch(project._id, { archived: true, updatedAt: Date.now() });
  },
});
