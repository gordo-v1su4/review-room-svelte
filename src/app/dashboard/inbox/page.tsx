"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, Inbox, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AdminGate } from "@/components/auth/AdminGate";
import { AuthorBadge } from "@/components/comments/AuthorBadge";
import { Button } from "@/components/ui/button";
import { formatTimecode } from "@/lib/utils";
import { cn } from "@/lib/utils";

function formatDateKey(dateKey: string) {
  if (!/^\d{8}$/.test(dateKey)) return dateKey;
  return `${dateKey.slice(0, 4)}-${dateKey.slice(4, 6)}-${dateKey.slice(6, 8)}`;
}

function formatCommentTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

type InboxComment = {
  videoId: Id<"videos">;
  folderId?: Id<"projectFolders">;
  assetClass?: "VID" | "IMG" | "CTX" | "STB";
};

function assetHref(projectId: Id<"projects">, comment: InboxComment) {
  const params = new URLSearchParams();
  if (comment.folderId) {
    params.set("folder", comment.folderId);
  } else if (comment.assetClass) {
    params.set("assetClass", comment.assetClass);
  }
  params.set("video", comment.videoId);
  return `/dashboard/projects/${projectId}?${params.toString()}`;
}

export default function InboxPage() {
  const digests = useQuery(api.inbox.listFeedbackDigests, {});
  const toggleCommentComplete = useMutation(api.comments.toggleComplete);

  async function toggleComplete(commentId: Id<"comments">) {
    try {
      await toggleCommentComplete({ commentId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update comment");
    }
  }

  return (
    <AdminGate>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-600">Inbox</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Feedback digest
          </h1>
        </div>
        <p className="max-w-xl text-sm text-zinc-500">
          Daily in-app digest of review notes. Email can plug into this same feed later.
        </p>
      </div>

      {!digests ? (
        <p className="mt-8 text-sm text-zinc-500">Loading feedback...</p>
      ) : digests.length === 0 ? (
        <div className="mt-12 grid min-h-[20rem] place-items-center rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center">
          <div>
            <Inbox className="mx-auto h-8 w-8 text-zinc-700" />
            <p className="mt-3 text-sm font-medium text-zinc-300">
              No feedback yet
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              Client comments will collect here by project and day.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {digests.map((digest) => (
            <section
              key={digest.digestKey}
              className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950"
            >
              <div className="flex flex-col gap-3 border-b border-zinc-800 bg-zinc-900/45 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/projects/${digest.projectId}`}
                      className="truncate text-sm font-medium text-zinc-100 hover:text-white"
                    >
                      {digest.projectTitle}
                    </Link>
                    <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                      {formatDateKey(digest.dateKey)}
                    </span>
                    {digest.needsAttentionCount > 0 && (
                      <span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] font-medium text-sky-300">
                        {digest.needsAttentionCount} needs attention
                      </span>
                    )}
                  </div>
                  {digest.clientName && (
                    <p className="mt-1 text-xs text-zinc-600">
                      {digest.clientName}
                    </p>
                  )}
                </div>
                <div className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {digest.commentCount} comments
                </div>
              </div>

              <div className="divide-y divide-zinc-800/60">
                {digest.comments.map((comment) => (
                  <article
                    key={comment.commentId}
                    className={cn(
                      "grid gap-3 px-4 py-3 sm:grid-cols-[minmax(8rem,13rem)_minmax(0,1fr)_auto] sm:items-start",
                      comment.feedbackNeedsAttention && "bg-sky-400/[0.035]",
                    )}
                  >
                    <div className="min-w-0">
                      <Link
                        href={assetHref(digest.projectId, comment)}
                        className="block truncate text-xs font-medium tracking-wide text-zinc-200 hover:text-white"
                      >
                        {comment.assetCode}
                      </Link>
                      <Link
                        href={assetHref(digest.projectId, comment)}
                        className="mt-0.5 block truncate text-[11px] text-zinc-600 hover:text-zinc-400"
                      >
                        {comment.title}
                      </Link>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                        <AuthorBadge
                          name={comment.authorName}
                          role={comment.authorRole}
                          compact
                        />
                        <span>{formatCommentTime(comment.createdAt)}</span>
                        {comment.timecodeSec != null && (
                          <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-sky-300">
                            {formatTimecode(comment.timecodeSec)}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 break-words text-sm leading-5 text-zinc-300 [overflow-wrap:anywhere]">
                        {comment.body}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 gap-1.5 justify-self-start border px-2 text-xs sm:justify-self-end",
                        comment.completedAt
                          ? "border-emerald-400/20 text-emerald-300 hover:bg-emerald-400/10"
                          : "border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
                      )}
                      onClick={() => void toggleComplete(comment.commentId)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {comment.completedAt ? "Handled" : "Mark handled"}
                    </Button>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </AdminGate>
  );
}
