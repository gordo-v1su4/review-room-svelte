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
import { VideoInspectorPanel } from "./VideoInspectorPanel";
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
  const [playhead, setPlayhead] = useState(0);
  const [seekTo, setSeekTo] = useState<number | null>(null);
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
    setSeekTo(null);
    setPlayhead(0);
    onSelect(next._id);
  }

  function selectVideo(id: VideoDoc["_id"]) {
    setContinuePlayback(false);
    setSeekTo(null);
    setPlayhead(0);
    onSelect(id);
  }

  function playNextInOrder() {
    if (playbackMode !== "order" || videos.length < 2) return;
    const next = videos[(activeIndex + 1) % videos.length];
    setContinuePlayback(true);
    setSeekTo(null);
    setPlayhead(0);
    onSelect(next._id);
  }

  return (
    <div className="h-full space-y-3 overflow-y-auto p-2.5 lg:h-auto lg:space-y-5 lg:overflow-visible lg:p-8">
      <div className="mobile-review-player flex h-[calc(100%-1rem)] min-h-[16rem] flex-col overflow-hidden rounded-lg border border-zinc-800/60 bg-zinc-900/30 lg:block lg:h-auto">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800/60 px-2 py-1 lg:px-4 lg:py-3">
          <div className="hidden lg:block">
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
          <div className="grid w-full grid-cols-2 rounded-lg bg-zinc-950/70 p-0.5 lg:flex lg:w-auto lg:border lg:border-zinc-800 lg:p-1">
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
        <div className="relative min-h-0 flex-1 bg-black lg:h-[min(50dvh,36rem)]">
          <VideoPlayer
            fitAvailable
            key={active._id}
            storageKey={active.storageKey}
            spriteKey={active.spriteKey}
            posterKey={active.thumbnailKey}
            mimeType={active.mimeType}
            assetClass={active.assetClass}
            fps={active.fps}
            width={active.width}
            height={active.height}
            loop={playbackMode === "loop"}
            autoPlay={continuePlayback}
            onEnded={playNextInOrder}
            onTimeUpdate={setPlayhead}
            seekTo={seekTo}
          />
          {videos.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous asset"
                onClick={() => navigate(-1)}
                className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/45 text-zinc-200 backdrop-blur transition hover:bg-black/70"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Next asset"
                onClick={() => navigate(1)}
                className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/45 text-zinc-200 backdrop-blur transition hover:bg-black/70"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 border-t border-zinc-800/60 px-2.5 py-2 lg:flex lg:flex-wrap lg:gap-4 lg:px-6 lg:py-4">
          <div className="min-w-[6rem] rounded-md border border-zinc-800/80 bg-zinc-950/70 px-2 py-1 lg:min-w-[7.5rem]">
            <VideoStatusControl
              status={active.status}
              canEdit
              includeAdminExtras={canEdit}
              hideLabel
              onChange={(status: VideoStatus) =>
                void setStatus({ videoId: active._id, status })
              }
            />
          </div>
          <div className="order-first min-w-0 flex-1 lg:order-none">
            <h2 className="truncate text-xs font-medium text-zinc-100 lg:text-lg">
              {active.title}
            </h2>
            <p className="hidden break-words text-[11px] text-zinc-600 [overflow-wrap:anywhere] lg:block">
              {activeIndex + 1} / {videos.length} /{" "}
              {activeIsImage ? mediaKindLabel(active) : formatDuration(active.durationSec)} /{" "}
              {active.originalFilename}
            </p>
          </div>
          <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 lg:justify-start lg:gap-3">
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

      <div className="h-[28rem] overflow-hidden rounded-lg border border-zinc-800">
        <VideoInspectorPanel key={active._id} video={active} mode="admin" canEdit canManageFeedback={canEdit} playhead={playhead} onSeek={setSeekTo} />
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
