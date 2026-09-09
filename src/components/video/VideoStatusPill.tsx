import type { VideoStatus } from "@/lib/types";
import { STATUS_BADGE_CLASS, videoStatusLabel } from "@/lib/videoStatus";
import { cn } from "@/lib/utils";

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
        "inline-flex max-w-full rounded-md px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap",
        STATUS_BADGE_CLASS[status],
        className,
      )}
    >
      {videoStatusLabel(status)}
    </span>
  );
}
