"use client";

import { useMemo, useState } from "react";
import type { VideoDoc } from "@/lib/smartViews";
import { assetClassLabel, isImageAsset } from "@/lib/media";
import { Bookmark } from "lucide-react";
import { VideoStatusPill } from "./VideoStatusPill";
import { VideoRatingControl } from "./VideoRatingControl";
import { cn } from "@/lib/utils";
import type { VideoStatus } from "@/lib/types";

type FieldGroup = "all" | "essentials" | "review" | "file" | "tags";
type FieldFilter = "all" | "empty" | "filled";

type FieldRow = {
  id: string;
  label: string;
  group: Exclude<FieldGroup, "all">;
  value: string | null;
  filled: boolean;
};

export function AssetFieldsPanel({
  video,
  canEdit,
  onStatusChange,
  onRatingChange,
  onShortlistChange,
}: {
  video: VideoDoc;
  canEdit?: boolean;
  onStatusChange?: (status: VideoStatus) => void;
  onRatingChange?: (rating: number) => void;
  onShortlistChange?: () => void;
}) {
  const [group, setGroup] = useState<FieldGroup>("all");
  const [filter, setFilter] = useState<FieldFilter>("all");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => buildFieldRows(video), [video]);

  const visible = rows.filter((row) => {
    if (group !== "all" && row.group !== group) return false;
    if (filter === "empty" && row.filled) return false;
    if (filter === "filled" && !row.filled) return false;
    if (search.trim() && !row.label.toLowerCase().includes(search.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-zinc-800/60 p-3">
        <div className="flex flex-wrap gap-1">
          {(["all", "essentials", "review", "file", "tags"] as FieldGroup[]).map((item) => (
            <FilterChip key={item} active={group === item} onClick={() => setGroup(item)}>
              {item === "all" ? "All" : item.charAt(0).toUpperCase() + item.slice(1)}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {(["all", "empty", "filled"] as FieldFilter[]).map((item) => (
            <FilterChip key={item} active={filter === item} onClick={() => setFilter(item)}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </FilterChip>
          ))}
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search fields…"
          className="h-8 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2.5 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-[var(--brand-accent)]/50"
        />
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {visible.map((row) => (
          <div
            key={row.id}
            className="flex items-start justify-between gap-3 rounded-md border border-zinc-800/60 bg-zinc-900/30 px-2.5 py-2"
          >
            <span className="text-[11px] text-zinc-500">{row.label}</span>
            <div className="min-w-0 break-words text-right text-xs text-zinc-200 [overflow-wrap:anywhere]">
              {row.id === "status" ? (
                <VideoStatusPill status={video.status} />
              ) : row.id === "rating" && canEdit && onRatingChange ? (
                <VideoRatingControl value={video.rating} onChange={onRatingChange} />
              ) : row.id === "shortlist" && canEdit && onShortlistChange ? (
                <button
                  type="button"
                  onClick={onShortlistChange}
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-300 transition hover:text-zinc-100"
                >
                  <Bookmark
                    className={cn(
                      "h-3.5 w-3.5",
                      video.isSelect && "fill-[var(--selected)] text-[var(--selected)]",
                    )}
                  />
                  {video.isSelect ? "Selected" : "Add to shortlist"}
                </button>
              ) : row.id === "tags" && video.tags.length > 0 ? (
                <span className="flex flex-wrap justify-end gap-1">
                  {video.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </span>
              ) : (
                <span className={cn(!row.filled && "text-zinc-600")}>
                  {row.value ?? "—"}
                </span>
              )}
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <p className="py-6 text-center text-xs text-zinc-600">No fields match.</p>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-2 py-0.5 text-[10px] font-medium transition",
        active
          ? "border-[var(--brand-accent)]/30 bg-[var(--brand-accent-muted)] text-[var(--brand-accent)]"
          : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300",
      )}
    >
      {children}
    </button>
  );
}

function buildFieldRows(video: VideoDoc): FieldRow[] {
  const resolution =
    video.width && video.height ? `${video.width}×${video.height}` : null;
  const duration =
    video.durationSec != null
      ? `${Math.floor(video.durationSec / 60)}:${String(Math.floor(video.durationSec % 60)).padStart(2, "0")}`
      : null;

  return [
    {
      id: "status",
      label: "Status",
      group: "essentials",
      value: video.status,
      filled: true,
    },
    {
      id: "rating",
      label: "Rating",
      group: "essentials",
      value: video.rating > 0 ? String(video.rating) : null,
      filled: video.rating > 0,
    },
    {
      id: "shortlist",
      label: "Shortlist",
      group: "essentials",
      value: video.isSelect ? "Selected" : null,
      filled: video.isSelect,
    },
    {
      id: "viewed",
      label: "Viewed",
      group: "review",
      value: video.viewed ? "Yes" : "No",
      filled: video.viewed,
    },
    {
      id: "comments",
      label: "Comments",
      group: "review",
      value: video.commentCount > 0 ? String(video.commentCount) : null,
      filled: video.commentCount > 0,
    },
    {
      id: "attention",
      label: "Needs attention",
      group: "review",
      value: video.feedbackNeedsAttention ? "Yes" : null,
      filled: Boolean(video.feedbackNeedsAttention),
    },
    {
      id: "filename",
      label: "Filename",
      group: "file",
      value: video.originalFilename,
      filled: Boolean(video.originalFilename),
    },
    {
      id: "mime",
      label: "MIME type",
      group: "file",
      value: video.mimeType,
      filled: Boolean(video.mimeType),
    },
    {
      id: "duration",
      label: "Duration",
      group: "file",
      value: duration,
      filled: Boolean(duration),
    },
    {
      id: "resolution",
      label: "Resolution",
      group: "file",
      value: resolution,
      filled: Boolean(resolution),
    },
    {
      id: "assetCode",
      label: "Asset code",
      group: "file",
      value: video.assetCode ?? null,
      filled: Boolean(video.assetCode),
    },
    {
      id: "assetClass",
      label: "Asset class",
      group: "file",
      value: video.assetClass ? assetClassLabel(video.assetClass) : null,
      filled: Boolean(video.assetClass),
    },
    {
      id: "tags",
      label: "Tags",
      group: "tags",
      value: video.tags.length > 0 ? video.tags.join(", ") : null,
      filled: video.tags.length > 0,
    },
    {
      id: "image",
      label: "Media type",
      group: "file",
      value: isImageAsset(video) ? "Image" : "Video",
      filled: true,
    },
  ];
}
