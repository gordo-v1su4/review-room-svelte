"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, Bookmark, MessageSquare, Star } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AuthorBadge } from "@/components/comments/AuthorBadge";
import type { VideoDoc } from "@/lib/smartViews";
import { assetClassLabel, isImageAsset } from "@/lib/media";
import { cn, formatDuration, formatTimecode } from "@/lib/utils";
import { useStorageUrl } from "@/hooks/useStorageUrl";
import { VideoStatusPill } from "./VideoStatusPill";

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
  onSelect,
}: {
  projectId: Id<"projects">;
  videos: VideoDoc[];
  selectedId?: string;
  onSelect: (id: VideoDoc["_id"]) => void;
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

  const columns = useMemo<ColumnDef<ReviewTableRow>[]>(
    () => [
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
              {row.original.video.isSelect && (
                <Bookmark className="h-3 w-3 shrink-0 fill-sky-400 text-sky-400" />
              )}
            </div>
            <div className="truncate text-[10px] text-zinc-600">
              {row.original.video.title !== row.original.video.assetCode &&
                `${row.original.video.title} · `}
              {row.original.video.originalFilename}
            </div>
          </div>
        ),
        size: 260,
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
        size: 72,
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => row.video.status,
        cell: ({ row }) => <VideoStatusPill status={row.original.video.status} />,
        size: 128,
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
        size: 132,
      },
      {
        id: "rating",
        header: "Rating",
        accessorFn: (row) => row.video.rating,
        cell: ({ row }) => <RatingCell rating={row.original.video.rating} />,
        size: 110,
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
        size: 76,
      },
      {
        id: "latestNote",
        header: "Latest Note",
        accessorFn: (row) => row.latestNote?.body ?? "",
        cell: ({ row }) => {
          const note = row.original.latestNote;
          if (!note) return <span className="text-zinc-700">-</span>;
          return (
            <div className="min-w-0">
              <div className="truncate text-zinc-300">{note.body}</div>
              <div className="mt-1 flex min-w-0 items-center gap-2 text-[10px] text-zinc-600">
                <AuthorBadge
                  name={note.authorName}
                  role={note.authorRole}
                  compact
                  className="max-w-[11rem]"
                />
                {note.timecodeSec != null && (
                  <span className="text-sky-400">{formatTimecode(note.timecodeSec)}</span>
                )}
              </div>
            </div>
          );
        },
        size: 360,
      },
      {
        id: "noteDate",
        header: "Note Date",
        accessorFn: (row) => row.latestNote?.createdAt ?? 0,
        cell: ({ row }) => (
          <span className="text-zinc-500">
            {formatDateTime(row.original.latestNote?.createdAt)}
          </span>
        ),
        size: 120,
      },
      {
        id: "updated",
        header: "Updated",
        accessorFn: (row) => row.video.updatedAt,
        cell: ({ row }) => (
          <span className="text-zinc-500">{formatDateTime(row.original.video.updatedAt)}</span>
        ),
        size: 120,
      },
      {
        id: "length",
        header: "Length",
        accessorFn: (row) => row.video.durationSec ?? 0,
        cell: ({ row }) => (
          <span className="text-zinc-500">
            {isImageAsset(row.original.video)
              ? "Still"
              : formatDuration(row.original.video.durationSec)}
          </span>
        ),
        size: 82,
      },
    ],
    [],
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
        <div className="border-b border-zinc-800/70 bg-zinc-900/40 px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                Review Table
              </p>
              <p className="text-xs text-zinc-400">
                Shot-style notes, status, and latest-feedback tracking.
              </p>
            </div>
            <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
              {rows.length} rows
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1420px] table-fixed border-collapse">
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
                  onClick={() => onSelect(row.original.video._id)}
                  className={cn(
                    "cursor-pointer border-b border-zinc-800/45 text-[11.5px] transition",
                    index % 2 === 0 ? "bg-white/[0.012]" : "bg-transparent",
                    selectedId === row.original.video._id
                      ? "bg-sky-400/[0.085]"
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
