"use client";

import * as Popover from "@radix-ui/react-popover";
import {
  type CSSProperties,
  type DragEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AdminGate, useAdminAccess } from "@/components/auth/AdminGate";
import { VideoGrid } from "@/components/video/VideoGrid";
import { VideoTableView } from "@/components/video/VideoTableView";
import { VideoReviewMode } from "@/components/video/VideoReviewMode";
import { VideoDetailsPanel } from "@/components/video/VideoDetailsPanel";
import { ImageLightbox } from "@/components/video/ImageLightbox";
import { ProjectViewSwitcher } from "./ProjectViewSwitcher";
import { ProjectFilters } from "./ProjectFilters";
import { VideoGroupedView } from "./VideoGroupedView";
import { FolderShelf } from "./FolderShelf";
import { matchesSmartView } from "@/lib/smartViews";
import { applyFilters, sortVideos, type FilterState } from "@/lib/filters";
import { isImageAsset, mediaKind } from "@/lib/media";
import type {
  AssetClass,
  CardAspectRatio,
  GridSize,
  SmartViewId,
  SortKey,
  ThumbnailScale,
  WorkspaceLayout,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useStorageUrl } from "@/hooks/useStorageUrl";
import { DEFAULT_PROJECT_ACCENT, hexToRgba, projectAccent } from "@/lib/projectAccent";

type ProjectIdentityPatch = {
  title?: string;
  clientName?: string;
  description?: string;
  brandColor?: string;
  bannerKey?: string;
  clearClientName?: boolean;
  clearDescription?: boolean;
  clearBanner?: boolean;
};
type ProjectVisibility = "private" | "shared" | "workspace";

const VISIBILITY_OPTIONS: Array<{
  id: ProjectVisibility;
  label: string;
  description: string;
}> = [
  {
    id: "private",
    label: "Private",
    description: "Only you can open this project.",
  },
  {
    id: "shared",
    label: "Shared",
    description: "Only listed people or domains can open it.",
  },
  {
    id: "workspace",
    label: "Workspace",
    description: "Every signed-in app user can open it.",
  },
];

const WORKSPACE_APPEARANCE_KEY = "review-room.workspace.appearance";
const GRID_SIZES: GridSize[] = ["sm", "md", "lg"];
const CARD_ASPECT_RATIOS: CardAspectRatio[] = ["video", "square", "portrait"];
const THUMBNAIL_SCALES: ThumbnailScale[] = ["fit", "fill"];
const ASSET_CLASSES: AssetClass[] = ["VID", "IMG", "CTX", "STB"];

