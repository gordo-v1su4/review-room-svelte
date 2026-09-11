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
  MoreHorizontal,
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
import { CenterAssetViewer } from "@/components/video/CenterAssetViewer";
import { VideoInspectorPanel } from "@/components/video/VideoInspectorPanel";
import { ReviewWorkspaceShell } from "./ReviewWorkspaceShell";
import { WorkspacePanelToggles } from "./WorkspacePanelToggles";
import { AssetBrowserToolbar } from "./AssetBrowserToolbar";
import { ImageLightbox } from "@/components/video/ImageLightbox";
import { VideoGroupedView } from "./VideoGroupedView";
import { VideoFieldGroupedView } from "./VideoFieldGroupedView";
import { FolderShelf } from "./FolderShelf";
import { matchesSmartView } from "@/lib/smartViews";
import { projectRootLabel } from "@/lib/projectFolders";
import { applyFilters, sortVideos, type FilterState } from "@/lib/filters";
import {
  applyCollectionFilterRules,
  collectionIsConfigured,
  collectionRulesActive,
  collectionRulesToFilterState,
  filterStateToCollectionRules,
  type CollectionFilterRules,
} from "@/lib/collectionFilters";
import { isImageAsset, mediaKind } from "@/lib/media";
import type {
  AssetClass,
  CardAspectRatio,
  FolderSortKey,
  GridSize,
  GroupByField,
  SmartViewId,
  SortKey,
  ThumbnailScale,
  WorkspaceLayout,
} from "@/lib/types";
import type { CardFieldId } from "@/lib/cardFields";
import {
  DEFAULT_VISIBLE_CARD_FIELDS,
  normalizeVisibleFields,
} from "@/lib/cardFields";
import {
  layoutPreset,
  loadWorkspacePanelState,
  saveWorkspacePanelState,
  WORKSPACE_CHROME_PADDING,
} from "@/lib/workspaceLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  emptySelectModifiers,
  nextCheckedIds,
  type MediaSelectModifiers,
} from "@/lib/mediaSelection";
import { isEditableTarget, stepInList } from "@/lib/mediaNavigation";
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

