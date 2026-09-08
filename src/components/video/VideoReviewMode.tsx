"use client";

import { useEffect, useState } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ListVideo,
  Repeat2,
} from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { VideoDoc } from "@/lib/smartViews";
import { isImageAsset, mediaKindLabel } from "@/lib/media";
import { cn, formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "./VideoPlayer";
import { VideoRatingControl } from "./VideoRatingControl";
import { VideoStatusControl } from "./VideoStatusControl";
import { useStorageUrl } from "@/hooks/useStorageUrl";
import type { VideoStatus } from "@/lib/types";

export function VideoReviewMode({
  videos,
  activeId,
  onSelect,
  canEdit = true,
}: {
  videos: VideoDoc[];
  activeId?: string;
  onSelect: (id: VideoDoc["_id"]) => void;
  canEdit?: boolean;
}) {
  const [playbackMode, setPlaybackMode] = useState<"order" | "loop">("loop");
  const [continuePlayback, setContinuePlayback] = useState(false);
  const toggleSelect = useMutation(api.videos.toggleSelect);
  const setStatus = useMutation(api.videos.updateMetadata);
  const setRating = useMutation(api.videos.setRating);

  if (!videos.length) {
    return (
      <div className="mx-6 flex min-h-[280px] items-center justify-center rounded-lg border border-dashed border-zinc-800 text-sm text-zinc-500 sm:mx-8">
        No media match.
      </div>
    );
  }

  const active = videos.find((video) => video._id === activeId) ?? videos[0];
  const activeIndex = videos.findIndex((video) => video._id === active._id);
  const activeIsImage = isImageAsset(active);

  function navigate(delta: number) {
    const next = videos[(activeIndex + delta + videos.length) % videos.length];
    setContinuePlayback(false);
    onSelect(next._id);
  }

  function selectVideo(id: VideoDoc["_id"]) {
    setContinuePlayback(false);
    onSelect(id);
  }

  function playNextInOrder() {
    if (playbackMode !== "order" || videos.length < 2) return;
    const next = videos[(activeIndex + 1) % videos.length];
    setContinuePlayback(true);
    onSelect(next._id);
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="overflow-hidden rounded-lg border border-zinc-800/60 bg-zinc-900/30">
        <div className="flex flex-col gap-3 border-b border-zinc-800/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
              Playback
            </p>
            <p className="text-xs text-zinc-500">
              {activeIsImage
                ? "Reviewing the selected image"
                : playbackMode === "loop"
                ? "Looping the selected clip"
                : "Advancing through the strip below"}
            </p>
          </div>
          <div className="grid grid-cols-2 rounded-lg border border-zinc-800 bg-zinc-950/70 p-1 sm:flex">
            <button
              type="button"
              aria-pressed={playbackMode === "order"}
              onClick={() => {
                setPlaybackMode("order");
                setContinuePlayback(false);
              }}
              className={cn(
                "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium text-zinc-500 transition",
                playbackMode === "order"
                  ? "bg-zinc-800 text-zinc-100"
                  : "hover:bg-zinc-900 hover:text-zinc-300",
              )}
            >
              <ListVideo className="h-3.5 w-3.5" />
              Play order
            </button>
            <button
              type="button"
              aria-pressed={playbackMode === "loop"}
              onClick={() => {
                setPlaybackMode("loop");
                setContinuePlayback(false);
              }}
              className={cn(
                "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium text-zinc-500 transition",
                playbackMode === "loop"
                  ? "bg-zinc-800 text-zinc-100"
                  : "hover:bg-zinc-900 hover:text-zinc-300",
              )}
            >
              <Repeat2 className="h-3.5 w-3.5" />
              Loop clip
            </button>
          </div>
        </div>
        <div className="relative bg-black">
          <VideoPlayer
            key={active._id}
            storageKey={active.storageKey}
            spriteKey={active.spriteKey}
            mimeType={active.mimeType}
            assetClass={active.assetClass}
            version={active.updatedAt}
            fps={active.fps}
            width={active.width}
            height={active.height}
            loop={playbackMode === "loop"}
            autoPlay={continuePlayback}
            onEnded={playNextInOrder}
          />
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
        <div className="grid gap-3 border-t border-zinc-800/60 px-4 py-4 sm:flex sm:flex-wrap sm:items-center sm:gap-4 sm:px-6">
          <div className="min-w-[7.5rem] rounded-md border border-zinc-800/80 bg-zinc-950/70 px-2 py-1.5">
            <VideoStatusControl
              status={active.status}
              canEdit={canEdit}
              includeAdminExtras
              onChange={(status: VideoStatus) =>
                void setStatus({ videoId: active._id, status })
              }
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-base font-medium text-zinc-100 sm:truncate sm:text-lg">
              {active.title}
            </h2>
            <p className="text-[11px] text-zinc-600">
              {activeIndex + 1} / {videos.length} /{" "}
              {activeIsImage ? mediaKindLabel(active) : formatDuration(active.durationSec)} /{" "}
              {active.originalFilename}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
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
          </div>
        </div>
      </div>

      <div>
          <div className="mb-3 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
          In this project
        </div>
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
          {videos.map((video) => (
            <button
              key={video._id}
              type="button"
              onClick={() => selectVideo(video._id)}
              className={cn(
                "relative aspect-video w-36 shrink-0 overflow-hidden rounded-lg border bg-zinc-950 text-left transition sm:w-40",
                video._id === active._id
                  ? "border-teal-300/80"
                  : "border-zinc-800/60 opacity-65 hover:opacity-100",
              )}
            >
              <ReviewStripThumbnail video={video} />
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

function ReviewStripThumbnail({ video }: { video: VideoDoc }) {
  const isImage = isImageAsset(video);
  const thumbUrl = useStorageUrl(
    video.thumbnailKey ?? (isImage ? video.storageKey : undefined),
    video.updatedAt,
  );
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  useEffect(() => {
    setThumbnailFailed(false);
  }, [thumbUrl]);

  if (thumbUrl && !thumbnailFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={thumbUrl}
        alt=""
        className="h-full w-full object-cover"
        onError={() => setThumbnailFailed(true)}
      />
    );
  }

  return (
    <div className="grid h-full place-items-center text-xs text-zinc-700">
      {video.processingStatus === "processing" ? "Processing..." : "No thumbnail"}
    </div>
  );
}
