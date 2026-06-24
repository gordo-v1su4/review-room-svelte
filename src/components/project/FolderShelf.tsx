"use client";

import { Folder, Pencil } from "lucide-react";
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
  onRenameFolder,
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
  onRenameFolder?: (folderId: Id<"projectFolders">, title: string) => void;
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
          onRename={onRenameFolder}
        />
      ))}
    </div>
  );
}

export function FolderTile({
  folder,
  active,
  accent,
  counts,
  canEdit,
  onOpen,
  onDrop,
  onRename,
}: {
  folder: FolderDoc;
  active: boolean;
  accent: string;
  counts: { total: number; images: number; videos: number };
  canEdit: boolean;
  onOpen: () => void;
  onDrop: (videoId: Id<"videos">) => void;
  onRename?: (folderId: Id<"projectFolders">, title: string) => void;
}) {
  const [dragActive, setDragActive] = useState(false);

  function requestRename() {
    const nextTitle = window.prompt("Rename folder", folder.title)?.trim();
    if (!nextTitle || nextTitle === folder.title) return;
    onRename?.(folder._id, nextTitle);
  }

  return (
    <div
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
        "group relative flex w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-lg border bg-zinc-900/80 text-left transition-all",
        dragActive
          ? "border-[var(--project-accent)] ring-1 ring-[var(--project-accent-ring)]"
          : active
            ? "border-[var(--project-accent)]"
            : "border-zinc-800/80 hover:border-zinc-600",
      )}
    >
      {canEdit && onRename && (
        <button
          type="button"
          title="Rename folder"
          className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-md border border-zinc-800 bg-zinc-950/90 text-zinc-500 opacity-0 shadow-sm transition hover:border-zinc-700 hover:text-zinc-100 group-hover:opacity-100"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            requestRename();
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <span className="relative block aspect-square w-full overflow-hidden bg-zinc-950">
          <span className="absolute inset-2 rounded-md border border-zinc-800 bg-zinc-900/80 shadow-inner transition group-hover:border-zinc-700 group-hover:bg-zinc-900" />
          <Folder className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 text-zinc-400 transition group-hover:text-zinc-200" />
        </span>
        <span className="block min-w-0 space-y-1.5 p-3">
          <span className="block truncate text-[12px] font-medium leading-4 text-zinc-300 transition group-hover:text-zinc-100">
            {folder.title}
          </span>
          <span className="flex items-center justify-between gap-2 text-[11px] text-zinc-600">
            <span>{folderItemLabel(counts.total)}</span>
          </span>
        </span>
      </button>
    </div>
  );
}

export function folderItemLabel(total: number) {
  if (total === 0) return "No items";
  return `${total} ${total === 1 ? "item" : "items"}`;
}

export function folderCounts(videos: VideoDoc[], folderId: Id<"projectFolders">) {
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
