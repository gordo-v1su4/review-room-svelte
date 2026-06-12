"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Bookmark, Play, Repeat } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { VideoGrid } from "@/components/video/VideoGrid";
import { VideoDetailsPanel } from "@/components/video/VideoDetailsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  CardAspectRatio,
  GridSize,
  ThumbnailScale,
  WorkspaceAppearance,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const DEFAULT_APPEARANCE: WorkspaceAppearance = {
  gridSize: "md",
  aspectRatio: "video",
  thumbnailScale: "fill",
  showCardInfo: true,
};

function normalizeAppearance(value: unknown): WorkspaceAppearance {
  const appearance = value as Partial<WorkspaceAppearance> | undefined;
  return {
    gridSize: isGridSize(appearance?.gridSize)
      ? appearance.gridSize
      : DEFAULT_APPEARANCE.gridSize,
    aspectRatio: isCardAspectRatio(appearance?.aspectRatio)
      ? appearance.aspectRatio
      : DEFAULT_APPEARANCE.aspectRatio,
    thumbnailScale: isThumbnailScale(appearance?.thumbnailScale)
      ? appearance.thumbnailScale
      : DEFAULT_APPEARANCE.thumbnailScale,
    showCardInfo:
      typeof appearance?.showCardInfo === "boolean"
        ? appearance.showCardInfo
        : DEFAULT_APPEARANCE.showCardInfo,
  };
}

function isGridSize(value: unknown): value is GridSize {
  return value === "sm" || value === "md" || value === "lg";
}

function isCardAspectRatio(value: unknown): value is CardAspectRatio {
  return value === "video" || value === "square" || value === "portrait";
}

function isThumbnailScale(value: unknown): value is ThumbnailScale {
  return value === "fit" || value === "fill";
}

export default function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const data = useQuery(api.reviewPublic.getProjectByToken, { token });
  const queriedVideos = useQuery(api.reviewPublic.listVideosByToken, { token });
  const videos = useMemo(() => queriedVideos ?? [], [queriedVideos]);
  const savedName = useQuery(api.reviewPublic.getReviewerName, { token });
  const verifyPasscode = useMutation(api.reviewLinks.verifyPasscode);
  const setReviewerName = useMutation(api.reviewPublic.setReviewerName);

  const [unlocked, setUnlocked] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [name, setName] = useState("");
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"videos"> | null>(null);
  const [showShortlist, setShowShortlist] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [loopPreview, setLoopPreview] = useState(false);

  useEffect(() => {
    if (data && !data.link.passcodeHash) setUnlocked(true);
  }, [data]);

  useEffect(() => {
    if (initialSelectionDone || !videos.length) return;
    setSelectedId(videos[0]._id);
    setInitialSelectionDone(true);
  }, [initialSelectionDone, videos]);

  const selected = useMemo(
    () => videos.find((v) => v._id === selectedId) ?? null,
    [videos, selectedId],
  );
  const shortlisted = useMemo(
    () => videos.filter((video) => video.isSelect),
    [videos],
  );
  const visibleVideos = showShortlist ? shortlisted : videos;
  const previewIndex = selected
    ? shortlisted.findIndex((video) => video._id === selected._id)
    : -1;

  useEffect(() => {
    if (!showShortlist) return;
    if (!shortlisted.length) {
      setShowShortlist(false);
      setPreviewMode(false);
      return;
    }
    if (!selectedId || !shortlisted.some((video) => video._id === selectedId)) {
      setSelectedId(shortlisted[0]._id);
    }
  }, [selectedId, shortlisted, showShortlist]);

  function startPreview() {
    if (!shortlisted.length) return;
    setShowShortlist(true);
    setPreviewMode(true);
    setSelectedId(shortlisted[0]._id);
  }

  function advancePreview() {
    if (!previewMode || !shortlisted.length || !selected) return;
    const nextIndex = previewIndex + 1;
    if (nextIndex < shortlisted.length) {
      setSelectedId(shortlisted[nextIndex]._id);
      return;
    }
    if (loopPreview) {
      setSelectedId(shortlisted[0]._id);
      return;
    }
    setPreviewMode(false);
  }

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-zinc-500">
        Loading review…
      </div>
    );
  }

  const { project } = data;
  const appearance = normalizeAppearance(data.link.appearance);

  if (!unlocked && data.link.passcodeHash) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-6">
        <h1 className="text-xl font-semibold">{project.title}</h1>
        <p className="text-sm text-zinc-400">Enter the passcode to continue.</p>
        <Input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Passcode"
        />
        <Button
          onClick={() =>
            void verifyPasscode({ token, passcode }).then((r) => {
              if (r.ok) setUnlocked(true);
            })
          }
        >
          Continue
        </Button>
      </div>
    );
  }

  if (savedName === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-zinc-500">
        Loading review…
      </div>
    );
  }

  if (!savedName && !nameSubmitted) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-6">
        <h1 className="text-xl font-semibold">{project.title}</h1>
        <p className="text-sm text-zinc-400">Your name appears on comments.</p>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
        <Button
          disabled={!name.trim()}
          onClick={() =>
            void setReviewerName({ token, displayName: name.trim() })
              .then(() => setNameSubmitted(true))
          }
        >
          Start review
        </Button>
      </div>
    );
  }

  const reviewerName = savedName ?? name.trim();

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-50">
      <header className="border-b border-zinc-800 px-6 py-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Review</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {project.title}
        </h1>
        {project.description && (
          <p className="mt-3 max-w-2xl text-sm text-zinc-400">
            {project.description}
          </p>
        )}
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowShortlist(false)}
            className={cn(
              "h-8 rounded-md border px-3 text-xs font-medium transition",
              !showShortlist
                ? "border-teal-400/50 bg-teal-400/15 text-teal-200"
                : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200",
            )}
          >
            All {videos.length}
          </button>
          <button
            type="button"
            onClick={() => setShowShortlist(true)}
            disabled={!shortlisted.length}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45",
              showShortlist
                ? "border-sky-300/50 bg-sky-400/15 text-sky-200"
                : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200",
            )}
          >
            <Bookmark className="h-3.5 w-3.5" />
            Shortlist {shortlisted.length}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {previewMode && selected && previewIndex >= 0 && (
            <span className="text-xs text-zinc-500">
              Previewing {previewIndex + 1}/{shortlisted.length}
            </span>
          )}
          <Button
            type="button"
            variant={loopPreview ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-xs"
            onClick={() => setLoopPreview((value) => !value)}
            disabled={!shortlisted.length}
          >
            <Repeat className="h-3.5 w-3.5" />
            Loop
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs"
            onClick={startPreview}
            disabled={!shortlisted.length}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Preview shortlist
          </Button>
        </div>
      </div>
      <div className="flex">
        <div className="min-w-0 flex-1 p-6">
          <VideoGrid
            videos={visibleVideos}
            selectedId={selectedId ?? undefined}
            size={appearance.gridSize}
            aspectRatio={appearance.aspectRatio}
            thumbnailScale={appearance.thumbnailScale}
            showCardInfo={appearance.showCardInfo}
            actionMode="client"
            token={token}
            onSelect={setSelectedId}
            empty={
              <p className="text-zinc-500">
                {showShortlist
                  ? "No shortlisted videos yet."
                  : "No videos in this review yet."}
              </p>
            }
          />
        </div>
        {selected && (
          <VideoDetailsPanel
            video={selected}
            mode="client"
            token={token}
            reviewerName={reviewerName}
            autoPlay={previewMode}
            loop={previewMode && loopPreview && shortlisted.length === 1}
            onEnded={advancePreview}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  );
}
