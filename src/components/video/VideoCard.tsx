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
import {
  MessageSquare,
  Bookmark,
  Check,
  Folder,
  PenLine,
  Star,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { VideoDoc } from "@/lib/smartViews";
import type { CardFieldId } from "@/lib/cardFields";
import { DEFAULT_VISIBLE_CARD_FIELDS } from "@/lib/cardFields";
import type { CardAspectRatio, ThumbnailScale } from "@/lib/types";
import { assetClassLabel, isImageAsset, mediaKindLabel } from "@/lib/media";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { VideoStatusControl } from "./VideoStatusControl";
import { VideoRatingControl } from "./VideoRatingControl";
import type { VideoStatus } from "@/lib/types";
import { isOmittedAsset } from "@/lib/videoStatus";
import {
  emptySelectModifiers,
  modifiersFromEvent,
  type MediaSelectModifiers,
} from "@/lib/mediaSelection";
import { useStorageUrl } from "@/hooks/useStorageUrl";
import {
  ImageAnnotationOverlay,
  hasImageAnnotations,
  type AnnotationStroke,
} from "./ImageAnnotationLayer";

export function VideoCard({
  video,
  selected,
  checked,
  size = "md",
  aspectRatio = "video",
  thumbnailScale = "fill",
  showCardInfo = true,
  visibleFields,
  fieldOrder,
  actionMode = "admin",
  token,
  folderLabel,
  onOpenFolder,
  onDragStart,
  onSelect,
  onOpenImagePreview,
  onOpenVideoPreview,
}: {
  video: VideoDoc;
  selected?: boolean;
  checked?: boolean;
  size?: "sm" | "md" | "lg";
  aspectRatio?: CardAspectRatio;
  thumbnailScale?: ThumbnailScale;
  showCardInfo?: boolean;
  visibleFields?: CardFieldId[];
  fieldOrder?: CardFieldId[];
  actionMode?: "admin" | "client";
  token?: string;
  folderLabel?: string;
  onOpenFolder?: () => void;
  onDragStart?: (event: DragEvent<HTMLElement>, video: VideoDoc) => void;
  onSelect: (modifiers?: MediaSelectModifiers) => void;
  onOpenImagePreview?: () => void;
  onOpenVideoPreview?: () => void;
}) {
  const isImage = isImageAsset(video);
  const thumbUrl = useStorageUrl(
    video.thumbnailKey ?? (isImage ? video.storageKey : undefined),
    video.updatedAt,
  );
  const spriteUrl = useStorageUrl(video.spriteKey, video.updatedAt);
  const canScrub = Boolean(spriteUrl);
  const annotationStrokes = video.annotationStrokes as AnnotationStroke[] | undefined;
  const annotated = hasImageAnnotations(annotationStrokes);
  const toggleSelectAdmin = useMutation(api.videos.toggleSelect);
  const toggleSelectClient = useMutation(api.reviewPublic.clientToggleSelect);
  const setRatingAdmin = useMutation(api.videos.setRating);
  const setRatingClient = useMutation(api.reviewPublic.clientSetRating);
  const setStatusAdmin = useMutation(api.videos.updateMetadata);
  const setStatusClient = useMutation(api.reviewPublic.clientSetStatus);
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
  const annotationSurfaceStyle = useMemo(
    () =>
      getMediaSurfaceStyle({
        containerAspect,
        mediaAspect: frameAspect,
        scale: thumbnailScale,
      }),
    [containerAspect, frameAspect, thumbnailScale],
  );
  const titleClass =
    size === "lg"
      ? "line-clamp-2 text-xs leading-4"
      : "line-clamp-1 text-[11px] leading-4";
  const visible = new Set(visibleFields ?? DEFAULT_VISIBLE_CARD_FIELDS);
  const orderedFields = (fieldOrder ?? visibleFields ?? DEFAULT_VISIBLE_CARD_FIELDS).filter(
    (field) => visible.has(field) && field !== "status",
  );
  const showStatusFooter = visible.has("status");
  const canChangeStatus = actionMode === "admin" || Boolean(token);
  const omitted = isOmittedAsset(video);
  const multiSelect = checked !== undefined;

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

  function changeStatus(status: VideoStatus) {
    if (actionMode === "client" && token) {
      if (
        status !== "awaiting_review" &&
        status !== "in_progress" &&
        status !== "needs_changes" &&
        status !== "approved"
      ) {
        return;
      }
      void setStatusClient({ token, videoId: video._id, status });
      return;
    }
    void setStatusAdmin({ videoId: video._id, status });
  }

  function openPreview(event?: MouseEvent<HTMLElement>) {
    event?.preventDefault();
    event?.stopPropagation();
    if (isImage) {
      onOpenImagePreview?.();
      return;
    }
    onOpenVideoPreview?.();
  }

  return (
    <article
      role="button"
      tabIndex={0}
      draggable={Boolean(onDragStart)}
      onClick={(event) => onSelect(modifiersFromEvent(event))}
      onDoubleClick={(event) => openPreview(event)}
      onDragStart={(event) => onDragStart?.(event, video)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(emptySelectModifiers());
        }
      }}
      className={cn(
        "group relative flex w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-lg border bg-zinc-900/80 text-left transition-all",
        onDragStart && "cursor-grab active:cursor-grabbing",
        selected
          ? "border-[var(--selected)] ring-1 ring-[color-mix(in_srgb,var(--selected)_50%,transparent)]"
          : checked
            ? "border-[var(--brand-accent)]/40 ring-1 ring-[color-mix(in_srgb,var(--brand-accent)_22%,transparent)]"
            : "border-zinc-800/80 hover:border-zinc-600",
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
            className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-[var(--brand-accent)] shadow-[0_0_10px_color-mix(in_srgb,var(--brand-accent)_85%,transparent)]"
            style={{ left: `${hoverPct * 100}%` }}
          />
        )}
        {isImage && annotated && (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-[8]"
            style={annotationSurfaceStyle}
          >
            <ImageAnnotationOverlay strokes={annotationStrokes} scaleStroke />
          </div>
        )}
        {omitted && (
          <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-[color-mix(in_srgb,var(--status-omitted)_36%,transparent)]">
            <span className="text-[11px] font-medium uppercase tracking-wide text-red-50/90">
              Omit
            </span>
          </div>
        )}
        <div
          className={cn(
            "absolute right-2 top-2 flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0",
            omitted && "z-30",
            "sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
            video.isSelect && "opacity-100",
          )}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          {isImage && onOpenImagePreview && (
            <button
              type="button"
              title={annotated ? "Markup saved" : "Markup"}
              className={cn(
                "grid h-6 w-6 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white",
                annotated && "text-[var(--annotation)]",
              )}
              onClick={openPreview}
            >
              <PenLine
                className={cn(
                  "h-3 w-3",
                  annotated && "fill-[color-mix(in_srgb,var(--annotation)_20%,transparent)] text-[var(--annotation)]",
                )}
              />
            </button>
          )}
          <button
            type="button"
            title={video.isSelect ? "Remove from selected" : "Select"}
            className={cn(
              "grid h-6 w-6 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white",
              video.isSelect && "text-[var(--selected)]",
            )}
            onClick={toggleShortlist}
          >
            <Bookmark
              className={cn(
                "h-3 w-3",
                video.isSelect && "fill-[var(--selected)] text-[var(--selected)]",
              )}
            />
          </button>
        </div>
        <div
          className={cn(
            "absolute left-2 top-2 flex items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
            (video.rating > 0 || checked) && "opacity-100",
            omitted && "z-30",
          )}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          {multiSelect && (
            <button
              type="button"
              title={checked ? "Deselect" : "Select"}
              aria-pressed={checked}
              className="grid h-6 w-6 place-items-center rounded-full transition hover:bg-white/10"
              onClick={(event) => {
                event.stopPropagation();
                onSelect({
                  shiftKey: event.shiftKey,
                  metaKey: true,
                  ctrlKey: false,
                });
              }}
              onDoubleClick={(event) => event.stopPropagation()}
            >
              <span
                className={cn(
                  "grid h-3 w-3 place-items-center rounded-[3px] border border-white/50 bg-transparent",
                  checked && "border-[var(--brand-accent)] bg-[var(--brand-accent)] text-white",
                  !checked && "text-transparent",
                )}
              >
                <Check className="h-2.5 w-2.5" />
              </span>
            </button>
          )}
          <VideoRatingControl
            value={video.rating}
            onChange={rateVideo}
            className="gap-0"
            starClassName="h-3 w-3"
            buttonClassName="h-5 w-4 text-zinc-400 hover:text-[var(--rating)]"
          />
        </div>
        <div
          className={cn(
            "absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2",
            omitted && "z-30",
          )}
        >
          {visible.has("duration") && !isImage && (
            <span className="text-[10px] text-zinc-500">
              {formatDuration(video.durationSec)}
            </span>
          )}
          {visible.has("assetClass") && (
            <span className="text-[10px] text-zinc-500">
              {video.assetClass ? video.assetClass : mediaKindLabel(video)}
            </span>
          )}
        </div>
      </div>
      {showCardInfo && (
        <div className={cn("space-y-1.5", size === "sm" ? "p-2" : "p-2.5")}>
          {folderLabel && (
            <button
              type="button"
              title={`In ${folderLabel} — open group`}
              className="flex min-w-0 max-w-full items-center gap-1 rounded-full border border-zinc-800 bg-zinc-950/80 px-1.5 py-0.5 text-[9px] font-medium text-zinc-500 transition hover:border-zinc-600 hover:text-zinc-200"
              onClick={(event) => {
                event.stopPropagation();
                onOpenFolder?.();
              }}
            >
              <Folder className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{folderLabel}</span>
            </button>
          )}
          <p
            title={video.title}
            className={cn(
              "font-medium text-zinc-400 transition-colors group-hover:text-zinc-200",
              titleClass,
            )}
          >
            {video.title}
          </p>
          {orderedFields.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-600">
              {orderedFields.map((field) => (
                <CardFieldChip key={field} field={field} video={video} />
              ))}
            </div>
          )}
        </div>
      )}
      {showStatusFooter && (
        <div
          className={cn(
            "border-t border-zinc-800/80 bg-zinc-950/55",
            size === "sm" ? "px-2 py-1.5" : "px-2.5 py-2",
          )}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <VideoStatusControl
            status={video.status}
            canEdit={canChangeStatus}
            includeAdminExtras={actionMode === "admin"}
            compact={size === "sm"}
            onChange={changeStatus}
          />
        </div>
      )}
    </article>
  );
}

