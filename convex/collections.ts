import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getProjectForAdmin, getProjectForEditor } from "./lib/access";

const SYSTEM_COLLECTIONS = [
  { systemKey: "videos", title: "Videos", assetClass: "VID" },
  { systemKey: "images", title: "Images", assetClass: "IMG" },
  { systemKey: "needs_review", title: "Needs Review", status: "awaiting_review" },
  { systemKey: "approved", title: "Approved", status: "approved" },
] as const;

export const listByProject = query({
  args: { projectId: v.id("projects") },
  returns: v.array(
    v.object({
      _id: v.id("collections"),
      title: v.string(),
      kind: v.union(v.literal("system"), v.literal("user")),
      systemKey: v.optional(v.string()),
      sourceFolderId: v.optional(v.id("projectFolders")),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await getProjectForAdmin(ctx, args.projectId);

    const existing = await ctx.db
      .query("collections")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return existing
      .sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "system" ? -1 : 1;
        return a.createdAt - b.createdAt;
      })
      .map((collection) => ({
        _id: collection._id,
        title: collection.title,
        kind: collection.kind,
        systemKey: collection.systemKey,
        sourceFolderId: collection.sourceFolderId,
        createdAt: collection.createdAt,
      }));
  },
});

export const ensureSystemCollections = mutation({
  args: { projectId: v.id("projects") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { admin } = await getProjectForEditor(ctx, args.projectId);
    const existing = await ctx.db
      .query("collections")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    if (existing.some((item) => item.kind === "system")) return null;

    const now = Date.now();
    for (const [index, item] of SYSTEM_COLLECTIONS.entries()) {
      await ctx.db.insert("collections", {
        projectId: args.projectId,
        title: item.title,
        kind: "system",
        systemKey: item.systemKey,
        filterRules: {
          assetClass: "assetClass" in item ? item.assetClass : undefined,
          status: "status" in item ? item.status : undefined,
        },
        createdBy: admin._id,
        createdAt: now + index,
      });
    }
    return null;
  },
});

export const create = mutation({
  args: { projectId: v.id("projects") },
  returns: v.id("collections"),
  handler: async (ctx, args) => {
    const { admin } = await getProjectForEditor(ctx, args.projectId);
    const now = Date.now();
    return await ctx.db.insert("collections", {
      projectId: args.projectId,
      title: "Untitled Collection",
      kind: "user",
      createdBy: admin._id,
      createdAt: now,
    });
  },
});

export const rename = mutation({
  args: {
    collectionId: v.id("collections"),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const collection = await ctx.db.get("collections", args.collectionId);
    if (!collection) throw new Error("Collection not found");
    await getProjectForEditor(ctx, collection.projectId);
    if (collection.kind === "system") throw new Error("System collections cannot be renamed");
    await ctx.db.patch("collections", args.collectionId, {
      title: args.title.trim() || "Untitled Collection",
    });
    return null;
  },
});

export const setSourceFolder = mutation({
  args: {
    collectionId: v.id("collections"),
    sourceFolderId: v.id("projectFolders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const collection = await ctx.db.get("collections", args.collectionId);
    if (!collection) throw new Error("Collection not found");
    await getProjectForEditor(ctx, collection.projectId);
    const folder = await ctx.db.get("projectFolders", args.sourceFolderId);
    if (!folder || folder.projectId !== collection.projectId) {
      throw new Error("Folder not found");
    }
    await ctx.db.patch("collections", args.collectionId, {
      sourceFolderId: args.sourceFolderId,
    });
    return null;
  },
});

export const remove = mutation({
  args: { collectionId: v.id("collections") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const collection = await ctx.db.get("collections", args.collectionId);
    if (!collection) throw new Error("Collection not found");
    await getProjectForEditor(ctx, collection.projectId);
    if (collection.kind === "system") throw new Error("System collections cannot be deleted");
    await ctx.db.delete("collections", args.collectionId);
    return null;
  },
});

export const getById = query({
  args: { collectionId: v.id("collections") },
  returns: v.union(
    v.object({
      _id: v.id("collections"),
      projectId: v.id("projects"),
      title: v.string(),
      kind: v.union(v.literal("system"), v.literal("user")),
      systemKey: v.optional(v.string()),
      sourceFolderId: v.optional(v.id("projectFolders")),
      filterRules: v.optional(v.any()),
      groupBy: v.optional(v.string()),
      sortKey: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const collection = await ctx.db.get("collections", args.collectionId);
    if (!collection) return null;
    await getProjectForAdmin(ctx, collection.projectId);
    return {
      _id: collection._id,
      projectId: collection.projectId,
      title: collection.title,
      kind: collection.kind,
      systemKey: collection.systemKey,
      sourceFolderId: collection.sourceFolderId,
      filterRules: collection.filterRules,
      groupBy: collection.groupBy,
      sortKey: collection.sortKey,
    };
  },
});
