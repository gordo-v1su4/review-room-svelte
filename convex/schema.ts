import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const status = v.union(
  v.literal("awaiting_review"),
  v.literal("needs_changes"),
  v.literal("approved"),
  v.literal("final"),
  v.literal("archived"),
);

const applicationTables = {
  appUsers: defineTable({
    authUserId: v.id("users"),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("client")),
  }).index("by_auth_user", ["authUserId"]),

  projects: defineTable({
    title: v.string(),
    slug: v.string(),
    clientName: v.optional(v.string()),
    description: v.optional(v.string()),
    bannerKey: v.optional(v.string()),
    brandColor: v.optional(v.string()),
    downloadEnabledByDefault: v.boolean(),
    createdBy: v.id("appUsers"),
    createdAt: v.number(),
    updatedAt: v.number(),
    archived: v.optional(v.boolean()),
  })
    .index("by_creator", ["createdBy"])
    .index("by_slug", ["slug"]),

  videos: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    originalFilename: v.string(),
    storageKey: v.string(),
    thumbnailKey: v.optional(v.string()),
    spriteKey: v.optional(v.string()),
    mimeType: v.string(),
    sizeBytes: v.optional(v.number()),
    durationSec: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    fps: v.optional(v.number()),
    status,
    viewed: v.boolean(),
    rating: v.number(),
    isSelect: v.boolean(),
    commentCount: v.number(),
    tags: v.array(v.string()),
    downloadEnabled: v.boolean(),
    order: v.number(),
    uploadedBy: v.id("appUsers"),
    uploadedAt: v.number(),
    updatedAt: v.number(),
    approvedAt: v.optional(v.number()),
    processingStatus: v.optional(
      v.union(
        v.literal("uploading"),
        v.literal("processing"),
        v.literal("ready"),
        v.literal("error"),
      ),
    ),
  })
    .index("by_project", ["projectId"])
    .index("by_project_status", ["projectId", "status"])
    .index("by_project_uploadedAt", ["projectId", "uploadedAt"]),

  comments: defineTable({
    videoId: v.id("videos"),
    projectId: v.id("projects"),
    authorName: v.string(),
    authorRole: v.union(v.literal("admin"), v.literal("client")),
    body: v.string(),
    timecodeSec: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_video", ["videoId"])
    .index("by_project", ["projectId"]),

  reviewLinks: defineTable({
    projectId: v.id("projects"),
    token: v.string(),
    passcodeHash: v.optional(v.string()),
    canDownload: v.boolean(),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_project", ["projectId"]),

  reviewerSessions: defineTable({
    token: v.string(),
    displayName: v.string(),
    createdAt: v.number(),
  }).index("by_token", ["token"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
