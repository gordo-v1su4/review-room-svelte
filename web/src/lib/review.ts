import type { CreativeMetadata } from './asset-metadata';
export type LocalAsset = { id: string; name: string; url: string; poster?: string; type: 'video' | 'image'; size: number; sourceFile: File; assetClass: 'VID' | 'IMG' | 'CTX' | 'STB'; importedAt: number; tags: string[]; assetCode: string; duration?: number; width?: number; height?: number; fps?: number; codec?: string; metadata?: CreativeMetadata };
export function openLocalAsset(file: File): LocalAsset {
  if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) throw new Error('Choose a video or image file.');
  const isVideo = file.type.startsWith('video/');
  return { id: crypto.randomUUID(), name: file.name, url: URL.createObjectURL(file), type: isVideo ? 'video' : 'image', size: file.size, sourceFile: file, assetClass: isVideo ? 'VID' : 'IMG', importedAt: Date.now(), tags: [], assetCode: '' };
}
