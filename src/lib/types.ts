export type VideoStatus =
  | "awaiting_review"
  | "needs_changes"
  | "approved"
  | "final"
  | "archived";

export type UserRole = "admin" | "client";

export type SmartViewId =
  | "all"
  | "awaiting_review"
  | "in_review"
  | "has_feedback"
  | "selected"
  | "highly_rated"
  | "needs_changes"
  | "approved"
  | "final";

export type SortKey =
  | "newest"
  | "oldest"
  | "status"
  | "rating_desc"
  | "title"
  | "recently_reviewed"
  | "most_comments";

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

export type WorkspaceLayout = "grid" | "grouped" | "list" | "review";
