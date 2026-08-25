"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { useMutation, useQuery } from "convex/react";
import {
  X,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  Flag,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { VideoDoc } from "@/lib/smartViews";
import { assetClassLabel, isImageAsset, mediaKindLabel } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "./VideoPlayer";
import { VideoStatusPill } from "./VideoStatusPill";
import { VideoRatingControl } from "./VideoRatingControl";
import {
  CommentList,
  type CommentReactionEmoji,
} from "@/components/comments/CommentList";
import { CommentComposer } from "@/components/comments/CommentComposer";
import { AuthorBadge } from "@/components/comments/AuthorBadge";
import { cn } from "@/lib/utils";
import type { VideoStatus } from "@/lib/types";

type Mode = "admin" | "client";

const STATUS_OPTIONS: Array<{ value: VideoStatus; label: string }> = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "awaiting_review", label: "Awaiting review" },
  { value: "needs_changes", label: "Needs changes" },
  { value: "approved", label: "Approved" },
  { value: "final", label: "Final" },
  { value: "omitted", label: "Omit" },
];

export function VideoDetailsPanel({
  video,
  mode,
  onClose,
  onExpand,
  token,
  autoPlay = false,
  loop = false,
  onEnded,
  canEdit = mode === "admin",
  canDelete = mode === "admin",
  canManageFeedback = mode === "admin",
}: {
  video: VideoDoc;
  mode: Mode;
  onClose: () => void;
  onExpand?: () => void;
  token?: string;
  autoPlay?: boolean;
  loop?: boolean;
  onEnded?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canManageFeedback?: boolean;
}) {
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const isImage = isImageAsset(video);
  const assetLabel = mediaKindLabel(video);
  const adminComments = useQuery(
    api.comments.listByVideo,
    mode === "admin" ? { videoId: video._id } : "skip",
  );
  const clientComments = useQuery(
    api.reviewPublic.listCommentsByVideo,
    mode === "client" && token ? { token, videoId: video._id } : "skip",
  );
  const comments = mode === "admin" ? adminComments : clientComments;
  const uploader = useQuery(
    api.videos.getUploader,
    mode === "admin" ? { videoId: video._id } : "skip",
  );

  const markViewedAdmin = useMutation(api.videos.markViewed);
  const markViewedClient = useMutation(api.reviewPublic.clientMarkViewed);
  const setRatingAdmin = useMutation(api.videos.setRating);
  const setRatingClient = useMutation(api.reviewPublic.clientSetRating);
  const toggleSelectAdmin = useMutation(api.videos.toggleSelect);
  const toggleSelectClient = useMutation(api.reviewPublic.clientToggleSelect);
  const approveAdmin = useMutation(api.videos.approve);
  const approveClient = useMutation(api.reviewPublic.clientApprove);
  const requestChangesAdmin = useMutation(api.videos.requestChanges);
  const requestChangesClient = useMutation(api.reviewPublic.clientRequestChanges);
  const addCommentAdmin = useMutation(api.comments.add);
  const addCommentClient = useMutation(api.reviewPublic.clientAddComment);
  const toggleReaction = useMutation(api.comments.toggleReaction);
  const toggleCommentComplete = useMutation(api.comments.toggleComplete);
  const acknowledgeFeedback = useMutation(api.videos.acknowledgeFeedback);
  const updateMeta = useMutation(api.videos.updateMetadata);
  const setMarkedForDeletion = useMutation(api.videos.setMarkedForDeletion);
  const removeVideo = useMutation(api.videos.remove);
  const statusLabel =
    STATUS_OPTIONS.find((option) => option.value === video.status)?.label ??
    video.status;

  const handleFirstPlay = () => {
    if (!video.viewed) {
      if (mode === "client" && token) {
        void markViewedClient({ token, videoId: video._id });
      } else {
        void markViewedAdmin({ videoId: video._id });
      }
    }
  };

  return (
    <aside
      className="review-panel-drawer fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] w-full flex-col rounded-t-xl border-t border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60 lg:sticky lg:top-[3.25rem] lg:z-auto lg:h-[calc(100dvh-3.25rem)] lg:max-h-none lg:w-[420px] lg:max-w-md lg:self-start lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none"
    >
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="truncate text-sm font-medium">{video.title}</h2>
        <div className="flex gap-1">
          {onExpand && (
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:inline-flex"
              onClick={onExpand}
            >
              Expand
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-3 sm:p-4">
        <div onMouseEnter={handleFirstPlay}>
          <VideoPlayer
            storageKey={video.storageKey}
            spriteKey={video.spriteKey}
            mimeType={video.mimeType}
            assetClass={video.assetClass}
            version={video.updatedAt}
            fps={video.fps}
            autoPlay={autoPlay}
            loop={loop}
            onPlay={handleFirstPlay}
            onTimeUpdate={setPlayhead}
            onEnded={onEnded}
            seekTo={seekTo}
          />
        </div>

        {mode === "admin" && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <VideoStatusPill status={video.status} />
              {video.assetCode && (
                <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  {video.assetCode}
                </span>
              )}
              {video.assetClass && (
                <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                  {assetClassLabel(video.assetClass)}
                </span>
              )}
            </div>
            {canEdit ? (
              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <span className="shrink-0">Status</span>
                <Popover.Root>
                  <Popover.Trigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-8 min-w-0 flex-1 items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-900/70 px-2.5 text-left text-xs font-medium text-zinc-200 outline-none transition hover:border-zinc-700 hover:bg-zinc-800 focus-visible:border-teal-400/60 focus-visible:ring-1 focus-visible:ring-teal-400/25"
                      aria-label="Change media status"
                    >
                      <span className="truncate">{statusLabel}</span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                    </button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      align="end"
                      sideOffset={6}
                      className="z-50 w-[var(--radix-popover-trigger-width)] min-w-48 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 p-1.5 text-zinc-200 shadow-2xl shadow-black/45"
                    >
                      {STATUS_OPTIONS.map((option) => {
                        const selected = option.value === video.status;

                        return (
                          <Popover.Close asChild key={option.value}>
                            <button
                              type="button"
                              onClick={() =>
                                void updateMeta({
                                  videoId: video._id,
                                  status: option.value,
                                })
                              }
                              className={cn(
                                "flex min-h-8 w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs outline-none transition focus-visible:ring-1 focus-visible:ring-teal-300/80",
                                selected
                                  ? "border border-teal-400/35 bg-teal-400/12 text-teal-100"
                                  : "border border-transparent text-zinc-400 hover:bg-teal-400/10 hover:text-teal-100",
                              )}
                            >
                              <span className="truncate">{option.label}</span>
                              {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                            </button>
                          </Popover.Close>
                        );
                      })}
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Status: {statusLabel}</p>
            )}
            {uploader ? (
              <div className="flex min-w-0 items-center gap-2 text-xs text-zinc-500">
                <span className="shrink-0">Uploaded by</span>
                <AuthorBadge
                  name={uploader.name}
                  role={uploader.role}
                  compact
                  className="min-w-0"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <span className="h-5 w-5 rounded-full border border-zinc-800 bg-zinc-950" />
                Loading uploader...
              </div>
            )}
          </div>
        )}

        {mode === "admin" && canManageFeedback && video.feedbackNeedsAttention && (
          <div className="rounded-lg border border-sky-400/25 bg-sky-400/10 p-3">
            <div className="flex items-start gap-2">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-sky-100">
                  Feedback needs attention
                </p>
                <p className="mt-0.5 text-[11px] text-sky-200/65">
                  React to notes or mark them handled when they no longer need follow-up.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 border border-sky-300/20 px-2 text-[11px] text-sky-100 hover:bg-sky-300/10"
                onClick={() => void acknowledgeFeedback({ videoId: video._id })}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark all handled
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <VideoRatingControl
            value={video.rating}
            onChange={(rating) => {
              if (mode === "client" && token) {
                void setRatingClient({ token, videoId: video._id, rating });
              } else {
                void setRatingAdmin({ videoId: video._id, rating });
              }
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (mode === "client" && token) {
                void toggleSelectClient({ token, videoId: video._id });
              } else {
                void toggleSelectAdmin({ videoId: video._id });
              }
            }}
          >
            <Bookmark
              className={cn("h-4 w-4", video.isSelect && "fill-sky-400 text-sky-400")}
            />
            Shortlist
          </Button>
        </div>

        {(mode === "client" || canEdit) && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            className="flex-1"
            variant="success"
            onClick={() => {
              if (mode === "client" && token) {
                void approveClient({ token, videoId: video._id });
              } else {
                void approveAdmin({ videoId: video._id });
              }
            }}
          >
            Approve
          </Button>
          <Button
            className="flex-1"
            variant="warning"
            onClick={() => {
              if (mode === "client" && token) {
                void requestChangesClient({ token, videoId: video._id });
              } else {
                void requestChangesAdmin({ videoId: video._id });
              }
            }}
          >
            Request changes
          </Button>
          </div>
        )}

        {mode === "admin" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              variant="ghost"
              className={cn(
                "justify-start gap-2 border border-zinc-800 text-zinc-500 hover:border-red-900/60 hover:bg-red-950/20 hover:text-red-300",
                video.markedForDeletion &&
                  "border-red-900/70 bg-red-950/20 text-red-300",
              )}
              onClick={() =>
                void setMarkedForDeletion({
                  videoId: video._id,
                  marked: !video.markedForDeletion,
                })
              }
            >
              <Flag className="h-4 w-4" />
              {video.markedForDeletion ? "Unmark" : "Mark for delete"}
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                className="justify-start gap-2 border border-zinc-800 text-zinc-500 hover:border-red-900/60 hover:bg-red-950/20 hover:text-red-300"
                onClick={() => {
                  if (!window.confirm(`Delete "${video.title}" from this review?`)) {
                    return;
                  }
                  void removeVideo({ videoId: video._id }).then(() => {
                    onClose();
                  });
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete {assetLabel}
              </Button>
            )}
          </div>
        )}

        <CommentComposer
          currentTime={playhead}
          onSubmit={(body, timecodeSec) => {
            if (mode === "client" && token) {
              void addCommentClient({
                token,
                videoId: video._id,
                body,
                timecodeSec,
              });
            } else {
              void addCommentAdmin({
                videoId: video._id,
                body,
                timecodeSec,
              });
            }
          }}
          timecodeEnabled={!isImage}
        />
        <CommentList
          comments={comments ?? []}
          onSeek={(sec) => setSeekTo(sec)}
          canReact={canManageFeedback}
          onToggleReaction={(commentId, emoji: CommentReactionEmoji) =>
            void toggleReaction({ commentId, emoji })
          }
          canComplete={canManageFeedback}
          onToggleComplete={(commentId) =>
            void toggleCommentComplete({ commentId })
          }
        />
      </div>
    </aside>
  );
}
