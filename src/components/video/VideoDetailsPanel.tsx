"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { X, Bookmark, CheckCircle2, Flag, MessageSquare, RotateCcw, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { VideoDoc } from "@/lib/smartViews";
import { assetClassLabel, isImageAsset, mediaKindLabel } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VideoPlayer } from "./VideoPlayer";
import { VideoStatusPill } from "./VideoStatusPill";
import { VideoRatingControl } from "./VideoRatingControl";
import {
  CommentList,
  type CommentReactionEmoji,
} from "@/components/comments/CommentList";
import { CommentComposer } from "@/components/comments/CommentComposer";
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
  expanded,
  onClose,
  onToggleExpand,
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
  expanded?: boolean;
  onClose: () => void;
  onToggleExpand?: () => void;
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
  const resetStatus = useMutation(api.videos.resetStatus);
  const removeVideo = useMutation(api.videos.remove);

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
      className={cn(
        "review-panel-drawer fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-xl border-t border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60 lg:sticky lg:top-[3.25rem] lg:z-auto lg:h-[calc(100dvh-3.25rem)] lg:max-h-none lg:self-start lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none",
        expanded ? "w-full max-w-none" : "w-full lg:max-w-md lg:w-[420px]",
      )}
    >
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="truncate text-sm font-medium">{video.title}</h2>
        <div className="flex gap-1">
          {onToggleExpand && (
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:inline-flex"
              onClick={onToggleExpand}
            >
              {expanded ? "Collapse" : "Expand"}
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
            {canEdit && (
              <label className="flex items-center gap-2 text-[11px] text-zinc-500">
                <span className="shrink-0">Status</span>
                <select
                  value={video.status}
                  onChange={(event) =>
                    void updateMeta({
                      videoId: video._id,
                      status: event.target.value as VideoStatus,
                    })
                  }
                  className="h-8 min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-200 outline-none transition focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/25"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {canEdit ? (
              <Input
                defaultValue={video.title}
                onBlur={(e) =>
                  void updateMeta({
                    videoId: video._id,
                    title: e.target.value,
                  })
                }
              />
            ) : (
              <p className="text-sm text-zinc-300">{video.title}</p>
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

        {mode === "admin" && (canEdit || canDelete) && (
          <div className="grid gap-2 sm:grid-cols-2">
            {canEdit && (
              <Button
                variant="ghost"
                className="justify-start gap-2 border border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-200"
                onClick={() => void resetStatus({ videoId: video._id })}
              >
                <RotateCcw className="h-4 w-4" />
                Reset status
              </Button>
            )}
            {canEdit && (
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
            )}
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
