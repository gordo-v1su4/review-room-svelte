import type { Doc } from "../../convex/_generated/dataModel";
import type { SmartViewId } from "./types";

export type VideoDoc = Doc<"videos">;

export const SMART_VIEWS: {
  id: SmartViewId;
  label: string;
  droppable?: boolean;
}[] = [
  { id: "all", label: "All" },
  { id: "awaiting_review", label: "Awaiting Review" },
  { id: "in_review", label: "In Review" },
  { id: "has_feedback", label: "Has Feedback" },
  { id: "selected", label: "Selected", droppable: true },
  { id: "highly_rated", label: "Highly Rated" },
  { id: "needs_changes", label: "Needs Changes", droppable: true },
  { id: "approved", label: "Approved", droppable: true },
  { id: "final", label: "Final", droppable: true },
];

export function matchesSmartView(video: VideoDoc, view: SmartViewId): boolean {
  switch (view) {
    case "all":
      return video.status !== "archived";
    case "awaiting_review":
      return video.status === "awaiting_review" && !video.viewed;
    case "in_review":
      return video.status === "awaiting_review" && video.viewed;
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
    case "selected":
      return { isSelect: true };
    case "needs_changes":
      return { status: "needs_changes" };
    case "approved":
      return { status: "approved" };
    case "final":
      return { status: "final" };
    default:
      return null;
  }
}
