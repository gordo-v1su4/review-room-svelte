import type { VideoStatus } from "@/lib/types";

export const VIDEO_STATUS_LABELS: Record<VideoStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  awaiting_review: "Needs review",
  needs_changes: "Needs changes",
  approved: "Approved",
  final: "Final",
  omitted: "Omit",
  archived: "Archived",
};

/** Review decisions shown on cards. Approved lives here, not as a second control. */
export const CARD_STATUS_OPTIONS: VideoStatus[] = [
  "awaiting_review",
  "in_progress",
  "needs_changes",
  "approved",
];

export const ADMIN_STATUS_EXTRAS: VideoStatus[] = [
  "not_started",
  "final",
  "omitted",
];

export const STATUS_BADGE_CLASS: Record<VideoStatus, string> = {
  not_started:
    "bg-[color-mix(in_srgb,var(--status-not-started)_18%,transparent)] text-[var(--status-not-started)]",
  in_progress:
    "bg-[color-mix(in_srgb,var(--status-in-progress)_18%,transparent)] text-[var(--status-in-progress)]",
  awaiting_review:
    "bg-[color-mix(in_srgb,var(--status-awaiting)_18%,transparent)] text-[var(--status-awaiting)]",
  needs_changes:
    "bg-[var(--warning-muted)] text-[var(--warning)]",
  approved: "bg-[var(--success-muted)] text-[var(--success)]",
  final: "bg-[var(--info-muted)] text-[var(--info)]",
  omitted:
    "bg-[color-mix(in_srgb,var(--status-omitted)_18%,transparent)] text-[var(--status-omitted)]",
  archived: "bg-zinc-900 text-zinc-500",
};

export function videoStatusLabel(status: VideoStatus) {
  return VIDEO_STATUS_LABELS[status];
}

export function isOmittedAsset(video: {
  status: VideoStatus;
  markedForDeletion?: boolean;
}) {
  return video.status === "omitted" || Boolean(video.markedForDeletion);
}
