"use client";

import * as Popover from "@radix-ui/react-popover";
import type { ReactNode } from "react";
import {
  Bookmark,
  Check,
  ChevronDown,
  Columns3,
  Film,
  Grid3X3,
  Image,
  List,
  Rows3,
  RotateCcw,
  Search,
  SlidersHorizontal,
  SquarePlay,
} from "lucide-react";
import type { FilterState } from "@/lib/filters";
import type {
  AssetClass,
  CardAspectRatio,
  GridSize,
  MediaKind,
  SortKey,
  ThumbnailScale,
  WorkspaceLayout,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "status", label: "Status" },
  { id: "rating_desc", label: "Rating" },
  { id: "title", label: "Title" },
  { id: "most_comments", label: "Most comments" },
];

const SORT_LABELS = Object.fromEntries(
  SORTS.map((sort) => [sort.id, sort.label]),
) as Record<SortKey, string>;

const GRID_SIZES: { id: GridSize; label: string }[] = [
  { id: "sm", label: "S" },
  { id: "md", label: "M" },
  { id: "lg", label: "L" },
];

const ASPECT_RATIOS: { id: CardAspectRatio; label: string; title: string }[] = [
  { id: "video", label: "16:9", title: "Landscape" },
  { id: "square", label: "1:1", title: "Square" },
  { id: "portrait", label: "9:16", title: "Portrait" },
];

const THUMBNAIL_SCALES: { id: ThumbnailScale; label: string }[] = [
  { id: "fit", label: "Fit" },
  { id: "fill", label: "Fill" },
];

type MediaTypeFilterId = "all" | Extract<MediaKind, "video" | "image">;

const MEDIA_TYPE_OPTIONS: Array<{
  id: MediaTypeFilterId;
  label: string;
  icon?: typeof Film;
}> = [
  { id: "all", label: "All" },
  { id: "video", label: "Videos", icon: Film },
  { id: "image", label: "Images", icon: Image },
];

const ASSET_CLASS_OPTIONS: Array<{ id: AssetClass; label: string }> = [
  { id: "VID", label: "VID" },
  { id: "IMG", label: "IMG" },
  { id: "CTX", label: "CTX" },
  { id: "STB", label: "STB" },
];

export function ProjectFilters({
  layout,
  gridSize,
  aspectRatio,
  thumbnailScale,
  showCardInfo,
  resultCount,
  mediaTypeCounts,
  assetClassCounts,
  filters,
  sort,
  onLayout,
  onGridSize,
  onAspectRatio,
  onThumbnailScale,
  onShowCardInfo,
  onFilters,
  onSort,
  onClear,
  onResetStatus,
  canResetStatus = false,
}: {
  layout: WorkspaceLayout;
  gridSize: GridSize;
  aspectRatio: CardAspectRatio;
  thumbnailScale: ThumbnailScale;
  showCardInfo: boolean;
  resultCount: number;
  mediaTypeCounts: Record<"all" | "video" | "image", number>;
  assetClassCounts: Record<"all" | AssetClass, number>;
  filters: FilterState;
  sort: SortKey;
  onLayout: (layout: WorkspaceLayout) => void;
  onGridSize: (size: GridSize) => void;
  onAspectRatio: (ratio: CardAspectRatio) => void;
  onThumbnailScale: (scale: ThumbnailScale) => void;
  onShowCardInfo: (show: boolean) => void;
  onFilters: (f: FilterState) => void;
  onSort: (s: SortKey) => void;
  onClear: () => void;
  onResetStatus?: () => void;
  canResetStatus?: boolean;
}) {
  const active =
    filters.search ||
    filters.mediaTypes.length > 0 ||
    filters.assetClasses.length > 0 ||
    filters.statuses.length > 0 ||
    filters.tags.length > 0 ||
    filters.selectedOnly ||
    filters.hasComments ||
    filters.minRating > 0;

  return (
    <div className="no-scrollbar sticky top-14 z-20 flex h-[3.25rem] flex-nowrap items-center gap-2 overflow-x-auto whitespace-nowrap border-b border-zinc-800 bg-zinc-950 px-4 py-2.5 sm:px-6 lg:top-0 lg:px-8">
      <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-zinc-800 bg-zinc-900 p-0.5">
        {[
          { id: "grid", label: "Grid", icon: Grid3X3 },
          { id: "grouped", label: "Group", icon: Columns3 },
          { id: "table", label: "Table", icon: List },
          { id: "review", label: "Review", icon: SquarePlay },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => onLayout(item.id as WorkspaceLayout)}
              className={cn(
                "inline-flex h-8 w-[4.6rem] shrink-0 items-center justify-center gap-1.5 rounded px-2 text-[11px] font-medium transition",
                layout === item.id
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-200",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <AppearancePopover
        gridSize={gridSize}
        aspectRatio={aspectRatio}
        thumbnailScale={thumbnailScale}
        showCardInfo={showCardInfo}
        onGridSize={onGridSize}
        onAspectRatio={onAspectRatio}
        onThumbnailScale={onThumbnailScale}
        onShowCardInfo={onShowCardInfo}
      />

      {canResetStatus && onResetStatus && (
        <button
          type="button"
          onClick={onResetStatus}
          title="Reset status"
          className="inline-flex h-8 w-[5.4rem] shrink-0 items-center justify-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-[11px] font-medium text-zinc-300 shadow-sm transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <RotateCcw className="h-3.5 w-3.5 text-zinc-500" />
          Reset
        </button>
      )}

      <MediaTypeFilter
        filters={filters}
        counts={mediaTypeCounts}
        onFilters={onFilters}
      />

      <AssetClassFilter
        filters={filters}
        counts={assetClassCounts}
        onFilters={onFilters}
      />

      <div className="relative w-[15rem] shrink-0">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
        <Input
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => onFilters({ ...filters, search: e.target.value })}
          className="h-8 border-zinc-800 bg-zinc-900 pl-7 text-xs"
        />
      </div>

      <SortPopover sort={sort} onSort={onSort} />
      <button
        type="button"
        onClick={() =>
          onFilters({ ...filters, selectedOnly: !filters.selectedOnly })
        }
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition",
          filters.selectedOnly
            ? "border-zinc-700 bg-zinc-800 text-sky-200"
            : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200",
        )}
      >
        <Bookmark
          className={cn("h-3.5 w-3.5", filters.selectedOnly && "fill-current")}
        />
        Selected
      </button>
      {active && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 border border-zinc-800 bg-zinc-900 px-2.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
          onClick={onClear}
        >
          Clear filters
        </Button>
      )}
      <span className="shrink-0 px-1 text-[11px] tabular-nums text-zinc-600">
        {resultCount}
      </span>
    </div>
  );
}

