"use client";

import { Bookmark, Check, Download, MessageSquare, Play, Star } from "lucide-react";
import type { VideoDoc } from "@/lib/smartViews";
import { cn, formatDuration } from "@/lib/utils";
import { VideoStatusPill } from "./VideoStatusPill";

export function VideoListView({
  videos,
  selectedId,
  onSelect,
}: {
  videos: VideoDoc[];
  selectedId?: string;
  onSelect: (id: VideoDoc["_id"]) => void;
}) {
  if (!videos.length) {
    return (
      <div className="mx-6 flex min-h-[280px] items-center justify-center rounded-lg border border-dashed border-zinc-800 text-sm text-zinc-500 sm:mx-8">
        No videos match.
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="overflow-hidden rounded-lg border border-zinc-800/60 bg-zinc-950">
        <div className="hidden grid-cols-[64px_minmax(0,2fr)_140px_minmax(0,1fr)_110px_72px_92px_40px] gap-3 border-b border-zinc-800/60 bg-zinc-900/40 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600 md:grid">
          <div />
          <div>Title</div>
          <div>Status</div>
          <div>Tags</div>
          <div>Rating</div>
          <div className="text-right">Notes</div>
          <div>Duration</div>
          <div />
        </div>
        <div className="divide-y divide-zinc-800/40">
          {videos.map((video) => (
            <button
              key={video._id}
              type="button"
              onClick={() => onSelect(video._id)}
              className={cn(
                "grid w-full gap-3 px-3 py-2 text-left transition md:grid-cols-[64px_minmax(0,2fr)_140px_minmax(0,1fr)_110px_72px_92px_40px] md:items-center",
                selectedId === video._id
                  ? "bg-zinc-800/45"
                  : "hover:bg-zinc-900/60",
              )}
            >
              <div className="relative hidden h-9 w-16 overflow-hidden rounded bg-zinc-900 md:block">
                <div className="grid h-full place-items-center text-zinc-700">
                  <Play className="h-3.5 w-3.5" />
                </div>
              </div>
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
              <div>
                <VideoStatusPill status={video.status} />
              </div>
              <div className="flex min-w-0 flex-wrap gap-1">
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
              <div className="text-right text-[11px] tabular-nums">
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
                {formatDuration(video.durationSec)}
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
