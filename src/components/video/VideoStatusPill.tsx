import type { VideoStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABELS: Record<VideoStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  awaiting_review: "Awaiting review",
  needs_changes: "Needs changes",
  approved: "Approved",
  final: "Final",
  omitted: "Omit",
  archived: "Archived",
};

const STYLES: Record<VideoStatus, string> = {
  not_started: "border border-zinc-800 bg-zinc-900 text-zinc-500",
  in_progress: "border border-violet-400/15 bg-violet-950/35 text-violet-200/80",
  awaiting_review: "border border-teal-400/15 bg-teal-950/30 text-teal-300/70",
  needs_changes: "bg-amber-950/80 text-amber-300",
  approved: "bg-emerald-950/80 text-emerald-300",
  final: "bg-sky-950/80 text-sky-300",
  omitted: "border border-zinc-700 bg-zinc-950 text-zinc-400",
  archived: "bg-zinc-900 text-zinc-500",
};

export function VideoStatusPill({
  status,
  className,
}: {
  status: VideoStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-normal whitespace-nowrap",
        STYLES[status],
        className,
      )}
    >
      {LABELS[status]}
    </span>
  );
}
