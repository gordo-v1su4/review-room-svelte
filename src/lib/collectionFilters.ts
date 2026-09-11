import type { FilterState } from "./filters";
import type { VideoDoc } from "./smartViews";
import { mediaKind } from "./media";
import type { AssetClass, SmartViewId } from "./types";

export type CollectionFilterRules = {
  assetClass?: AssetClass;
  status?: string;
  smartView?: SmartViewId;
  assetClasses?: AssetClass[];
  statuses?: string[];
  tags?: string[];
  minRating?: number;
  selectedOnly?: boolean;
  hasComments?: boolean;
  search?: string;
};

export function collectionRulesActive(
  rules: CollectionFilterRules | null | undefined,
): boolean {
  if (!rules) return false;
  if (rules.assetClass || rules.status || rules.smartView) return true;
  if (rules.assetClasses?.length) return true;
  if (rules.statuses?.length) return true;
  if (rules.tags?.length) return true;
  if (rules.minRating && rules.minRating > 0) return true;
  if (rules.selectedOnly) return true;
  if (rules.hasComments) return true;
  if (rules.search?.trim()) return true;
  return false;
}

export function collectionIsConfigured(collection: {
  kind: "system" | "user";
  sourceFolderId?: string;
  filterRules?: unknown;
}): boolean {
  if (collection.kind === "system") return true;
  if (collection.sourceFolderId) return true;
  return collectionRulesActive(collection.filterRules as CollectionFilterRules);
}

export function filterStateToCollectionRules(
  filters: FilterState,
  smartView: SmartViewId,
): CollectionFilterRules {
  const rules: CollectionFilterRules = {};
  if (smartView !== "all") rules.smartView = smartView;
  if (filters.assetClasses.length) rules.assetClasses = filters.assetClasses;
  if (filters.statuses.length) rules.statuses = filters.statuses;
  if (filters.tags.length) rules.tags = filters.tags;
  if (filters.minRating > 0) rules.minRating = filters.minRating;
  if (filters.selectedOnly) rules.selectedOnly = true;
  if (filters.hasComments) rules.hasComments = true;
  if (filters.search.trim()) rules.search = filters.search.trim();
  return rules;
}

export function collectionRulesToFilterState(
  rules: CollectionFilterRules,
): { filters: FilterState; smartView: SmartViewId } {
  return {
    smartView: rules.smartView ?? "all",
    filters: {
      assetClasses: rules.assetClasses ?? (rules.assetClass ? [rules.assetClass] : []),
      statuses: rules.statuses ?? (rules.status ? [rules.status] : []),
      tags: rules.tags ?? [],
      minRating: rules.minRating ?? 0,
      selectedOnly: rules.selectedOnly ?? false,
      hasComments: rules.hasComments ?? false,
      search: rules.search ?? "",
    },
  };
}

export function applyCollectionFilterRules(
  videos: VideoDoc[],
  rules: CollectionFilterRules | null | undefined,
): VideoDoc[] {
  if (!rules) return videos;

  return videos.filter((video) => {
    if (rules.assetClass && video.assetClass !== rules.assetClass) return false;
    if (rules.status && video.status !== rules.status) return false;

    if (rules.assetClasses?.length) {
      const assetClass =
        video.assetClass ?? (mediaKind(video) === "video" ? "VID" : "IMG");
      if (!rules.assetClasses.includes(assetClass)) return false;
    }
    if (rules.statuses?.length && !rules.statuses.includes(video.status)) {
      return false;
    }
    if (rules.selectedOnly && !video.isSelect) return false;
    if (rules.hasComments && video.commentCount === 0) return false;
    if (rules.minRating && rules.minRating > 0 && video.rating < rules.minRating) {
      return false;
    }
    if (rules.tags?.length && !rules.tags.every((tag) => video.tags.includes(tag))) {
      return false;
    }
    if (rules.search) {
      const query = rules.search.toLowerCase();
      const haystack = [
        video.title,
        video.originalFilename,
        video.mimeType,
        mediaKind(video),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}
