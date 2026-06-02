"use client";

import { Bookmark, Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { VideoDoc } from "@/lib/smartViews";
import { cn, formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "./VideoPlayer";
import { VideoRatingControl } from "./VideoRatingControl";
import { VideoStatusPill } from "./VideoStatusPill";

export function VideoReviewMode({
  videos,
  activeId,
  onSelect,
}: {
  videos: VideoDoc[];
  activeId?: string;
  onSelect: (id: VideoDoc["_id"]) => void;
}) {
  const toggleSelect = useMutation(api.videos.toggleSelect);
  const approve = useMutation(api.videos.approve);
  const requestChanges = useMutation(api.videos.requestChanges);
  const setRating = useMutation(api.videos.setRating);

  if (!videos.length) {
    return (
      <div className="mx-6 flex min-h-[280px] items-center justify-center rounded-lg border border-dashed border-zinc-800 text-sm text-zinc-500 sm:mx-8">
        No videos match.
      </div>
    );
  }

  const active = videos.find((video) => video._id === activeId) ?? videos[0];
  const activeIndex = videos.findIndex((video) => video._id === active._id);

  function navigate(delta: number) {
    const next = videos[(activeIndex + delta + videos.length) % videos.length];
    onSelect(next._id);
  }

  return (
    <div className="space-y-5 p-6 sm:p-8">
      <div className="overflow-hidden rounded-lg border border-zinc-800/60 bg-zinc-900/30">
        <div className="relative bg-black">
          <VideoPlayer storageKey={active.storageKey} spriteKey={active.spriteKey} />
          {videos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/45 text-zinc-200 backdrop-blur transition hover:bg-black/70"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate(1)}
                className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/45 text-zinc-200 backdrop-blur transition hover:bg-black/70"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-zinc-800/60 px-4 py-3">
          <VideoStatusPill status={active.status} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-medium text-zinc-100">
              {active.title}
            </h2>
            <p className="text-[11px] text-zinc-600">
              {activeIndex + 1} / {videos.length} /{" "}
              {formatDuration(active.durationSec)} / {active.originalFilename}
            </p>
          </div>
          <VideoRatingControl
            value={active.rating}
            onChange={(rating) => void setRating({ videoId: active._id, rating })}
          />
          <Button
            variant={active.isSelect ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "gap-1.5",
              active.isSelect && "border-sky-500/25 bg-sky-500/10 text-sky-200",
            )}
            onClick={() => void toggleSelect({ videoId: active._id })}
          >
            <Bookmark
              className={cn("h-4 w-4", active.isSelect && "fill-sky-400 text-sky-400")}
            />
            {active.isSelect ? "Selected" : "Select"}
          </Button>
          <Button
            variant="success"
            size="sm"
            className="gap-1.5"
            onClick={() => void approve({ videoId: active._id })}
          >
            <Check className="h-4 w-4" />
            Approve
          </Button>
          <Button
            variant="warning"
            size="sm"
            className="gap-1.5"
            onClick={() => void requestChanges({ videoId: active._id })}
          >
            <X className="h-4 w-4" />
            Changes
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
          In this project
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
          {videos.map((video) => (
            <button
              key={video._id}
              type="button"
              onClick={() => onSelect(video._id)}
              className={cn(
                "relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg border bg-zinc-950 text-left transition",
                video._id === active._id
                  ? "border-violet-300 ring-1 ring-violet-300/40"
                  : "border-zinc-800/60 opacity-65 hover:opacity-100",
              )}
            >
              <div className="grid h-full place-items-center text-xs text-zinc-700">
                {video.processingStatus === "processing" ? "Processing..." : "Preview"}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="truncate text-[11px] font-medium text-zinc-100">
                  {video.title}
                </p>
              </div>
              {video.isSelect && (
                <Bookmark className="absolute right-2 top-2 h-3.5 w-3.5 fill-sky-400 text-sky-400" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
