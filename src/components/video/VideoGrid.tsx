"use client";

import type { DragEvent } from "react";
import type { VideoDoc } from "@/lib/smartViews";
import type { CardFieldId } from "@/lib/cardFields";
import type { CardAspectRatio, GridSize, ThumbnailScale } from "@/lib/types";
import { assetGridClass, assetGridStyle } from "@/lib/gridLayout";
import { cn } from "@/lib/utils";
import type { MediaSelectModifiers } from "@/lib/mediaSelection";
import { VideoCard } from "./VideoCard";

export function VideoGrid({
  videos,
  leadingItems,
  selectedId,
  checkedIds,
  size,
  aspectRatio = "video",
  thumbnailScale = "fill",
  showCardInfo = true,
  visibleFields,
  fieldOrder,
  actionMode = "admin",
  token,
  onDragStart,
  onSelect,
  onOpenImagePreview,
  onOpenVideoPreview,
  folderLabelFor,
  onOpenVideoFolder,
  empty,
}: {
  videos: VideoDoc[];
  leadingItems?: React.ReactNode;
  selectedId?: string;
  checkedIds?: string[];
  size: GridSize;
  aspectRatio?: CardAspectRatio;
  thumbnailScale?: ThumbnailScale;
  showCardInfo?: boolean;
  visibleFields?: CardFieldId[];
  fieldOrder?: CardFieldId[];
  actionMode?: "admin" | "client";
  token?: string;
  onDragStart?: (event: DragEvent<HTMLElement>, video: VideoDoc) => void;
  onSelect: (id: VideoDoc["_id"], modifiers?: MediaSelectModifiers) => void;
  onOpenImagePreview?: (video: VideoDoc) => void;
  onOpenVideoPreview?: (video: VideoDoc) => void;
  folderLabelFor?: (video: VideoDoc) => string | undefined;
  onOpenVideoFolder?: (video: VideoDoc) => void;
  empty?: React.ReactNode;
}) {
  if (!videos.length && !leadingItems) {
    return (
      <div className="mx-4 flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-zinc-800 px-4 text-center text-sm text-zinc-500 sm:mx-6 lg:mx-8">
        {empty ?? "No media"}
      </div>
    );
  }

  return (
    <div
      className={cn(assetGridClass(), "p-4 sm:p-6 lg:p-8")}
      style={assetGridStyle(size)}
    >
      {leadingItems}
      {videos.map((video, index) => (
        <div
          key={video._id}
          className="rr-grid"
          style={{ animationDelay: `${Math.min(index, 11) * 28}ms` }}
        >
        <VideoCard
          video={video}
          size={size}
          aspectRatio={aspectRatio}
          thumbnailScale={thumbnailScale}
          showCardInfo={showCardInfo}
          visibleFields={visibleFields}
          fieldOrder={fieldOrder}
          actionMode={actionMode}
          token={token}
          onDragStart={onDragStart}
          selected={selectedId === video._id}
          checked={checkedIds ? checkedIds.includes(video._id) : undefined}
          folderLabel={folderLabelFor?.(video)}
          onOpenFolder={
            onOpenVideoFolder ? () => onOpenVideoFolder(video) : undefined
          }
          onSelect={(modifiers) => onSelect(video._id, modifiers)}
          onOpenImagePreview={
            onOpenImagePreview ? () => onOpenImagePreview(video) : undefined
          }
          onOpenVideoPreview={
            onOpenVideoPreview ? () => onOpenVideoPreview(video) : undefined
          }
        />
        </div>
      ))}
    </div>
  );
}
