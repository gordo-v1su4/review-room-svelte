"use client";

import type { DragEvent } from "react";
import type { VideoDoc } from "@/lib/smartViews";
import type { CardAspectRatio, GridSize, ThumbnailScale } from "@/lib/types";
import { cn } from "@/lib/utils";
import { VideoCard } from "./VideoCard";

export function VideoGrid({
  videos,
  leadingItems,
  selectedId,
  size,
  aspectRatio = "video",
  thumbnailScale = "fill",
  showCardInfo = true,
  actionMode = "admin",
  token,
  onDragStart,
  onSelect,
  onOpenImagePreview,
  empty,
}: {
  videos: VideoDoc[];
  leadingItems?: React.ReactNode;
  selectedId?: string;
  size: GridSize;
  aspectRatio?: CardAspectRatio;
  thumbnailScale?: ThumbnailScale;
  showCardInfo?: boolean;
  actionMode?: "admin" | "client";
  token?: string;
  onDragStart?: (event: DragEvent<HTMLElement>, video: VideoDoc) => void;
  onSelect: (id: VideoDoc["_id"]) => void;
  onOpenImagePreview?: (video: VideoDoc) => void;
  empty?: React.ReactNode;
}) {
  if (!videos.length && !leadingItems) {
    return (
      <div className="mx-4 flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-zinc-800 px-4 text-center text-sm text-zinc-500 sm:mx-6 lg:mx-8">
        {empty ?? "No media"}
      </div>
    );
  }

  const gridClass =
    size === "sm"
      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
      : size === "lg"
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

  return (
    <div className={cn("grid gap-3 p-4 sm:p-6 lg:p-8", gridClass)}>
      {leadingItems}
      {videos.map((video) => (
        <VideoCard
          key={video._id}
          video={video}
          size={size}
          aspectRatio={aspectRatio}
          thumbnailScale={thumbnailScale}
          showCardInfo={showCardInfo}
          actionMode={actionMode}
          token={token}
          onDragStart={onDragStart}
          selected={selectedId === video._id}
          onSelect={() => onSelect(video._id)}
          onOpenImagePreview={
            onOpenImagePreview ? () => onOpenImagePreview(video) : undefined
          }
        />
      ))}
    </div>
  );
}
