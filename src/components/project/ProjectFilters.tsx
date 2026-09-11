"use client";

import * as Popover from "@radix-ui/react-popover";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Columns3,
  Grid3X3,
  List,
  Rows3,
  Search,
  SlidersHorizontal,
  SquarePlay,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FilterState } from "@/lib/filters";
import { assetClassLabel } from "@/lib/media";
import { WORKSPACE_CHROME_PADDING } from "@/lib/workspaceLayout";
import type {
  AssetClass,
  CardAspectRatio,
  FolderSortKey,
  GridSize,
  GroupByField,
  SortKey,
  ThumbnailScale,
  VideoStatus,
  WorkspaceLayout,
} from "@/lib/types";
import type { CardFieldId } from "@/lib/cardFields";
import { FieldsVisibilityPopover } from "./FieldsVisibilityPopover";
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

const FOLDER_SORTS: { id: FolderSortKey; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "title", label: "Title A–Z" },
  { id: "title_desc", label: "Title Z–A" },
  { id: "attention", label: "Needs attention" },
];

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

const ASSET_CLASS_OPTIONS: Array<{ id: AssetClass; label: string }> = [
  { id: "VID", label: assetClassLabel("VID") },
  { id: "IMG", label: assetClassLabel("IMG") },
  { id: "CTX", label: assetClassLabel("CTX") },
  { id: "STB", label: assetClassLabel("STB") },
];

const toolbarShellClass =
  "inline-flex h-8 shrink-0 items-center rounded-md bg-zinc-900 p-0.5";
const toolbarActionClass =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-zinc-900 px-2.5 text-[11px] font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-100";

const toolbarIconOnlyClass = "max-lg:w-7 max-lg:px-0 lg:min-w-[3.25rem]";
const toolbarActionIconOnlyClass =
  "max-lg:w-8 max-lg:justify-center max-lg:px-0";

function toolbarSegmentClass(active: boolean) {
  return cn(
    "inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded px-2 text-[11px] font-medium transition",
    toolbarIconOnlyClass,
    active
      ? "bg-[var(--brand-accent-muted)] text-[var(--brand-accent)]"
      : "text-zinc-500 hover:bg-zinc-800/70 hover:text-zinc-200",
  );
}

const LAYOUT_ITEMS = [
  { id: "grid", label: "Grid", icon: Grid3X3 },
  { id: "grouped", label: "Group", icon: Columns3 },
  { id: "table", label: "Table", icon: List },
  { id: "review", label: "Review", icon: SquarePlay },
] as const;

