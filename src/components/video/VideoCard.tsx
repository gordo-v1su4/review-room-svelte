"use client";

import { MessageSquare, Download, Bookmark, Star } from "lucide-react";
import type { VideoDoc } from "@/lib/smartViews";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { VideoStatusPill } from "./VideoStatusPill";
import { useStorageUrl } from "@/hooks/useStorageUrl";

export function VideoCard({
  video,
  selected,
  size = "md",
  onSelect,
}: {
  video: VideoDoc;
  selected?: boolean;
  size?: "sm" | "md" | "lg";
  onSelect: () => void;
}) {
  const thumbUrl = useStorageUrl(video.thumbnailKey);
  const cols =
    size === "sm" ? "min-w-[180px]" : size === "lg" ? "min-w-[320px]" : "min-w-[240px]";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border bg-zinc-900/80 text-left transition-all",
        cols,
        selected
          ? "border-sky-300 ring-1 ring-sky-300/50"
          : "border-zinc-800/80 hover:border-zinc-600",
      )}
    >
      <div className="relative aspect-video w-full bg-zinc-950">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-600">
            {video.processingStatus === "processing" ? "Processing..." : "No preview"}
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
          <VideoStatusPill status={video.status} />
          <span className="text-[10px] text-zinc-300">
            {formatDuration(video.durationSec)}
          </span>
        </div>
      </div>
      <div className="space-y-2 p-3">
        <p className="line-clamp-2 text-sm font-medium text-zinc-100">{video.title}</p>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {video.rating > 0 && (
            <span className="inline-flex items-center gap-0.5 text-yellow-400">
              <Star className="h-3 w-3 fill-yellow-400" />
              {video.rating}/5
            </span>
          )}
          {video.commentCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {video.commentCount}
            </span>
          )}
          {video.isSelect && <Bookmark className="h-3 w-3 fill-sky-400 text-sky-400" />}
          {video.downloadEnabled && <Download className="h-3 w-3" />}
        </div>
      </div>
    </button>
  );
}
