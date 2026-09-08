"use client";

import type { DragEvent } from "react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { SMART_VIEWS, matchesSmartView, type VideoDoc } from "@/lib/smartViews";
import type { SmartViewId } from "@/lib/types";
import type { CardFieldId } from "@/lib/cardFields";
import type { CardAspectRatio, GridSize, ThumbnailScale } from "@/lib/types";
import { VideoCard } from "@/components/video/VideoCard";
import { folderCounts, folderCoverAsset, FolderTile } from "./FolderShelf";
import { assetGridClass, assetGridStyle } from "@/lib/gridLayout";
import { projectAccent } from "@/lib/projectAccent";
import { cn } from "@/lib/utils";
import type { MediaSelectModifiers } from "@/lib/mediaSelection";

type FolderDoc = Doc<"projectFolders">;

export function VideoGroupedView({
  folders = [],
  folderVideos = [],
  projectTitle,
  brandColor,
  videos,
  size,
  aspectRatio = "video",
  thumbnailScale = "fill",
  showCardInfo = true,
  visibleFields,
  fieldOrder,
  selectedId,
  checkedIds,
  onDragStart,
  onOpenFolder,
  onDropVideo,
  onRenameFolder,
  onRemoveFolder,
  onSelect,
  onOpenImagePreview,
  onOpenVideoPreview,
}: {
  folders?: FolderDoc[];
  folderVideos?: VideoDoc[];
  projectTitle?: string;
  brandColor?: string;
  videos: VideoDoc[];
  size: GridSize;
  aspectRatio?: CardAspectRatio;
  thumbnailScale?: ThumbnailScale;
  showCardInfo?: boolean;
  visibleFields?: CardFieldId[];
  fieldOrder?: CardFieldId[];
  selectedId?: string;
  checkedIds?: string[];
  onDragStart?: (event: DragEvent<HTMLElement>, video: VideoDoc) => void;
  onOpenFolder?: (id: Id<"projectFolders">) => void;
  onDropVideo?: (
    videoId: Id<"videos">,
    folderId: Id<"projectFolders"> | undefined,
  ) => void;
  onRenameFolder?: (folderId: Id<"projectFolders">, title: string) => void;
  onRemoveFolder?: (
    folderId: Id<"projectFolders">,
    title: string,
    assetDisposition: "move_to_root" | "archive_assets",
  ) => void;
  onSelect: (id: VideoDoc["_id"], modifiers?: MediaSelectModifiers) => void;
  onOpenImagePreview?: (video: VideoDoc) => void;
  onOpenVideoPreview?: (video: VideoDoc) => void;
}) {
  const sections = SMART_VIEWS.filter((v) => v.id !== "all");
  const accent = projectAccent(brandColor);
  const gridClass = assetGridClass();
  const gridStyle = assetGridStyle(size);

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      {folders.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-medium text-zinc-400">Folders</h3>
          <div className={cn(gridClass)} style={gridStyle}>
            {folders.map((folder) => (
              <div key={folder._id} className="min-w-0">
                <FolderTile
                  folder={folder}
                  active={false}
                  accent={accent}
                  counts={folderCounts(folderVideos, folder._id)}
                  coverAsset={folderCoverAsset(folderVideos, folder)}
                  canEdit={Boolean(onDropVideo)}
                  onOpen={() => onOpenFolder?.(folder._id)}
                  onDrop={(videoId) => onDropVideo?.(videoId, folder._id)}
                  onRename={onRenameFolder}
                  onRemove={onRemoveFolder}
                  projectTitle={projectTitle}
                />
              </div>
            ))}
          </div>
        </section>
      )}
      {sections.map((section) => {
        const items = videos.filter((v) => matchesSmartView(v, section.id));
        if (!items.length) return null;
        return (
          <section key={section.id}>
            <h3 className="mb-3 text-sm font-medium text-zinc-400">{section.label}</h3>
            <div className={cn(gridClass)} style={gridStyle}>
              {items.map((video) => (
                <div key={video._id} className="min-w-0">
                  <VideoCard
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
                    onSelect={(modifiers) => onSelect(video._id, modifiers)}
                    onOpenImagePreview={
                      onOpenImagePreview
                        ? () => onOpenImagePreview(video)
                        : undefined
                    }
                    onOpenVideoPreview={
                      onOpenVideoPreview
                        ? () => onOpenVideoPreview(video)
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
