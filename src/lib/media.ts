import type { VideoDoc } from "@/lib/smartViews";

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

export function mediaKindLabel(asset: Pick<VideoDoc, "mimeType">) {
  return isImageAsset(asset) ? "image" : "video";
}
