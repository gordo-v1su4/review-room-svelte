import type { VideoDoc } from "@/lib/smartViews";
import type { AssetClass, MediaKind } from "@/lib/types";

export function isImageMimeType(mimeType?: string | null) {
  return Boolean(mimeType?.startsWith("image/"));
}

export function isVideoMimeType(mimeType?: string | null) {
  return Boolean(mimeType?.startsWith("video/"));
}

const VIDEO_EXTENSION_MIME_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  webm: "video/webm",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
};

const IMAGE_EXTENSION_MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
};

function extensionFromFilename(filename?: string | null) {
  return filename?.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
}

export function mimeTypeForFilename(filename?: string | null) {
  const extension = extensionFromFilename(filename);
  if (!extension) return undefined;
  return VIDEO_EXTENSION_MIME_TYPES[extension] ?? IMAGE_EXTENSION_MIME_TYPES[extension];
}

export function normalizedMediaMimeType(
  mimeType?: string | null,
  filename?: string | null,
) {
  return mimeType || mimeTypeForFilename(filename) || "application/octet-stream";
}

export function isImageFileType(mimeType?: string | null, filename?: string | null) {
  return isImageMimeType(mimeType) || isImageMimeType(mimeTypeForFilename(filename));
}

export function isVideoFileType(mimeType?: string | null, filename?: string | null) {
  return isVideoMimeType(mimeType) || isVideoMimeType(mimeTypeForFilename(filename));
}

type MediaAssetLike = Pick<VideoDoc, "mimeType"> & {
  assetClass?: AssetClass | null;
};

export function isImageAsset(asset: MediaAssetLike) {
  if (asset.assetClass && asset.assetClass !== "VID") return true;
  return isImageMimeType(asset.mimeType);
}

export function isVideoAsset(asset: MediaAssetLike) {
  if (asset.assetClass && asset.assetClass !== "VID") return false;
  return asset.assetClass === "VID" || isVideoMimeType(asset.mimeType);
}

export function mediaKind(asset: MediaAssetLike): MediaKind {
  if (isImageAsset(asset)) return "image";
  if (isVideoAsset(asset)) return "video";
  return "other";
}

export function mediaKindLabel(asset: MediaAssetLike) {
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

export function assetClassForFileType(
  mimeType?: string | null,
  filename?: string | null,
): AssetClass {
  return isVideoFileType(mimeType, filename) ? "VID" : "IMG";
}

export function assetClassLabel(assetClass?: AssetClass | null) {
  return assetClass ? ASSET_CLASS_LABELS[assetClass] : "Media";
}
