"use client";

import type { DragEvent } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import type { VideoDoc } from "@/lib/smartViews";
import type { CardFieldId } from "@/lib/cardFields";
import type { CardAspectRatio, GridSize, GroupByField, ThumbnailScale } from "@/lib/types";
import { groupVideosByField } from "@/lib/groupVideos";
import { assetGridClass, assetGridStyle } from "@/lib/gridLayout";
import { VideoCard } from "@/components/video/VideoCard";
import { cn } from "@/lib/utils";
import type { MediaSelectModifiers } from "@/lib/mediaSelection";

export function VideoFieldGroupedView({
  videos,
  groupBy,
  folderTitleById,
  projectTitle,
  size,
  aspectRatio = "video",
  thumbnailScale = "fill",
  showCardInfo = true,
  visibleFields,
  fieldOrder,
  selectedId,
  checkedIds,
  onDragStart,
  onSelect,
  onOpenImagePreview,
  onOpenVideoPreview,
  folderLabelFor,
  onOpenVideoFolder,
}: {
  videos: VideoDoc[];
  groupBy: GroupByField;
  folderTitleById: Map<Id<"projectFolders">, string>;
  projectTitle?: string;
  size: GridSize;
  aspectRatio?: CardAspectRatio;
  thumbnailScale?: ThumbnailScale;
  showCardInfo?: boolean;
  visibleFields?: CardFieldId[];
  fieldOrder?: CardFieldId[];
  selectedId?: string;
  checkedIds?: string[];
  onDragStart?: (event: DragEvent<HTMLElement>, video: VideoDoc) => void;
  onSelect: (id: VideoDoc["_id"], modifiers?: MediaSelectModifiers) => void;
  onOpenImagePreview?: (video: VideoDoc) => void;
  onOpenVideoPreview?: (video: VideoDoc) => void;
  folderLabelFor?: (video: VideoDoc) => string | undefined;
  onOpenVideoFolder?: (video: VideoDoc) => void;
}) {
  const groups = groupVideosByField(videos, groupBy, folderTitleById, projectTitle);

  if (!videos.length) {
    return (
      <div className="mx-4 flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-zinc-800 px-4 text-center text-sm text-zinc-500 sm:mx-6 lg:mx-8">
        No media
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      {groups.map((group) => (
        <section key={group.key}>
          <h3 className="mb-3 text-sm font-medium text-zinc-400">
            {group.label}
            <span className="ml-2 text-xs tabular-nums text-zinc-600">
              {group.videos.length}
            </span>
          </h3>
          <div className={cn(assetGridClass())} style={assetGridStyle(size)}>
            {group.videos.map((video) => (
              <VideoCard
                key={video._id}
                video={video}
                size={size}
                aspectRatio={aspectRatio}
                thumbnailScale={thumbnailScale}
                showCardInfo={showCardInfo}
                visibleFields={visibleFields}
                fieldOrder={fieldOrder}
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
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