const WORKSPACE_APPEARANCE_KEY = "review-room.workspace.appearance.shared";
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
  const removeMany = useMutation(api.videos.removeMany);
  const archiveProject = useMutation(api.projects.archive);
  const updateProject = useMutation(api.projects.update);
  const startPreviewRefresh = useMutation(api.videos.startPreviewRefresh);
  const markProcessingFailed = useMutation(api.videos.markProcessingFailed);
  const moveToFolder = useMutation(api.videos.moveToFolder);
  const markViewedAdmin = useMutation(api.videos.markViewed);
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
  const [checkedIds, setCheckedIds] = useState<Id<"videos">[]>([]);
  const [lastCheckedId, setLastCheckedId] = useState<Id<"videos"> | null>(null);
  const [previewImageId, setPreviewImageId] = useState<Id<"videos"> | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [viewerAutoPlay, setViewerAutoPlay] = useState(false);
  const [viewerExpanded, setViewerExpanded] = useState(false);
  const [panelLayout, setPanelLayout] = useState(() =>
    loadWorkspacePanelState(projectId).layout,
  );
  const desktopWorkspace = useMediaQuery("(min-width: 1024px)");
  const [drawMode, setDrawMode] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [groupBy, setGroupBy] = useState<GroupByField>("none");
  const [visibleCardFields, setVisibleCardFields] = useState<CardFieldId[]>(
    DEFAULT_VISIBLE_CARD_FIELDS,
  );
  const [cardFieldOrder, setCardFieldOrder] = useState<CardFieldId[]>(
    DEFAULT_VISIBLE_CARD_FIELDS,
  );
  const [reprocessing, setReprocessing] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");
  const [folderSort, setFolderSort] = useState<FolderSortKey>("newest");
  const [filters, setFilters] = useState<FilterState>({
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
  const collectionParam = searchParams.get("collection");
  const activeCollectionId = collectionParam
    ? (collectionParam as Id<"collections">)
    : null;
  const workspacePrefs = useQuery(
    api.workspacePreferences.getForProject,
    appUser ? { projectId } : "skip",
  );
  const saveCardFields = useMutation(api.workspacePreferences.saveCardFields);
  const ensureCollections = useMutation(api.collections.ensureSystemCollections);
  const setCollectionSourceFolder = useMutation(api.collections.setSourceFolder);
  const updateCollectionFilterRules = useMutation(api.collections.updateFilterRules);
  const activeCollection = useQuery(
    api.collections.getById,
    activeCollectionId ? { collectionId: activeCollectionId } : "skip",
  );

  // Whether the user has expressed any filter intent beyond browsing.
  const filtersActive =
    filters.assetClasses.length > 0 ||
    filters.statuses.length > 0 ||
    filters.tags.length > 0 ||
    filters.minRating > 0 ||
    filters.selectedOnly ||
    filters.hasComments ||
    filters.search.trim().length > 0;
  const isFiltering = view !== "all" || filtersActive;
  const collectionConfigured = activeCollection
    ? collectionIsConfigured(activeCollection)
    : false;
  const collectionBrowsing = Boolean(activeCollectionId && collectionConfigured);

  // One scope rule: counts always mean everything under the current level.
  // At project root that is every asset (including those nested in folders);
  // inside a folder it is that folder's assets.
  const scopedVideos = useMemo(
    () =>
      activeFolderId
        ? videos.filter((video) => video.folderId === activeFolderId)
        : videos,
    [activeFolderId, videos],
  );

  // Browsing shows structure; filtering shows content. With no filter at
  // root the grid holds folder tiles plus loose media. Once any filter is
  // active the grid flattens to matching media across all folders.
  const gridSourceVideos = useMemo(() => {
    if (activeCollection?.sourceFolderId) {
      return videos.filter((video) => video.folderId === activeCollection.sourceFolderId);
    }
    if (activeFolderId) return scopedVideos;
    if (routeAssetClass || layout === "table" || isFiltering || activeCollectionId) {
      return videos;
    }
    return videos.filter((video) => !video.folderId);
  }, [
    activeCollection?.sourceFolderId,
    activeCollectionId,
    activeFolderId,
    isFiltering,
    layout,
    routeAssetClass,
    scopedVideos,
    videos,
  ]);

  const viewScopedVideos = useMemo(
    () => scopedVideos.filter((v) => matchesSmartView(v, view)),
    [scopedVideos, view],
  );

  const filtered = useMemo(() => {
    let list = gridSourceVideos.filter((v) => matchesSmartView(v, view));
    if (activeCollection?.filterRules) {
      list = applyCollectionFilterRules(
        list,
        activeCollection.filterRules as CollectionFilterRules,
      );
    }
    list = applyFilters(list, filters);
    const collectionSort = activeCollection?.sortKey as SortKey | undefined;
    return sortVideos(list, collectionSort ?? sort);
  }, [activeCollection, filters, gridSourceVideos, sort, view]);

  const filteredIdsKey = filtered.map((video) => video._id).join(",");

  useEffect(() => {
    const visible = new Set(filteredIdsKey.split(",").filter(Boolean));
    setCheckedIds((current) => {
      const next = current.filter((id) => visible.has(id));
      return next.length === current.length ? current : next;
    });
  }, [filteredIdsKey]);

  function handleMediaSelect(
    id: Id<"videos">,
    modifiers: MediaSelectModifiers = emptySelectModifiers(),
  ) {
    const next = nextCheckedIds(
      filtered.map((video) => video._id),
      checkedIds,
      id,
      lastCheckedId,
      modifiers,
    );
    setCheckedIds(next);
    setLastCheckedId(id);
    setSelectedId(id);
    setViewerAutoPlay(false);
  }

  function applyPanelLayout(
    expanded: boolean,
    overrides?: { viewerOpen?: boolean; infoOpen?: boolean },
  ) {
    const nextViewerOpen = overrides?.viewerOpen ?? viewerOpen;
    const nextInfoOpen = overrides?.infoOpen ?? infoOpen;
    const nextLayout = layoutPreset({
      viewerOpen: nextViewerOpen,
      infoOpen: nextInfoOpen,
      expanded,
    });
    setPanelLayout(nextLayout);
    saveWorkspacePanelState(projectId, {
      viewerOpen: nextViewerOpen,
      infoOpen: nextInfoOpen,
      layout: nextLayout,
    });
  }

  function openVideoInWorkspace(videoId: Id<"videos">) {
    setSelectedId(videoId);
    setCheckedIds((current) =>
      current.includes(videoId) ? current : [...current, videoId],
    );
    setLastCheckedId(videoId);
    setViewerExpanded(true);
    setViewerOpen(true);
    setViewerAutoPlay(true);
    applyPanelLayout(true, { viewerOpen: true });
  }

  const activeFolder = activeFolderId
    ? folders.find((folder) => folder._id === activeFolderId)
    : null;

  const sortedFolders = useMemo(() => {
    const copy = [...folders];
    switch (folderSort) {
      case "oldest":
        return copy.sort((a, b) => a.createdAt - b.createdAt);
      case "title":
        return copy.sort((a, b) => a.title.localeCompare(b.title));
      case "title_desc":
        return copy.sort((a, b) => b.title.localeCompare(a.title));
      case "attention": {
        const attention = (folderId: Id<"projectFolders">) =>
          videos.filter(
            (v) => v.folderId === folderId && v.feedbackNeedsAttention === true,
          ).length;
        return copy.sort((a, b) => attention(b._id) - attention(a._id));
      }
      case "newest":
      default:
        return copy.sort((a, b) => b.createdAt - a.createdAt);
    }
  }, [folderSort, folders, videos]);

  const folderTitleById = useMemo(
    () => new Map(folders.map((folder) => [folder._id, folder.title])),
    [folders],
  );
  // Badge cards with their folder only when the grid is a flattened
  // cross-folder list; at level scope the location is already obvious.
  const showFolderBadges = !activeFolderId && folders.length > 0;
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

  // ←/→ cycles the open image lightbox first, otherwise the grid selection.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const ids = filtered.map((video) => video._id);
      if (!ids.length) return;
      if (previewImageId) {
        const next = stepInList(ids, previewImageId, direction);
        if (next && next !== previewImageId) {
          event.preventDefault();
          setPreviewImageId(next);
        }
        return;
      }
      const next = stepInList(ids, selectedId, direction);
      if (next && next !== selectedId) {
        event.preventDefault();
        setSelectedId(next);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filtered, previewImageId, selectedId]);

  const previewIds = filtered.map((video) => video._id);
  const activePreviewId = previewImageId;
  const activePreviewIndex = activePreviewId
    ? previewIds.indexOf(activePreviewId)
    : -1;
  const hasPrevPreview = activePreviewIndex > 0;
  const hasNextPreview =
    activePreviewIndex !== -1 && activePreviewIndex < previewIds.length - 1;

  function stepPreview(direction: 1 | -1) {
    const next = stepInList(previewIds, activePreviewId, direction);
    if (!next || next === activePreviewId) return;
    if (previewImageId) setPreviewImageId(next);
  }

  useEffect(() => {
    const stored = loadWorkspacePanelState(projectId);
    setPanelLayout(stored.layout);
    setViewerOpen(false);
    setInfoOpen(false);
    setViewerExpanded(false);
  }, [projectId]);

  useEffect(() => {
    if (!workspacePrefs) return;
    setVisibleCardFields(normalizeVisibleFields(workspacePrefs.visibleCardFields));
    setCardFieldOrder(
      normalizeVisibleFields(workspacePrefs.fieldOrder ?? workspacePrefs.visibleCardFields),
    );
  }, [workspacePrefs]);

  useEffect(() => {
    void ensureCollections({ projectId }).catch(() => {
      // Homelab may lag deploy; collections seed is non-blocking.
    });
  }, [ensureCollections, projectId]);

  const loadedCollectionFiltersRef = useRef<string | null>(null);
  useEffect(() => {
    loadedCollectionFiltersRef.current = null;
  }, [activeCollectionId]);

  useEffect(() => {
    if (!activeCollection || activeCollection.kind !== "user") return;
    if (!activeCollection.filterRules) return;
    const key = activeCollection._id;
    if (loadedCollectionFiltersRef.current === key) return;
    loadedCollectionFiltersRef.current = key;
    const parsed = collectionRulesToFilterState(
      activeCollection.filterRules as CollectionFilterRules,
    );
    setView(parsed.smartView);
    setFilters(parsed.filters);
  }, [activeCollection]);

  useEffect(() => {
    if (!videoParam || !videos.length) return;
    const deepLinkedVideo = videos.find((video) => video._id === videoParam);
    if (!deepLinkedVideo) return;
    setSelectedId((current) =>
      current === deepLinkedVideo._id ? current : deepLinkedVideo._id,
    );
  }, [videoParam, videos]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(WORKSPACE_APPEARANCE_KEY);
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
  }, []);

  useEffect(() => {
    if (!appearanceReady) return;
    window.localStorage.setItem(
      WORKSPACE_APPEARANCE_KEY,
      JSON.stringify({ gridSize, aspectRatio, thumbnailScale, showCardInfo }),
    );
  }, [appearanceReady, aspectRatio, gridSize, showCardInfo, thumbnailScale]);

  useEffect(() => {
    if (layout !== "review" || selectedId || !filtered[0]) return;
    setSelectedId(filtered[0]._id);
  }, [filtered, layout, selectedId]);

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
    closeSelectedAsset();
    setCheckedIds([]);
    setLastCheckedId(null);
    toast.success(`Archived ${result.archived} assets`);
  }

  async function deleteSelected() {
    if (!checkedIds.length) return;
    const count = checkedIds.length;
    if (
      !window.confirm(
        `Delete ${count} selected item${count === 1 ? "" : "s"}?`,
      )
    ) {
      return;
    }
    const result = await removeMany({ videoIds: checkedIds });
    if (selectedId && checkedIds.includes(selectedId)) {
      closeSelectedAsset();
    }
    setCheckedIds([]);
    setLastCheckedId(null);
    toast.success(`Deleted ${result.archived} item${result.archived === 1 ? "" : "s"}`);
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

  const projectTitle = project.title;

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
      toast.success(
        folder ? `Moved to ${folder.title}` : `Moved to ${projectRootLabel(projectTitle)}`,
      );
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
    const rootName = projectRootLabel(projectTitle);
    const action =
      assetDisposition === "archive_assets"
        ? `Archive ${count} media ${count === 1 ? "asset" : "assets"} and delete "${title}"?`
        : `Delete "${title}" and move ${count} media ${count === 1 ? "asset" : "assets"} to ${rootName}?`;
    if (count > 0 && !window.confirm(action)) return;
    if (count === 0 && !window.confirm(`Delete folder "${title}"?`)) return;

    try {
      const result = await removeFolderMutation({ folderId, assetDisposition });
      if (activeFolderId === folderId) router.push(`/dashboard/projects/${projectId}`);
      toast.success(
        result.archived
          ? `Archived ${result.archived} and removed folder`
          : result.moved
            ? `Moved ${result.moved} to ${rootName}`
            : "Folder removed",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove folder");
    }
  }

  function clearAllFilters() {
    setView("all");
    setFilters({
      assetClasses: [],
      statuses: [],
      tags: [],
      minRating: 0,
      selectedOnly: false,
      hasComments: false,
      search: "",
    });
    if (routeAssetClass) router.push(`/dashboard/projects/${projectId}`);
  }

  async function saveCollectionFilters() {
    if (!activeCollection || activeCollection.kind !== "user") return;
    const rules = filterStateToCollectionRules(filters, view);
    if (!collectionRulesActive(rules)) {
      toast.error("Set at least one filter in the toolbar first");
      return;
    }
    try {
      await updateCollectionFilterRules({
        collectionId: activeCollection._id,
        filterRules: rules,
      });
      toast.success("Collection filters saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save collection filters",
      );
    }
  }

  const canEditProject = appUser.role === "admin" && project.memberRole !== "viewer";
  const canUploadMedia = true;
  const canOrganizeFolders = canEditProject;
  const canManageAccess = appUser.role === "admin" && project.isOwner;
  const projectBrandColor = project.brandColor;
  const viewerPanelVisible =
    Boolean(selected) && desktopWorkspace && viewerOpen;
  const infoPanelVisible = Boolean(selected) && desktopWorkspace && infoOpen;
  const useWorkspacePanels =
    layout !== "review" && (viewerPanelVisible || infoPanelVisible);

  function handleLayoutChange(next: WorkspaceLayout) {
    if (next === "review") {
      setViewerOpen(false);
      setInfoOpen(false);
      setViewerAutoPlay(false);
      setViewerExpanded(false);
      persistPanelToggles({ viewerOpen: false, infoOpen: false });
    }
    setLayout(next);
  }

  function closeSelectedAsset() {
    setSelectedId(null);
    setViewerOpen(false);
    setInfoOpen(false);
    setViewerAutoPlay(false);
    setViewerExpanded(false);
    persistPanelToggles({ viewerOpen: false, infoOpen: false });
  }

  function renderGridContent(options: {
    selectedId?: Id<"videos">;
    includeLeadingItems?: boolean;
    onDragStart?: (event: DragEvent<HTMLElement>, video: (typeof videos)[number]) => void;
    showFolderBadges?: boolean;
    onSelect?: (id: Id<"videos">, modifiers?: MediaSelectModifiers) => void;
  }) {
    const handleSelect = options.onSelect ?? handleMediaSelect;
    const commonProps = {
      videos: filtered,
      selectedId: options.selectedId,
      checkedIds,
      size: gridSize,
      aspectRatio,
      thumbnailScale,
      showCardInfo,
      visibleFields: visibleCardFields,
      fieldOrder: cardFieldOrder,
      onSelect: handleSelect,
      onOpenImagePreview: (video: (typeof videos)[number]) => setPreviewImageId(video._id),
      onOpenVideoPreview: (video: (typeof videos)[number]) => openVideoInWorkspace(video._id),
      folderLabelFor: options.showFolderBadges
        ? (video: (typeof videos)[number]) =>
            video.folderId ? folderTitleById.get(video.folderId) : undefined
        : undefined,
      onOpenVideoFolder: (video: (typeof videos)[number]) =>
        video.folderId &&
        router.push(`/dashboard/projects/${projectId}?folder=${video.folderId}`),
      onDragStart: options.onDragStart,
    };

    if (groupBy !== "none") {
      return (
        <VideoFieldGroupedView
          {...commonProps}
          groupBy={groupBy}
          folderTitleById={folderTitleById}
          projectTitle={projectTitle}
        />
      );
    }

    return (
      <VideoGrid
        {...commonProps}
        leadingItems={
          options.includeLeadingItems
            ? (
                <FolderShelf
                  folders={
                    routeAssetClass || isFiltering || collectionBrowsing ? [] : sortedFolders
                  }
                  videos={videos}
                  activeFolderId={activeFolderId}
                  projectTitle={projectTitle}
                  brandColor={projectBrandColor}
                  aspectRatio={aspectRatio}
                  thumbnailScale={thumbnailScale}
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
                />
              )
            : undefined
        }
        empty={
          <div className="col-span-full py-16 text-center">
            <p className="text-sm text-zinc-500">
              {activeFolder
                ? "No media in this folder."
                : collectionBrowsing
                  ? "Nothing matches this collection."
                  : isFiltering
                    ? "Nothing matches the current filters."
                    : "Upload your first media to start a review."}
            </p>
            {!activeFolder && isFiltering ? (
              <Button variant="secondary" className="mt-3" onClick={clearAllFilters}>
                Clear filters
              </Button>
            ) : (
              canUploadMedia && (
                <Link
                  href={
                    activeFolderId
                      ? `/dashboard/projects/${projectId}/upload?folder=${activeFolderId}`
                      : `/dashboard/projects/${projectId}/upload`
                  }
                >
                  <Button className="mt-3">Upload</Button>
                </Link>
              )
            )}
          </div>
        }
      />
    );
  }

  function persistPanelToggles(next: { viewerOpen?: boolean; infoOpen?: boolean }) {
    const current = loadWorkspacePanelState(projectId);
    saveWorkspacePanelState(projectId, {
      ...current,
      viewerOpen: next.viewerOpen ?? viewerOpen,
      infoOpen: next.infoOpen ?? infoOpen,
    });
  }

  function handleVisibleFieldsChange(visible: CardFieldId[], order: CardFieldId[]) {
    setVisibleCardFields(visible);
    setCardFieldOrder(order);
    void saveCardFields({
      projectId,
      visibleCardFields: visible,
      fieldOrder: order,
    });
  }

  const assetBrowserToolbar = (
    <AssetBrowserToolbar
      layout={layout}
      gridSize={gridSize}
      aspectRatio={aspectRatio}
      thumbnailScale={thumbnailScale}
      showCardInfo={showCardInfo}
      assetClassCounts={assetClassCounts}
      filters={filters}
      sort={sort}
      folderSort={folderSort}
      showFolderSort={!activeFolderId && folders.length > 0}
      groupBy={groupBy}
      visibleFields={visibleCardFields}
      fieldOrder={cardFieldOrder}
      panelToggles={
        layout === "review" ? null : (
        <WorkspacePanelToggles
          viewerActive={viewerPanelVisible}
          infoActive={infoPanelVisible}
          onToggleViewer={() => {
            if (viewerPanelVisible) {
              setViewerOpen(false);
              setViewerExpanded(false);
              setViewerAutoPlay(false);
              persistPanelToggles({ viewerOpen: false });
              return;
            }
            if (!selected) return;
            setViewerOpen(true);
            setViewerExpanded(false);
            applyPanelLayout(false, { viewerOpen: true });
            persistPanelToggles({ viewerOpen: true });
          }}
          onToggleInfo={() => {
            if (infoPanelVisible) {
              setInfoOpen(false);
              persistPanelToggles({ infoOpen: false });
              return;
            }
            if (!selected) return;
            setInfoOpen(true);
            applyPanelLayout(viewerExpanded, { infoOpen: true });
            persistPanelToggles({ infoOpen: true });
          }}
        />
        )
      }
      onFolderSort={setFolderSort}
      onLayout={handleLayoutChange}
      onGridSize={setGridSize}
      onAspectRatio={setAspectRatio}
      onThumbnailScale={setThumbnailScale}
      onShowCardInfo={setShowCardInfo}
      onFilters={setFilters}
      onSort={setSort}
      onGroupBy={setGroupBy}
      onVisibleFieldsChange={handleVisibleFieldsChange}
      canUploadMedia={canUploadMedia}
      uploadHref={
        activeFolderId
          ? `/dashboard/projects/${projectId}/upload?folder=${activeFolderId}`
          : `/dashboard/projects/${projectId}/upload`
      }
    />
  );

  return (
    <AdminGate>
      <div
        className={cn(
          "flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950",
          layout === "review" &&
            !desktopWorkspace &&
            "min-h-[calc(100dvh-3rem)]",
        )}
      >
        <div className="shrink-0">
        <ProjectHero
          compact={!desktopWorkspace}
          minimal={layout === "review" && !desktopWorkspace}
          title={project.title}
          clientName={project.clientName}
          description={project.description}
          brandColor={project.brandColor}
          bannerKey={project.bannerKey}
          updatedAt={project.updatedAt}
          projectId={projectId}
          visibility={(project.visibility ?? "private") as ProjectVisibility}
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
          onDeleteSelected={() => void deleteSelected()}
          canDeleteSelected={project.isOwner && checkedIds.length > 0}
          selectedCount={checkedIds.length}
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
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950">
        <div className="shrink-0">{assetBrowserToolbar}</div>

        {activeCollection && activeCollection.kind === "user" && !collectionConfigured && (
          <div className={cn("border-b border-zinc-800/60 py-8 text-center", WORKSPACE_CHROME_PADDING)}>
            <p className="text-sm text-zinc-300">Configure this collection</p>
            <p className="mt-1 text-xs text-zinc-500">
              Save the current toolbar filters, or choose a source folder to scope assets.
            </p>
            {canEditProject && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => void saveCollectionFilters()}
                >
                  Save current filters
                </Button>
                {folders.map((folder) => (
                  <Button
                    key={folder._id}
                    variant="secondary"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() =>
                      void setCollectionSourceFolder({
                        collectionId: activeCollection._id,
                        sourceFolderId: folder._id,
                      }).then(() => toast.success(`Source folder set to ${folder.title}`))
                    }
                  >
                    {folder.title}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeCollection && collectionConfigured && layout !== "review" && (
          <div
            className={cn(
              "flex items-center justify-between border-b border-zinc-800/60 py-2",
              WORKSPACE_CHROME_PADDING,
            )}
          >
            <p className="text-xs text-zinc-500">
              Collection{" "}
              <span className="font-medium text-zinc-200">{activeCollection.title}</span>
            </p>
            {activeCollection.kind === "user" && canEditProject && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-400"
                onClick={() => void saveCollectionFilters()}
              >
                Update filters
              </Button>
            )}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {useWorkspacePanels && selected ? (
            <ReviewWorkspaceShell
              projectId={projectId}
              viewerOpen={viewerOpen}
              infoOpen={infoOpen}
              preferredLayout={panelLayout}
              assetBrowser={
                <div className="flex h-full min-h-0 flex-col overflow-hidden">
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {layout === "grid" || layout === "grouped" ? (
                      renderGridContent({ selectedId: selectedId ?? undefined })
                    ) : layout === "table" ? (
                      <VideoTableView
                        projectId={projectId}
                        videos={filtered}
                        selectedId={selectedId ?? undefined}
                        checkedIds={checkedIds}
                        onSelect={handleMediaSelect}
                        onToggleAll={(checked) => {
                          const ids = filtered.map((video) => video._id);
                          setCheckedIds(checked ? ids : []);
                          setLastCheckedId(checked ? (ids[ids.length - 1] ?? null) : null);
                        }}
                      />
                    ) : (
                      <VideoReviewMode
                        videos={filtered}
                        activeId={selectedId ?? undefined}
                        onSelect={(id) => {
                          handleMediaSelect(id);
                        }}
                        canEdit={canEditProject}
                      />
                    )}
                  </div>
                </div>
              }
              viewer={
                <CenterAssetViewer
                  key={selected._id}
                  video={selected}
                  mode="admin"
                  autoPlay={viewerAutoPlay}
                  drawMode={drawMode}
                  canAnnotate={canEditProject}
                  onDrawModeChange={setDrawMode}
                  seekTo={seekTo}
                  onTimeUpdate={setPlayhead}
                  onFirstPlay={() => {
                    if (!selected.viewed) {
                      void markViewedAdmin({ videoId: selected._id });
                    }
                  }}
                />
              }
              inspector={
                <VideoInspectorPanel
                  key={selected._id}
                  video={selected}
                  mode="admin"
                  compact
                  playhead={playhead}
                  drawMode={drawMode}
                  onDrawModeChange={setDrawMode}
                  onSeek={(sec) => setSeekTo(sec)}
                  onClose={closeSelectedAsset}
                  canEdit={canEditProject}
                  canManageFeedback={canEditProject}
                />
              }
            />
          ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className={cn("flex min-h-0 min-w-0 flex-1", selected && "lg:flex-row")}>
              <div
                className={cn(
                  "min-h-0 min-w-0 flex-1",
                  layout === "review"
                    ? "flex min-h-0 flex-1 flex-col overflow-hidden"
                    : "overflow-y-auto",
                  selected && layout !== "review" && "lg:pr-0",
                )}
              >
                {layout === "grid" ? (
                  renderGridContent({
                    selectedId: selectedId ?? undefined,
                    includeLeadingItems: true,
                    showFolderBadges,
                    onDragStart: canOrganizeFolders ? beginVideoDrag : undefined,
                    onSelect: handleMediaSelect,
                  })
                ) : layout === "grouped" ? (
                  <VideoGroupedView
                    folders={
                      activeFolderId || routeAssetClass || isFiltering || collectionBrowsing
                        ? []
                        : sortedFolders
                    }
                    folderVideos={videos}
                    projectTitle={projectTitle}
                    brandColor={projectBrandColor}
                    videos={filtered}
                    size={gridSize}
                    aspectRatio={aspectRatio}
                    thumbnailScale={thumbnailScale}
                    showCardInfo={showCardInfo}
                    visibleFields={visibleCardFields}
                    fieldOrder={cardFieldOrder}
                    selectedId={selectedId ?? undefined}
                    checkedIds={checkedIds}
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
                    onSelect={handleMediaSelect}
                    onOpenImagePreview={(video) => setPreviewImageId(video._id)}
                    onOpenVideoPreview={(video) => openVideoInWorkspace(video._id)}
                  />
                ) : layout === "table" ? (
                  <VideoTableView
                    projectId={projectId}
                    videos={filtered}
                    selectedId={selectedId ?? undefined}
                    checkedIds={checkedIds}
                    onSelect={handleMediaSelect}
                    onToggleAll={(checked) => {
                      const ids = filtered.map((video) => video._id);
                      setCheckedIds(checked ? ids : []);
                      setLastCheckedId(checked ? (ids[ids.length - 1] ?? null) : null);
                    }}
                  />
                ) : (
                  <VideoReviewMode
                    videos={filtered}
                    activeId={selectedId ?? undefined}
                    onSelect={(id) => {
                      handleMediaSelect(id);
                    }}
                    canEdit={canEditProject}
                  />
                )}
              </div>
              {!desktopWorkspace && selected && layout !== "review" && (infoOpen || viewerOpen) && (
                <>
                  {viewerOpen && (
                    <div className="sticky top-0 z-30 h-[min(42dvh,22rem)] shrink-0 border-b border-zinc-800/60 bg-zinc-950">
                      <CenterAssetViewer
                        key={selected._id}
                        video={selected}
                        mode="admin"
                        autoPlay={viewerAutoPlay}
                        drawMode={drawMode}
                        canAnnotate={canEditProject}
                        onDrawModeChange={setDrawMode}
                        seekTo={seekTo}
                        onTimeUpdate={setPlayhead}
                        onFirstPlay={() => {
                          if (!selected.viewed) {
                            void markViewedAdmin({ videoId: selected._id });
                          }
                        }}
                      />
                    </div>
                  )}
                  {infoOpen && (
                    <>
                      <button
                        type="button"
                        aria-label="Close asset info"
                        className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
                        onClick={closeSelectedAsset}
                      />
                      <VideoInspectorPanel
                        video={selected}
                        mode="admin"
                        compact
                        playhead={playhead}
                        drawMode={drawMode}
                        onDrawModeChange={setDrawMode}
                        onSeek={(sec) => setSeekTo(sec)}
                        onClose={closeSelectedAsset}
                        canEdit={canEditProject}
                        canManageFeedback={canEditProject}
                      />
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          )}
        </div>
        </div>
        <ImageLightbox
          video={previewImage}
          mode="admin"
          canDownload={Boolean(previewImage?.downloadEnabled)}
          hasPrev={hasPrevPreview}
          hasNext={hasNextPreview}
          onPrev={() => stepPreview(-1)}
          onNext={() => stepPreview(1)}
          onClose={() => setPreviewImageId(null)}
        />
      </div>
    </AdminGate>
  );
}

function ProjectHeroActions({
  className,
  compact = false,
  hideUpload = false,
  projectId,
  visibility,
  canManageAccess,
  canEditProject,
  canClearVideos,
  canDeleteSelected,
  selectedCount,
  reprocessing,
  canUploadMedia,
  uploadHref,
  onShare,
  onReprocess,
  onClearVideos,
  onDeleteSelected,
  onArchiveProject,
}: {
  className?: string;
  compact?: boolean;
  hideUpload?: boolean;
  projectId: Id<"projects">;
  visibility: ProjectVisibility;
  canManageAccess: boolean;
  canEditProject: boolean;
  canClearVideos: boolean;
  canDeleteSelected: boolean;
  selectedCount: number;
  reprocessing: boolean;
  canUploadMedia: boolean;
  uploadHref: string;
  onShare: () => void;
  onReprocess: () => void;
  onClearVideos: () => void;
  onDeleteSelected: () => void;
  onArchiveProject: () => void;
}) {
  return (
    <div className={className}>
      <ProjectAccessPopover
        compact={compact}
        projectId={projectId}
        visibility={visibility}
        canManage={canManageAccess}
      />
      <ProjectActionsMenu
        canManageAccess={canManageAccess}
        canEditProject={canEditProject}
        canClearVideos={canClearVideos}
        canDeleteSelected={canDeleteSelected}
        selectedCount={selectedCount}
        reprocessing={reprocessing}
        onShare={onShare}
        onReprocess={onReprocess}
        onClearVideos={onClearVideos}
        onDeleteSelected={onDeleteSelected}
        onArchiveProject={onArchiveProject}
      />
      {canUploadMedia && !hideUpload && (
        <Link href={uploadHref}>
          <Button
            size="sm"
            aria-label="Upload"
            className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"
          >
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        </Link>
      )}
    </div>
  );
}

function ProjectHero({
  compact = false,
  minimal = false,
  title,
  clientName,
  description,
  brandColor,
  bannerKey,
  updatedAt,
  projectId,
  visibility,
  onUpdate,
  onShare,
  onReprocess,
  reprocessing,
  onClearVideos,
  canClearVideos,
  onDeleteSelected,
  canDeleteSelected,
  selectedCount,
  onArchiveProject,
  uploadHref,
  canEditProject,
  canUploadMedia,
  canManageAccess,
}: {
  compact?: boolean;
  minimal?: boolean;
  title: string;
  clientName?: string;
  description?: string;
  brandColor?: string;
  bannerKey?: string;
  updatedAt: number;
  projectId: Id<"projects">;
  visibility: ProjectVisibility;
  onUpdate: (patch: ProjectIdentityPatch) => Promise<unknown>;
  onShare: () => void;
  onReprocess: () => void;
  reprocessing: boolean;
  onClearVideos: () => void;
  canClearVideos: boolean;
  onDeleteSelected: () => void;
  canDeleteSelected: boolean;
  selectedCount: number;
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
      : `radial-gradient(circle at 20% 0%, ${hexToRgba(accent, 0.2)}, transparent 32%), linear-gradient(135deg, #151517, #0b0b0d 70%)`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  } as CSSProperties;
  const compactHeroStyle = {
    ...heroStyle,
    backgroundSize: bannerUrl ? "cover" : "100% 100%",
  } as CSSProperties;
  const mobileTopWashStyle = {
    backgroundImage: bannerUrl
      ? heroStyle.backgroundImage
      : `radial-gradient(ellipse 120% 220% at 0% 0%, ${hexToRgba(accent, 0.42)}, transparent 58%), linear-gradient(180deg, #151517, #0b0b0d 85%)`,
    backgroundSize: bannerUrl ? "cover" : "100% 100%",
    backgroundPosition: "top center",
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

  const identityBlock = (
    <>
        {!compact && (
          <div className="rr-eyebrow mb-2 flex items-center gap-2 sm:mb-2.5">
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
              <span className="truncate text-zinc-400">{clientName ?? "Client"}</span>
            )}
          </div>
        )}
        <div
          className={cn(
            "flex w-full min-w-0 gap-2.5 overflow-hidden sm:gap-3 lg:gap-4",
            compact ? "items-end" : "items-center sm:items-end",
          )}
        >
          <div className="relative shrink-0">
            <button
              type="button"
              disabled={!canEditProject}
              className={cn(
                "group grid place-items-center rounded-xl font-semibold text-zinc-950 transition hover:brightness-110",
                compact
                  ? "h-14 w-14 text-base sm:h-16 sm:w-16"
                  : "h-14 w-14 text-base sm:h-16 sm:w-16 md:h-20 md:w-20 md:text-lg ring-4 ring-zinc-950",
                minimal && "h-10 w-10 text-sm",
              )}
              style={{ backgroundColor: accent }}
              onClick={openIdentityEditor}
              title={canEditProject ? "Edit project identity" : "View-only project"}
            >
              {initials(title)}
              <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300 opacity-0 transition group-hover:opacity-100">
                <Palette className="h-3.5 w-3.5" />
              </span>
            </button>
            {identityOpen && canEditProject && (
              <div className="rr-popover absolute left-0 top-full z-50 mt-3 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-white/[0.08] bg-[#0d0d0f] p-2.5">
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
            <h1
              className={cn(
                "truncate text-lg font-semibold tracking-tight sm:text-xl lg:text-2xl",
                "text-zinc-100",
                minimal && "text-base sm:text-lg",
              )}
            >
              {title}
            </h1>
            {!minimal && compact && clientName && (
              <p className="mt-0.5 truncate text-[13px] leading-5 text-zinc-400">
                {clientName}
              </p>
            )}
            {!minimal && !compact && description && (
              <p className="mt-1 line-clamp-1 min-h-5 max-w-3xl text-[13px] leading-5 text-zinc-500">
                {description}
              </p>
            )}
            {!minimal && compact && !clientName && description && (
              <p className="mt-0.5 line-clamp-2 max-w-3xl text-[13px] leading-5 text-zinc-400">
                {description}
              </p>
            )}
            {!minimal && (
            <div className="mt-2.5 hidden flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[10px] tracking-[0.12em] text-zinc-600 uppercase sm:flex">
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
              <span className="inline-flex items-center gap-1.5 text-[var(--success)]/80">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                Review link ready
              </span>
            </div>
            )}
          </div>
          <ProjectHeroActions
            compact={compact}
            hideUpload={compact}
            className="flex shrink-0 flex-nowrap items-center gap-1 sm:gap-2"
            projectId={projectId}
            visibility={visibility}
            canManageAccess={canManageAccess}
            canEditProject={canEditProject}
            canClearVideos={canClearVideos}
            canDeleteSelected={canDeleteSelected}
            selectedCount={selectedCount}
            reprocessing={reprocessing}
            canUploadMedia={canUploadMedia}
            uploadHref={uploadHref}
            onShare={onShare}
            onReprocess={onReprocess}
            onClearVideos={onClearVideos}
            onDeleteSelected={onDeleteSelected}
            onArchiveProject={onArchiveProject}
          />
        </div>
    </>
  );

  return (
    <div
      className={cn(
        "relative shrink-0",
        !compact && "border-b border-zinc-800/60",
      )}
    >
      {!compact && <div className="rr-ruler" aria-hidden />}
      {compact && !minimal ? (
        <div className="relative -mt-12 shrink-0 overflow-hidden pt-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-12 z-0 h-10"
            style={mobileTopWashStyle}
          />
          <div
            className={cn(
              "relative z-10",
              WORKSPACE_CHROME_PADDING,
              "pb-2 pt-3",
            )}
          >
            {identityBlock}
          </div>
        </div>
      ) : (
        <>
          {!minimal && (
            <div className="relative overflow-hidden">
              <div
                className="h-24 bg-cover bg-center sm:h-32 lg:h-40"
                style={heroStyle}
              />
              <div className="rr-blueprint pointer-events-none absolute inset-0" aria-hidden />
            </div>
          )}
          <div
            className={cn(
              "relative",
              WORKSPACE_CHROME_PADDING,
              compact && minimal && "py-1 pb-0",
              !minimal && !compact && "-mt-10 pb-4 sm:-mt-12 sm:pb-4 lg:-mt-16 lg:pb-5",
            )}
          >
            {identityBlock}
          </div>
        </>
      )}
    </div>
  );
}

function ProjectActionsMenu({
  canManageAccess,
  canEditProject,
  canClearVideos,
  canDeleteSelected,
  selectedCount,
  reprocessing,
  onShare,
  onReprocess,
  onClearVideos,
  onDeleteSelected,
  onArchiveProject,
}: {
  canManageAccess: boolean;
  canEditProject: boolean;
  canClearVideos: boolean;
  canDeleteSelected: boolean;
  selectedCount: number;
  reprocessing: boolean;
  onShare: () => void;
  onReprocess: () => void;
  onClearVideos: () => void;
  onDeleteSelected: () => void;
  onArchiveProject: () => void;
}) {
  const hasActions =
    canManageAccess || canEditProject;

  if (!hasActions) return null;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="h-8 gap-1.5 px-2.5 text-xs"
          title="Project actions"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Actions</span>
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="rr-popover z-50 w-52 rounded-xl border border-white/[0.08] bg-[#0d0d0f] p-1.5"
        >
          {canManageAccess && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-300 transition hover:bg-zinc-900"
              onClick={onShare}
            >
              <Link2 className="h-3.5 w-3.5 text-zinc-500" />
              Share review link
            </button>
          )}
          {canEditProject && (
            <button
              type="button"
              disabled={reprocessing}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
              onClick={onReprocess}
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-zinc-500", reprocessing && "animate-spin")} />
              Refresh previews
            </button>
          )}
          {canEditProject && (
            <button
              type="button"
              disabled={!canDeleteSelected}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
              onClick={onDeleteSelected}
            >
              <Trash2 className="h-3.5 w-3.5 text-[var(--danger)]" />
              Delete selected
              {selectedCount > 0 ? ` (${selectedCount})` : ""}
            </button>
          )}
          {canEditProject && (
            <button
              type="button"
              disabled={!canClearVideos}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
              onClick={onClearVideos}
            >
              <Trash2 className="h-3.5 w-3.5 text-zinc-500" />
              Clear media
            </button>
          )}
          {canManageAccess && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-red-300 transition hover:bg-red-950/30"
              onClick={onArchiveProject}
            >
              <Archive className="h-3.5 w-3.5" />
              Archive project
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ProjectAccessPopover({
  compact = false,
  projectId,
  visibility,
  canManage,
}: {
  compact?: boolean;
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
          className={cn(
            "h-8 shrink-0 text-xs",
            compact ? "gap-1 px-1.5" : "gap-2 px-2.5 sm:w-auto",
          )}
        >
          <div className="flex shrink-0 gap-0.5">
            {(members ?? []).slice(0, compact ? 2 : 3).map((member) => (
              <span
                key={member.entryKey}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-zinc-950 bg-zinc-700 text-[9px] font-medium text-zinc-200"
                title={member.name}
              >
                {member.name.slice(0, 1).toUpperCase()}
              </span>
            ))}
          </div>
          {compact ? (
            members && members.length > 2 ? (
              <span className="text-[10px] tabular-nums text-zinc-400">
                +{members.length - 2}
              </span>
            ) : null
          ) : (
            <span className="tabular-nums text-zinc-300">
              {members ? members.length : "…"}
            </span>
          )}
          {!compact && (
            <span className="hidden text-zinc-500 sm:inline">
              {members?.length === 1 ? "person" : "people"}
            </span>
          )}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="rr-popover z-50 w-[21rem] max-w-[calc(100vw-1rem)] rounded-xl border border-white/[0.08] bg-[#0d0d0f] p-3 text-zinc-200"
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
                        ? "border-[var(--brand-accent)] bg-[color-mix(in_srgb,var(--brand-accent)_12%,#0b0b0d)] text-[color-mix(in_srgb,var(--brand-accent)_70%,white)]"
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
              <span className="rounded-full bg-[var(--info-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--info)]">
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
                    <span className="rounded-full bg-[var(--brand-accent-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--brand-accent)]">
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

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
