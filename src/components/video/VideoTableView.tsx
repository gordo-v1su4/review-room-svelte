"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, Bookmark, Check, MessageSquare, Star } from "lucide-react";
import {
  modifiersFromEvent,
  type MediaSelectModifiers,
} from "@/lib/mediaSelection";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AuthorBadge } from "@/components/comments/AuthorBadge";
import type { VideoDoc } from "@/lib/smartViews";
import { assetClassLabel, isImageAsset } from "@/lib/media";
import { cn, formatTimecode } from "@/lib/utils";
import { useStorageUrl } from "@/hooks/useStorageUrl";
import { VideoStatusControl } from "./VideoStatusControl";
import type { VideoStatus } from "@/lib/types";

type LatestNote = {
  videoId: Id<"videos">;
  commentId: Id<"comments">;
  authorName: string;
  authorRole: "admin" | "client";
  body: string;
  timecodeSec?: number;
  createdAt: number;
};

type ReviewTableRow = {
  video: VideoDoc;
  latestNote?: LatestNote;
};

function formatDateTime(timestamp?: number) {
  if (!timestamp) return "-";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function AttentionPill({ video }: { video: VideoDoc }) {
  if (video.feedbackNeedsAttention) {
    return (
      <span className="inline-flex rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] font-medium text-sky-300">
        Needs attention
      </span>
    );
  }
  if (video.feedbackAcknowledgedAt) {
    return (
      <span className="inline-flex rounded-full border border-emerald-400/15 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
        Acknowledged
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
      Open
    </span>
  );
}

function TableThumbnail({ video }: { video: VideoDoc }) {
  const isImage = isImageAsset(video);
  const url = useStorageUrl(
    video.thumbnailKey ?? (isImage ? video.storageKey : undefined),
    video.updatedAt,
  );

  return (
    <div className="h-10 w-16 overflow-hidden rounded border border-zinc-800 bg-zinc-950">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full place-items-center text-[9px] text-zinc-700">
          {video.processingStatus === "processing" ? "Proc" : "No img"}
        </div>
      )}
    </div>
  );
}

function RatingCell({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            "h-3 w-3",
            index < rating ? "fill-yellow-400 text-yellow-400" : "text-zinc-800",
          )}
        />
      ))}
    </span>
  );
}

