"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Group,
  Panel,
  type Layout,
  type PanelImperativeHandle,
} from "react-resizable-panels";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  loadWorkspacePanelState,
  normalizeLayout,
  saveWorkspacePanelState,
  type WorkspacePanelState,
} from "@/lib/workspaceLayout";
import { WorkspaceResizeHandle } from "./WorkspaceResizeHandle";
import { cn } from "@/lib/utils";

const MIN_ASSETS = 18;
const MIN_VIEWER = 20;
const MIN_INSPECTOR = 22;
const INSPECTOR_MIN_PX = "280px";

export function ReviewWorkspaceShell({
  projectId,
  assetBrowser,
  viewer,
  inspector,
  viewerOpen,
  infoOpen,
  className,
}: {
  projectId: Id<"projects">;
  assetBrowser: ReactNode;
  viewer: ReactNode;
  inspector: ReactNode;
  viewerOpen: boolean;
  infoOpen: boolean;
  onViewerOpenChange?: (open: boolean) => void;
  onInfoOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  const viewerRef = useRef<PanelImperativeHandle>(null);
  const inspectorRef = useRef<PanelImperativeHandle>(null);
  const [layout, setLayout] = useState<Layout>(
    () => loadWorkspacePanelState(projectId).layout,
  );

  useEffect(() => {
    const panel = viewerRef.current;
    if (!panel) return;
    if (viewerOpen) panel.expand();
    else panel.collapse();
  }, [viewerOpen]);

  useEffect(() => {
    const panel = inspectorRef.current;
    if (!panel) return;
    if (infoOpen) panel.expand();
    else panel.collapse();
  }, [infoOpen]);

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
      id={`workspace-${projectId}`}
      orientation="horizontal"
      className={cn("hidden min-h-0 flex-1 lg:flex", className)}
      defaultLayout={layout}
      onLayoutChanged={(nextLayout, meta) => {
        const normalized = normalizeLayout(nextLayout);
        setLayout(normalized);
        if (meta.isUserInteraction) {
          persist({ layout: normalized });
        }
      }}
    >
      <Panel id="assets" minSize={`${MIN_ASSETS}%`} maxSize="72%">
        <div className="flex h-full min-w-0 flex-col overflow-hidden">
          {assetBrowser}
        </div>
      </Panel>

      <WorkspaceResizeHandle />

      <Panel
        id="viewer"
        panelRef={viewerRef}
        collapsible
        collapsedSize={0}
        minSize={`${MIN_VIEWER}%`}
        maxSize="58%"
      >
        <div className="flex h-full min-w-0 flex-col overflow-hidden border-x border-zinc-800/60 bg-zinc-950">
          {viewer}
        </div>
      </Panel>

      <WorkspaceResizeHandle />

      <Panel
        id="inspector"
        panelRef={inspectorRef}
        collapsible
        collapsedSize={0}
        minSize={INSPECTOR_MIN_PX}
        maxSize="48%"
      >
        <div className="flex h-full min-w-0 flex-col overflow-hidden bg-zinc-950">
          {inspector}
        </div>
      </Panel>
    </Group>
  );
}
