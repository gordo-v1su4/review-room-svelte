"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AdminGate } from "@/components/auth/AdminGate";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { VideoGrid } from "@/components/video/VideoGrid";
import { VideoDetailsPanel } from "@/components/video/VideoDetailsPanel";
import { ProjectViewSwitcher } from "./ProjectViewSwitcher";
import { ProjectFilters } from "./ProjectFilters";
import { VideoGroupedView } from "./VideoGroupedView";
import { matchesSmartView } from "@/lib/smartViews";
import { applyFilters, sortVideos, type FilterState } from "@/lib/filters";
import type { GridSize, SmartViewId, SortKey } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProjectWorkspace({ projectId }: { projectId: Id<"projects"> }) {
  const project = useQuery(api.projects.getById, { projectId });
  const queriedVideos = useQuery(api.videos.listByProject, { projectId });
  const videos = useMemo(() => queriedVideos ?? [], [queriedVideos]);
  const createLink = useMutation(api.reviewLinks.create);

  const [view, setView] = useState<SmartViewId>("all");
  const [layout, setLayout] = useState<"grid" | "grouped">("grid");
  const [gridSize, setGridSize] = useState<GridSize>("md");
  const [selectedId, setSelectedId] = useState<Id<"videos"> | null>(null);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");
  const [filters, setFilters] = useState<FilterState>({
    statuses: [],
    tags: [],
    minRating: 0,
    selectedOnly: false,
    hasComments: false,
    search: "",
  });

  const filtered = useMemo(() => {
    let list = videos.filter((v) => matchesSmartView(v, view));
    list = applyFilters(list, filters);
    return sortVideos(list, sort);
  }, [videos, view, filters, sort]);

  const selected = videos.find((v) => v._id === selectedId) ?? null;

  if (!project) {
    return <div className="text-zinc-500">Loading project…</div>;
  }

  return (
    <AdminGate>
      <div className="space-y-6">
        <div
          className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
          style={
            project.brandColor
              ? { borderColor: `${project.brandColor}33` }
              : undefined
          }
        >
          <div className="h-32 bg-gradient-to-br from-zinc-800 to-zinc-950" />
          <div className="flex flex-wrap items-end justify-between gap-4 p-6">
            <div>
              <h1 className="text-2xl font-semibold">{project.title}</h1>
              {project.clientName && (
                <p className="text-sm text-zinc-400">{project.clientName}</p>
              )}
              {project.description && (
                <p className="mt-2 max-w-2xl text-sm text-zinc-500">
                  {project.description}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  void createLink({
                    projectId,
                    canDownload: project.downloadEnabledByDefault,
                  }).then((res) => {
                    const url =
                      typeof window !== "undefined"
                        ? `${window.location.origin}${res.url}`
                        : res.url;
                    void navigator.clipboard?.writeText(url);
                    toast.success("Review link copied to clipboard");
                  })
                }
              >
                Share review link
              </Button>
              <Link href={`/dashboard/projects/${projectId}/upload`}>
                <Button>Upload</Button>
              </Link>
            </div>
          </div>
        </div>

        <ProjectViewSwitcher videos={videos} active={view} onChange={setView} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <ProjectFilters
            filters={filters}
            sort={sort}
            onFilters={setFilters}
            onSort={setSort}
            onClear={() =>
              setFilters({
                statuses: [],
                tags: [],
                minRating: 0,
                selectedOnly: false,
                hasComments: false,
                search: "",
              })
            }
          />
          <div className="flex gap-2">
            {(["sm", "md", "lg"] as GridSize[]).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={gridSize === s ? "default" : "ghost"}
                onClick={() => setGridSize(s)}
              >
                {s}
              </Button>
            ))}
            <Button
              size="sm"
              variant={layout === "grouped" ? "default" : "ghost"}
              onClick={() => setLayout(layout === "grid" ? "grouped" : "grid")}
            >
              {layout === "grid" ? "Grouped" : "Grid"}
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "flex gap-0",
            selected && !panelExpanded && "lg:flex-row",
          )}
        >
          <div className={cn("min-w-0 flex-1", selected && "lg:pr-0")}>
            {layout === "grid" ? (
              <VideoGrid
                videos={filtered}
                selectedId={selectedId ?? undefined}
                size={gridSize}
                onSelect={(id) => {
                  setSelectedId(id);
                  setPanelExpanded(false);
                }}
                empty={
                  <div className="text-center">
                    <p>Upload your first videos to start a review.</p>
                    <Link href={`/dashboard/projects/${projectId}/upload`}>
                      <Button className="mt-3">Upload</Button>
                    </Link>
                  </div>
                }
              />
            ) : (
              <VideoGroupedView
                videos={filtered}
                size={gridSize}
                selectedId={selectedId ?? undefined}
                onSelect={setSelectedId}
              />
            )}
          </div>
          {selected && (
            <VideoDetailsPanel
              video={selected}
              mode="admin"
              expanded={panelExpanded}
              onClose={() => setSelectedId(null)}
              onToggleExpand={() => setPanelExpanded((e) => !e)}
              reviewerName="Admin"
            />
          )}
        </div>
      </div>
    </AdminGate>
  );
}
