import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getProjectForAdmin } from "./lib/access";

export const getForProject = query({
  args: { projectId: v.id("projects") },
  returns: v.union(
    v.object({
      _id: v.id("workspacePreferences"),
      visibleCardFields: v.optional(v.array(v.string())),
      fieldOrder: v.optional(v.array(v.string())),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const { admin } = await getProjectForAdmin(ctx, args.projectId);

    const prefs = await ctx.db
      .query("workspacePreferences")
      .withIndex("by_project_user", (q) =>
        q.eq("projectId", args.projectId).eq("appUserId", admin._id),
      )
      .unique();

    if (!prefs) return null;
    return {
      _id: prefs._id,
      visibleCardFields: prefs.visibleCardFields,
      fieldOrder: prefs.fieldOrder,
    };
  },
});

export const saveCardFields = mutation({
  args: {
    projectId: v.id("projects"),
    visibleCardFields: v.array(v.string()),
    fieldOrder: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { admin } = await getProjectForAdmin(ctx, args.projectId);

    const existing = await ctx.db
      .query("workspacePreferences")
      .withIndex("by_project_user", (q) =>
        q.eq("projectId", args.projectId).eq("appUserId", admin._id),
      )
      .unique();

    if (existing) {
      await ctx.db.patch("workspacePreferences", existing._id, {
        visibleCardFields: args.visibleCardFields,
        fieldOrder: args.fieldOrder,
        updatedAt: Date.now(),
      });
      return null;
    }

    await ctx.db.insert("workspacePreferences", {
      projectId: args.projectId,
      appUserId: admin._id,
      visibleCardFields: args.visibleCardFields,
      fieldOrder: args.fieldOrder,
      updatedAt: Date.now(),
    });
    return null;
  },
});
