export type VideoStatus =
  | "not_started"
  | "in_progress"
  | "awaiting_review"
  | "needs_changes"
  | "approved"
  | "final"
  | "omitted"
  | "archived";

export type UserRole = "admin" | "client";

export type AssetClass = "VID" | "IMG" | "CTX" | "STB";

export type SmartViewId =
  | "all"
  | "not_started"
  | "in_progress"
  | "awaiting_review"
  | "in_review"
  | "needs_attention"
  | "has_feedback"
  | "selected"
  | "highly_rated"
  | "needs_changes"
  | "approved"
  | "final"
  | "omitted";

export type SortKey =
  | "newest"
  | "oldest"
  | "status"
  | "rating_desc"
  | "title"
  | "recently_reviewed"
  | "most_comments";

export type FolderSortKey = "manual" | "title" | "newest" | "attention";

export type GridSize = "sm" | "md" | "lg";

export type CardAspectRatio = "video" | "square" | "portrait";

export type ThumbnailScale = "fit" | "fill";

export type MediaKind = "video" | "image" | "other";

export type WorkspaceAppearance = {
  gridSize: GridSize;
  aspectRatio: CardAspectRatio;
  thumbnailScale: ThumbnailScale;
  showCardInfo: boolean;
};

export type WorkspaceLayout = "grid" | "grouped" | "table" | "review";
