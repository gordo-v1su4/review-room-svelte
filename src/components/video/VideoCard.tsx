"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { MessageSquare, Download, Bookmark, Star } from "lucide-react";
import { api } from "../../../convex/_generated/api";
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
  const thumbUrl = useStorageUrl(video.thumbnailKey, video.updatedAt);
  const spriteUrl = useStorageUrl(video.spriteKey, video.updatedAt);
  const toggleSelect = useMutation(api.videos.toggleSelect);
  const setRating = useMutation(api.videos.setRating);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const spriteFrameCount = 10;
  const scrubFrame =
    hoverPct == null
      ? 0
      : Math.min(
          spriteFrameCount - 1,
          Math.max(0, Math.floor(hoverPct * spriteFrameCount)),
        );
  const scrubPosition =
    spriteFrameCount <= 1 ? 0 : (scrubFrame / (spriteFrameCount - 1)) * 100;
  const titleClass =
    size === "lg"
      ? "line-clamp-2 text-sm leading-5"
      : "line-clamp-1 text-[13px] leading-5";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group relative flex w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-lg border bg-zinc-900/80 text-left transition-all",
        selected
          ? "border-sky-300 ring-1 ring-sky-300/50"
          : "border-zinc-800/80 hover:border-zinc-600",
      )}
    >
      <div
        className="relative aspect-video w-full overflow-hidden bg-zinc-950"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          setHoverPct(Math.min(1, Math.max(0, pct)));
        }}
        onMouseLeave={() => setHoverPct(null)}
      >
        {spriteUrl && hoverPct != null ? (
          <div
            className="h-full w-full bg-cover bg-no-repeat"
            style={{
              backgroundImage: `url(${spriteUrl})`,
              backgroundSize: `${spriteFrameCount * 100}% 100%`,
              backgroundPosition: `${scrubPosition}% center`,
            }}
          />
        ) : thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-600">
            {video.processingStatus === "processing" ? "Processing..." : "No preview"}
          </div>
        )}
        {hoverPct != null && (
          <div
            className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-teal-300 shadow-[0_0_10px_rgba(45,212,191,0.85)]"
            style={{ left: `${hoverPct * 100}%` }}
          />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
        <div
          className={cn(
            "absolute right-2 top-2 flex items-center rounded-full border border-white/10 bg-black/55 p-0.5 opacity-100 shadow-sm backdrop-blur transition-opacity sm:opacity-0",
            "sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
            video.isSelect && "opacity-100",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            title={video.isSelect ? "Remove from selected" : "Select"}
            className={cn(
              "grid h-6 w-6 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white",
              video.isSelect && "text-sky-300",
            )}
            onClick={() => void toggleSelect({ videoId: video._id })}
          >
            <Bookmark
              className={cn("h-3 w-3", video.isSelect && "fill-sky-400 text-sky-400")}
            />
          </button>
        </div>
        <div
          className="absolute left-2 top-2 flex items-center rounded-full border border-white/10 bg-black/55 px-1 py-0.5 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          onClick={(event) => event.stopPropagation()}
        >
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              title={`Rate ${rating}/5`}
              className="grid h-5 w-4 place-items-center text-zinc-400 transition hover:text-yellow-300"
              onClick={() => void setRating({ videoId: video._id, rating })}
            >
              <Star
                className={cn(
                  "h-3 w-3",
                  video.rating >= rating && "fill-yellow-400 text-yellow-400",
                )}
              />
            </button>
          ))}
        </div>
        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
          <VideoStatusPill status={video.status} />
          <span className="text-[10px] text-zinc-300">
            {formatDuration(video.durationSec)}
          </span>
        </div>
      </div>
      <div className={cn("space-y-1.5", size === "sm" ? "p-2.5" : "p-3")}>
        <p
          title={video.title}
          className={cn(
            "font-medium text-zinc-300 transition-colors group-hover:text-zinc-100",
            titleClass,
          )}
        >
          {video.title}
        </p>
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
    </article>
  );
}
