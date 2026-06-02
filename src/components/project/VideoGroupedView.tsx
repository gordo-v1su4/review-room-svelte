"use client";

import { SMART_VIEWS, matchesSmartView, type VideoDoc } from "@/lib/smartViews";
import type { SmartViewId } from "@/lib/types";
import type { GridSize } from "@/lib/types";
import { VideoCard } from "@/components/video/VideoCard";

export function VideoGroupedView({
  videos,
  size,
  selectedId,
  onSelect,
}: {
  videos: VideoDoc[];
  size: GridSize;
  selectedId?: string;
  onSelect: (id: VideoDoc["_id"]) => void;
}) {
  const sections = SMART_VIEWS.filter((v) => v.id !== "all");

  return (
    <div className="space-y-10">
      {sections.map((section) => {
        const items = videos.filter((v) => matchesSmartView(v, section.id));
        if (!items.length) return null;
        return (
          <section key={section.id}>
            <h3 className="mb-3 text-sm font-medium text-zinc-400">{section.label}</h3>
            <div className="flex flex-wrap gap-4">
              {items.map((video) => (
                <VideoCard
                  key={video._id}
                  video={video}
                  size={size}
                  selected={selectedId === video._id}
                  onSelect={() => onSelect(video._id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
