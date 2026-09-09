"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Archive,
  Check,
  ChevronsLeft,
  ChevronsRight,
  Folder,
  FolderOpen,
  Inbox,
  Layers,
  LogOut,
  Pencil,
  Plus,
  Settings,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useAdminAccess } from "@/components/auth/AdminGate";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { Button } from "@/components/ui/button";
import { projectRootLabel, moveMediaToRootLabel } from "@/lib/projectFolders";
import { projectAccent, projectAccentStyle } from "@/lib/projectAccent";
import { cn } from "@/lib/utils";

const SIDEBAR_STORAGE_KEY = "review-room.sidebar.collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated } = useConvexAuth();
  const { appUser, isAdmin } = useAdminAccess();
  const { signOut } = useAuthActions();
  const isReview = pathname?.startsWith("/review");
  const isSignIn = pathname?.startsWith("/sign-in");
  const isWorkspace =
    /^\/dashboard\/projects\/[^/]+$/.test(pathname ?? "") &&
    pathname !== "/dashboard/projects/new";
  const workspaceProjectId = isWorkspace
    ? (pathname?.split("/").at(-1) as Id<"projects"> | undefined)
    : undefined;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarReady, setSidebarReady] = useState(false);
  const projects = useQuery(
    api.projects.listForAdmin,
    isAuthenticated && appUser && !isReview ? {} : "skip",
  );
  const workspaceProject = workspaceProjectId
    ? projects?.find((project) => project._id === workspaceProjectId)
    : undefined;

  useEffect(() => {
    setSidebarCollapsed(
      window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true",
    );
    setSidebarReady(true);
  }, []);

  useEffect(() => {
    if (!sidebarReady) return;
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed, sidebarReady]);

  if (isReview || isSignIn) {
    return <div className="min-h-dvh bg-[var(--background)]">{children}</div>;
  }

  return (
    <div className="flex h-dvh bg-[var(--background)] text-zinc-50">
      {isAuthenticated && appUser && (
        <aside
          className={cn(
            "hidden shrink-0 flex-col overflow-visible border-r border-zinc-800/70 bg-zinc-950 transition-[width] duration-200 lg:flex",
            sidebarCollapsed ? "w-14" : "w-60",
          )}
        >
          <Link
            href="/dashboard"
            className={cn(
              "flex h-14 items-center border-b border-zinc-800/70",
              sidebarCollapsed ? "justify-center px-2" : "px-4",
            )}
            title="Review Room"
          >
            <span
              className={cn(
                "grid grid-cols-[auto_auto] items-stretch gap-x-2 gap-y-0.5",
                sidebarCollapsed && "flex",
              )}
            >
              <span
                className={cn(
                  "relative aspect-[809/484]",
                  sidebarCollapsed ? "h-4 w-auto" : "row-span-2 h-[95%] self-center",
                )}
              >
                <Image
                  src="/logo-rr-light.png"
                  alt=""
                  fill
                  unoptimized
                  className="object-contain object-left opacity-80"
                />
              </span>
              <span
                className={cn(
                  "self-start text-sm font-semibold leading-none",
                  sidebarCollapsed && "hidden",
                )}
              >
                Review Room
              </span>
              <span
                className={cn(
                  "self-end text-[10px] leading-none text-zinc-600",
                  sidebarCollapsed && "hidden",
                )}
              >
                Review workspace
              </span>
            </span>
          </Link>

          <nav className={cn("space-y-1 overflow-visible py-4", sidebarCollapsed ? "px-2" : "px-3")}>
            <SideLink
              href="/dashboard"
              active={pathname === "/dashboard"}
              icon={<Folder className="h-4 w-4" />}
              label="Projects"
              count={projects?.length}
              collapsed={sidebarCollapsed}
            />
            <SideLink
              href="/dashboard/inbox"
              active={pathname === "/dashboard/inbox"}
              icon={<Inbox className="h-4 w-4" />}
              label="Inbox"
              collapsed={sidebarCollapsed}
            />
            <NotificationBell collapsed={sidebarCollapsed} />
            <SideLink
              href="/dashboard"
              icon={<Users className="h-4 w-4" />}
              label="Clients"
              collapsed={sidebarCollapsed}
            />
            <SideLink
              href="/dashboard"
              icon={<Settings className="h-4 w-4" />}
              label="Settings"
              collapsed={sidebarCollapsed}
            />
          </nav>

          <div className={cn("px-3", sidebarCollapsed && "hidden")}>
            <p className="px-2 pb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
              Recent
            </p>
            <div className="space-y-1">
              {(projects ?? []).slice(0, 5).map((project) => (
                <RecentProjectLink
                  key={project._id}
                  href={`/dashboard/projects/${project._id}`}
                  title={project.title}
                  brandColor={project.brandColor}
                  active={pathname === `/dashboard/projects/${project._id}`}
                />
              ))}
            </div>
          </div>

          {workspaceProjectId && !sidebarCollapsed && (
            <Suspense fallback={null}>
              <WorkspaceSidebarFolders
                projectId={workspaceProjectId}
                projectTitle={workspaceProject?.title}
                brandColor={workspaceProject?.brandColor}
                canEdit={isAdmin}
              />
              <WorkspaceSidebarCollections
                projectId={workspaceProjectId}
                canEdit={isAdmin}
              />
            </Suspense>
          )}

          <div className={cn("mt-auto space-y-3 p-3", sidebarCollapsed && "px-2")}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-full text-zinc-500 hover:text-zinc-200"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            >
              {sidebarCollapsed ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <ChevronsLeft className="h-4 w-4" />
              )}
            </Button>
            {isAdmin && (
              <Link href="/dashboard/projects/new">
                <Button
                  className={cn("w-full gap-2", sidebarCollapsed && "px-0")}
                  size="sm"
                  variant="secondary"
                  title="New project"
                >
                  <Plus className="h-4 w-4" />
                  <span className={cn(sidebarCollapsed && "hidden")}>New project</span>
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full gap-2 text-zinc-500",
                sidebarCollapsed ? "justify-center px-0" : "justify-start",
              )}
              title="Sign out"
              onClick={() => void signOut()}
            >
              <LogOut className="h-4 w-4" />
              <span className={cn(sidebarCollapsed && "hidden")}>Sign out</span>
            </Button>
          </div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur lg:hidden">
          <div className="flex min-h-14 items-center justify-between gap-3 px-3 py-2 sm:px-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold leading-none">
              <span className="relative aspect-[809/484] h-[1em] shrink-0">
                <Image
                  src="/logo-rr-light.png"
                  alt=""
                  fill
                  unoptimized
                  className="object-contain object-left opacity-80"
                />
              </span>
              Review Room
            </Link>
            {isAuthenticated && appUser && (
              <div className="flex min-w-0 items-center gap-1.5">
                {isAdmin && (
                  <Button size="sm" className="h-8 gap-1.5 px-2.5" asChild>
                    <Link href="/dashboard/projects/new">
                      <Plus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">New</span>
                    </Link>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2.5 text-zinc-500"
                  onClick={() => void signOut()}
                >
                  Sign out
                </Button>
              </div>
            )}
          </div>
        </header>
        <main
          className={cn(
            "min-w-0 flex-1",
            isWorkspace
              ? "flex min-h-0 flex-col overflow-hidden"
              : "overflow-y-auto mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

type FolderDoc = Doc<"projectFolders">;
type VideoDoc = Doc<"videos">;

function WorkspaceSidebarCollections({
  projectId,
  canEdit,
}: {
  projectId: Id<"projects">;
  canEdit: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCollectionParam = searchParams.get("collection");
  const collections = useQuery(api.collections.listByProject, { projectId });
  const ensureCollections = useMutation(api.collections.ensureSystemCollections);
  const createCollection = useMutation(api.collections.create);
  const renameCollection = useMutation(api.collections.rename);
  const removeCollection = useMutation(api.collections.remove);
  const [editingId, setEditingId] = useState<Id<"collections"> | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void ensureCollections({ projectId }).catch(() => {
      // Non-blocking if homelab deploy lags.
    });
  }, [ensureCollections, projectId]);

  async function handleCreate() {
    setCreating(true);
    try {
      const collectionId = await createCollection({ projectId });
      router.push(`/dashboard/projects/${projectId}?collection=${collectionId}`);
      toast.success("Collection created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create collection");
    } finally {
      setCreating(false);
    }
  }

  async function handleRename(collectionId: Id<"collections">) {
    const title = renameDraft.trim();
    if (!title) return;
    try {
      await renameCollection({ collectionId, title });
      setEditingId(null);
      toast.success("Collection renamed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not rename collection");
    }
  }

  async function handleRemove(collectionId: Id<"collections">, title: string) {
    if (!window.confirm(`Delete collection "${title}"?`)) return;
    try {
      await removeCollection({ collectionId });
      if (activeCollectionParam === collectionId) {
        router.push(`/dashboard/projects/${projectId}`);
      }
      toast.success("Collection deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete collection");
    }
  }

  return (
    <div className="mt-5 px-3">
      <div className="flex items-center justify-between px-2 pb-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
          Collections
        </p>
        {canEdit && (
          <button
            type="button"
            className="grid h-5 w-5 place-items-center rounded border border-zinc-800 bg-zinc-900 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-100"
            title="New collection"
            disabled={creating}
            onClick={() => void handleCreate()}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="space-y-1">
        {(collections ?? []).map((collection) => {
          const active = activeCollectionParam === collection._id;
          const href = `/dashboard/projects/${projectId}?collection=${collection._id}`;

          if (editingId === collection._id && collection.kind === "user") {
            return (
              <form
                key={collection._id}
                className="flex items-center gap-1 px-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleRename(collection._id);
                }}
              >
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={(event) => setRenameDraft(event.target.value)}
                  className="h-7 min-w-0 flex-1 rounded border border-zinc-800 bg-zinc-900 px-2 text-[11px] text-zinc-200"
                />
                <button type="submit" className="text-[10px] text-[var(--brand-accent)]">
                  Save
                </button>
              </form>
            );
          }

          return (
            <div key={collection._id} className="group relative flex items-center">
              <Link
                href={href}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-sm py-1.5 pl-2 pr-1 text-[12px] transition",
                  active
                    ? "bg-[var(--brand-accent-muted)] text-zinc-200"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300",
                )}
              >
                <Layers className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{collection.title}</span>
              </Link>
              {canEdit && collection.kind === "user" && (
                <div className="flex shrink-0 items-center opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    title="Rename"
                    className="grid h-6 w-6 place-items-center rounded text-zinc-600 hover:bg-zinc-900 hover:text-zinc-200"
                    onClick={() => {
                      setEditingId(collection._id);
                      setRenameDraft(collection.title);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    className="grid h-6 w-6 place-items-center rounded text-zinc-600 hover:bg-zinc-900 hover:text-red-300"
                    onClick={() => void handleRemove(collection._id, collection.title)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WorkspaceSidebarFolders({
  projectId,
  projectTitle,
  brandColor,
  canEdit,
}: {
  projectId: Id<"projects">;
  projectTitle?: string;
  brandColor?: string;
  canEdit: boolean;
}) {
  const searchParams = useSearchParams();
  const activeFolderParam = searchParams.get("folder");
  const activeFolderId =
    activeFolderParam && activeFolderParam !== "root"
      ? (activeFolderParam as Id<"projectFolders">)
      : null;
  const router = useRouter();
  const folders = useQuery(api.folders.listByProject, { projectId });
  const videos = useQuery(api.videos.listByProject, { projectId });
  const moveToFolder = useMutation(api.videos.moveToFolder);
  const createFolder = useMutation(api.folders.create);
  const renameFolder = useMutation(api.folders.rename);
  const removeFolder = useMutation(api.folders.remove);
  const [composerOpen, setComposerOpen] = useState(false);
  const [folderDraft, setFolderDraft] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  async function createProjectFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = folderDraft.trim();
    if (!trimmed) return;

    setCreatingFolder(true);
    try {
      const folderId = await createFolder({
        projectId,
        title: trimmed,
      });
      setFolderDraft("");
      setComposerOpen(false);
      router.push(`/dashboard/projects/${projectId}?folder=${folderId}`);
      toast.success("Folder created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create folder");
    } finally {
      setCreatingFolder(false);
    }
  }

  async function renameProjectFolder(folderId: Id<"projectFolders">, title: string) {
    try {
      await renameFolder({ folderId, title });
      toast.success("Folder renamed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not rename folder");
    }
  }

  async function removeProjectFolder(
    folderId: Id<"projectFolders">,
    title: string,
    assetDisposition: "move_to_root" | "archive_assets",
  ) {
    const count = (videos ?? []).filter((video) => video.folderId === folderId).length;
    const rootName = projectRootLabel(projectTitle);
    const action =
      assetDisposition === "archive_assets"
        ? `Archive ${count} media ${count === 1 ? "asset" : "assets"} and delete "${title}"?`
        : `Delete "${title}" and move ${count} media ${count === 1 ? "asset" : "assets"} to ${rootName}?`;
    if (count > 0 && !window.confirm(action)) return;
    if (count === 0 && !window.confirm(`Delete folder "${title}"?`)) return;

    try {
      const result = await removeFolder({ folderId, assetDisposition });
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

  return (
    <SidebarFolders
      projectId={projectId}
      projectTitle={projectTitle}
      brandColor={brandColor}
      folders={folders ?? []}
      videos={videos ?? []}
      activeFolderId={activeFolderId}
      canEdit={canEdit}
      composerOpen={composerOpen}
      folderDraft={folderDraft}
      creatingFolder={creatingFolder}
      onOpenComposer={() => setComposerOpen(true)}
      onCancelComposer={() => {
        setComposerOpen(false);
        setFolderDraft("");
      }}
      onFolderDraft={setFolderDraft}
      onCreateFolder={createProjectFolder}
      onDropVideo={(videoId, folderId) =>
        canEdit &&
        void moveToFolder(folderId ? { videoId, folderId } : { videoId })
      }
      onRenameFolder={(folderId, title) =>
        void renameProjectFolder(folderId, title)
      }
      onRemoveFolder={(folderId, title, assetDisposition) =>
        void removeProjectFolder(folderId, title, assetDisposition)
      }
    />
  );
}

function SidebarFolders({
  projectId,
  projectTitle,
  brandColor,
  folders,
  videos,
  activeFolderId,
  canEdit,
  composerOpen,
  folderDraft,
  creatingFolder,
  onOpenComposer,
  onCancelComposer,
  onFolderDraft,
  onCreateFolder,
  onDropVideo,
  onRenameFolder,
  onRemoveFolder,
}: {
  projectId: Id<"projects">;
  projectTitle?: string;
  brandColor?: string;
  folders: FolderDoc[];
  videos: VideoDoc[];
  activeFolderId: Id<"projectFolders"> | null;
  canEdit: boolean;
  composerOpen: boolean;
  folderDraft: string;
  creatingFolder: boolean;
  onOpenComposer: () => void;
  onCancelComposer: () => void;
  onFolderDraft: (value: string) => void;
  onCreateFolder: (event: FormEvent<HTMLFormElement>) => void;
  onDropVideo: (
    videoId: Id<"videos">,
    folderId: Id<"projectFolders"> | undefined,
  ) => void;
  onRenameFolder: (folderId: Id<"projectFolders">, title: string) => void;
  onRemoveFolder: (
    folderId: Id<"projectFolders">,
    title: string,
    assetDisposition: "move_to_root" | "archive_assets",
  ) => void;
}) {
  const [editingFolderId, setEditingFolderId] = useState<Id<"projectFolders"> | null>(null);
  const [removingFolderId, setRemovingFolderId] = useState<Id<"projectFolders"> | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const rootFolders = folders;
  const rootLabel = projectRootLabel(projectTitle);
  // Same scope rule as the workspace: counts mean everything under here.
  const rootCount = videos.length;
  const accent = projectAccent(brandColor);

  function startRename(folder: FolderDoc) {
    setEditingFolderId(folder._id);
    setRenameDraft(folder.title);
  }

  function cancelRename() {
    setEditingFolderId(null);
    setRenameDraft("");
  }

  function submitRename(folder: FolderDoc) {
    const nextTitle = renameDraft.trim();
    if (!nextTitle || nextTitle === folder.title) {
      cancelRename();
      return;
    }
    onRenameFolder(folder._id, nextTitle);
    cancelRename();
  }

  return (
    <div className="mt-5 px-3" style={projectAccentStyle(accent)}>
      <div className="flex items-center justify-between px-2 pb-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
          Folders
        </p>
        {canEdit && (
          <button
            type="button"
            className="grid h-5 w-5 place-items-center rounded border border-zinc-800 bg-zinc-900 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-100"
            title="Add folder"
            onClick={onOpenComposer}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="space-y-1">
        <SidebarFolderLink
          href={`/dashboard/projects/${projectId}`}
          label={rootLabel}
          count={rootCount}
          active={!activeFolderId}
          accent={accent}
          icon="root"
          depth={0}
          onDrop={canEdit ? (videoId) => onDropVideo(videoId, undefined) : undefined}
        />
        <div className="ml-4 border-l border-zinc-800/90 pl-2">
          {canEdit && composerOpen && (
            <form onSubmit={onCreateFolder} className="mb-1 flex items-center gap-1">
              <input
                autoFocus
                value={folderDraft}
                onChange={(event) => onFolderDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") onCancelComposer();
                }}
                placeholder="Folder name"
                className="h-7 min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-[11px] text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-teal-400"
              />
              <button
                type="submit"
                disabled={creatingFolder || !folderDraft.trim()}
                className="grid h-7 w-7 place-items-center rounded-md bg-teal-500 text-zinc-950 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
                title="Create folder"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </form>
          )}
          <div className="space-y-1">
            {rootFolders.map((folder) => {
              const active = activeFolderId === folder._id;
              const count = videos.filter((video) => video.folderId === folder._id).length;
              const isEditing = editingFolderId === folder._id;
              return (
                <div key={folder._id} className="group flex items-center gap-1">
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <form
                        className="flex items-center gap-1 py-0.5"
                        onSubmit={(event) => {
                          event.preventDefault();
                          submitRename(folder);
                        }}
                      >
                        <input
                          autoFocus
                          value={renameDraft}
                          onChange={(event) => setRenameDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") cancelRename();
                          }}
                          className="h-7 min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-[11px] text-zinc-200 outline-none focus:border-teal-400"
                        />
                        <button
                          type="submit"
                          title="Save folder name"
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-teal-500 text-zinc-950"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Cancel rename"
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-100"
                          onClick={cancelRename}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    ) : (
                      <SidebarFolderLink
                        href={`/dashboard/projects/${projectId}?folder=${folder._id}`}
                        label={folder.title}
                        count={count}
                        active={active}
                        accent={accent}
                        icon={active ? "open" : "folder"}
                        depth={1}
                        onDrop={
                          canEdit
                            ? (videoId) => onDropVideo(videoId, folder._id)
                            : undefined
                        }
                      />
                    )}
                  </div>
                  {canEdit && !isEditing && (
                    <div className="relative flex shrink-0 items-center">
                      <button
                        type="button"
                        title="Rename folder"
                        className="grid h-6 w-6 place-items-center rounded text-zinc-600 opacity-0 transition hover:bg-zinc-900 hover:text-zinc-200 group-hover:opacity-100"
                        onClick={() => {
                          setRemovingFolderId(null);
                          startRename(folder);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        title="Remove folder"
                        className="grid h-6 w-6 place-items-center rounded text-zinc-600 opacity-0 transition hover:bg-zinc-900 hover:text-red-300 group-hover:opacity-100"
                        onClick={() =>
                          setRemovingFolderId((current) =>
                            current === folder._id ? null : folder._id,
                          )
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      {removingFolderId === folder._id && (
                        <div className="absolute right-0 top-7 z-50 w-44 rounded-md border border-zinc-800 bg-zinc-950 p-1 shadow-2xl shadow-black/50">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-100"
                            onClick={() => {
                              setRemovingFolderId(null);
                              onRemoveFolder(folder._id, folder.title, "move_to_root");
                            }}
                          >
                            <FolderOpen className="h-3.5 w-3.5 text-zinc-500" />
                            {moveMediaToRootLabel(projectTitle)}
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] text-red-300 transition hover:bg-red-950/30"
                            onClick={() => {
                              setRemovingFolderId(null);
                              onRemoveFolder(folder._id, folder.title, "archive_assets");
                            }}
                          >
                            <Archive className="h-3.5 w-3.5" />
                            Archive media
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarFolderLink({
  href,
  label,
  count,
  active,
  accent,
  icon,
  depth,
  onDrop,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
  accent: string;
  icon: "root" | "folder" | "open";
  depth: number;
  onDrop?: (videoId: Id<"videos">) => void;
}) {
  const Icon = icon === "root" ? Inbox : icon === "open" ? FolderOpen : Folder;
  const [dragActive, setDragActive] = useState(false);

  return (
    <Link
      href={href}
      title={label}
      onDragEnter={(event) => {
        if (!onDrop) return;
        event.preventDefault();
        setDragActive(true);
      }}
      onDragOver={(event) => {
        if (!onDrop) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDragLeave={(event) => {
        if (!onDrop) return;
        if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget as Node)) {
          return;
        }
        setDragActive(false);
      }}
      onDrop={(event) => {
        if (!onDrop) return;
        setDragActive(false);
        const videoId = event.dataTransfer.getData("application/review-room-video-id");
        if (!videoId) return;
        event.preventDefault();
        onDrop(videoId as Id<"videos">);
      }}
      className={cn(
        "relative flex items-center gap-2 rounded-sm py-1.5 pr-2 text-[12px] transition",
        dragActive
          ? "bg-zinc-900 text-zinc-100"
          : active
            ? "bg-[var(--project-accent-muted)] text-zinc-300"
            : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300",
      )}
      style={{ paddingLeft: `${depth === 0 ? 8 : 4}px` }}
    >
      {depth > 0 && (
        <span className="absolute -left-2 top-1/2 h-px w-2 bg-zinc-800" />
      )}
      <Icon
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          active ? "text-zinc-400" : "text-zinc-600",
        )}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span
        className={cn(
          "text-[10px] tabular-nums",
          active ? "text-zinc-500" : "text-zinc-600",
        )}
      >
        {count}
      </span>
    </Link>
  );
}

function RecentProjectLink({
  href,
  title,
  brandColor,
  active,
}: {
  href: string;
  title: string;
  brandColor?: string;
  active: boolean;
}) {
  const accent = projectAccent(brandColor);

  return (
    <Link
      href={href}
      style={projectAccentStyle(accent)}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[12px] transition",
        active
          ? "bg-zinc-900 text-zinc-100"
          : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300",
      )}
    >
      <span
        className="h-4 w-4 shrink-0 rounded"
        style={{ backgroundColor: accent }}
      />
      <span className="truncate">{title}</span>
    </Link>
  );
}

function SideLink({
  href,
  active,
  icon,
  label,
  count,
  collapsed,
}: {
  href: string;
  active?: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        "flex items-center rounded-md py-1.5 text-[12.5px] transition",
        collapsed ? "justify-center px-0" : "gap-2.5 px-2",
        active
          ? "bg-zinc-800/60 text-zinc-100"
          : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300",
      )}
    >
      <span className={cn(active ? "text-zinc-200" : "text-zinc-600")}>
        {icon}
      </span>
      <span className={cn("flex-1", collapsed && "hidden")}>{label}</span>
      {count !== undefined && !collapsed && (
        <span className="text-[10px] tabular-nums text-zinc-600">{count}</span>
      )}
    </Link>
  );
}
