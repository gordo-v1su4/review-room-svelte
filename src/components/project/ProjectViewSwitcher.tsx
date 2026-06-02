"use client";

import { SMART_VIEWS, countByView, type VideoDoc } from "@/lib/smartViews";
import type { SmartViewId } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ProjectViewSwitcher({
  videos,
  active,
  onChange,
}: {
  videos: VideoDoc[];
  active: SmartViewId;
  onChange: (view: SmartViewId) => void;
}) {
  return (
    <Tabs value={active} onValueChange={(v) => onChange(v as SmartViewId)}>
      <TabsList className="flex h-auto flex-wrap gap-1 bg-transparent p-0">
        {SMART_VIEWS.map((view) => (
          <TabsTrigger key={view.id} value={view.id} className="shrink-0">
            {view.label}
            <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-400">
              {countByView(videos, view.id)}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
