"use client";

import { useState, type ReactNode } from "react";
import { Group, Panel, type Layout } from "react-resizable-panels";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  layoutForVisible,
  loadWorkspacePanelState,
  normalizeLayout,
  saveWorkspacePanelState,
  type WorkspacePanelState,
} from "@/lib/workspaceLayout";
import { WorkspaceResizeHandle } from "./WorkspaceResizeHandle";
import { cn } from "@/lib/utils";

const MIN_ASSETS = 18;
const MIN_VIEWER = 20;
const INSPECTOR_MIN_PX = "280px";

export function ReviewWorkspaceShell({
  projectId,
  assetBrowser,
  viewer,
  inspector,
  viewerOpen,
  infoOpen,
  preferredLayout,
  className,
}: {
  projectId: Id<"projects">;
  assetBrowser: ReactNode;
  viewer: ReactNode;
  inspector: ReactNode;
  viewerOpen: boolean;
  infoOpen: boolean;
  preferredLayout: Layout;
  className?: string;
}) {
  const [layout, setLayout] = useState<Layout>(() =>
    layoutForVisible(preferredLayout, viewerOpen, infoOpen),
  );
  const visibleLayout = layoutForVisible(preferredLayout, viewerOpen, infoOpen);
  const layoutKey = JSON.stringify(visibleLayout);

  function persist(next: Partial<WorkspacePanelState>) {
    const current = loadWorkspacePanelState(projectId);
    saveWorkspacePanelState(projectId, {
      ...current,
      viewerOpen,
      infoOpen,
      layout,
      ...next,
    });
  }

  return (
    <Group
      key={layoutKey}
      id={`workspace-${projectId}`}
      orientation="horizontal"
      className={cn("hidden min-h-0 flex-1 lg:flex", className)}
      defaultLayout={visibleLayout}
      onLayoutChanged={(nextLayout, meta) => {
        const merged: Layout = {
          ...layout,
          ...nextLayout,
        };
        const normalized = normalizeLayout(merged, { viewerOpen, infoOpen });
        setLayout(normalized);
        if (meta.isUserInteraction) {
          persist({ layout: normalized });
        }
      }}
    >
      <Panel
        id="assets"
        minSize={`${MIN_ASSETS}%`}
        maxSize={viewerOpen || infoOpen ? "72%" : "100%"}
      >
        <div className="flex h-full min-w-0 flex-col overflow-hidden">
          {assetBrowser}
        </div>
      </Panel>

      {viewerOpen && (
        <>
          <WorkspaceResizeHandle />
          <Panel id="viewer" minSize={`${MIN_VIEWER}%`} maxSize="68%">
            <div className="flex h-full min-w-0 flex-col overflow-hidden border-x border-zinc-800/60 bg-zinc-950">
              {viewer}
            </div>
          </Panel>
        </>
      )}

      {infoOpen && (
        <>
          <WorkspaceResizeHandle />
          <Panel id="inspector" minSize={INSPECTOR_MIN_PX} maxSize="48%">
            <div className="flex h-full min-w-0 flex-col overflow-hidden bg-zinc-950">
              {inspector}
            </div>
          </Panel>
        </>
      )}
    </Group>
  );
}
