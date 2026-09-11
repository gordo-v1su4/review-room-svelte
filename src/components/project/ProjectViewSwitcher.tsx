"use client";

import { SMART_VIEWS, countByView, type VideoDoc } from "@/lib/smartViews";
import type { SmartViewId } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { WORKSPACE_CHROME_PADDING } from "@/lib/workspaceLayout";

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
      <TabsList
        className={cn(
          "no-scrollbar flex h-auto justify-start gap-0.5 overflow-x-auto border-b border-zinc-800/60 bg-transparent py-0",
          WORKSPACE_CHROME_PADDING,
        )}
      >
        {SMART_VIEWS.map((view) => {
          const count = countByView(videos, view.id);
          return (
            <TabsTrigger
              key={view.id}
              value={view.id}
              className={cn(
                "relative shrink-0 rounded-none border-0 bg-transparent px-2.5 py-3 font-mono text-[10px] tracking-[0.14em] text-zinc-500 uppercase shadow-none transition-colors after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-transparent after:transition-colors hover:text-zinc-300 data-[state=active]:bg-transparent data-[state=active]:text-zinc-50 data-[state=active]:shadow-none data-[state=active]:after:bg-[var(--brand-accent)] sm:px-3",
                count === 0 && active !== view.id && "opacity-40",
              )}
            >
              {view.label}
              <span className="rr-readout rounded-sm border border-zinc-800 bg-zinc-900/60 px-1 py-px text-[9px] text-zinc-500">
                {String(count).padStart(2, "0")}
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
