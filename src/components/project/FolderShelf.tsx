"use client";

import { Folder } from "lucide-react";
import { useState, type DragEvent } from "react";
import type { Id, Doc } from "../../../convex/_generated/dataModel";
import type { VideoDoc } from "@/lib/smartViews";
import { mediaKind } from "@/lib/media";
import { projectAccent, projectAccentStyle } from "@/lib/projectAccent";
import { cn } from "@/lib/utils";

type FolderDoc = Doc<"projectFolders">;

export function FolderShelf({
  folders,
  videos,
  activeFolderId,
  brandColor,
  canEdit,
  onOpen,
  onDropVideo,
}: {
  folders: FolderDoc[];
  videos: VideoDoc[];
  activeFolderId: Id<"projectFolders"> | null;
  brandColor?: string;
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
  const accent = projectAccent(brandColor);

  if (!visibleFolders.length || activeFolder) return null;

  return (
    <div className="contents" style={projectAccentStyle(accent)}>
      {visibleFolders.map((folder) => (
        <FolderTile
          key={folder._id}
          folder={folder}
          active={false}
          accent={accent}
          counts={folderCounts(videos, folder._id)}
          canEdit={canEdit}
          onOpen={() => onOpen(folder._id)}
          onDrop={(videoId) => onDropVideo(videoId, folder._id)}
        />
      ))}
    </div>
  );
}

function FolderTile({
  folder,
  active,
  accent,
  counts,
  canEdit,
  onOpen,
  onDrop,
}: {
  folder: FolderDoc;
  active: boolean;
  accent: string;
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
        "group relative flex min-h-[14.25rem] min-w-0 flex-col justify-end overflow-hidden rounded-lg border text-left shadow-sm transition",
        dragActive
          ? "border-[var(--project-accent)] bg-zinc-900"
          : active
            ? "border-[var(--project-accent)] bg-zinc-900"
            : "border-zinc-800/70 bg-zinc-900/45 hover:border-zinc-700 hover:bg-zinc-900/75",
      )}
    >
      <span
        className="absolute left-0 top-0 h-9 w-32 rounded-br-lg border-b border-r border-zinc-700"
        style={{ backgroundColor: accent }}
      />
      <span className="absolute inset-x-0 bottom-0 top-7 rounded-lg rounded-tl-none border-t border-zinc-700 bg-zinc-900" />
      <span className="absolute inset-x-2 top-10 h-[7.8rem] rounded-md border border-zinc-700 bg-zinc-800" />
      <span
        className={cn(
          "relative z-10 mx-auto mb-9 grid h-12 w-12 shrink-0 place-items-center rounded-md border",
          active
            ? "border-zinc-700 bg-zinc-950"
            : "border-zinc-700 bg-zinc-950 text-zinc-400 group-hover:text-zinc-200",
        )}
        style={{ color: active ? accent : undefined }}
      >
        <Folder className="h-6 w-6" />
      </span>
      <span className="relative z-10 block min-w-0 border-t border-zinc-800 bg-zinc-900 px-3 py-3">
        <span className="block truncate text-sm font-medium text-zinc-200">
          {folder.title}
        </span>
        <span className="mt-1 block text-[11px] text-zinc-500">
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
