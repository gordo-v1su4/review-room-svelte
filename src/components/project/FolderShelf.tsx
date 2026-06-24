"use client";

import { Check, Folder, ImagePlus, Pencil, Trash2, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id, Doc } from "../../../convex/_generated/dataModel";
import type { VideoDoc } from "@/lib/smartViews";
import { isImageAsset, mediaKind } from "@/lib/media";
import { projectAccent, projectAccentStyle } from "@/lib/projectAccent";
import { cn } from "@/lib/utils";
import { useStorageUrl } from "@/hooks/useStorageUrl";

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
          coverAsset={folderCoverAsset(videos, folder)}
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
  coverAsset,
  canEdit,
  onOpen,
  onDrop,
  onRename,
}: {
  folder: FolderDoc;
  active: boolean;
  accent: string;
  counts: { total: number; images: number; videos: number };
  coverAsset?: VideoDoc | null;
  canEdit: boolean;
  onOpen: () => void;
  onDrop: (videoId: Id<"videos">) => void;
  onRename?: (folderId: Id<"projectFolders">, title: string) => void;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(folder.title);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const setFolderCover = useMutation(api.folders.setCover);
  const coverKey = folder.coverImageKey ?? (coverAsset
    ? coverAsset.thumbnailKey ?? (isImageAsset(coverAsset) ? coverAsset.storageKey : undefined)
    : undefined);
  const coverUrl = useStorageUrl(coverKey, folder.updatedAt);

  function startRename() {
    setRenameDraft(folder.title);
    setRenaming(true);
  }

  function cancelRename() {
    setRenameDraft(folder.title);
    setRenaming(false);
  }

  function submitRename() {
    const nextTitle = renameDraft.trim();
    if (!nextTitle || nextTitle === folder.title) {
      cancelRename();
      return;
    }
    onRename?.(folder._id, nextTitle);
    setRenaming(false);
  }

  async function uploadCover(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image for the folder cover");
      return;
    }
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("projectId", folder.projectId);
      formData.append("file", file);
      const response = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        storageKey?: string;
        error?: string;
      };
      if (!response.ok || !data.storageKey) {
        throw new Error(data.error ?? "Folder cover upload failed");
      }
      await setFolderCover({ folderId: folder._id, coverImageKey: data.storageKey });
      toast.success("Folder cover updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update cover");
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  async function clearCover() {
    setUploadingCover(true);
    try {
      await setFolderCover({ folderId: folder._id });
      toast.success("Folder cover reset");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset cover");
    } finally {
      setUploadingCover(false);
    }
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
        if (!canEdit) return;
        if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget as Node)) {
          return;
        }
        setDragActive(false);
      }}
      onDrop={(event) => {
        if (!canEdit) return;
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
            startRename();
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <span className="relative block aspect-square w-full overflow-hidden bg-zinc-950">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-80 transition group-hover:opacity-100"
            />
          ) : (
            <span className="absolute inset-2 rounded-md border border-zinc-800 bg-zinc-900/80 shadow-inner transition group-hover:border-zinc-700 group-hover:bg-zinc-900" />
          )}
          <span className="absolute inset-0 bg-gradient-to-t from-zinc-950/75 via-transparent to-zinc-950/10" />
          <Folder
            className={cn(
              "absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 transition group-hover:text-zinc-100",
              coverUrl ? "text-white/85 drop-shadow" : "text-zinc-400",
            )}
          />
        </span>
      </button>
      <div className="block min-w-0 space-y-1.5 p-3">
        {renaming ? (
          <div className="space-y-2">
            <form
              className="flex items-center gap-1"
              onSubmit={(event) => {
                event.preventDefault();
                submitRename();
              }}
            >
              <input
                autoFocus
                value={renameDraft}
                onChange={(event) => setRenameDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") cancelRename();
                }}
                className="h-7 min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-[12px] text-zinc-100 outline-none focus:border-teal-400"
              />
              <button
                type="submit"
                title="Save folder name"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-teal-500 text-zinc-950"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Close folder editor"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-100"
                onClick={cancelRename}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </form>
            <div className="flex items-center gap-1">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void uploadCover(event.currentTarget.files?.[0])}
              />
              <button
                type="button"
                title="Upload folder cover"
                disabled={uploadingCover}
                className="flex h-7 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-[11px] text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100 disabled:cursor-wait disabled:text-zinc-600"
                onClick={() => coverInputRef.current?.click()}
              >
                <ImagePlus className="h-3.5 w-3.5" />
                <span className="truncate">{uploadingCover ? "Uploading..." : "Cover"}</span>
              </button>
              {folder.coverImageKey && (
                <button
                  type="button"
                  title="Reset folder cover"
                  disabled={uploadingCover}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-100 disabled:cursor-wait disabled:text-zinc-700"
                  onClick={() => void clearCover()}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <button type="button" onClick={onOpen} className="block max-w-full text-left">
            <span className="block truncate text-[12px] font-medium leading-4 text-zinc-300 transition group-hover:text-zinc-100">
              {folder.title}
            </span>
          </button>
        )}
        <span className="flex items-center justify-between gap-2 text-[11px] text-zinc-600">
          <span>{folderItemLabel(counts.total)}</span>
        </span>
      </div>
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

export function folderCoverAsset(videos: VideoDoc[], folder: FolderDoc) {
  const folderAssets = videos.filter((video) => video.folderId === folder._id);

  return (
    folderAssets
      .filter((video) => isImageAsset(video))
      .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null
  );
}

function readDraggedVideoId(event: DragEvent) {
  const id = event.dataTransfer.getData("application/review-room-video-id");
  return id ? (id as Id<"videos">) : null;
}
