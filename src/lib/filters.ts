import type { VideoDoc } from "./smartViews";
import { mediaKind } from "./media";
import type { AssetClass, MediaKind, SortKey } from "./types";

const STATUS_SORT_ORDER: Record<VideoDoc["status"], number> = {
  not_started: 0,
  in_progress: 1,
  awaiting_review: 2,
  needs_changes: 3,
  approved: 4,
  final: 5,
  omitted: 6,
  archived: 7,
};

export type FilterState = {
  mediaTypes: MediaKind[];
  assetClasses: AssetClass[];
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
    case "status":
      return copy.sort(
        (a, b) =>
          STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status] ||
          b.uploadedAt - a.uploadedAt,
      );
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
    if (
      filters.mediaTypes.length &&
      !filters.mediaTypes.includes(mediaKind(v))
    ) {
      return false;
    }
    if (
      filters.assetClasses.length &&
      !filters.assetClasses.includes(v.assetClass ?? (mediaKind(v) === "video" ? "VID" : "IMG"))
    ) {
      return false;
    }
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
      const haystack = [
        v.title,
        v.originalFilename,
        v.mimeType,
        mediaKind(v),
      ].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
