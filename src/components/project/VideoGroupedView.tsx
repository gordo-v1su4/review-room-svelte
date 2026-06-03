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
  const cardWidth =
    size === "sm"
      ? "w-[calc(50%_-_0.375rem)] min-w-[150px] sm:w-[180px]"
      : size === "lg"
        ? "w-full sm:w-[320px]"
        : "w-full sm:w-[240px]";

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
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
                    selected={selectedId === video._id}
                    onSelect={() => onSelect(video._id)}
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
