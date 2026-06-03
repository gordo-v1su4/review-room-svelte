"use client";

import { type CSSProperties, useMemo, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Archive,
  Clock,
  ImagePlus,
  Link2,
  Palette,
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useStorageUrl } from "@/hooks/useStorageUrl";

type ProjectIdentityPatch = {
  title?: string;
  brandColor?: string;
  bannerKey?: string;
};

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
  const updateProject = useMutation(api.projects.update);

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
      let failed = 0;
      for (const video of videos) {
        const res = await fetch("/api/media/enqueue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId: video._id,
            storageKey: video.storageKey,
          }),
        });
        if (res.ok) {
          ok++;
        } else {
          failed++;
        }
      }
      if (failed) {
        toast.error(`Queued ${ok} previews; ${failed} failed to start`);
      } else {
        toast.success(`Refreshing previews for ${ok} videos`);
      }
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
          brandColor={project.brandColor}
          bannerKey={project.bannerKey}
          updatedAt={project.updatedAt}
          projectId={projectId}
          counts={counts}
          onUpdate={(patch) => updateProject({ projectId, ...patch })}
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
            <>
              <button
                type="button"
                aria-label="Close video details"
                className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden"
                onClick={() => setSelectedId(null)}
              />
              <VideoDetailsPanel
                video={selected}
                mode="admin"
                expanded={panelExpanded}
                onClose={() => setSelectedId(null)}
                onToggleExpand={() => setPanelExpanded((e) => !e)}
                reviewerName="Admin"
              />
            </>
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
  brandColor,
  bannerKey,
  updatedAt,
  projectId,
  counts,
  onUpdate,
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
  brandColor?: string;
  bannerKey?: string;
  updatedAt: number;
  projectId: Id<"projects">;
  counts: {
    awaiting: number;
    feedback: number;
    selected: number;
    approved: number;
  };
  onUpdate: (patch: ProjectIdentityPatch) => Promise<unknown>;
  onShare: () => void;
  onReprocess: () => void;
  reprocessing: boolean;
  onClearVideos: () => void;
  canClearVideos: boolean;
  onArchiveProject: () => void;
  uploadHref: string;
}) {
  const bannerUrl = useStorageUrl(bannerKey, updatedAt);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftColor, setDraftColor] = useState(brandColor ?? "#14b8a6");
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const accent = brandColor ?? "#14b8a6";
  const heroStyle = {
    "--project-accent": accent,
    backgroundImage: bannerUrl
      ? `linear-gradient(90deg, rgba(9,9,11,0.68), rgba(9,9,11,0.22)), url("${bannerUrl}")`
      : `radial-gradient(circle at 20% 0%, ${hexToRgba(accent, 0.2)}, transparent 32%), linear-gradient(135deg, #18181b, #09090b 70%)`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  } as CSSProperties;

  function openIdentityEditor() {
    setDraftTitle(title);
    setDraftColor(brandColor ?? "#14b8a6");
    setIdentityOpen((open) => !open);
  }

  async function saveIdentity() {
    const nextTitle = draftTitle.trim();
    if (!nextTitle) return;
    setSavingIdentity(true);
    try {
      await onUpdate({ title: nextTitle, brandColor: draftColor });
      toast.success("Project identity updated");
      setIdentityOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update project",
      );
    } finally {
      setSavingIdentity(false);
    }
  }

  async function uploadBanner(file?: File) {
    if (!file) return;
    setUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append("projectId", projectId);
      formData.append("file", file);
      const response = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        storageKey?: string;
        error?: string;
      };
      if (!response.ok || !data.storageKey) {
        throw new Error(data.error ?? "Banner upload failed");
      }
      await onUpdate({ bannerKey: data.storageKey });
      toast.success("Project banner updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not upload banner",
      );
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  }

  return (
    <div className="relative border-b border-zinc-800/60">
      <div className="h-32 sm:h-40" style={heroStyle} />
      <div className="relative -mt-14 px-4 pb-5 sm:-mt-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
          <div className="relative shrink-0">
            <button
              type="button"
              className="group grid h-16 w-16 place-items-center rounded-xl text-lg font-semibold text-zinc-950 ring-4 ring-zinc-950 transition hover:brightness-110 sm:h-20 sm:w-20"
              style={{ backgroundColor: accent }}
              onClick={openIdentityEditor}
              title="Edit project identity"
            >
              {initials(title)}
              <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300 opacity-0 shadow-sm transition group-hover:opacity-100">
                <Palette className="h-3.5 w-3.5" />
              </span>
            </button>
            {identityOpen && (
              <div className="absolute left-0 top-full z-50 mt-3 w-[min(15.5rem,calc(100vw-2rem))] rounded-lg border border-zinc-700/60 bg-zinc-950/35 p-2.5 shadow-2xl shadow-black/30 ring-1 ring-white/5 backdrop-blur-xl">
                <div className="space-y-2">
                  <Input
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    aria-label="Project title"
                    className="h-8 border-zinc-700/60 bg-zinc-950/35 px-2.5 text-xs backdrop-blur-md"
                  />
                  <div className="flex items-center gap-2">
                    <label className="flex h-8 flex-1 items-center gap-2 rounded-md border border-zinc-700/60 bg-zinc-950/35 px-2 text-[11px] text-zinc-300 backdrop-blur-md">
                      <input
                        type="color"
                        value={draftColor}
                        onChange={(event) => setDraftColor(event.target.value)}
                        className="h-4 w-4 cursor-pointer rounded border-0 bg-transparent p-0"
                      />
                      Custom color
                    </label>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 gap-1.5 px-2.5 text-xs"
                      disabled={uploadingBanner}
                      onClick={() => bannerInputRef.current?.click()}
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      Image
                    </Button>
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => void uploadBanner(event.target.files?.[0])}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 text-xs"
                      onClick={() => setIdentityOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      disabled={savingIdentity || !draftTitle.trim()}
                      onClick={() => void saveIdentity()}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2 text-[11px] text-zinc-500">
              <span>Projects</span>
              <span className="text-zinc-700">/</span>
              <span className="truncate text-zinc-400">{clientName ?? "Client"}</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">
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
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
            <Button variant="secondary" className="w-full gap-2 sm:w-auto" onClick={onShare}>
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share review link</span>
              <span className="sm:hidden">Share</span>
            </Button>
            <Button
              variant="secondary"
              className="w-full gap-2 sm:w-auto"
              disabled={reprocessing}
              onClick={onReprocess}
            >
              <RefreshCw className={cn("h-4 w-4", reprocessing && "animate-spin")} />
              <span className="hidden sm:inline">Refresh previews</span>
              <span className="sm:hidden">Refresh</span>
            </Button>
            <Button
              variant="secondary"
              className="w-full gap-2 text-zinc-300 sm:w-auto"
              disabled={!canClearVideos}
              onClick={onClearVideos}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Clear videos</span>
              <span className="sm:hidden">Clear</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full gap-2 text-zinc-500 sm:w-auto"
              onClick={onArchiveProject}
            >
              <Archive className="h-4 w-4" />
              <span className="hidden sm:inline">Archive project</span>
              <span className="sm:hidden">Archive</span>
            </Button>
            <Link href={uploadHref}>
              <Button className="w-full gap-2 sm:w-auto">
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

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `rgba(20,184,166,${alpha})`;
  }
  const value = Number.parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red},${green},${blue},${alpha})`;
}
