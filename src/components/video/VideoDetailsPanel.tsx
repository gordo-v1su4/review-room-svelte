"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { X, Bookmark, Flag, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { VideoDoc } from "@/lib/smartViews";
import { isImageAsset, mediaKindLabel } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VideoPlayer } from "./VideoPlayer";
import { VideoStatusPill } from "./VideoStatusPill";
import { VideoRatingControl } from "./VideoRatingControl";
import { CommentList } from "@/components/comments/CommentList";
import { CommentComposer } from "@/components/comments/CommentComposer";
import { cn } from "@/lib/utils";

type Mode = "admin" | "client";

export function VideoDetailsPanel({
  video,
  mode,
  expanded,
  onClose,
  onToggleExpand,
  token,
  reviewerName,
  autoPlay = false,
  loop = false,
  onEnded,
  canEdit = mode === "admin",
  canDelete = mode === "admin",
}: {
  video: VideoDoc;
  mode: Mode;
  expanded?: boolean;
  onClose: () => void;
  onToggleExpand?: () => void;
  token?: string;
  reviewerName?: string;
  autoPlay?: boolean;
  loop?: boolean;
  onEnded?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const isImage = isImageAsset(video);
  const assetLabel = mediaKindLabel(video);
  const comments = useQuery(api.comments.listByVideo, { videoId: video._id });

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
  const updateMeta = useMutation(api.videos.updateMetadata);
  const setMarkedForDeletion = useMutation(api.videos.setMarkedForDeletion);
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
        "review-panel-drawer fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-xl border-t border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60 lg:static lg:z-auto lg:h-full lg:max-h-none lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none",
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
            <VideoStatusPill status={video.status} />
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
            const name = reviewerName ?? "Reviewer";
            if (mode === "client" && token) {
              void addCommentClient({
                token,
                videoId: video._id,
                authorName: name,
                body,
                timecodeSec,
              });
            } else {
              void addCommentAdmin({
                videoId: video._id,
                authorName: name,
                authorRole: "admin",
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
        />
      </div>
    </aside>
  );
}
