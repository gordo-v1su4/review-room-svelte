import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAppUserOrNull, getProjectForAdmin } from "./lib/access";

type InboxComment = {
  commentId: Id<"comments">;
  videoId: Id<"videos">;
  folderId?: Id<"projectFolders">;
  assetClass?: "VID" | "IMG" | "CTX" | "STB";
  assetCode: string;
  title: string;
  authorName: string;
  authorRole: "admin" | "client";
  body: string;
  createdAt: number;
  timecodeSec?: number;
  completedAt?: number;
  feedbackNeedsAttention: boolean;
};

type InboxDigest = {
  digestKey: string;
  dateKey: string;
  projectId: Id<"projects">;
  projectTitle: string;
  clientName?: string;
  commentCount: number;
  needsAttentionCount: number;
  latestAt: number;
  comments: InboxComment[];
};

function dateKeyFromTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

export const listFeedbackDigests = query({
  args: {},
  handler: async (ctx) => {
    const appUser = await getAppUserOrNull(ctx);
    if (!appUser) return [];

    const comments = await ctx.db.query("comments").collect();
    const groups = new Map<string, InboxDigest>();
    const projectAccess = new Map<Id<"projects">, boolean>();

    for (const comment of comments) {
      let canRead = projectAccess.get(comment.projectId);
      if (canRead === undefined) {
        try {
          await getProjectForAdmin(ctx, comment.projectId);
          canRead = true;
        } catch {
          canRead = false;
        }
        projectAccess.set(comment.projectId, canRead);
      }
      if (!canRead) continue;

      const [project, video] = await Promise.all([
        ctx.db.get(comment.projectId),
        ctx.db.get(comment.videoId),
      ]);
      if (!project || project.archived || !video || video.status === "archived") {
        continue;
      }

      const dateKey = dateKeyFromTimestamp(comment.createdAt);
      const digestKey = `${project._id}:${dateKey}`;
      const group =
        groups.get(digestKey) ??
        {
          digestKey,
          dateKey,
          projectId: project._id,
          projectTitle: project.title,
          clientName: project.clientName,
          commentCount: 0,
          needsAttentionCount: 0,
          latestAt: 0,
          comments: [],
        };

      const completedAt = comment.completedAt ?? video.feedbackAcknowledgedAt;
      const needsAttention = !completedAt;
      group.commentCount += 1;
      group.needsAttentionCount += needsAttention ? 1 : 0;
      group.latestAt = Math.max(group.latestAt, comment.createdAt);
      group.comments.push({
        commentId: comment._id,
        videoId: video._id,
        folderId: video.folderId,
        assetClass: video.assetClass,
        assetCode: video.assetCode ?? video.title,
        title: video.title,
        authorName: comment.authorName,
        authorRole: comment.authorRole,
        body: comment.body,
        createdAt: comment.createdAt,
        timecodeSec: comment.timecodeSec,
        completedAt,
        feedbackNeedsAttention: needsAttention,
      });
      groups.set(digestKey, group);
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        comments: group.comments.sort((a, b) => b.createdAt - a.createdAt),
      }))
      .sort((a, b) => b.latestAt - a.latestAt);
  },
});
