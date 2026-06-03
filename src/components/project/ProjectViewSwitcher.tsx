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
      <TabsList className="no-scrollbar flex h-auto justify-start gap-0.5 overflow-x-auto border-b border-zinc-800/60 bg-transparent px-4 py-0 sm:px-6 lg:px-8">
        {SMART_VIEWS.map((view) => (
          <TabsTrigger
            key={view.id}
            value={view.id}
            className="relative shrink-0 rounded-none border-0 bg-transparent px-2.5 py-3 text-[11px] text-zinc-600 shadow-none data-[state=active]:bg-transparent data-[state=active]:text-zinc-100 data-[state=active]:shadow-none sm:px-3 sm:text-xs"
          >
            {view.label}
            <span className="rounded bg-zinc-800/70 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-400">
              {countByView(videos, view.id)}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