export function WorkspaceLayoutSwitcher({
  layout,
  onLayout,
  className,
}: {
  layout: WorkspaceLayout;
  onLayout: (layout: WorkspaceLayout) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-4 gap-0.5 rounded-lg bg-zinc-900/80 p-0.5",
        className,
      )}
      role="tablist"
      aria-label="Workspace layout"
    >
      {LAYOUT_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = layout === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            title={item.label}
            onClick={() => onLayout(item.id)}
            className={cn(
              "inline-flex h-8 items-center justify-center gap-1.5 rounded-md text-[11px] font-medium transition",
              active
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden min-[480px]:inline">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ProjectFilters({
  layout,
  gridSize,
  aspectRatio,
  thumbnailScale,
  showCardInfo,
  assetClassCounts,
  filters,
  sort,
  folderSort,
  showFolderSort,
  groupBy = "none",
  visibleFields,
  fieldOrder,
  panelToggles,
  canUploadMedia,
  uploadHref,
  onFolderSort,
  onLayout,
  onGridSize,
  onAspectRatio,
  onThumbnailScale,
  onShowCardInfo,
  onFilters,
  onSort,
  onGroupBy,
  onVisibleFieldsChange,
}: {
  layout: WorkspaceLayout;
  gridSize: GridSize;
  aspectRatio: CardAspectRatio;
  thumbnailScale: ThumbnailScale;
  showCardInfo: boolean;
  assetClassCounts: Record<"all" | AssetClass, number>;
  filters: FilterState;
  sort: SortKey;
  folderSort?: FolderSortKey;
  showFolderSort?: boolean;
  groupBy?: GroupByField;
  visibleFields?: CardFieldId[];
  fieldOrder?: CardFieldId[];
  panelToggles?: React.ReactNode;
  canUploadMedia?: boolean;
  uploadHref?: string;
  onFolderSort?: (sort: FolderSortKey) => void;
  onLayout: (layout: WorkspaceLayout) => void;
  onGridSize: (size: GridSize) => void;
  onAspectRatio: (ratio: CardAspectRatio) => void;
  onThumbnailScale: (scale: ThumbnailScale) => void;
  onShowCardInfo: (show: boolean) => void;
  onFilters: (f: FilterState) => void;
  onSort: (s: SortKey) => void;
  onGroupBy?: (group: GroupByField) => void;
  onVisibleFieldsChange?: (visible: CardFieldId[], order: CardFieldId[]) => void;
}) {
  return (
    <div className="z-20 w-full shrink-0 min-w-0 bg-zinc-950 lg:border-b lg:border-zinc-800">
      <div
        className={cn(
          "flex items-center gap-2 pb-1.5 pt-1 lg:hidden",
          WORKSPACE_CHROME_PADDING,
        )}
      >
        <WorkspaceLayoutSwitcher
          layout={layout}
          onLayout={onLayout}
          className="min-w-0 flex-1"
        />
        {canUploadMedia && uploadHref && (
          <Link href={uploadHref} className="shrink-0">
            <Button
              size="sm"
              aria-label="Upload"
              className="h-8 gap-1.5 px-2.5 text-xs"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden min-[480px]:inline">Upload</span>
            </Button>
          </Link>
        )}
      </div>
      <div
        className={cn(
          "no-scrollbar flex w-full min-w-0 flex-nowrap items-center gap-1 overflow-x-auto overflow-y-hidden max-lg:h-9 max-lg:pb-1 max-lg:pt-0 lg:h-11 lg:overflow-hidden lg:py-1.5",
          WORKSPACE_CHROME_PADDING,
        )}
      >
        <div className={cn(toolbarShellClass, "hidden lg:inline-flex")}>
          {LAYOUT_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                title={item.label}
                aria-label={item.label}
                onClick={() => onLayout(item.id)}
                className={toolbarSegmentClass(layout === item.id)}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">{item.label}</span>
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

        {visibleFields && fieldOrder && onVisibleFieldsChange && (
          <FieldsVisibilityPopover
            visibleFields={visibleFields}
            fieldOrder={fieldOrder}
            onChange={onVisibleFieldsChange}
          />
        )}

        <FilterPopover
          filters={filters}
          assetClassCounts={assetClassCounts}
          groupBy={groupBy}
          onFilters={onFilters}
          onGroupBy={onGroupBy}
        />

        <div className="min-w-2 flex-1" aria-hidden />

        <SearchIconPopover filters={filters} onFilters={onFilters} />
        <SortPopover
          sort={sort}
          folderSort={folderSort}
          showFolderSort={showFolderSort}
          onSort={onSort}
          onFolderSort={onFolderSort}
        />
        <span
          className="hidden h-8 shrink-0 items-center gap-1.5 border-l border-zinc-800/80 pl-2 text-[10px] text-zinc-600 lg:inline-flex"
          title="Arrow keys: previous / next asset"
        >
          <kbd className="rounded border border-zinc-800 bg-zinc-900 px-1 py-px font-sans text-[9px] leading-none text-zinc-500">
            ←
          </kbd>
          <kbd className="rounded border border-zinc-800 bg-zinc-900 px-1 py-px font-sans text-[9px] leading-none text-zinc-500">
            →
          </kbd>
          <span className="hidden xl:inline">Prev / next</span>
        </span>
        {panelToggles}
      </div>
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
          title="Appearance"
          aria-label="Appearance"
          className={cn(toolbarActionClass, toolbarActionIconOnlyClass)}
        >
          <Rows3 className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Appearance</span>
          <ChevronDown className="hidden h-3.5 w-3.5 text-zinc-500 lg:inline" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="rr-popover z-50 w-[15.25rem] max-w-[calc(100vw-1rem)] rounded-xl border border-white/[0.08] bg-[#0d0d0f] p-2 text-zinc-200"
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
  folderSort,
  showFolderSort,
  onSort,
  onFolderSort,
}: {
  sort: SortKey;
  folderSort?: FolderSortKey;
  showFolderSort?: boolean;
  onSort: (sort: SortKey) => void;
  onFolderSort?: (sort: FolderSortKey) => void;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          title={`Sort: ${SORT_LABELS[sort]}`}
          aria-label={`Sort: ${SORT_LABELS[sort]}`}
          className={cn(
            toolbarActionClass,
            "min-w-8 justify-between",
            toolbarActionIconOnlyClass,
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-zinc-500" />
            <span className="hidden font-normal text-zinc-500 lg:inline">
              Sort
            </span>
            <span className="hidden lg:inline">{SORT_LABELS[sort]}</span>
          </span>
          <ChevronDown className="hidden h-3.5 w-3.5 text-zinc-500 lg:inline" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="rr-popover z-50 w-48 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d0d0f] p-1.5 text-zinc-200"
        >
          {SORTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSort(item.id)}
              className={cn(
                "flex min-h-8 w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs outline-none transition focus-visible:ring-1 focus-visible:ring-teal-300/80",
                sort === item.id
                  ? "border border-teal-400/35 bg-teal-400/12 text-teal-100"
                  : "border border-transparent text-zinc-400 hover:bg-teal-400/10 hover:text-teal-100",
              )}
            >
              {item.label}
              {sort === item.id && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
          {showFolderSort && folderSort && onFolderSort && (
            <>
              <p className="mt-1.5 px-2.5 pt-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                Groups
              </p>
              {FOLDER_SORTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onFolderSort(item.id)}
                  className={cn(
                    "flex min-h-8 w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs outline-none transition focus-visible:ring-1 focus-visible:ring-teal-300/80",
                    folderSort === item.id
                      ? "border border-teal-400/35 bg-teal-400/12 text-teal-100"
                      : "border border-transparent text-zinc-400 hover:bg-teal-400/10 hover:text-teal-100",
                  )}
                >
                  {item.label}
                  {folderSort === item.id && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </>
          )}
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

const GROUP_OPTIONS: Array<{ id: GroupByField; label: string }> = [
  { id: "none", label: "None" },
  { id: "status", label: "Status" },
  { id: "assetClass", label: "Asset class" },
  { id: "folder", label: "Folder" },
];

const STATUS_FILTER_OPTIONS: Array<{ id: VideoStatus; label: string }> = [
  { id: "awaiting_review", label: "Needs review" },
  { id: "in_progress", label: "In progress" },
  { id: "needs_changes", label: "Needs changes" },
  { id: "approved", label: "Approved" },
];

function FilterPopover({
  filters,
  assetClassCounts,
  groupBy,
  onFilters,
  onGroupBy,
}: {
  filters: FilterState;
  assetClassCounts: Record<"all" | AssetClass, number>;
  groupBy: GroupByField;
  onFilters: (filters: FilterState) => void;
  onGroupBy?: (group: GroupByField) => void;
}) {
  const activeCount =
    filters.statuses.length +
    filters.assetClasses.length +
    (filters.hasComments ? 1 : 0) +
    (filters.selectedOnly ? 1 : 0) +
    (groupBy !== "none" ? 1 : 0);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          title={activeCount ? `Filter (${activeCount} active)` : "Filter"}
          aria-label={activeCount ? `Filter (${activeCount} active)` : "Filter"}
          className={cn(
            toolbarActionClass,
            "relative",
            toolbarActionIconOnlyClass,
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Filter</span>
          {activeCount > 0 && (
            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[var(--brand-accent)]" />
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="rr-popover z-50 w-52 rounded-xl border border-white/[0.08] bg-[#0d0d0f] p-2"
        >
          {STATUS_FILTER_OPTIONS.map((option) => {
            const active = filters.statuses.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() =>
                  onFilters({
                    ...filters,
                    statuses: active
                      ? filters.statuses.filter((s) => s !== option.id)
                      : [...filters.statuses, option.id],
                  })
                }
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs",
                  active ? "bg-[var(--brand-accent-muted)] text-zinc-100" : "text-zinc-500",
                )}
              >
                {option.label}
                {active && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() =>
              onFilters({ ...filters, selectedOnly: !filters.selectedOnly })
            }
            className={cn(
              "mt-1 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs",
              filters.selectedOnly
                ? "bg-[var(--brand-accent-muted)] text-zinc-100"
                : "text-zinc-500",
            )}
          >
            Selected only
            {filters.selectedOnly && <Check className="h-3.5 w-3.5" />}
          </button>
          <p className="mt-1.5 px-2 pt-1 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
            Media
          </p>
          {ASSET_CLASS_OPTIONS.map((option) => {
            const active = filters.assetClasses.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() =>
                  onFilters({
                    ...filters,
                    assetClasses: active
                      ? filters.assetClasses.filter((id) => id !== option.id)
                      : [...filters.assetClasses, option.id],
                  })
                }
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs",
                  active ? "bg-[var(--brand-accent-muted)] text-zinc-100" : "text-zinc-500",
                )}
              >
                {option.label}
                <span className="tabular-nums text-zinc-600">
                  {assetClassCounts[option.id]}
                </span>
              </button>
            );
          })}
          {onGroupBy && (
            <>
              <p className="mt-1.5 px-2 pt-1 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                Group by
              </p>
              {GROUP_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onGroupBy(option.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs",
                    groupBy === option.id
                      ? "bg-[var(--brand-accent-muted)] text-zinc-100"
                      : "text-zinc-500 hover:bg-zinc-900",
                  )}
                >
                  {option.label}
                  {groupBy === option.id && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SearchIconPopover({
  filters,
  onFilters,
}: {
  filters: FilterState;
  onFilters: (filters: FilterState) => void;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          title="Search"
          aria-label="Search"
          className={cn(toolbarActionClass, toolbarActionIconOnlyClass)}
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Search</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="rr-popover z-50 w-56 rounded-xl border border-white/[0.08] bg-[#0d0d0f] p-2"
        >
          <Input
            autoFocus
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => onFilters({ ...filters, search: e.target.value })}
            className="h-8 border-zinc-800 bg-zinc-900 text-xs"
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
