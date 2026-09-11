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
import { WORKSPACE_CHROME_MARGIN, WORKSPACE_CHROME_PADDING } from "@/lib/workspaceLayout";

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
      <div
        className={cn(
          WORKSPACE_CHROME_MARGIN,
          "flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-800 text-sm text-zinc-500",
        )}
      >
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
    <div
      className={cn(
        WORKSPACE_CHROME_PADDING,
        "flex min-h-0 flex-1 flex-col overflow-hidden pt-2 pb-2 sm:pt-2 lg:pb-14",
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800/60 pb-2">
        <div className="min-w-0">
          <p className="rr-eyebrow text-[10px]" style={{ color: "var(--brand-accent)" }}>
            Review mode
          </p>
          <p className="rr-readout truncate text-[10px] tracking-[0.08em] text-zinc-500 uppercase">
            {activeIsImage
              ? "Image review"
              : playbackMode === "loop"
                ? "Loop clip"
                : "Play in order"}
          </p>
        </div>
        <div className="inline-flex shrink-0 rounded-md border border-zinc-800 bg-zinc-950/70 p-0.5">
          <button
            type="button"
            aria-pressed={playbackMode === "order"}
            onClick={() => {
              setPlaybackMode("order");
              setContinuePlayback(false);
            }}
            className={cn(
              "inline-flex h-7 items-center justify-center gap-1 rounded px-2 font-mono text-[9px] font-medium tracking-[0.1em] uppercase text-zinc-500 transition",
              playbackMode === "order"
                ? "bg-zinc-800 text-zinc-100"
                : "hover:bg-zinc-900 hover:text-zinc-300",
            )}
          >
            <ListVideo className="h-3 w-3" />
            <span className="hidden sm:inline">Order</span>
          </button>
          <button
            type="button"
            aria-pressed={playbackMode === "loop"}
            onClick={() => {
              setPlaybackMode("loop");
              setContinuePlayback(false);
            }}
            className={cn(
              "inline-flex h-7 items-center justify-center gap-1 rounded px-2 font-mono text-[9px] font-medium tracking-[0.1em] uppercase text-zinc-500 transition",
              playbackMode === "loop"
                ? "bg-zinc-800 text-zinc-100"
                : "hover:bg-zinc-900 hover:text-zinc-300",
            )}
          >
            <Repeat2 className="h-3 w-3" />
            <span className="hidden sm:inline">Loop</span>
          </button>
        </div>
      </div>

      <div className="relative mt-2 flex min-h-[34dvh] flex-1 flex-col overflow-hidden rounded-lg border border-zinc-800/60 bg-black lg:min-h-0">
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="flex h-full min-h-0 w-full max-w-full flex-col px-1 py-1 sm:px-2">
            <VideoPlayer
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
              fitAvailable
              onEnded={playNextInOrder}
            />
          </div>
          {videos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="absolute left-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/45 text-zinc-200 backdrop-blur transition hover:bg-black/70 sm:left-3 sm:h-9 sm:w-9"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate(1)}
                className="absolute right-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/45 text-zinc-200 backdrop-blur transition hover:bg-black/70 sm:right-3 sm:h-9 sm:w-9"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t border-zinc-800/60 bg-zinc-950/90 px-2 py-1.5 sm:gap-3 sm:px-3">
          <VideoStatusControl
            status={active.status}
            canEdit={canEdit}
            includeAdminExtras
            compact
            hideLabel
            onChange={(status: VideoStatus) =>
              void setStatus({ videoId: active._id, status })
            }
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xs font-medium text-zinc-100 sm:text-sm">
              {active.title}
            </h2>
            <p className="truncate text-[10px] text-zinc-600">
              {activeIndex + 1} / {videos.length} ·{" "}
              {activeIsImage ? mediaKindLabel(active) : formatDuration(active.durationSec)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <VideoRatingControl
              value={active.rating}
              onChange={(rating) => void setRating({ videoId: active._id, rating })}
            />
            <Button
              variant={active.isSelect ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "h-7 gap-1 px-2 text-xs",
                active.isSelect && "border-sky-500/25 bg-sky-500/10 text-sky-200",
              )}
              onClick={() => void toggleSelect({ videoId: active._id })}
            >
              <Bookmark
                className={cn("h-3.5 w-3.5", active.isSelect && "fill-sky-400 text-sky-400")}
              />
              <span className="hidden sm:inline">
                {active.isSelect ? "Selected" : "Select"}
              </span>
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-2 shrink-0">
        <div className="rr-eyebrow mb-1 text-[10px]">
          Sequence — {String(videos.length).padStart(2, "0")} clips
        </div>
        <div className="no-scrollbar flex items-end gap-2 overflow-x-auto">
          {videos.map((video) => (
            <button
              key={video._id}
              type="button"
              onClick={() => selectVideo(video._id)}
              className={cn(
                "relative aspect-[16/9] w-24 shrink-0 overflow-hidden rounded-md border bg-zinc-950 text-left transition sm:w-28 md:w-32",
                video._id === active._id
                  ? "border-teal-300/80"
                  : "border-zinc-800/60 opacity-65 hover:opacity-100",
              )}
            >
              <ReviewStripThumbnail video={video} />
              <div className="absolute inset-x-0 bottom-0.5 bg-gradient-to-t from-black/40 to-transparent px-1 pb-0.5 pt-2">
                <p className="truncate text-[9px] font-medium text-zinc-100/40 sm:text-[10px]">
                  {video.title}
                </p>
              </div>
              {video.isSelect && (
                <Bookmark className="absolute right-1 top-1 h-3 w-3 fill-sky-400 text-sky-400" />
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
    <div className="grid h-full place-items-center text-[10px] text-zinc-700">
      {video.processingStatus === "processing" ? "Processing..." : "No thumbnail"}
    </div>
  );
}
