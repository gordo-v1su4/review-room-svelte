import type { VideoStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABELS: Record<VideoStatus, string> = {
  awaiting_review: "Awaiting review",
  needs_changes: "Needs changes",
  approved: "Approved",
  final: "Final",
  archived: "Archived",
};

const STYLES: Record<VideoStatus, string> = {
  awaiting_review: "bg-zinc-800 text-zinc-300",
  needs_changes: "bg-amber-950/80 text-amber-300",
  approved: "bg-emerald-950/80 text-emerald-300",
  final: "bg-sky-950/80 text-sky-300",
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
        "inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-normal",
        STYLES[status],
        className,
      )}
    >
      {LABELS[status]}
    </span>
  );
}
