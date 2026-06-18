"use client";

import { type DragEvent, useEffect, useState } from "react";
import { Bookmark, Check, Download, Folder, MessageSquare, Star } from "lucide-react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type { VideoDoc } from "@/lib/smartViews";
import { isImageAsset, mediaKindLabel } from "@/lib/media";
import { cn, formatDuration } from "@/lib/utils";
import { VideoStatusPill } from "./VideoStatusPill";
import { useStorageUrl } from "@/hooks/useStorageUrl";
import { folderCounts, folderItemLabel } from "@/components/project/FolderShelf";

type FolderDoc = Doc<"projectFolders">;

export function VideoListView({
  folders = [],
  folderVideos = [],
  videos,
  selectedId,
  onDragStart,
  onOpenFolder,
  onDropVideo,
  onSelect,
}: {
  folders?: FolderDoc[];
  folderVideos?: VideoDoc[];
  videos: VideoDoc[];
  selectedId?: string;
  onDragStart?: (event: DragEvent<HTMLElement>, video: VideoDoc) => void;
  onOpenFolder?: (id: Id<"projectFolders">) => void;
  onDropVideo?: (
    videoId: Id<"videos">,
    folderId: Id<"projectFolders"> | undefined,
  ) => void;
  onSelect: (id: VideoDoc["_id"]) => void;
}) {
  if (!videos.length && !folders.length) {
    return (
      <div className="mx-6 flex min-h-[280px] items-center justify-center rounded-lg border border-dashed border-zinc-800 text-sm text-zinc-500 sm:mx-8">
        No media match.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="overflow-hidden rounded-lg border border-zinc-800/60 bg-zinc-950">
        <div className="hidden grid-cols-[116px_minmax(0,2fr)_132px_minmax(0,1fr)_110px_72px_78px_40px] gap-3 border-b border-zinc-800/60 bg-zinc-900/40 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600 md:grid">
          <div />
          <div>Title</div>
          <div>Status</div>
          <div>Tags</div>
          <div>Rating</div>
          <div className="text-right">Notes</div>
          <div>Length</div>
          <div />
        </div>
        <div className="divide-y divide-zinc-800/40">
          {folders.map((folder) => (
            <FolderListRow
              key={folder._id}
              folder={folder}
              counts={folderCounts(folderVideos, folder._id)}
              onOpen={() => onOpenFolder?.(folder._id)}
              onDrop={(videoId) => onDropVideo?.(videoId, folder._id)}
              canDrop={Boolean(onDropVideo)}
            />
          ))}
          {videos.map((video) => (
            <button
              key={video._id}
              type="button"
              draggable={Boolean(onDragStart)}
              onClick={() => onSelect(video._id)}
              onDragStart={(event) => onDragStart?.(event, video)}
              className={cn(
                "grid w-full grid-cols-[112px_minmax(0,1fr)] gap-3 px-3 py-3 text-left transition md:grid-cols-[116px_minmax(0,2fr)_132px_minmax(0,1fr)_110px_72px_78px_40px] md:items-center md:py-2.5",
                onDragStart && "cursor-grab active:cursor-grabbing",
                selectedId === video._id
                  ? "bg-zinc-800/45"
                  : "hover:bg-zinc-900/60",
              )}
            >
              <VideoListThumbnail video={video} />
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-zinc-100">
                    {video.title}
                  </span>
                  {video.isSelect && (
                    <Bookmark className="h-3.5 w-3.5 shrink-0 fill-sky-400 text-sky-400" />
                  )}
                  {video.status === "approved" && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  )}
                </div>
                <div className="truncate text-[11px] text-zinc-600">
                  {video.originalFilename}
                </div>
              </div>
              <div className="col-start-2 md:col-start-auto">
                <VideoStatusPill status={video.status} />
              </div>
              <div className="col-span-2 flex min-w-0 flex-wrap gap-1 md:col-span-1">
                {video.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-zinc-800/70 px-1.5 py-0.5 text-[10px] text-zinc-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className={cn(
                      "h-3 w-3",
                      index < video.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-zinc-800",
                    )}
                  />
                ))}
              </div>
              <div className="text-left text-[11px] tabular-nums md:text-right">
                {video.commentCount > 0 ? (
                  <span className="inline-flex items-center gap-1 text-sky-300">
                    <MessageSquare className="h-3 w-3" />
                    {video.commentCount}
                  </span>
                ) : (
                  <span className="text-zinc-800">-</span>
                )}
              </div>
              <div className="text-[11px] text-zinc-600">
                {isImageAsset(video) ? mediaKindLabel(video) : formatDuration(video.durationSec)}
              </div>
              <div className="hidden justify-end md:flex">
                {video.downloadEnabled && (
                  <Download className="h-3.5 w-3.5 text-zinc-600" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FolderListRow({
  folder,
  counts,
  canDrop,
  onOpen,
  onDrop,
}: {
  folder: FolderDoc;
  counts: { total: number; images: number; videos: number };
  canDrop: boolean;
  onOpen: () => void;
  onDrop: (videoId: Id<"videos">) => void;
}) {
  const [dragActive, setDragActive] = useState(false);

  return (
    <button
      type="button"
      onClick={onOpen}
      onDragEnter={(event) => {
        if (!canDrop) return;
        event.preventDefault();
        setDragActive(true);
      }}
      onDragOver={(event) => {
        if (!canDrop) return;
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
        const videoId = event.dataTransfer.getData("application/review-room-video-id");
        if (!videoId) return;
        event.preventDefault();
        onDrop(videoId as Id<"videos">);
      }}
      className={cn(
        "grid w-full grid-cols-[112px_minmax(0,1fr)] gap-3 px-3 py-3 text-left transition md:grid-cols-[116px_minmax(0,2fr)_132px_minmax(0,1fr)_110px_72px_78px_40px] md:items-center md:py-2.5",
        dragActive ? "bg-zinc-800/60" : "hover:bg-zinc-900/60",
      )}
    >
      <div className="relative h-[63px] w-28 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
        <span className="absolute inset-1.5 rounded border border-zinc-800 bg-zinc-900/80" />
        <Folder className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-zinc-400" />
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-medium text-zinc-100">
            {folder.title}
          </span>
        </div>
        <div className="truncate text-[11px] text-zinc-600">
          {folderItemLabel(counts.total)}
        </div>
      </div>
      <div className="col-start-2 md:col-start-auto">
        <span className="inline-flex rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Folder
        </span>
      </div>
      <div className="col-span-2 min-w-0 text-[11px] text-zinc-600 md:col-span-1">
        {counts.videos} video / {counts.images} image
      </div>
      <div className="text-[11px] text-zinc-800">-</div>
      <div className="text-left text-[11px] text-zinc-800 md:text-right">-</div>
      <div className="text-[11px] text-zinc-600">Folder</div>
      <div />
    </button>
  );
}

function VideoListThumbnail({ video }: { video: VideoDoc }) {
  const isImage = isImageAsset(video);
  const thumbUrl = useStorageUrl(
    video.thumbnailKey ?? (isImage ? video.storageKey : undefined),
    video.updatedAt,
  );
  const spriteUrl = useStorageUrl(video.spriteKey, video.updatedAt);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const canScrub = Boolean(spriteUrl);
  const spriteFrameCount = 10;
  const scrubFrame =
    hoverPct == null
      ? 0
      : Math.min(
          spriteFrameCount - 1,
          Math.max(0, Math.floor(hoverPct * spriteFrameCount)),
        );
  const scrubPosition =
    spriteFrameCount <= 1 ? 0 : (scrubFrame / (spriteFrameCount - 1)) * 100;

  useEffect(() => {
    setThumbnailFailed(false);
  }, [thumbUrl]);

  return (
    <div
      className="relative h-[63px] w-28 overflow-hidden rounded-md border border-zinc-800 bg-zinc-900"
      onMouseMove={(event) => {
        if (!canScrub) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const pct = (event.clientX - rect.left) / rect.width;
        setHoverPct(Math.min(1, Math.max(0, pct)));
      }}
      onMouseLeave={() => setHoverPct(null)}
    >
      {canScrub && hoverPct != null ? (
        <div
          className="h-full w-full bg-cover bg-no-repeat"
          style={{
            backgroundImage: `url(${spriteUrl})`,
            backgroundSize: `${spriteFrameCount * 100}% 100%`,
            backgroundPosition: `${scrubPosition}% center`,
          }}
        />
      ) : thumbUrl && !thumbnailFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setThumbnailFailed(true)}
        />
      ) : (
        <div className="grid h-full place-items-center text-[10px] text-zinc-700">
          {video.processingStatus === "processing" ? "Processing" : "Preview"}
        </div>
      )}
      {canScrub && hoverPct != null && (
        <div
          className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-teal-300 shadow-[0_0_10px_rgba(45,212,191,0.85)]"
          style={{ left: `${hoverPct * 100}%` }}
        />
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/80 to-transparent" />
      <span className="absolute bottom-1 right-1 text-[10px] tabular-nums text-zinc-200">
        {isImage ? mediaKindLabel(video) : formatDuration(video.durationSec)}
      </span>
    </div>
  );
}
