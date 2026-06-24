import type { Doc } from "../../convex/_generated/dataModel";
import type { SmartViewId } from "./types";

export type VideoDoc = Doc<"videos">;

export const SMART_VIEWS: {
  id: SmartViewId;
  label: string;
  droppable?: boolean;
}[] = [
  { id: "all", label: "All" },
  { id: "not_started", label: "Not Started", droppable: true },
  { id: "in_progress", label: "In Progress", droppable: true },
  { id: "awaiting_review", label: "Awaiting Review" },
  { id: "in_review", label: "In Review" },
  { id: "needs_attention", label: "Needs Attention" },
  { id: "has_feedback", label: "Has Feedback" },
  { id: "selected", label: "Selected", droppable: true },
  { id: "highly_rated", label: "Highly Rated" },
  { id: "needs_changes", label: "Needs Changes", droppable: true },
  { id: "approved", label: "Approved", droppable: true },
  { id: "final", label: "Final", droppable: true },
  { id: "omitted", label: "Omit", droppable: true },
];

export function matchesSmartView(video: VideoDoc, view: SmartViewId): boolean {
  switch (view) {
    case "all":
      return video.status !== "archived";
    case "not_started":
      return video.status === "not_started";
    case "in_progress":
      return video.status === "in_progress";
    case "awaiting_review":
      return video.status === "awaiting_review" && !video.viewed;
    case "in_review":
      return video.status === "awaiting_review" && video.viewed;
    case "needs_attention":
      return video.feedbackNeedsAttention === true;
    case "has_feedback":
      return video.commentCount > 0;
    case "selected":
      return video.isSelect;
    case "highly_rated":
      return video.rating >= 4;
    case "needs_changes":
      return video.status === "needs_changes";
    case "approved":
      return video.status === "approved";
    case "final":
      return video.status === "final";
    case "omitted":
      return video.status === "omitted";
    default:
      return true;
  }
}

export function countByView(videos: VideoDoc[], view: SmartViewId): number {
  return videos.filter((v) => matchesSmartView(v, view)).length;
}

export function applyDropToView(
  view: SmartViewId
): Partial<Pick<VideoDoc, "status" | "isSelect">> | null {
  switch (view) {
    case "not_started":
      return { status: "not_started" };
    case "in_progress":
      return { status: "in_progress" };
    case "selected":
      return { isSelect: true };
    case "needs_changes":
      return { status: "needs_changes" };
    case "approved":
      return { status: "approved" };
    case "final":
      return { status: "final" };
    case "omitted":
      return { status: "omitted" };
    default:
      return null;
  }
}
