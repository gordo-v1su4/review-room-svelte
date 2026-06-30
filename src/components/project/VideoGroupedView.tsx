"use client";

import type { DragEvent } from "react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { SMART_VIEWS, matchesSmartView, type VideoDoc } from "@/lib/smartViews";
import type { SmartViewId } from "@/lib/types";
import type { CardAspectRatio, GridSize, ThumbnailScale } from "@/lib/types";
import { VideoCard } from "@/components/video/VideoCard";
import { folderCounts, folderCoverAsset, FolderTile } from "./FolderShelf";
import { projectAccent } from "@/lib/projectAccent";

type FolderDoc = Doc<"projectFolders">;

export function VideoGroupedView({
  folders = [],
  folderVideos = [],
  brandColor,
  videos,
  size,
  aspectRatio = "video",
  thumbnailScale = "fill",
  showCardInfo = true,
  selectedId,
  onDragStart,
  onOpenFolder,
  onDropVideo,
  onRenameFolder,
  onRemoveFolder,
  onSelect,
  onOpenImagePreview,
}: {
  folders?: FolderDoc[];
  folderVideos?: VideoDoc[];
  brandColor?: string;
  videos: VideoDoc[];
  size: GridSize;
  aspectRatio?: CardAspectRatio;
  thumbnailScale?: ThumbnailScale;
  showCardInfo?: boolean;
  selectedId?: string;
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
  onSelect: (id: VideoDoc["_id"]) => void;
  onOpenImagePreview?: (video: VideoDoc) => void;
}) {
  const sections = SMART_VIEWS.filter((v) => v.id !== "all");
  const accent = projectAccent(brandColor);
  const cardWidth =
    size === "sm"
      ? "w-[calc(50%_-_0.375rem)] min-w-[150px] sm:w-[180px]"
      : size === "lg"
        ? "w-full sm:w-[320px]"
        : "w-full sm:w-[240px]";

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      {folders.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-medium text-zinc-400">Folders</h3>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            {folders.map((folder) => (
              <div key={folder._id} className={cardWidth}>
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
            <div className="flex flex-wrap gap-3 sm:gap-4">
              {items.map((video) => (
                <div key={video._id} className={cardWidth}>
                  <VideoCard
                    video={video}
                    size={size}
                    aspectRatio={aspectRatio}
                    thumbnailScale={thumbnailScale}
                    showCardInfo={showCardInfo}
                    onDragStart={onDragStart}
                    selected={selectedId === video._id}
                    onSelect={() => onSelect(video._id)}
                    onOpenImagePreview={
                      onOpenImagePreview
                        ? () => onOpenImagePreview(video)
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
