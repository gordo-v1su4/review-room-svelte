"use client";

import type { VideoDoc } from "@/lib/smartViews";
import type { GridSize } from "@/lib/types";
import { cn } from "@/lib/utils";
import { VideoCard } from "./VideoCard";

export function VideoGrid({
  videos,
  selectedId,
  size,
  onSelect,
  empty,
}: {
  videos: VideoDoc[];
  selectedId?: string;
  size: GridSize;
  onSelect: (id: VideoDoc["_id"]) => void;
  empty?: React.ReactNode;
}) {
  if (!videos.length) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-zinc-800 text-sm text-zinc-500">
        {empty ?? "No videos"}
      </div>
    );
  }

  const gridClass =
    size === "sm"
      ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-6"
      : size === "lg"
        ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

  return (
    <div className={cn("grid gap-4", gridClass)}>
      {videos.map((video) => (
        <VideoCard
          key={video._id}
          video={video}
          size={size}
          selected={selectedId === video._id}
          onSelect={() => onSelect(video._id)}
        />
      ))}
    </div>
  );
}
