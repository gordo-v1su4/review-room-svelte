import type { Id } from "../../convex/_generated/dataModel";
import type { VideoDoc } from "@/lib/smartViews";
import type { GroupByField } from "@/lib/types";
import { assetClassLabel } from "@/lib/media";
import { VIDEO_STATUS_LABELS } from "@/lib/videoStatus";
import { projectRootLabel } from "@/lib/projectFolders";

export type VideoGroup = {
  key: string;
  label: string;
  videos: VideoDoc[];
};

export function groupVideosByField(
  videos: VideoDoc[],
  groupBy: GroupByField,
  folderTitleById: Map<Id<"projectFolders">, string>,
  projectTitle?: string | null,
): VideoGroup[] {
  if (groupBy === "none") {
    return [{ key: "all", label: "All", videos }];
  }

  const buckets = new Map<string, VideoGroup>();

  for (const video of videos) {
    let key: string;
    let label: string;

    switch (groupBy) {
      case "status":
        key = video.status;
        label = VIDEO_STATUS_LABELS[video.status] ?? video.status;
        break;
      case "assetClass":
        key = video.assetClass ?? "unknown";
        label = video.assetClass ? assetClassLabel(video.assetClass) : "Unclassified";
        break;
      case "folder":
        key = video.folderId ?? "root";
        label = video.folderId
          ? folderTitleById.get(video.folderId) ?? "Folder"
          : projectRootLabel(projectTitle);
        break;
      case "uploader":
        key = video.uploadedBy;
        label = `Uploader ${video.uploadedBy.slice(-4)}`;
        break;
      default:
        key = "all";
        label = "All";
    }

    const existing = buckets.get(key);
    if (existing) {
      existing.videos.push(video);
    } else {
      buckets.set(key, { key, label, videos: [video] });
    }
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}
