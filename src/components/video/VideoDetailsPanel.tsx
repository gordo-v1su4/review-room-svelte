"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { X, Bookmark } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { VideoDoc } from "@/lib/smartViews";
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
}: {
  video: VideoDoc;
  mode: Mode;
  expanded?: boolean;
  onClose: () => void;
  onToggleExpand?: () => void;
  token?: string;
  reviewerName?: string;
}) {
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [playhead, setPlayhead] = useState(0);
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
        "review-panel-drawer flex h-full flex-col border-l border-zinc-800 bg-zinc-950",
        expanded ? "w-full max-w-none" : "w-full max-w-md lg:w-[420px]",
      )}
    >
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="truncate text-sm font-medium">{video.title}</h2>
        <div className="flex gap-1">
          {onToggleExpand && (
            <Button variant="ghost" size="sm" onClick={onToggleExpand}>
              {expanded ? "Collapse" : "Expand"}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div onMouseEnter={handleFirstPlay}>
          <VideoPlayer
            storageKey={video.storageKey}
            spriteKey={video.spriteKey}
            onTimeUpdate={setPlayhead}
            seekTo={seekTo}
          />
        </div>

        {mode === "admin" && (
          <div className="space-y-2">
            <VideoStatusPill status={video.status} />
            <Input
              defaultValue={video.title}
              onBlur={(e) =>
                void updateMeta({
                  videoId: video._id,
                  title: e.target.value,
                })
              }
            />
          </div>
        )}

        <div className="flex items-center justify-between">
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

        <div className="flex gap-2">
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
        />
        <CommentList
          comments={comments ?? []}
          onSeek={(sec) => setSeekTo(sec)}
        />
      </div>
    </aside>
  );
}
