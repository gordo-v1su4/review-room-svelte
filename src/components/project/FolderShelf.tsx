"use client";

import { Folder } from "lucide-react";
import { useState, type DragEvent } from "react";
import type { Id, Doc } from "../../../convex/_generated/dataModel";
import type { VideoDoc } from "@/lib/smartViews";
import { mediaKind } from "@/lib/media";
import { cn } from "@/lib/utils";

type FolderDoc = Doc<"projectFolders">;

export function FolderShelf({
  folders,
  videos,
  activeFolderId,
  canEdit,
  onOpen,
  onDropVideo,
}: {
  folders: FolderDoc[];
  videos: VideoDoc[];
  activeFolderId: Id<"projectFolders"> | null;
  canEdit: boolean;
  onOpen: (folderId: Id<"projectFolders"> | null) => void;
  onDropVideo: (
    videoId: Id<"videos">,
    folderId: Id<"projectFolders"> | undefined,
  ) => void;
}) {
  const activeFolder = activeFolderId
    ? folders.find((folder) => folder._id === activeFolderId)
    : null;
  const visibleFolders = activeFolderId
    ? []
    : folders;

  if (!visibleFolders.length || activeFolder) return null;

  return (
    <div className="space-y-3 border-b border-zinc-900/80 px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex flex-wrap gap-3">
        {visibleFolders.map((folder) => (
          <FolderTile
            key={folder._id}
            folder={folder}
            active={false}
            counts={folderCounts(videos, folder._id)}
            canEdit={canEdit}
            onOpen={() => onOpen(folder._id)}
            onDrop={(videoId) => onDropVideo(videoId, folder._id)}
          />
        ))}
      </div>
    </div>
  );
}

function FolderTile({
  folder,
  active,
  counts,
  canEdit,
  onOpen,
  onDrop,
}: {
  folder: FolderDoc;
  active: boolean;
  counts: { total: number; images: number; videos: number };
  canEdit: boolean;
  onOpen: () => void;
  onDrop: (videoId: Id<"videos">) => void;
}) {
  const [dragActive, setDragActive] = useState(false);

  return (
    <button
      type="button"
      onClick={onOpen}
      onDragEnter={(event) => {
        if (!canEdit) return;
        event.preventDefault();
        setDragActive(true);
      }}
      onDragOver={(event) => {
        if (!canEdit) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDragLeave={(event) => {
        if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget as Node)) {
          return;
        }
        setDragActive(false);
      }}
      onDrop={(event) => {
        setDragActive(false);
        const videoId = readDraggedVideoId(event);
        if (!videoId) return;
        event.preventDefault();
        onDrop(videoId);
      }}
      className={cn(
        "group flex h-20 w-full min-w-0 items-center gap-3 rounded-lg border px-3 text-left transition sm:w-[15.5rem]",
        dragActive
          ? "border-sky-300/60 bg-sky-400/15 ring-1 ring-sky-300/25"
          : active
          ? "border-sky-300/45 bg-sky-400/10"
          : "border-zinc-800/70 bg-zinc-900/45 hover:border-zinc-700 hover:bg-zinc-900/75",
      )}
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-md border",
          active
            ? "border-sky-300/30 bg-sky-300/15 text-sky-200"
            : "border-zinc-700/70 bg-zinc-950/60 text-zinc-400 group-hover:text-zinc-200",
        )}
      >
        <Folder className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-zinc-200">
          {folder.title}
        </span>
        <span className="mt-1 block text-[11px] text-zinc-600">
          {counts.total} assets / {counts.videos} video / {counts.images} image
        </span>
      </span>
    </button>
  );
}

function folderCounts(videos: VideoDoc[], folderId: Id<"projectFolders">) {
  const assets = videos.filter((video) => video.folderId === folderId);
  return {
    total: assets.length,
    videos: assets.filter((asset) => mediaKind(asset) === "video").length,
    images: assets.filter((asset) => mediaKind(asset) === "image").length,
  };
}

function readDraggedVideoId(event: DragEvent) {
  const id = event.dataTransfer.getData("application/review-room-video-id");
  return id ? (id as Id<"videos">) : null;
}
