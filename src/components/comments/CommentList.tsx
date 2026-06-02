"use client";

import { Doc } from "../../../convex/_generated/dataModel";
import { formatTimecode } from "@/lib/utils";

type Comment = Doc<"comments">;

export function CommentList({
  comments,
  onSeek,
}: {
  comments: Comment[];
  onSeek?: (sec: number) => void;
}) {
  if (!comments.length) {
    return <p className="text-sm text-zinc-500">No feedback yet.</p>;
  }

  return (
    <ul className="max-h-48 space-y-3 overflow-y-auto pr-1">
      {comments.map((c) => (
        <li key={c._id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
            <span className="font-medium text-zinc-300">{c.authorName}</span>
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
        </li>
      ))}
    </ul>
  );
}