export function VideoTableView({
  projectId,
  videos,
  selectedId,
  checkedIds = [],
  onSelect,
  onToggleAll,
}: {
  projectId: Id<"projects">;
  videos: VideoDoc[];
  selectedId?: string;
  checkedIds?: string[];
  onSelect: (id: VideoDoc["_id"], modifiers?: MediaSelectModifiers) => void;
  onToggleAll?: (checked: boolean) => void;
}) {
  const latestNotes = useQuery(api.comments.latestByProject, { projectId });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "attention", desc: true },
  ]);

  const latestByVideo = useMemo(() => {
    const map = new Map<Id<"videos">, LatestNote>();
    for (const note of latestNotes ?? []) map.set(note.videoId, note);
    return map;
  }, [latestNotes]);

  const rows = useMemo<ReviewTableRow[]>(
    () => videos.map((video) => ({ video, latestNote: latestByVideo.get(video._id) })),
    [latestByVideo, videos],
  );

  const updateMetadata = useMutation(api.videos.updateMetadata);
  const applySmartViewDrop = useMutation(api.videos.applySmartViewDrop);
  const allChecked = videos.length > 0 && videos.every((video) => checkedIds.includes(video._id));
  const someChecked = videos.some((video) => checkedIds.includes(video._id));

  function targetIds(videoId: Id<"videos">) {
    if (checkedIds.includes(videoId) && checkedIds.length > 1) {
      return checkedIds as Id<"videos">[];
    }
    return [videoId];
  }

  function changeStatus(videoId: Id<"videos">, status: VideoStatus) {
    void Promise.all(
      targetIds(videoId).map((id) => updateMetadata({ videoId: id, status })),
    );
  }

  function toggleShortlist(videoId: Id<"videos">, currentlySelected: boolean) {
    const ids = targetIds(videoId);
    const next =
      ids.length > 1
        ? !videos.filter((video) => ids.includes(video._id)).every((video) => video.isSelect)
        : !currentlySelected;
    void Promise.all(ids.map((id) => applySmartViewDrop({ videoId: id, isSelect: next })));
  }

  const columns = useMemo<ColumnDef<ReviewTableRow>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <button
            type="button"
            title={allChecked ? "Clear selection" : "Select all"}
            aria-pressed={allChecked}
            className={cn(
              "grid h-3 w-3 place-items-center rounded-[3px] border border-white/50 bg-transparent",
              allChecked || someChecked
                ? "border-[var(--brand-accent)] bg-[var(--brand-accent)] text-white"
                : "text-transparent",
            )}
            onClick={(event) => {
              event.stopPropagation();
              onToggleAll?.(!allChecked);
            }}
          >
            <Check className="h-3 w-3" />
          </button>
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const checked = checkedIds.includes(row.original.video._id);
          return (
            <button
              type="button"
              title={checked ? "Deselect" : "Select"}
              aria-pressed={checked}
              className={cn(
                "grid h-3 w-3 place-items-center rounded-[3px] border border-white/50 bg-transparent",
                checked
                  ? "border-[var(--brand-accent)] bg-[var(--brand-accent)] text-white"
                  : "text-transparent",
              )}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(row.original.video._id, {
                  shiftKey: event.shiftKey,
                  metaKey: true,
                  ctrlKey: false,
                });
              }}
            >
              <Check className="h-3 w-3" />
            </button>
          );
        },
        size: 36,
      },
      {
        id: "preview",
        header: "",
        enableSorting: false,
        cell: ({ row }) => <TableThumbnail video={row.original.video} />,
        size: 76,
      },
      {
        id: "asset",
        header: "Shot / Asset",
        accessorFn: (row) => row.video.assetCode ?? row.video.title,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-medium text-zinc-100">
                {row.original.video.assetCode ?? row.original.video.title}
              </span>
            </div>
            <div className="truncate text-[10px] text-zinc-600">
              {row.original.video.title !== row.original.video.assetCode &&
                `${row.original.video.title} · `}
              {row.original.video.originalFilename}
            </div>
          </div>
        ),
        size: 220,
      },
      {
        id: "class",
        header: "Type",
        accessorFn: (row) => row.video.assetClass ?? (isImageAsset(row.video) ? "IMG" : "VID"),
        cell: ({ row }) => (
          <span title={assetClassLabel(row.original.video.assetClass)}>
            {row.original.video.assetClass ?? (isImageAsset(row.original.video) ? "IMG" : "VID")}
          </span>
        ),
        size: 56,
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => row.video.status,
        cell: ({ row }) => (
          <VideoStatusControl
            status={row.original.video.status}
            includeAdminExtras
            hideLabel
            onChange={(status) => changeStatus(row.original.video._id, status)}
          />
        ),
        size: 132,
      },
      {
        id: "shortlist",
        header: "",
        accessorFn: (row) => (row.video.isSelect ? 1 : 0),
        cell: ({ row }) => {
          const shortlisted = row.original.video.isSelect;
          return (
            <button
              type="button"
              title={shortlisted ? "Remove from shortlist" : "Add to shortlist"}
              aria-pressed={shortlisted}
              className={cn(
                "grid h-6 w-6 place-items-center rounded text-zinc-500 transition hover:text-zinc-200",
                shortlisted && "text-[var(--selected)]",
              )}
              onClick={(event) => {
                event.stopPropagation();
                toggleShortlist(row.original.video._id, shortlisted);
              }}
            >
              <Bookmark
                className={cn(
                  "h-3 w-3",
                  shortlisted && "fill-[var(--selected)] text-[var(--selected)]",
                )}
              />
            </button>
          );
        },
        size: 36,
      },
      {
        id: "attention",
        header: "Feedback",
        accessorFn: (row) =>
          row.video.feedbackNeedsAttention
            ? 2
            : row.video.feedbackAcknowledgedAt
              ? 1
              : 0,
        cell: ({ row }) => <AttentionPill video={row.original.video} />,
        size: 118,
      },
      {
        id: "rating",
        header: "Rating",
        accessorFn: (row) => row.video.rating,
        cell: ({ row }) => <RatingCell rating={row.original.video.rating} />,
        size: 96,
      },
      {
        id: "notes",
        header: "Notes",
        accessorFn: (row) => row.video.commentCount,
        cell: ({ row }) => (
          <span
            className={cn(
              "inline-flex items-center gap-1 tabular-nums",
              row.original.video.feedbackNeedsAttention
                ? "text-sky-300"
                : row.original.video.commentCount > 0
                  ? "text-zinc-300"
                  : "text-zinc-700",
            )}
          >
            <MessageSquare className="h-3 w-3" />
            {row.original.video.commentCount}
          </span>
        ),
        size: 64,
      },
      {
        id: "latestNote",
        header: "Latest Note",
        accessorFn: (row) => row.latestNote?.createdAt ?? 0,
        cell: ({ row }) => {
          const note = row.original.latestNote;
          if (!note) return <span className="text-zinc-700">-</span>;
          return (
            <div className="min-w-0">
              <div className="truncate text-zinc-300">{note.body}</div>
              <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[10px] text-zinc-600">
                <AuthorBadge
                  name={note.authorName}
                  role={note.authorRole}
                  compact
                  className="max-w-[8rem]"
                />
                {note.timecodeSec != null && (
                  <span className="text-sky-400">{formatTimecode(note.timecodeSec)}</span>
                )}
                <span>{formatDateTime(note.createdAt)}</span>
              </div>
            </div>
          );
        },
        size: 200,
      },
    ],
    [allChecked, checkedIds, onSelect, onToggleAll, someChecked, videos, updateMetadata, applySmartViewDrop],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!videos.length) {
    return (
      <div className="mx-6 flex min-h-[280px] items-center justify-center rounded-lg border border-dashed border-zinc-800 text-sm text-zinc-500 sm:mx-8">
        No media match.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="overflow-hidden rounded-lg border border-zinc-800/70 bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-zinc-800/70">
                  {headerGroup.headers.map((header) => {
                    const sortable = header.column.getCanSort();
                    const sortState = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className="bg-zinc-950 px-2 py-2 text-left align-middle text-[10px] font-semibold uppercase tracking-wider text-zinc-600"
                      >
                        {sortable ? (
                          <button
                            type="button"
                            className="inline-flex max-w-full items-center gap-1 truncate transition hover:text-zinc-300"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <span className="truncate">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                            </span>
                            {sortState === "asc" && <ArrowUp className="h-3 w-3" />}
                            {sortState === "desc" && <ArrowDown className="h-3 w-3" />}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, index) => (
                <tr
                  key={row.id}
                  onClick={(event) =>
                    onSelect(row.original.video._id, modifiersFromEvent(event))
                  }
                  className={cn(
                    "cursor-pointer border-b border-zinc-800/45 text-[11.5px] transition",
                    index % 2 === 0 ? "bg-white/[0.012]" : "bg-transparent",
                    selectedId === row.original.video._id
                      ? "bg-sky-400/[0.085]"
                      : checkedIds.includes(row.original.video._id)
                        ? "bg-[color-mix(in_srgb,var(--selected)_8%,transparent)] hover:bg-[color-mix(in_srgb,var(--selected)_12%,transparent)]"
                        : "hover:bg-white/[0.032]",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="truncate px-2 py-1.5 align-middle text-zinc-400"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
