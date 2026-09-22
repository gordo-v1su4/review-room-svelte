export type LocalAsset = { id: string; name: string; url: string; poster?: string; type: 'video' | 'image'; size: number; sourceFile: File };
export function openLocalAsset(file: File): LocalAsset {
  if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) throw new Error('Choose a video or image file.');
  return { id: crypto.randomUUID(), name: file.name, url: URL.createObjectURL(file), type: file.type.startsWith('video/') ? 'video' : 'image', size: file.size, sourceFile: file };
}
