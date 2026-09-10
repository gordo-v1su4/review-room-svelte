"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, MessageSquare, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { VideoDoc } from "@/lib/smartViews";
import { isImageAsset } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { AssetFieldsPanel } from "./AssetFieldsPanel";
import {
  CommentList,
  type CommentReactionEmoji,
} from "@/components/comments/CommentList";
import { CommentComposer } from "@/components/comments/CommentComposer";
import { cn } from "@/lib/utils";

type Mode = "admin" | "client";
type InspectorTab = "comments" | "fields";

export function VideoInspectorPanel({
  video,
  mode,
  onClose,
  token,
  canEdit = mode === "admin",
  canManageFeedback = mode === "admin",
  playhead = 0,
  onSeek,
  drawMode = false,
  onDrawModeChange,
  compact = false,
}: {
  video: VideoDoc;
  mode: Mode;
  onClose?: () => void;
  token?: string;
  canEdit?: boolean;
  canManageFeedback?: boolean;
  playhead?: number;
  onSeek?: (seconds: number) => void;
  drawMode?: boolean;
  onDrawModeChange?: (enabled: boolean) => void;
  compact?: boolean;
}) {
  const [tab, setTab] = useState<InspectorTab>("comments");
  const isImage = isImageAsset(video);
  const adminComments = useQuery(
    api.comments.listByVideo,
    mode === "admin" ? { videoId: video._id } : "skip",
  );
  const clientComments = useQuery(
    api.reviewPublic.listCommentsByVideo,
    mode === "client" && token ? { token, videoId: video._id } : "skip",
  );
  const comments = mode === "admin" ? adminComments : clientComments;

  const setRatingAdmin = useMutation(api.videos.setRating);
  const setRatingClient = useMutation(api.reviewPublic.clientSetRating);
  const toggleSelectAdmin = useMutation(api.videos.toggleSelect);
  const toggleSelectClient = useMutation(api.reviewPublic.clientToggleSelect);
  const addCommentAdmin = useMutation(api.comments.add);
  const addCommentClient = useMutation(api.reviewPublic.clientAddComment);
  const toggleReaction = useMutation(api.comments.toggleReaction);
  const toggleCommentComplete = useMutation(api.comments.toggleComplete);
  const acknowledgeFeedback = useMutation(api.videos.acknowledgeFeedback);

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2.5">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-medium">{video.title}</h2>
          {!compact && video.assetCode && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[9px] text-zinc-500">
                {video.assetCode}
              </span>
            </div>
          )}
        </div>
        {onClose && <Button variant="ghost" size="icon" aria-label="Close inspector" className="h-8 w-8 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>}
      </div>

      <div className="flex border-b border-zinc-800/60">
        {(["comments", "fields"] as InspectorTab[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              "flex-1 px-3 py-2 text-xs font-medium capitalize transition",
              tab === item
                ? "border-b-2 border-[var(--brand-accent)] text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "fields" ? (
        <AssetFieldsPanel
          video={video}
          canEdit={canEdit}
          onRatingChange={(rating) => {
            if (mode === "client" && token) {
              void setRatingClient({ token, videoId: video._id, rating });
            } else {
              void setRatingAdmin({ videoId: video._id, rating });
            }
          }}
          onShortlistChange={() => {
            if (mode === "client" && token) {
              void toggleSelectClient({ token, videoId: video._id });
            } else {
              void toggleSelectAdmin({ videoId: video._id });
            }
          }}
        />
      ) : (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {mode === "admin" && canManageFeedback && video.feedbackNeedsAttention && (
            <div className="rounded-lg border border-[var(--info-muted)] bg-[var(--info-muted)] p-3">
              <div className="flex items-start gap-2">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--info)]" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-zinc-200">Feedback needs attention</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-[11px]"
                  onClick={() => void acknowledgeFeedback({ videoId: video._id })}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark handled
                </Button>
              </div>
            </div>
          )}

          <CommentComposer
            currentTime={playhead}
            drawEnabled={isImage && Boolean(onDrawModeChange)}
            drawActive={drawMode}
            onDrawToggle={() => onDrawModeChange?.(!drawMode)}
            onSubmit={(body, timecodeSec) => {
              if (mode === "client" && token) {
                void addCommentClient({ token, videoId: video._id, body, timecodeSec });
              } else {
                void addCommentAdmin({ videoId: video._id, body, timecodeSec });
              }
            }}
            timecodeEnabled={!isImage}
          />
          <CommentList
            comments={comments ?? []}
            onSeek={(sec) => onSeek?.(sec)}
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
      )}
    </aside>
  );
}
