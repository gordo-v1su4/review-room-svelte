"use client";

import { Doc } from "../../../convex/_generated/dataModel";
import { CheckCircle2 } from "lucide-react";
import { cn, formatTimecode } from "@/lib/utils";
import { AuthorBadge } from "./AuthorBadge";

export type CommentReactionEmoji = "thumbs_up" | "thumbs_down" | "fire" | "heart";

export type Comment = Doc<"comments"> & {
  reactions?: Record<CommentReactionEmoji, number>;
};

const REACTION_OPTIONS: Array<{
  id: CommentReactionEmoji;
  label: string;
  title: string;
}> = [
  { id: "thumbs_up", label: "👍", title: "Thumbs up" },
  { id: "thumbs_down", label: "👎", title: "Thumbs down" },
  { id: "fire", label: "🔥", title: "Fire" },
  { id: "heart", label: "❤️", title: "Heart" },
];

export function CommentList({
  comments,
  onSeek,
  onToggleReaction,
  onToggleComplete,
  canReact = false,
  canComplete = false,
}: {
  comments: Comment[];
  onSeek?: (sec: number) => void;
  onToggleReaction?: (commentId: Comment["_id"], emoji: CommentReactionEmoji) => void;
  onToggleComplete?: (commentId: Comment["_id"]) => void;
  canReact?: boolean;
  canComplete?: boolean;
}) {
  if (!comments.length) {
    return <p className="text-sm text-zinc-500">No feedback yet.</p>;
  }

  const openCount = comments.filter((comment) => !comment.completedAt).length;

  return (
    <div className="space-y-2">
      {openCount > 0 && (
        <div className="rounded-md bg-[var(--info)] px-3 py-1.5 text-center text-xs font-medium text-white">
          {openCount} open {openCount === 1 ? "comment" : "comments"}
        </div>
      )}
      <ul className="max-h-48 space-y-3 overflow-y-auto pr-1">
        {comments.map((c) => (
          <li
            key={c._id}
            className={cn(
              "rounded-lg border bg-zinc-900/50 p-3",
              c.completedAt ? "border-[color-mix(in_srgb,var(--success)_15%,transparent)]" : "border-zinc-800",
            )}
          >
            <div className="flex items-start justify-between gap-2 text-xs text-zinc-500">
              <AuthorBadge name={c.authorName} role={c.authorRole} />
              {c.timecodeSec != null && (
                <button
                  type="button"
                  className="text-sky-400 hover:underline"
                  onClick={() => onSeek?.(c.timecodeSec!)}
                >
                  {formatTimecode(c.timecodeSec)}
                </button>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-200">{c.body}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {REACTION_OPTIONS.map((reaction) => {
                const count = c.reactions?.[reaction.id] ?? 0;
                return (
                  <button
                    key={reaction.id}
                    type="button"
                    title={reaction.title}
                    disabled={!canReact}
                    onClick={() => onToggleReaction?.(c._id, reaction.id)}
                    className={cn(
                      "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] transition",
                      count > 0
                        ? "border-teal-400/30 bg-teal-400/10 text-teal-100"
                        : "border-zinc-800 bg-zinc-950/50 text-zinc-500",
                      canReact
                        ? "hover:border-zinc-600 hover:text-zinc-200"
                        : "cursor-default",
                    )}
                  >
                    <span>{reaction.label}</span>
                    {count > 0 && (
                      <span className="tabular-nums text-zinc-400">{count}</span>
                    )}
                  </button>
                );
              })}
              {canComplete && (
                <button
                  type="button"
                  title={c.completedAt ? "Reopen note" : "Mark note handled"}
                  onClick={() => onToggleComplete?.(c._id)}
                  className={cn(
                    "ml-auto inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] transition",
                    c.completedAt
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                      : "border-zinc-800 bg-zinc-950/50 text-zinc-500 hover:border-emerald-400/30 hover:text-emerald-200",
                  )}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {c.completedAt ? "Handled" : "Mark handled"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
