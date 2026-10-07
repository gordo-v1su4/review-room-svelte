import type { CreativeMetadata } from './asset-metadata';
export type ReviewAsset = { versionId?: string; metadataUpdatedAt?: number | null; availability?: 'queued' | 'running' | 'error' | 'ready'; id: string; name: string; url: string; poster?: string; sprite?: string; type: 'video' | 'image'; size: number; sourceFile: Pick<File, 'name' | 'type'>; assetClass: 'VID' | 'IMG' | 'CTX' | 'STB'; importedAt: number; tags: string[]; assetCode: string; duration?: number; width?: number; height?: number; fps?: number; codec?: string; metadata?: CreativeMetadata };
export type LocalAsset = ReviewAsset & { sourceFile: File };
export function openLocalAsset(file: File): LocalAsset {
  // Keep the original upload format contract when OS file pickers omit MIME data.
  // Recognition only admits a candidate; prepareLocalImport validates decoding.
  const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|avi|mkv)$/i.test(file.name);
  const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(file.name);
  if (!isVideo && !isImage) throw new Error('Choose a video or image file.');
  return { id: crypto.randomUUID(), name: file.name, url: URL.createObjectURL(file), type: isVideo ? 'video' : 'image', size: file.size, sourceFile: file, assetClass: isVideo ? 'VID' : 'IMG', importedAt: Date.now(), tags: [], assetCode: '' };
}
