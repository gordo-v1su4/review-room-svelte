"use client";

import type { FilterState } from "@/lib/filters";
import type { SortKey } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "rating_desc", label: "Rating" },
  { id: "title", label: "Title" },
  { id: "most_comments", label: "Most comments" },
];

export function ProjectFilters({
  filters,
  sort,
  onFilters,
  onSort,
  onClear,
}: {
  filters: FilterState;
  sort: SortKey;
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
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search…"
        value={filters.search}
        onChange={(e) => onFilters({ ...filters, search: e.target.value })}
        className="h-8 w-40"
      />
      <select
        value={sort}
        onChange={(e) => onSort(e.target.value as SortKey)}
        className="h-8 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-300"
      >
        {SORTS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={filters.selectedOnly}
          onChange={(e) =>
            onFilters({ ...filters, selectedOnly: e.target.checked })
          }
        />
        Selected only
      </label>
      {active && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
