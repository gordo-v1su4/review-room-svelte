"use client";

import {
  type CSSProperties,
  type DragEvent,
  type MouseEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useMutation } from "convex/react";
import { MessageSquare, Download, Bookmark, Maximize2, Star, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { VideoDoc } from "@/lib/smartViews";
import type { CardAspectRatio, ThumbnailScale } from "@/lib/types";
import { assetClassLabel, isImageAsset, mediaKindLabel } from "@/lib/media";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { VideoStatusPill } from "./VideoStatusPill";
import { useStorageUrl } from "@/hooks/useStorageUrl";

export function VideoCard({
  video,
  selected,
  size = "md",
  aspectRatio = "video",
  thumbnailScale = "fill",
  showCardInfo = true,
  actionMode = "admin",
  token,
  onDragStart,
  onSelect,
  onOpenImagePreview,
}: {
  video: VideoDoc;
  selected?: boolean;
  size?: "sm" | "md" | "lg";
  aspectRatio?: CardAspectRatio;
  thumbnailScale?: ThumbnailScale;
  showCardInfo?: boolean;
  actionMode?: "admin" | "client";
  token?: string;
  onDragStart?: (event: DragEvent<HTMLElement>, video: VideoDoc) => void;
  onSelect: () => void;
  onOpenImagePreview?: () => void;
}) {
  const isImage = isImageAsset(video);
  const thumbUrl = useStorageUrl(
    video.thumbnailKey ?? (isImage ? video.storageKey : undefined),
    video.updatedAt,
  );
  const spriteUrl = useStorageUrl(video.spriteKey, video.updatedAt);
  const canScrub = Boolean(spriteUrl);
  const toggleSelectAdmin = useMutation(api.videos.toggleSelect);
  const toggleSelectClient = useMutation(api.reviewPublic.clientToggleSelect);
  const setRatingAdmin = useMutation(api.videos.setRating);
  const setRatingClient = useMutation(api.reviewPublic.clientSetRating);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [spriteAspect, setSpriteAspect] = useState<number | null>(null);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const spriteFrameCount = 10;
  const scrubFrame =
    hoverPct == null
      ? 0
      : Math.min(
          spriteFrameCount - 1,
          Math.max(0, Math.floor(hoverPct * spriteFrameCount)),
        );
  const frameAspect =
    spriteAspect ??
    (video.width && video.height ? video.width / video.height : 16 / 9);
  const containerAspect = aspectRatioToNumber(aspectRatio);
  const spriteSurfaceStyle = useMemo(
    () =>
      getSpriteSurfaceStyle({
        containerAspect,
        frameAspect,
        frameCount: spriteFrameCount,
        frameIndex: scrubFrame,
        scale: thumbnailScale,
        spriteUrl,
      }),
    [
      containerAspect,
      frameAspect,
      scrubFrame,
      spriteFrameCount,
      spriteUrl,
      thumbnailScale,
    ],
  );
  const titleClass =
    size === "lg"
      ? "line-clamp-2 text-[13px] leading-5"
      : "line-clamp-1 text-[12px] leading-4";

  useEffect(() => {
    setThumbnailFailed(false);
  }, [thumbUrl]);

  useEffect(() => {
    if (!spriteUrl) {
      setSpriteAspect(null);
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled || image.naturalHeight <= 0) return;
      setSpriteAspect(image.naturalWidth / spriteFrameCount / image.naturalHeight);
    };
    image.onerror = () => {
      if (!cancelled) setSpriteAspect(null);
    };
    image.src = spriteUrl;

    return () => {
      cancelled = true;
    };
  }, [spriteFrameCount, spriteUrl]);

  function toggleShortlist() {
    if (actionMode === "client" && token) {
      void toggleSelectClient({ token, videoId: video._id });
      return;
    }
    void toggleSelectAdmin({ videoId: video._id });
  }

  function rateVideo(rating: number) {
    if (actionMode === "client" && token) {
      void setRatingClient({ token, videoId: video._id, rating });
      return;
    }
    void setRatingAdmin({ videoId: video._id, rating });
  }

  function openImagePreview(event?: MouseEvent<HTMLElement>) {
    event?.preventDefault();
    event?.stopPropagation();
    if (!isImage || !onOpenImagePreview) return;
    onOpenImagePreview();
  }

  return (
    <article
      role="button"
      tabIndex={0}
      draggable={Boolean(onDragStart)}
      onClick={onSelect}
      onDoubleClick={(event) => openImagePreview(event)}
      onDragStart={(event) => onDragStart?.(event, video)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group relative flex w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-lg border bg-zinc-900/80 text-left transition-all",
        onDragStart && "cursor-grab active:cursor-grabbing",
        selected
          ? "border-sky-300 ring-1 ring-sky-300/50"
          : "border-zinc-800/80 hover:border-zinc-600",
        video.markedForDeletion &&
          actionMode === "admin" &&
          "border-red-900/70 bg-red-950/25 hover:border-red-700/80",
      )}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden bg-zinc-950",
          aspectRatioClass[aspectRatio],
        )}
        onMouseMove={(e) => {
          if (!canScrub) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          setHoverPct(Math.min(1, Math.max(0, pct)));
        }}
        onMouseLeave={() => setHoverPct(null)}
      >
        {canScrub && hoverPct != null ? (
          <div
            className="absolute left-1/2 top-1/2 bg-no-repeat"
            style={spriteSurfaceStyle}
          />
        ) : thumbUrl && !thumbnailFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl}
            alt=""
            onError={() => setThumbnailFailed(true)}
            className={cn(
              "h-full w-full",
              thumbnailScale === "fit" ? "object-contain" : "object-cover",
            )}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-600">
            {video.processingStatus === "processing" ? "Processing..." : "No preview"}
          </div>
        )}
        {canScrub && hoverPct != null && (
          <div
            className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-teal-300 shadow-[0_0_10px_rgba(45,212,191,0.85)]"
            style={{ left: `${hoverPct * 100}%` }}
          />
        )}
        {video.markedForDeletion && actionMode === "admin" && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-red-950/55 text-red-100 ring-1 ring-inset ring-red-500/30 backdrop-blur-[1px]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300/25 bg-black/45 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide">
              <Trash2 className="h-3 w-3" />
              Marked for delete
            </span>
          </div>
        )}
        <div
          className={cn(
            "absolute right-2 top-2 flex items-center gap-0.5 rounded-full border border-white/10 bg-black/55 p-0.5 opacity-100 shadow-sm backdrop-blur transition-opacity sm:opacity-0",
            video.markedForDeletion && actionMode === "admin" && "z-30",
            "sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
            video.isSelect && "opacity-100",
          )}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          {isImage && onOpenImagePreview && (
            <button
              type="button"
              title="Preview image"
              className="grid h-6 w-6 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white"
              onClick={openImagePreview}
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            title={video.isSelect ? "Remove from selected" : "Select"}
            className={cn(
              "grid h-6 w-6 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white",
              video.isSelect && "text-sky-300",
            )}
            onClick={toggleShortlist}
          >
            <Bookmark
              className={cn("h-3 w-3", video.isSelect && "fill-sky-400 text-sky-400")}
            />
          </button>
        </div>
        <div
          className={cn(
            "absolute left-2 top-2 flex items-center rounded-full border border-white/10 bg-black/55 px-1 py-0.5 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
            video.markedForDeletion && actionMode === "admin" && "z-30",
          )}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              title={`Rate ${rating}/5`}
              className="grid h-5 w-4 place-items-center text-zinc-400 transition hover:text-yellow-300"
              onClick={() => rateVideo(rating)}
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
        <div
          className={cn(
            "absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2",
            video.markedForDeletion && actionMode === "admin" && "z-30",
          )}
        >
          <VideoStatusPill status={video.status} />
          <span className="text-[10px] text-zinc-500">
            {video.assetClass ? video.assetClass : isImage ? mediaKindLabel(video) : formatDuration(video.durationSec)}
          </span>
        </div>
      </div>
      {showCardInfo && (
        <div className={cn("space-y-1.5", size === "sm" ? "p-2.5" : "p-3")}>
          {video.assetCode && (
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-400">
                {video.assetCode}
              </span>
              {video.feedbackNeedsAttention && (
                <span className="rounded-full bg-sky-400/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
                  New notes
                </span>
              )}
            </div>
          )}
          <p
            title={video.title}
            className={cn(
              "font-medium text-zinc-500 transition-colors group-hover:text-zinc-300",
              titleClass,
            )}
          >
            {video.title}
          </p>
          <div className="flex items-center gap-2.5 text-[11px] text-zinc-600">
            {video.rating > 0 && (
              <span className="inline-flex items-center gap-0.5 text-yellow-400">
                <Star className="h-3 w-3 fill-yellow-400" />
                {video.rating}/5
              </span>
            )}
            {video.commentCount > 0 && (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  video.feedbackNeedsAttention && "text-sky-300",
                )}
              >
                <MessageSquare className="h-3 w-3" />
                {video.commentCount}
              </span>
            )}
            {video.isSelect && (
              <Bookmark className="h-3 w-3 fill-sky-400 text-sky-400" />
            )}
            {video.downloadEnabled && <Download className="h-3 w-3" />}
            {video.assetClass && (
              <span title={assetClassLabel(video.assetClass)}>{video.assetClass}</span>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

const aspectRatioClass: Record<CardAspectRatio, string> = {
  video: "aspect-video",
  square: "aspect-square",
  portrait: "aspect-[9/16]",
};

function aspectRatioToNumber(aspectRatio: CardAspectRatio) {
  switch (aspectRatio) {
    case "square":
      return 1;
    case "portrait":
      return 9 / 16;
    case "video":
    default:
      return 16 / 9;
  }
}

function getSpriteSurfaceStyle({
  containerAspect,
  frameAspect,
  frameCount,
  frameIndex,
  scale,
  spriteUrl,
}: {
  containerAspect: number;
  frameAspect: number;
  frameCount: number;
  frameIndex: number;
  scale: ThumbnailScale;
  spriteUrl?: string | null;
}): CSSProperties {
  const frameRatio = Math.max(frameAspect, 0.1);
  const frameIsWider = frameRatio > containerAspect;
  const width =
    scale === "fit"
      ? frameIsWider
        ? "100%"
        : `${(frameRatio / containerAspect) * 100}%`
      : frameIsWider
        ? `${(frameRatio / containerAspect) * 100}%`
        : "100%";
  const height =
    scale === "fit"
      ? frameIsWider
        ? `${(containerAspect / frameRatio) * 100}%`
        : "100%"
      : frameIsWider
        ? "100%"
        : `${(containerAspect / frameRatio) * 100}%`;

  return {
    width,
    height,
    transform: "translate(-50%, -50%)",
    backgroundImage: spriteUrl ? `url(${spriteUrl})` : undefined,
    backgroundSize: `${frameCount * 100}% 100%`,
    backgroundPosition:
      frameCount <= 1 ? "0% center" : `${(frameIndex / (frameCount - 1)) * 100}% center`,
  };
}
