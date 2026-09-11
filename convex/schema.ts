import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const status = v.union(
  v.literal("not_started"),
  v.literal("in_progress"),
  v.literal("awaiting_review"),
  v.literal("needs_changes"),
  v.literal("approved"),
  v.literal("final"),
  v.literal("omitted"),
  v.literal("archived"),
);

const assetClass = v.union(
  v.literal("VID"),
  v.literal("IMG"),
  v.literal("CTX"),
  v.literal("STB"),
);

const reactionEmoji = v.union(
  v.literal("thumbs_up"),
  v.literal("thumbs_down"),
  v.literal("fire"),
  v.literal("heart"),
);

const reviewAppearance = v.object({
  gridSize: v.union(v.literal("sm"), v.literal("md"), v.literal("lg")),
  aspectRatio: v.union(
    v.literal("video"),
    v.literal("square"),
    v.literal("portrait"),
  ),
  thumbnailScale: v.union(v.literal("fit"), v.literal("fill")),
  showCardInfo: v.boolean(),
});

const annotationTool = v.optional(
  v.union(
    v.literal("pen"),
    v.literal("arrow"),
    v.literal("rect"),
    v.literal("circle"),
  ),
);

const annotationStroke = v.object({
  id: v.string(),
  color: v.string(),
  width: v.number(),
  tool: annotationTool,
  points: v.array(
    v.object({
      x: v.number(),
      y: v.number(),
    }),
  ),
});

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
    visibility: v.optional(
      v.union(v.literal("private"), v.literal("shared"), v.literal("workspace")),
    ),
    nextAssetNumber: v.optional(v.number()),
    createdBy: v.id("appUsers"),
    createdAt: v.number(),
    updatedAt: v.number(),
    archived: v.optional(v.boolean()),
  })
    .index("by_creator", ["createdBy"])
    .index("by_slug", ["slug"]),

  projectMembers: defineTable({
    projectId: v.id("projects"),
    appUserId: v.id("appUsers"),
    role: v.union(v.literal("editor"), v.literal("viewer")),
    addedBy: v.id("appUsers"),
    addedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_user", ["appUserId"])
    .index("by_project_user", ["projectId", "appUserId"]),

  projectAccessRules: defineTable({
    projectId: v.id("projects"),
    pattern: v.string(),
    role: v.union(v.literal("editor"), v.literal("viewer")),
    addedBy: v.id("appUsers"),
    addedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_pattern", ["projectId", "pattern"]),

  projectFolders: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    coverImageKey: v.optional(v.string()),
    order: v.number(),
    createdBy: v.id("appUsers"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_project", ["projectId"]),

  videos: defineTable({
    projectId: v.id("projects"),
    folderId: v.optional(v.id("projectFolders")),
    assetClass: v.optional(assetClass),
    assetNumber: v.optional(v.number()),
    assetCode: v.optional(v.string()),
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
    markedForDeletion: v.optional(v.boolean()),
    annotationStrokes: v.optional(v.array(annotationStroke)),
    annotatedAt: v.optional(v.number()),
    feedbackNeedsAttention: v.optional(v.boolean()),
    feedbackAcknowledgedAt: v.optional(v.number()),
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
    .index("by_project_folder", ["projectId", "folderId"])
    .index("by_project_status", ["projectId", "status"])
    .index("by_project_uploadedAt", ["projectId", "uploadedAt"]),

  comments: defineTable({
    videoId: v.id("videos"),
    projectId: v.id("projects"),
    authorName: v.string(),
    authorRole: v.union(v.literal("admin"), v.literal("client")),
    body: v.string(),
    timecodeSec: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    completedBy: v.optional(v.id("appUsers")),
    createdAt: v.number(),
  })
    .index("by_video", ["videoId"])
    .index("by_project", ["projectId"]),

  commentReactions: defineTable({
    commentId: v.id("comments"),
    videoId: v.id("videos"),
    projectId: v.id("projects"),
    appUserId: v.id("appUsers"),
    emoji: reactionEmoji,
    createdAt: v.number(),
  })
    .index("by_comment", ["commentId"])
    .index("by_comment_user_emoji", ["commentId", "appUserId", "emoji"])
    .index("by_project", ["projectId"]),

  reviewLinks: defineTable({
    projectId: v.id("projects"),
    token: v.string(),
    passcodeHash: v.optional(v.string()),
    canDownload: v.boolean(),
    appearance: v.optional(reviewAppearance),
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

  workspacePreferences: defineTable({
    projectId: v.id("projects"),
    appUserId: v.id("appUsers"),
    visibleCardFields: v.optional(v.array(v.string())),
    fieldOrder: v.optional(v.array(v.string())),
    updatedAt: v.number(),
  }).index("by_project_user", ["projectId", "appUserId"]),

  collections: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    kind: v.union(v.literal("system"), v.literal("user")),
    systemKey: v.optional(v.string()),
    sourceFolderId: v.optional(v.id("projectFolders")),
    visibleFields: v.optional(v.array(v.string())),
    filterRules: v.optional(v.any()),
    groupBy: v.optional(v.string()),
    sortKey: v.optional(v.string()),
    createdBy: v.id("appUsers"),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
