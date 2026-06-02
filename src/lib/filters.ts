import type { VideoDoc } from "./smartViews";
import type { SortKey } from "./types";

export type FilterState = {
  statuses: string[];
  tags: string[];
  minRating: number;
  selectedOnly: boolean;
  hasComments: boolean;
  search: string;
};

export function sortVideos(videos: VideoDoc[], sort: SortKey): VideoDoc[] {
  const copy = [...videos];
  switch (sort) {
    case "oldest":
      return copy.sort((a, b) => a.uploadedAt - b.uploadedAt);
    case "rating_desc":
      return copy.sort((a, b) => b.rating - a.rating || b.uploadedAt - a.uploadedAt);
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case "recently_reviewed":
      return copy.sort(
        (a, b) => (b.approvedAt ?? b.updatedAt) - (a.approvedAt ?? a.updatedAt),
      );
    case "most_comments":
      return copy.sort((a, b) => b.commentCount - a.commentCount);
    case "newest":
    default:
      return copy.sort((a, b) => b.uploadedAt - a.uploadedAt);
  }
}

export function applyFilters(videos: VideoDoc[], filters: FilterState): VideoDoc[] {
  return videos.filter((v) => {
    if (filters.statuses.length && !filters.statuses.includes(v.status)) return false;
    if (filters.selectedOnly && !v.isSelect) return false;
    if (filters.hasComments && v.commentCount === 0) return false;
    if (filters.minRating > 0 && v.rating < filters.minRating) return false;
    if (
      filters.tags.length &&
      !filters.tags.every((t) => v.tags.includes(t))
    ) {
      return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!v.title.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}
