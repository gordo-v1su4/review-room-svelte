import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getProjectForAdmin, getProjectForEditor } from "./lib/access";
import { validateFolderParent, disposeFolder, folderNameKey } from './lib/folderTree';

const folderRemovalDisposition = v.union(
  v.literal("move_to_root"),
  v.literal("archive_assets"),
);

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
    parentFolderId: v.optional(v.id('projectFolders')),
  },
  handler: async (ctx, args) => {
    const { admin, project } = await getProjectForEditor(ctx, args.projectId);
    if (admin.role !== "admin") throw new Error("Admin required");
    const title = args.title.trim();
    if (!title) throw new Error("Folder name is required");

    const siblings = await ctx.db
      .query("projectFolders")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();
    await validateFolderParent(ctx, project._id, args.parentFolderId);
    if (siblings.some(folder => folder.parentFolderId === args.parentFolderId && folderNameKey(folder.title) === folderNameKey(title))) throw new Error('A folder with that name already exists');
    const maxOrder = siblings.filter(folder => folder.parentFolderId === args.parentFolderId).reduce((max, folder) => Math.max(max, folder.order), 0);
    const now = Date.now();
    const folderId = await ctx.db.insert("projectFolders", {
      projectId: project._id,
      parentFolderId: args.parentFolderId,
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

export const rename = mutation({
  args: {
    folderId: v.id("projectFolders"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const folder = await ctx.db.get(args.folderId);
    if (!folder) throw new Error("Folder not found");
    const { admin, project } = await getProjectForEditor(ctx, folder.projectId);
    if (admin.role !== "admin") throw new Error("Admin required");
    const title = args.title.trim();
    if (!title) throw new Error("Folder name is required");

    const siblings = await ctx.db
      .query("projectFolders")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();
    const duplicate = siblings.find(
      (item) =>
        item._id !== folder._id &&
        item.parentFolderId === folder.parentFolderId &&
        folderNameKey(item.title) === folderNameKey(title),
    );
    if (duplicate) throw new Error("A folder with that name already exists");

    const now = Date.now();
    await ctx.db.patch(folder._id, { title, updatedAt: now });
    await ctx.db.patch(project._id, { updatedAt: now });
  },
});

export const setCover = mutation({
  args: {
    folderId: v.id("projectFolders"),
    coverImageKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const folder = await ctx.db.get(args.folderId);
    if (!folder) throw new Error("Folder not found");
    const { admin, project } = await getProjectForEditor(ctx, folder.projectId);
    if (admin.role !== "admin") throw new Error("Admin required");
    const coverImageKey = args.coverImageKey?.trim();

    const now = Date.now();
    await ctx.db.patch(folder._id, {
      coverImageKey: coverImageKey || undefined,
      updatedAt: now,
    });
    await ctx.db.patch(project._id, { updatedAt: now });
  },
});

export const remove = mutation({
  args: {
    folderId: v.id("projectFolders"),
    assetDisposition: folderRemovalDisposition,
  },
  handler: async (ctx, args) => {
    const folder = await ctx.db.get(args.folderId);
    if (!folder) throw new Error("Folder not found");
    const { admin, project } = await getProjectForEditor(ctx, folder.projectId);
    if (admin.role !== "admin") throw new Error("Admin required");

    return await disposeFolder(ctx, folder, args.assetDisposition);
  },
});
