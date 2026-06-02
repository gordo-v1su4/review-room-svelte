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
  | "rating_desc"
  | "title"
  | "recently_reviewed"
  | "most_comments";

export type GridSize = "sm" | "md" | "lg";

export type WorkspaceLayout = "grid" | "grouped" | "list" | "review";
