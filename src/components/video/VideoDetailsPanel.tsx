"use client";

import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { AssetFieldsPanel } from "./AssetFieldsPanel";
import { useMutation, useQuery } from "convex/react";
import { X, CheckCircle2, MessageSquare } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { VideoDoc } from "@/lib/smartViews";
import { assetClassLabel, isImageAsset } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "./VideoPlayer";
import {
  CommentList,
  type CommentReactionEmoji,
} from "@/components/comments/CommentList";
import { CommentComposer } from "@/components/comments/CommentComposer";
import { AuthorBadge } from "@/components/comments/AuthorBadge";

type Mode = "admin" | "client";

export function VideoDetailsPanel({
  video,
  mode,
  onClose,
  onExpand,
  token,
  autoPlay = false,
  loop = false,
  onEnded,
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
  canManageFeedback?: boolean;
}) {
  const desktop = useMediaQuery("(min-width: 1024px)");
  const returnFocus = useRef<HTMLElement | null>(null);
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [playhead, setPlayhead] = useState(0);
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
  const uploader = useQuery(
    api.videos.getUploader,
    mode === "admin" ? { videoId: video._id } : "skip",
  );

  const markViewedAdmin = useMutation(api.videos.markViewed);
  const markViewedClient = useMutation(api.reviewPublic.clientMarkViewed);
  const addCommentAdmin = useMutation(api.comments.add);
  const addCommentClient = useMutation(api.reviewPublic.clientAddComment);
  const toggleReaction = useMutation(api.comments.toggleReaction);
  const toggleCommentComplete = useMutation(api.comments.toggleComplete);
  const acknowledgeFeedback = useMutation(api.videos.acknowledgeFeedback);
  const setRatingAdmin = useMutation(api.videos.setRating);
  const setRatingClient = useMutation(api.reviewPublic.clientSetRating);
  const toggleSelectAdmin = useMutation(api.videos.toggleSelect);
  const toggleSelectClient = useMutation(api.reviewPublic.clientToggleSelect);

  const handleFirstPlay = () => {
    if (!video.viewed) {
      if (mode === "client" && token) {
        void markViewedClient({ token, videoId: video._id });
      } else {
        void markViewedAdmin({ videoId: video._id });
      }
    }
  };

  const panel = (
    <aside
      className="flex h-full min-h-0 w-full shrink-0 flex-col bg-zinc-950 lg:w-[min(420px,40vw)] lg:border-l lg:border-zinc-800"
      style={desktop && mode === "client" ? { position: "sticky", top: 0, height: "100dvh" } : undefined}
    >
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="min-w-0 truncate text-sm font-medium">{video.title}</h2>
        <div className="flex shrink-0 gap-1">
          {onExpand && (
            <Button
              variant="ghost"
              size="sm"
              className="inline-flex"
              onClick={onExpand}
            >
              Expand
            </Button>
          )}
          <Button variant="ghost" size="icon" aria-label="Close video details" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4">
        <div className="h-[min(45dvh,28rem)]" onMouseEnter={handleFirstPlay}>
          <VideoPlayer
            fitAvailable
            storageKey={video.storageKey}
            spriteKey={video.spriteKey}
            posterKey={video.thumbnailKey}
            mimeType={video.mimeType}
            assetClass={video.assetClass}
            fps={video.fps}
            width={video.width}
            height={video.height}
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
        <details className="rounded-lg border border-zinc-800">
          <summary className="cursor-pointer px-3 py-3 text-sm text-zinc-300">Fields, rating & shortlist</summary>
          <div className="h-80">
            <AssetFieldsPanel video={video} canEdit onRatingChange={(rating) => {
              if (mode === "client" && token) void setRatingClient({ token, videoId: video._id, rating });
              else void setRatingAdmin({ videoId: video._id, rating });
            }} onShortlistChange={() => {
              if (mode === "client" && token) void toggleSelectClient({ token, videoId: video._id });
              else void toggleSelectAdmin({ videoId: video._id });
            }} />
          </div>
        </details>
      </div>
    </aside>
  );
  if (desktop) return panel;
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/65" />
        <Dialog.Content aria-describedby={undefined} onOpenAutoFocus={() => {
          returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }} onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus.current?.focus({ preventScroll: true });
        }} className="fixed inset-0 z-50 h-dvh overflow-hidden bg-zinc-950 outline-none sm:inset-x-auto sm:right-0 sm:w-[min(32rem,100vw)]">
          <Dialog.Title className="sr-only">Review {video.title}</Dialog.Title>
          {panel}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
