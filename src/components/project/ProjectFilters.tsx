"use client";

import {
  Bookmark,
  Columns3,
  Grid3X3,
  List,
  Search,
  SlidersHorizontal,
  SquarePlay,
  Rows3,
} from "lucide-react";
import type { FilterState } from "@/lib/filters";
import type { GridSize, SortKey, WorkspaceLayout } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "rating_desc", label: "Rating" },
  { id: "title", label: "Title" },
  { id: "most_comments", label: "Most comments" },
];

export function ProjectFilters({
  layout,
  gridSize,
  resultCount,
  filters,
  sort,
  onLayout,
  onGridSize,
  onFilters,
  onSort,
  onClear,
}: {
  layout: WorkspaceLayout;
  gridSize: GridSize;
  resultCount: number;
  filters: FilterState;
  sort: SortKey;
  onLayout: (layout: WorkspaceLayout) => void;
  onGridSize: (size: GridSize) => void;
  onFilters: (f: FilterState) => void;
  onSort: (s: SortKey) => void;
  onClear: () => void;
}) {
  const active =
    filters.search ||
    filters.selectedOnly ||
    filters.hasComments ||
    filters.minRating > 0;

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-zinc-800/60 bg-zinc-950/85 px-6 py-3 backdrop-blur sm:px-8">
      <div className="flex items-center gap-0.5 rounded-md border border-zinc-800/60 bg-zinc-900/60 p-0.5">
        {[
          { id: "grid", label: "Grid", icon: Grid3X3 },
          { id: "grouped", label: "Grouped", icon: Columns3 },
          { id: "list", label: "List", icon: List },
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
                "inline-flex h-7 items-center gap-1.5 rounded px-2 text-[11px] font-medium transition",
                layout === item.id
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-200",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="relative min-w-[170px] flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
        <Input
          placeholder="Search…"
          value={filters.search}
          onChange={(e) => onFilters({ ...filters, search: e.target.value })}
          className="h-8 border-zinc-800/60 bg-zinc-900/60 pl-7 text-xs"
        />
      </div>

      <Button
        variant="secondary"
        size="sm"
        className="hidden h-8 gap-1.5 text-xs text-zinc-400 sm:inline-flex"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filter
      </Button>

      <select
        value={sort}
        onChange={(e) => onSort(e.target.value as SortKey)}
        className="h-8 rounded-md border border-zinc-800/60 bg-zinc-900/60 px-2 text-xs text-zinc-300"
      >
        {SORTS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() =>
          onFilters({ ...filters, selectedOnly: !filters.selectedOnly })
        }
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition",
          filters.selectedOnly
            ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
            : "border-zinc-800/60 bg-zinc-900/60 text-zinc-500 hover:text-zinc-200",
        )}
      >
        <Bookmark
          className={cn("h-3.5 w-3.5", filters.selectedOnly && "fill-current")}
        />
        Selected
      </button>
      {active && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      )}
      <div className="ml-auto flex items-center gap-2">
        <span className="text-[11px] tabular-nums text-zinc-600">
          {resultCount}
        </span>
        <div className="hidden items-center rounded-md border border-zinc-800/60 bg-zinc-900/60 p-0.5 sm:flex">
          {(["sm", "md", "lg"] as GridSize[]).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onGridSize(size)}
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded px-1.5 text-[10px] font-medium uppercase transition",
                gridSize === size
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-600 hover:text-zinc-300",
              )}
            >
              <Rows3 className="h-3 w-3" />
              {size}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