export function ProjectWorkspace({ projectId }: { projectId: Id<"projects"> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { appUser, isAuthenticated, isChecking } = useAdminAccess();
  const projectQueryArgs = appUser ? { projectId } : "skip";
  const project = useQuery(api.projects.getById, projectQueryArgs);
  const queriedVideos = useQuery(api.videos.listByProject, projectQueryArgs);
  const queriedFolders = useQuery(api.folders.listByProject, projectQueryArgs);
  const videos = useMemo(() => queriedVideos ?? [], [queriedVideos]);
  const folders = useMemo(() => queriedFolders ?? [], [queriedFolders]);
  const createLink = useMutation(api.reviewLinks.create);
  const archiveVideos = useMutation(api.videos.archiveByProject);
  const archiveProject = useMutation(api.projects.archive);
  const updateProject = useMutation(api.projects.update);
  const startPreviewRefresh = useMutation(api.videos.startPreviewRefresh);
  const markProcessingFailed = useMutation(api.videos.markProcessingFailed);
  const moveToFolder = useMutation(api.videos.moveToFolder);
  const renameFolderMutation = useMutation(api.folders.rename);
  const removeFolderMutation = useMutation(api.folders.remove);

  const [view, setView] = useState<SmartViewId>("all");
  const [layout, setLayout] = useState<WorkspaceLayout>("grid");
  const [gridSize, setGridSize] = useState<GridSize>("md");
  const [aspectRatio, setAspectRatio] = useState<CardAspectRatio>("square");
  const [thumbnailScale, setThumbnailScale] = useState<ThumbnailScale>("fill");
  const [showCardInfo, setShowCardInfo] = useState(true);
  const [appearanceReady, setAppearanceReady] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"videos"> | null>(null);
  const [previewImageId, setPreviewImageId] = useState<Id<"videos"> | null>(null);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");
  const [filters, setFilters] = useState<FilterState>({
    mediaTypes: [],
    assetClasses: [],
    statuses: [],
    tags: [],
    minRating: 0,
    selectedOnly: false,
    hasComments: false,
    search: "",
  });
  const folderParam = searchParams.get("folder");
  const activeFolderId =
    folderParam && folderParam !== "root"
      ? (folderParam as Id<"projectFolders">)
      : null;
  const assetClassParam = searchParams.get("assetClass");
  const routeAssetClass = ASSET_CLASSES.includes(assetClassParam as AssetClass)
    ? (assetClassParam as AssetClass)
    : null;
  const videoParam = searchParams.get("video");

  const folderScopedVideos = useMemo(
    () =>
      routeAssetClass
        ? videos
        : layout === "table" && !activeFolderId
          ? videos
        : videos.filter((video) =>
            activeFolderId ? video.folderId === activeFolderId : !video.folderId,
          ),
    [activeFolderId, layout, routeAssetClass, videos],
  );

  const viewScopedVideos = useMemo(
    () => folderScopedVideos.filter((v) => matchesSmartView(v, view)),
    [folderScopedVideos, view],
  );

  const filtered = useMemo(() => {
    let list = viewScopedVideos;
    list = applyFilters(list, filters);
    return sortVideos(list, sort);
  }, [filters, sort, viewScopedVideos]);

  const activeFolder = activeFolderId
    ? folders.find((folder) => folder._id === activeFolderId)
    : null;
  const mediaTypeCounts = {
    all: viewScopedVideos.length,
    video: viewScopedVideos.filter((asset) => mediaKind(asset) === "video").length,
    image: viewScopedVideos.filter((asset) => mediaKind(asset) === "image").length,
  };
  const assetClassCounts = {
    all: viewScopedVideos.length,
    VID: viewScopedVideos.filter(
      (asset) => (asset.assetClass ?? (mediaKind(asset) === "video" ? "VID" : "IMG")) === "VID",
    ).length,
    IMG: viewScopedVideos.filter(
      (asset) => (asset.assetClass ?? (mediaKind(asset) === "video" ? "VID" : "IMG")) === "IMG",
    ).length,
    CTX: viewScopedVideos.filter((asset) => asset.assetClass === "CTX").length,
    STB: viewScopedVideos.filter((asset) => asset.assetClass === "STB").length,
  };
  const selected = videos.find((v) => v._id === selectedId) ?? null;
  const previewImage = videos.find((v) => v._id === previewImageId) ?? null;
  const counts = {
    awaiting: videos.filter((v) => v.status === "awaiting_review" && !v.viewed).length,
    feedback: videos.filter((v) => v.commentCount > 0).length,
    selected: videos.filter((v) => v.isSelect).length,
    approved: videos.filter((v) => v.status === "approved").length,
  };

  useEffect(() => {
    if (!videoParam || !videos.length) return;
    const deepLinkedVideo = videos.find((video) => video._id === videoParam);
    if (!deepLinkedVideo) return;
    setSelectedId((current) =>
      current === deepLinkedVideo._id ? current : deepLinkedVideo._id,
    );
    setPanelExpanded(false);
  }, [videoParam, videos]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(
        `${WORKSPACE_APPEARANCE_KEY}.${projectId}`,
      );
      if (stored) {
        const parsed = JSON.parse(stored) as {
          gridSize?: GridSize;
          aspectRatio?: CardAspectRatio;
          thumbnailScale?: ThumbnailScale;
          showCardInfo?: boolean;
        };
        if (parsed.gridSize && GRID_SIZES.includes(parsed.gridSize)) {
          setGridSize(parsed.gridSize);
        }
        if (
          parsed.aspectRatio &&
          CARD_ASPECT_RATIOS.includes(parsed.aspectRatio)
        ) {
          setAspectRatio(parsed.aspectRatio);
        }
        if (
          parsed.thumbnailScale &&
          THUMBNAIL_SCALES.includes(parsed.thumbnailScale)
        ) {
          setThumbnailScale(parsed.thumbnailScale);
        }
        if (typeof parsed.showCardInfo === "boolean") {
          setShowCardInfo(parsed.showCardInfo);
        }
      }
    } finally {
      setAppearanceReady(true);
    }
  }, [projectId]);

  useEffect(() => {
    if (!appearanceReady) return;
    window.localStorage.setItem(
      `${WORKSPACE_APPEARANCE_KEY}.${projectId}`,
      JSON.stringify({ gridSize, aspectRatio, thumbnailScale, showCardInfo }),
    );
  }, [
    appearanceReady,
    aspectRatio,
    gridSize,
    projectId,
    showCardInfo,
    thumbnailScale,
  ]);

  useEffect(() => {
    setFilters((current) => {
      const nextAssetClasses = routeAssetClass ? [routeAssetClass] : [];
      if (
        current.assetClasses.length === nextAssetClasses.length &&
        current.assetClasses[0] === nextAssetClasses[0]
      ) {
        return current;
      }
      return { ...current, assetClasses: nextAssetClasses };
    });
  }, [routeAssetClass]);

  async function reprocessPreviews() {
    setReprocessing(true);
    try {
      let ok = 0;
      let failed = 0;
      let skippedImages = 0;
      for (const video of videos) {
        if (isImageAsset(video)) {
          skippedImages++;
          continue;
        }
        try {
          const job = await startPreviewRefresh({ videoId: video._id });
          const res = await fetch("/api/media/enqueue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              videoId: video._id,
              storageKey: job.storageKey,
              previousThumbnailKey: job.previousThumbnailKey,
              previousSpriteKey: job.previousSpriteKey,
            }),
          });
          if (res.ok) {
            ok++;
          } else {
            failed++;
            await markProcessingFailed({ videoId: video._id });
          }
        } catch {
          failed++;
          await markProcessingFailed({ videoId: video._id }).catch(() => {});
        }
      }
      if (failed) {
        toast.error(`Queued ${ok} previews; ${failed} failed to start`);
      } else {
        toast.success(
          skippedImages
            ? `Refreshing previews for ${ok} videos; ${skippedImages} images skipped`
            : `Refreshing previews for ${ok} videos`,
        );
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
    if (!window.confirm(`Archive ${videos.length} assets from this project?`)) return;
    const result = await archiveVideos({ projectId });
    setSelectedId(null);
    toast.success(`Archived ${result.archived} assets`);
  }

  async function archiveCurrentProject() {
    if (!project) return;
    if (!window.confirm(`Archive project "${project.title}"?`)) return;
    await archiveProject({ projectId });
    toast.success("Project archived");
    router.push("/dashboard");
  }

  if (isChecking || !isAuthenticated || !appUser) {
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

  function beginVideoDrag(event: DragEvent<HTMLElement>, video: (typeof videos)[number]) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/review-room-video-id", video._id);
    event.dataTransfer.setData("text/plain", video.title);
  }

  async function moveVideoToFolder(
    videoId: Id<"videos">,
    folderId: Id<"projectFolders"> | undefined,
  ) {
    try {
      await moveToFolder(
        folderId ? { videoId, folderId } : { videoId },
      );
      const folder = folderId
        ? folders.find((item) => item._id === folderId)
        : null;
      toast.success(folder ? `Moved to ${folder.title}` : "Moved to project root");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not move media");
    }
  }

  async function renameFolder(folderId: Id<"projectFolders">, title: string) {
    try {
      await renameFolderMutation({ folderId, title });
      toast.success("Folder renamed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not rename folder");
    }
  }

  async function removeFolder(
    folderId: Id<"projectFolders">,
    title: string,
    assetDisposition: "move_to_root" | "archive_assets",
  ) {
    const count = videos.filter((video) => video.folderId === folderId).length;
    const action =
      assetDisposition === "archive_assets"
        ? `Archive ${count} media ${count === 1 ? "asset" : "assets"} and delete "${title}"?`
        : `Delete "${title}" and move ${count} media ${count === 1 ? "asset" : "assets"} to Project root?`;
    if (count > 0 && !window.confirm(action)) return;
    if (count === 0 && !window.confirm(`Delete folder "${title}"?`)) return;

    try {
      const result = await removeFolderMutation({ folderId, assetDisposition });
      if (activeFolderId === folderId) router.push(`/dashboard/projects/${projectId}`);
      toast.success(
        result.archived
          ? `Archived ${result.archived} and removed folder`
          : result.moved
            ? `Moved ${result.moved} to Project root`
            : "Folder removed",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove folder");
    }
  }

  const canEditProject = appUser.role === "admin" && project.memberRole !== "viewer";
  const canUploadMedia = true;
  const canOrganizeFolders = canEditProject;
  const canManageAccess = appUser.role === "admin" && project.isOwner;

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
          visibility={(project.visibility ?? "private") as ProjectVisibility}
          counts={counts}
          onUpdate={(patch) => updateProject({ projectId, ...patch })}
          onShare={() =>
            void createLink({
              projectId,
              canDownload: project.downloadEnabledByDefault,
              appearance: {
                gridSize,
                aspectRatio,
                thumbnailScale,
                showCardInfo,
              },
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
          canClearVideos={canManageAccess && videos.length > 0}
          onArchiveProject={() => void archiveCurrentProject()}
          uploadHref={
            activeFolderId
              ? `/dashboard/projects/${projectId}/upload?folder=${activeFolderId}`
              : `/dashboard/projects/${projectId}/upload`
          }
          canEditProject={canEditProject}
          canUploadMedia={canUploadMedia}
          canManageAccess={canManageAccess}
        />

        <ProjectViewSwitcher
          videos={folderScopedVideos}
          active={view}
          onChange={setView}
        />

        <ProjectFilters
          layout={layout}
          gridSize={gridSize}
          aspectRatio={aspectRatio}
          thumbnailScale={thumbnailScale}
          showCardInfo={showCardInfo}
          resultCount={filtered.length}
          mediaTypeCounts={mediaTypeCounts}
          assetClassCounts={assetClassCounts}
          filters={filters}
          sort={sort}
          onLayout={setLayout}
          onGridSize={setGridSize}
          onAspectRatio={setAspectRatio}
          onThumbnailScale={setThumbnailScale}
          onShowCardInfo={setShowCardInfo}
          onFilters={setFilters}
          onSort={setSort}
        />

        <div className="min-h-[420px]">
          <div className="min-w-0 flex-1">
            <div className={cn("flex gap-0", selected && !panelExpanded && "lg:flex-row")}>
              <div className={cn("min-w-0 flex-1", selected && "lg:pr-0")}>
                {layout === "grid" ? (
                  <VideoGrid
                    videos={filtered}
                    leadingItems={
                      <FolderShelf
                        folders={routeAssetClass ? [] : folders}
                        videos={videos}
                        activeFolderId={activeFolderId}
                        brandColor={project.brandColor}
                        canEdit={canOrganizeFolders}
                        onOpen={(folderId) =>
                          router.push(
                            folderId
                              ? `/dashboard/projects/${projectId}?folder=${folderId}`
                              : `/dashboard/projects/${projectId}`,
                          )
                        }
                        onDropVideo={(videoId, folderId) =>
                          void moveVideoToFolder(videoId, folderId)
                        }
                        onRenameFolder={(folderId, title) =>
                          void renameFolder(folderId, title)
                        }
                        onRemoveFolder={(folderId, title, assetDisposition) =>
                          void removeFolder(folderId, title, assetDisposition)
                        }
                      />
                    }
                    selectedId={selectedId ?? undefined}
                    size={gridSize}
                    aspectRatio={aspectRatio}
                    thumbnailScale={thumbnailScale}
                    showCardInfo={showCardInfo}
                    onDragStart={canOrganizeFolders ? beginVideoDrag : undefined}
                    onSelect={(id) => {
                      setSelectedId(id);
                      setPanelExpanded(false);
                    }}
                    onOpenImagePreview={(video) => setPreviewImageId(video._id)}
                    empty={
                      <div className="text-center">
                        <p>
                          {activeFolder
                            ? "No media in this folder."
                            : "Upload your first media to start a review."}
                        </p>
                        {canUploadMedia && (
                          <Link
                            href={
                              activeFolderId
                                ? `/dashboard/projects/${projectId}/upload?folder=${activeFolderId}`
                                : `/dashboard/projects/${projectId}/upload`
                            }
                          >
                            <Button className="mt-3">Upload</Button>
                          </Link>
                        )}
                      </div>
                    }
                  />
                ) : layout === "grouped" ? (
                  <VideoGroupedView
                    folders={activeFolderId || routeAssetClass ? [] : folders}
                    folderVideos={videos}
                    brandColor={project.brandColor}
                    videos={filtered}
                    size={gridSize}
                    aspectRatio={aspectRatio}
                    thumbnailScale={thumbnailScale}
                    showCardInfo={showCardInfo}
                    selectedId={selectedId ?? undefined}
                    onDragStart={canOrganizeFolders ? beginVideoDrag : undefined}
                    onOpenFolder={(folderId) =>
                      router.push(
                        `/dashboard/projects/${projectId}?folder=${folderId}`,
                      )
                    }
                    onDropVideo={
                      canOrganizeFolders
                        ? (videoId, folderId) =>
                            void moveVideoToFolder(videoId, folderId)
                        : undefined
                    }
                    onRenameFolder={
                      canOrganizeFolders
                        ? (folderId, title) => void renameFolder(folderId, title)
                        : undefined
                    }
                    onRemoveFolder={
                      canOrganizeFolders
                        ? (folderId, title, assetDisposition) =>
                            void removeFolder(folderId, title, assetDisposition)
                        : undefined
                    }
                    onSelect={setSelectedId}
                    onOpenImagePreview={(video) => setPreviewImageId(video._id)}
                  />
                ) : layout === "table" ? (
                  <VideoTableView
                    projectId={projectId}
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
                    canEdit={canEditProject}
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
                    canEdit={canEditProject}
                    canDelete={project.isOwner}
                    canManageFeedback={canEditProject}
                  />
                </>
              )}
            </div>
          </div>
        </div>
        <ImageLightbox
          video={previewImage}
          mode="admin"
          canDownload={Boolean(previewImage?.downloadEnabled)}
          onClose={() => setPreviewImageId(null)}
        />
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
  visibility,
  counts,
  onUpdate,
  onShare,
  onReprocess,
  reprocessing,
  onClearVideos,
  canClearVideos,
  onArchiveProject,
  uploadHref,
  canEditProject,
  canUploadMedia,
  canManageAccess,
}: {
  title: string;
  clientName?: string;
  description?: string;
  brandColor?: string;
  bannerKey?: string;
  updatedAt: number;
  projectId: Id<"projects">;
  visibility: ProjectVisibility;
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
  canEditProject: boolean;
  canUploadMedia: boolean;
  canManageAccess: boolean;
}) {
  const bannerUrl = useStorageUrl(bannerKey, updatedAt);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftClientName, setDraftClientName] = useState(clientName ?? "");
  const [draftDescription, setDraftDescription] = useState(description ?? "");
  const [draftColor, setDraftColor] = useState(
    brandColor ?? DEFAULT_PROJECT_ACCENT,
  );
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const accent = projectAccent(brandColor);
  const heroStyle = {
    "--project-accent": accent,
    backgroundImage: bannerUrl
      ? `linear-gradient(90deg, rgba(9,9,11,0.68), rgba(9,9,11,0.22)), url("${bannerUrl}")`
      : `radial-gradient(circle at 20% 0%, ${hexToRgba(accent, 0.2)}, transparent 32%), linear-gradient(135deg, #18181b, #09090b 70%)`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  } as CSSProperties;

  function resetIdentityDrafts() {
    setDraftTitle(title);
    setDraftClientName(clientName ?? "");
    setDraftDescription(description ?? "");
    setDraftColor(brandColor ?? DEFAULT_PROJECT_ACCENT);
  }

  function openIdentityEditor() {
    resetIdentityDrafts();
    setIdentityOpen((open) => !open);
  }

  function showIdentityEditor() {
    resetIdentityDrafts();
    setIdentityOpen(true);
  }

  async function saveIdentity() {
    const nextTitle = draftTitle.trim();
    const nextClientName = draftClientName.trim();
    const nextDescription = draftDescription.trim();
    if (!nextTitle) return;
    setSavingIdentity(true);
    try {
      await onUpdate({
        title: nextTitle,
        clientName: nextClientName || undefined,
        description: nextDescription || undefined,
        clearClientName: !nextClientName,
        clearDescription: !nextDescription,
        brandColor: draftColor,
      });
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

  async function clearBanner() {
    if (!bannerKey) return;
    setUploadingBanner(true);
    try {
      await onUpdate({ clearBanner: true });
      toast.success("Project banner removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove banner",
      );
    } finally {
      setUploadingBanner(false);
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
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:gap-5">
          <div className="relative shrink-0">
            <button
              type="button"
              disabled={!canEditProject}
              className="group grid h-16 w-16 place-items-center rounded-xl text-lg font-semibold text-zinc-950 ring-4 ring-zinc-950 transition hover:brightness-110 sm:h-20 sm:w-20"
              style={{ backgroundColor: accent }}
              onClick={openIdentityEditor}
              title={canEditProject ? "Edit project identity" : "View-only project"}
            >
              {initials(title)}
              <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300 opacity-0 shadow-sm transition group-hover:opacity-100">
                <Palette className="h-3.5 w-3.5" />
              </span>
            </button>
            {identityOpen && canEditProject && (
              <div className="absolute left-0 top-full z-50 mt-3 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 shadow-2xl shadow-black/45">
                <div className="space-y-2">
                  <Input
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    aria-label="Project title"
                    placeholder="Project title"
                    className="h-8 border-zinc-800 bg-zinc-900 px-2.5 text-xs"
                  />
                  <Input
                    value={draftClientName}
                    onChange={(event) => setDraftClientName(event.target.value)}
                    aria-label="Client name"
                    placeholder="Client name"
                    className="h-8 border-zinc-800 bg-zinc-900 px-2.5 text-xs"
                  />
                  <Textarea
                    value={draftDescription}
                    onChange={(event) => setDraftDescription(event.target.value)}
                    aria-label="Project description"
                    placeholder="Project description"
                    className="min-h-16 border-zinc-800 bg-zinc-900 px-2.5 py-2 text-xs"
                  />
                  <div className="flex items-center gap-2">
                    <label className="flex h-8 flex-1 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-[11px] text-zinc-300">
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
                    {bannerKey && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 px-2 text-xs text-zinc-400 hover:text-red-300"
                        disabled={uploadingBanner}
                        onClick={() => void clearBanner()}
                      >
                        <X className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    )}
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
              {canEditProject ? (
                <button
                  type="button"
                  className="truncate text-left text-zinc-400 transition hover:text-zinc-200"
                  onClick={showIdentityEditor}
                  title="Edit client name"
                >
                  {clientName ?? "Client"}
                </button>
              ) : (
                <span className="truncate text-zinc-400">
                  {clientName ?? "Client"}
                </span>
              )}
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">
              {title}
            </h1>
            {description && (
              <p className="mt-1 line-clamp-2 max-w-3xl break-words text-[13px] leading-5 text-zinc-500">
                {description}
              </p>
            )}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-zinc-600">
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3 w-3" />
                {canEditProject ? (
                  <button
                    type="button"
                    className="transition hover:text-zinc-300"
                    onClick={showIdentityEditor}
                    title="Edit client name"
                  >
                    {clientName ?? "No client"}
                  </button>
                ) : (
                  clientName ?? "No client"
                )}
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
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-start xl:justify-end">
            <ProjectAccessPopover
              projectId={projectId}
              visibility={visibility}
              canManage={canManageAccess}
            />
            {canManageAccess && (
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-full gap-1.5 px-2.5 text-xs sm:w-auto"
                onClick={onShare}
              >
                <Link2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share review link</span>
                <span className="sm:hidden">Share</span>
              </Button>
            )}
            {canEditProject && (
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-full gap-1.5 px-2.5 text-xs sm:w-auto"
                disabled={reprocessing}
                onClick={onReprocess}
              >
                <RefreshCw className={cn("h-4 w-4", reprocessing && "animate-spin")} />
                <span className="hidden sm:inline">Refresh previews</span>
                <span className="sm:hidden">Refresh</span>
              </Button>
            )}
            {canEditProject && (
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-full gap-1.5 px-2.5 text-xs text-zinc-300 sm:w-auto"
                disabled={!canClearVideos}
                onClick={onClearVideos}
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Clear media</span>
                <span className="sm:hidden">Clear</span>
              </Button>
            )}
            {canManageAccess && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-full gap-1.5 px-2.5 text-xs text-zinc-500 sm:w-auto"
                onClick={onArchiveProject}
              >
                <Archive className="h-4 w-4" />
                <span className="hidden sm:inline">Archive project</span>
                <span className="sm:hidden">Archive</span>
              </Button>
            )}
            {canUploadMedia && (
              <Link href={uploadHref}>
                <Button size="sm" className="h-8 w-full gap-1.5 px-2.5 text-xs sm:w-auto">
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
              </Link>
            )}
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

function ProjectAccessPopover({
  projectId,
  visibility,
  canManage,
}: {
  projectId: Id<"projects">;
  visibility: ProjectVisibility;
  canManage: boolean;
}) {
  const members = useQuery(api.projects.listMembers, { projectId });
  const addMember = useMutation(api.projects.addMember);
  const removeMember = useMutation(api.projects.removeMember);
  const removeAccessRule = useMutation(api.projects.removeAccessRule);
  const setVisibility = useMutation(api.projects.setVisibility);
  const [identifier, setIdentifier] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingVisibility, setSavingVisibility] =
    useState<ProjectVisibility | null>(null);

  const activeVisibility =
    VISIBILITY_OPTIONS.find((option) => option.id === visibility) ??
    VISIBILITY_OPTIONS[0];

  async function submitMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = identifier.trim();
    if (!value) return;
    setSaving(true);
    try {
      await addMember({ projectId, identifier: value, role: "editor" });
      setIdentifier("");
      toast.success(value.includes("*") ? "Email rule added" : "Member added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add user");
    } finally {
      setSaving(false);
    }
  }

  async function updateVisibility(nextVisibility: ProjectVisibility) {
    if (!canManage || nextVisibility === visibility) return;
    setSavingVisibility(nextVisibility);
    try {
      await setVisibility({ projectId, visibility: nextVisibility });
      toast.success(
        nextVisibility === "workspace"
          ? "Project visible to the workspace"
          : nextVisibility === "shared"
            ? "Project set to shared"
            : "Project set to private",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update access",
      );
    } finally {
      setSavingVisibility(null);
    }
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 w-full gap-1.5 px-2.5 text-xs sm:w-auto"
        >
          <Users className="h-4 w-4" />
          Access
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-50 w-[21rem] max-w-[calc(100vw-1rem)] rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-zinc-200 shadow-2xl shadow-black/45"
        >
          <div className="mb-3 border-b border-zinc-800 pb-2">
            <p className="text-xs font-medium text-zinc-100">Project access</p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Choose who inside the app can open this project.
            </p>
            <p className="mt-1 text-[10px] leading-4 text-zinc-600">
              Sign-in is still limited by the backend allowlist.
            </p>
          </div>

          <div className="mb-3 space-y-2">
            {canManage ? (
              <div className="grid grid-cols-3 gap-1.5">
                {VISIBILITY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={savingVisibility !== null}
                    onClick={() => void updateVisibility(option.id)}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-left text-[11px] font-medium transition",
                      visibility === option.id
                        ? "border-teal-400 bg-teal-950 text-teal-100"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                    )}
                  >
                    {savingVisibility === option.id ? "Saving" : option.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5">
                <p className="text-[11px] font-medium text-zinc-200">
                  {activeVisibility.label}
                </p>
              </div>
            )}
            <p className="text-[10px] leading-4 text-zinc-500">
              {activeVisibility.description}
            </p>
          </div>

          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-zinc-300">
              Direct access
            </p>
            {visibility === "workspace" && (
              <span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] font-medium text-sky-300">
                Optional
              </span>
            )}
          </div>
          <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
            {!members ? (
              <p className="py-4 text-center text-xs text-zinc-500">Loading...</p>
            ) : (
              members.map((member) => (
                <div
                  key={member.entryKey}
                  className="flex items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-zinc-200">
                      {member.name}
                    </p>
                    <p className="truncate text-[10px] text-zinc-500">
                      {member.isRule ? "Email rule" : member.email ?? member.role}
                    </p>
                  </div>
                  {member.isOwner ? (
                    <span className="rounded-full bg-teal-400/10 px-2 py-0.5 text-[10px] font-medium text-teal-300">
                      Owner
                    </span>
                  ) : canManage && member.membershipId ? (
                    <button
                      type="button"
                      title="Remove member"
                      className="grid h-6 w-6 place-items-center rounded text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
                      onClick={() =>
                        void removeMember({
                          membershipId: member.membershipId!,
                        }).then(() => toast.success("Member removed"))
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : canManage && member.ruleId ? (
                    <button
                      type="button"
                      title="Remove email rule"
                      className="grid h-6 w-6 place-items-center rounded text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
                      onClick={() =>
                        void removeAccessRule({
                          ruleId: member.ruleId!,
                        }).then(() => toast.success("Email rule removed"))
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <span className="text-[10px] capitalize text-zinc-500">
                      {member.role}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {canManage && (
            <form onSubmit={submitMember} className="mt-3 space-y-2">
              <Input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="Email, name, or *@domain.com"
                className="h-8 border-zinc-800 bg-zinc-900 text-xs"
              />
              <Button
                type="submit"
                size="sm"
                className="h-8 w-full gap-1.5 px-2.5 text-xs"
                disabled={saving || !identifier.trim()}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add person or domain
              </Button>
            </form>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
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