function CardFieldChip({
  field,
  video,
}: {
  field: CardFieldId;
  video: VideoDoc;
}) {
  switch (field) {
    case "status":
      return null;
    case "rating":
      if (video.rating <= 0) return null;
      return (
        <span className="inline-flex items-center gap-0.5 text-[var(--rating)]">
          <Star className="h-3 w-3 fill-[var(--rating)]" />
          {video.rating}/5
        </span>
      );
    case "shortlist":
      if (!video.isSelect) return null;
      return <Bookmark className="h-3 w-3 fill-[var(--selected)] text-[var(--selected)]" />;
    case "uploadedAt":
      return (
        <span>
          {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
            new Date(video.uploadedAt),
          )}
        </span>
      );
    case "duration":
      if (!video.durationSec) return null;
      return <span>{formatDuration(video.durationSec)}</span>;
    case "resolution":
      if (!video.width || !video.height) return null;
      return <span>{video.width}×{video.height}</span>;
    case "assetCode":
      if (!video.assetCode) return null;
      return (
        <span className="rounded-full border border-zinc-800 bg-zinc-950/80 px-1.5 py-0.5 text-[9px] tracking-wide text-zinc-500">
          {video.assetCode}
        </span>
      );
    case "assetClass":
      if (!video.assetClass) return null;
      return <span title={assetClassLabel(video.assetClass)}>{video.assetClass}</span>;
    case "commentCount":
      if (video.commentCount <= 0) return null;
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1",
            video.feedbackNeedsAttention && "text-[var(--info)]",
          )}
        >
          <MessageSquare className="h-3 w-3" />
          {video.commentCount}
        </span>
      );
    case "tags":
      if (!video.tags.length) return null;
      return (
        <span className="truncate text-zinc-500">{video.tags.slice(0, 2).join(", ")}</span>
      );
    case "filename":
      return <span className="truncate text-zinc-500">{video.originalFilename}</span>;
    case "uploader":
      return <span className="text-zinc-500">Team</span>;
    default:
      return null;
  }
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

function getMediaSurfaceStyle({
  containerAspect,
  mediaAspect,
  scale,
}: {
  containerAspect: number;
  mediaAspect: number;
  scale: ThumbnailScale;
}): CSSProperties {
  const mediaRatio = Math.max(mediaAspect, 0.1);
  const mediaIsWider = mediaRatio > containerAspect;
  const width =
    scale === "fit"
      ? mediaIsWider
        ? "100%"
        : `${(mediaRatio / containerAspect) * 100}%`
      : mediaIsWider
        ? `${(mediaRatio / containerAspect) * 100}%`
        : "100%";
  const height =
    scale === "fit"
      ? mediaIsWider
        ? `${(containerAspect / mediaRatio) * 100}%`
        : "100%"
      : mediaIsWider
        ? "100%"
        : `${(containerAspect / mediaRatio) * 100}%`;

  return {
    width,
    height,
    transform: "translate(-50%, -50%)",
  };
}