function MediaTypeFilter({
  filters,
  counts,
  onFilters,
}: {
  filters: FilterState;
  counts: Record<"all" | "video" | "image", number>;
  onFilters: (filters: FilterState) => void;
}) {
  const current = filters.mediaTypes.length === 1 ? filters.mediaTypes[0] : "all";

  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-zinc-800 bg-zinc-900 p-0.5">
      {MEDIA_TYPE_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = current === option.id;

        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() =>
              onFilters({
                ...filters,
                mediaTypes: option.id === "all" ? [] : [option.id],
              })
            }
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded px-2.5 text-[11px] font-medium transition",
              active
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-200",
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            <span>{option.label}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                active
                  ? "bg-zinc-950 text-zinc-300"
                  : "bg-zinc-800 text-zinc-600",
              )}
            >
              {counts[option.id === "all" ? "all" : option.id]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AssetClassFilter({
  filters,
  counts,
  onFilters,
}: {
  filters: FilterState;
  counts: Record<"all" | AssetClass, number>;
  onFilters: (filters: FilterState) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-zinc-800 bg-zinc-900 p-0.5">
      {ASSET_CLASS_OPTIONS.map((option) => {
        const active = filters.assetClasses.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            title={option.label}
            onClick={() =>
              onFilters({
                ...filters,
                assetClasses: active
                  ? filters.assetClasses.filter((item) => item !== option.id)
                  : [...filters.assetClasses, option.id],
              })
            }
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded px-2.5 text-[11px] font-medium transition",
              active
                ? "bg-teal-400 text-zinc-950"
                : "text-zinc-500 hover:text-zinc-200",
            )}
          >
            {option.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                active
                  ? "bg-zinc-950/15 text-zinc-950"
                  : "bg-zinc-800 text-zinc-600",
              )}
            >
              {counts[option.id]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AppearancePopover({
  gridSize,
  aspectRatio,
  thumbnailScale,
  showCardInfo,
  onGridSize,
  onAspectRatio,
  onThumbnailScale,
  onShowCardInfo,
}: {
  gridSize: GridSize;
  aspectRatio: CardAspectRatio;
  thumbnailScale: ThumbnailScale;
  showCardInfo: boolean;
  onGridSize: (size: GridSize) => void;
  onAspectRatio: (ratio: CardAspectRatio) => void;
  onThumbnailScale: (scale: ThumbnailScale) => void;
  onShowCardInfo: (show: boolean) => void;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 text-[11px] font-medium text-zinc-300 shadow-sm transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <Rows3 className="h-3.5 w-3.5" />
          Appearance
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-50 w-[15.25rem] max-w-[calc(100vw-1rem)] rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-200 shadow-2xl shadow-black/45"
        >
          <div className="mb-1.5 border-b border-white/10 pb-1.5">
            <p className="text-[10px] font-medium leading-none text-zinc-400">
              Visible to only you
            </p>
          </div>
          <div className="space-y-1.5">
            <AppearanceRow label="Card Size">
              <SegmentGroup columns={3}>
                {GRID_SIZES.map((size) => (
                  <SegmentButton
                    key={size.id}
                    active={gridSize === size.id}
                    onClick={() => onGridSize(size.id)}
                  >
                    {size.label}
                  </SegmentButton>
                ))}
              </SegmentGroup>
            </AppearanceRow>

            <AppearanceRow label="Aspect Ratio">
              <SegmentGroup columns={3}>
                {ASPECT_RATIOS.map((ratio) => (
                  <SegmentButton
                    key={ratio.id}
                    active={aspectRatio === ratio.id}
                    title={ratio.title}
                    ariaLabel={ratio.label}
                    onClick={() => onAspectRatio(ratio.id)}
                  >
                    <span
                      className={cn(
                        "block rounded-[3px] border border-current bg-current/10",
                        ratioIconClass[ratio.id],
                      )}
                    />
                  </SegmentButton>
                ))}
              </SegmentGroup>
            </AppearanceRow>

            <AppearanceRow label="Thumbnail Scale">
              <SegmentGroup columns={2}>
                {THUMBNAIL_SCALES.map((scale) => (
                  <SegmentButton
                    key={scale.id}
                    active={thumbnailScale === scale.id}
                    onClick={() => onThumbnailScale(scale.id)}
                  >
                    {scale.label}
                  </SegmentButton>
                ))}
              </SegmentGroup>
            </AppearanceRow>

            <AppearanceRow label="Show Card Info">
              <button
                type="button"
                role="switch"
                aria-label="Show Card Info"
                aria-checked={showCardInfo}
                onClick={() => onShowCardInfo(!showCardInfo)}
                className={cn(
                  "ml-auto flex h-4 w-7 items-center rounded-full p-0.5 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-200/80",
                  showCardInfo ? "bg-teal-400" : "bg-zinc-700/70",
                )}
              >
                <span
                  className={cn(
                    "h-3 w-3 rounded-full shadow-sm transition",
                    showCardInfo
                      ? "translate-x-3 bg-zinc-950"
                      : "translate-x-0 bg-zinc-300",
                  )}
                />
              </button>
            </AppearanceRow>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SortPopover({
  sort,
  onSort,
}: {
  sort: SortKey;
  onSort: (sort: SortKey) => void;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-8 min-w-32 shrink-0 items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 text-[11px] font-medium text-zinc-300 shadow-sm transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <span className="inline-flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500" />
            {SORT_LABELS[sort]}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-50 w-48 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 p-1.5 text-zinc-200 shadow-2xl shadow-black/45"
        >
          {SORTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSort(item.id)}
              className={cn(
                "flex h-7 w-full items-center justify-between rounded-md px-2.5 text-left text-[10px] transition",
                sort === item.id
                  ? "bg-teal-400 text-zinc-950"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
              )}
            >
              {item.label}
              {sort === item.id && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function AppearanceRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[5.8rem_5.9rem] items-center gap-1.5">
      <span className="whitespace-nowrap text-[10px] leading-none text-zinc-300/90">
        {label}
      </span>
      {children}
    </div>
  );
}

function SegmentGroup({
  children,
  columns,
}: {
  children: ReactNode;
  columns: 2 | 3;
}) {
  return (
    <div
      className={cn(
        "grid w-[5.35rem] justify-self-end gap-px rounded-md border border-zinc-800 bg-zinc-900 p-0.5",
        columns === 2 ? "grid-cols-2" : "grid-cols-3",
      )}
    >
      {children}
    </div>
  );
}

function SegmentButton({
  active,
  children,
  title,
  ariaLabel,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  title?: string;
  ariaLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-[18px] min-w-0 items-center justify-center gap-0.5 rounded-[4px] px-0.5 text-[9px] font-semibold leading-none text-zinc-300 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-200/80",
        active
          ? "bg-teal-400 text-zinc-950 shadow-sm ring-1 ring-teal-200/70"
          : "hover:bg-zinc-800 hover:text-zinc-100",
      )}
    >
      {children}
    </button>
  );
}

const ratioIconClass: Record<CardAspectRatio, string> = {
  video: "h-2.5 w-4",
  square: "h-3 w-3",
  portrait: "h-4 w-2.5",
};
