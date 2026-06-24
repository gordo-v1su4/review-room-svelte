import type { VideoDoc } from "@/lib/smartViews";
import type { AssetClass, MediaKind } from "@/lib/types";

export function isImageMimeType(mimeType?: string | null) {
  return Boolean(mimeType?.startsWith("image/"));
}

export function isVideoMimeType(mimeType?: string | null) {
  return Boolean(mimeType?.startsWith("video/"));
}

export function isImageAsset(asset: Pick<VideoDoc, "mimeType">) {
  return isImageMimeType(asset.mimeType);
}

export function isVideoAsset(asset: Pick<VideoDoc, "mimeType">) {
  return isVideoMimeType(asset.mimeType);
}

export function mediaKind(asset: Pick<VideoDoc, "mimeType">): MediaKind {
  if (isImageAsset(asset)) return "image";
  if (isVideoAsset(asset)) return "video";
  return "other";
}

export function mediaKindLabel(asset: Pick<VideoDoc, "mimeType">) {
  return mediaKind(asset);
}

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  VID: "Video",
  IMG: "Image",
  CTX: "Contact sheet",
  STB: "Storyboard",
};

export function assetClassForMimeType(mimeType?: string | null): AssetClass {
  return isVideoMimeType(mimeType) ? "VID" : "IMG";
}

export function assetClassLabel(assetClass?: AssetClass | null) {
  return assetClass ? ASSET_CLASS_LABELS[assetClass] : "Media";
}
