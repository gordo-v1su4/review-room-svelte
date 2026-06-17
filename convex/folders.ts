import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getProjectForAdmin, getProjectForEditor } from "./lib/access";

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await getProjectForAdmin(ctx, args.projectId);
    const folders = await ctx.db
      .query("projectFolders")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return folders.sort(
      (a, b) => a.order - b.order || a.title.localeCompare(b.title),
    );
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const { admin, project } = await getProjectForEditor(ctx, args.projectId);
    const title = args.title.trim();
    if (!title) throw new Error("Folder name is required");

    const siblings = await ctx.db
      .query("projectFolders")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();
    const maxOrder = siblings.reduce((max, folder) => Math.max(max, folder.order), 0);
    const now = Date.now();
    const folderId = await ctx.db.insert("projectFolders", {
      projectId: project._id,
      title,
      order: maxOrder + 1,
      createdBy: admin._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(project._id, { updatedAt: now });
    return folderId;
  },
});
