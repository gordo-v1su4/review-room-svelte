"use client";

import { useMemo, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Archive,
  Clock,
  Link2,
  RefreshCw,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AdminGate } from "@/components/auth/AdminGate";
import { VideoGrid } from "@/components/video/VideoGrid";
import { VideoListView } from "@/components/video/VideoListView";
import { VideoReviewMode } from "@/components/video/VideoReviewMode";
import { VideoDetailsPanel } from "@/components/video/VideoDetailsPanel";
import { ProjectViewSwitcher } from "./ProjectViewSwitcher";
import { ProjectFilters } from "./ProjectFilters";
import { VideoGroupedView } from "./VideoGroupedView";
import { matchesSmartView } from "@/lib/smartViews";
import { applyFilters, sortVideos, type FilterState } from "@/lib/filters";
import type { GridSize, SmartViewId, SortKey, WorkspaceLayout } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProjectWorkspace({ projectId }: { projectId: Id<"projects"> }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const projectQueryArgs = isAuthenticated ? { projectId } : "skip";
  const project = useQuery(api.projects.getById, projectQueryArgs);
  const queriedVideos = useQuery(api.videos.listByProject, projectQueryArgs);
  const videos = useMemo(() => queriedVideos ?? [], [queriedVideos]);
  const createLink = useMutation(api.reviewLinks.create);
  const archiveVideos = useMutation(api.videos.archiveByProject);
  const archiveProject = useMutation(api.projects.archive);

  const [view, setView] = useState<SmartViewId>("all");
  const [layout, setLayout] = useState<WorkspaceLayout>("grid");
  const [gridSize, setGridSize] = useState<GridSize>("md");
  const [selectedId, setSelectedId] = useState<Id<"videos"> | null>(null);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
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
  const counts = {
    awaiting: videos.filter((v) => v.status === "awaiting_review" && !v.viewed).length,
    feedback: videos.filter((v) => v.commentCount > 0).length,
    selected: videos.filter((v) => v.isSelect).length,
    approved: videos.filter((v) => v.status === "approved").length,
  };

  async function reprocessPreviews() {
    setReprocessing(true);
    try {
      let ok = 0;
      for (const video of videos) {
        const res = await fetch("/api/media/enqueue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId: video._id,
            storageKey: video.storageKey,
          }),
        });
        if (res.ok) ok++;
      }
      toast.success(`Refreshing previews for ${ok} videos`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not refresh previews",
      );
    } finally {
      setReprocessing(false);
    }
  }

  async function clearVideos() {
    if (!videos.length) return;
    if (!window.confirm(`Archive ${videos.length} videos from this project?`)) return;
    const result = await archiveVideos({ projectId });
    setSelectedId(null);
    toast.success(`Archived ${result.archived} videos`);
  }

  async function archiveCurrentProject() {
    if (!project) return;
    if (!window.confirm(`Archive project "${project.title}"?`)) return;
    await archiveProject({ projectId });
    toast.success("Project archived");
    router.push("/dashboard");
  }

  if (isLoading || !isAuthenticated) {
    return (
      <AdminGate>
        <div className="text-zinc-500">Loading project...</div>
      </AdminGate>
    );
  }

  if (!project) {
    return (
      <AdminGate>
        <div className="text-zinc-500">Loading project...</div>
      </AdminGate>
    );
  }

  return (
    <AdminGate>
      <div className="min-h-dvh bg-zinc-950">
        <ProjectHero
          title={project.title}
          clientName={project.clientName}
          description={project.description}
          counts={counts}
          onShare={() =>
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
          onReprocess={() => void reprocessPreviews()}
          reprocessing={reprocessing}
          onClearVideos={() => void clearVideos()}
          canClearVideos={videos.length > 0}
          onArchiveProject={() => void archiveCurrentProject()}
          uploadHref={`/dashboard/projects/${projectId}/upload`}
        />

        <ProjectViewSwitcher videos={videos} active={view} onChange={setView} />

        <ProjectFilters
          layout={layout}
          gridSize={gridSize}
          resultCount={filtered.length}
          filters={filters}
          sort={sort}
          onLayout={setLayout}
          onGridSize={setGridSize}
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

        <div className={cn("flex gap-0", selected && !panelExpanded && "lg:flex-row")}>
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
            ) : layout === "grouped" ? (
              <VideoGroupedView
                videos={filtered}
                size={gridSize}
                selectedId={selectedId ?? undefined}
                onSelect={setSelectedId}
              />
            ) : layout === "list" ? (
              <VideoListView
                videos={filtered}
                selectedId={selectedId ?? undefined}
                onSelect={(id) => {
                  setSelectedId(id);
                  setPanelExpanded(false);
                }}
              />
            ) : (
              <VideoReviewMode
                videos={filtered}
                activeId={selectedId ?? undefined}
                onSelect={(id) => {
                  setSelectedId(id);
                  setPanelExpanded(false);
                }}
              />
            )}
          </div>
          {selected && layout !== "review" && (
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

function ProjectHero({
  title,
  clientName,
  description,
  counts,
  onShare,
  onReprocess,
  reprocessing,
  onClearVideos,
  canClearVideos,
  onArchiveProject,
  uploadHref,
}: {
  title: string;
  clientName?: string;
  description?: string;
  counts: {
    awaiting: number;
    feedback: number;
    selected: number;
    approved: number;
  };
  onShare: () => void;
  onReprocess: () => void;
  reprocessing: boolean;
  onClearVideos: () => void;
  canClearVideos: boolean;
  onArchiveProject: () => void;
  uploadHref: string;
}) {
  return (
    <div className="relative border-b border-zinc-800/60">
      <div className="h-40 bg-[radial-gradient(circle_at_20%_0%,rgba(124,58,237,0.22),transparent_32%),linear-gradient(135deg,#18181b,#09090b_70%)]" />
      <div className="relative -mt-16 px-6 pb-5 sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-violet-600 text-lg font-semibold text-white ring-4 ring-zinc-950 sm:h-20 sm:w-20">
            {initials(title)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2 text-[11px] text-zinc-500">
              <span>Projects</span>
              <span className="text-zinc-700">/</span>
              <span className="truncate text-zinc-400">{clientName ?? "Client"}</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
              {title}
            </h1>
            {description && (
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-500">
                {description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-zinc-600">
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3 w-3" />
                {clientName ?? "No client"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Live workspace
              </span>
              <span className="inline-flex items-center gap-1.5 text-emerald-400/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Review link ready
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="gap-2" onClick={onShare}>
              <Link2 className="h-4 w-4" />
              Share review link
            </Button>
            <Button
              variant="secondary"
              className="gap-2"
              disabled={reprocessing}
              onClick={onReprocess}
            >
              <RefreshCw className={cn("h-4 w-4", reprocessing && "animate-spin")} />
              Refresh previews
            </Button>
            <Button
              variant="secondary"
              className="gap-2 text-zinc-300"
              disabled={!canClearVideos}
              onClick={onClearVideos}
            >
              <Trash2 className="h-4 w-4" />
              Clear videos
            </Button>
            <Button
              variant="ghost"
              className="gap-2 text-zinc-500"
              onClick={onArchiveProject}
            >
              <Archive className="h-4 w-4" />
              Archive project
            </Button>
            <Link href={uploadHref}>
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            </Link>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat label="Awaiting" value={counts.awaiting} accent="bg-zinc-400" />
          <Stat label="Feedback" value={counts.feedback} accent="bg-sky-400" />
          <Stat label="Selected" value={counts.selected} accent="bg-sky-400" />
          <Stat label="Approved" value={counts.approved} accent="bg-emerald-400" />
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-3.5 py-2.5">
      <span className={cn("h-6 w-0.5 rounded-full", accent)} />
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
          {label}
        </p>
        <p className="text-lg font-semibold leading-tight tabular-nums text-zinc-200">
          {value}
        </p>
      </div>
    </div>
  );
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
