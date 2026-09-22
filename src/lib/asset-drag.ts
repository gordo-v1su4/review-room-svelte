import type { FolderAccess, FolderAction, FolderState } from './project-folders';

export type AssetDrag = Readonly<{ projectId: string; assetIds: readonly string[] }>;
export const ASSET_DRAG_TYPE = 'application/x-review-room-assets';

export function beginAssetDrag(id: string, checked: readonly string[], visible: readonly string[], state: FolderState): AssetDrag | null {
  const source = state.placements[id];
  if (!source || source.archived || !visible.includes(id)) return null;
  const assetIds = [...new Set(checked.includes(id) ? checked.filter(item => visible.includes(item)) : [id])];
  if (assetIds.some(item => !state.placements[item] || state.placements[item].archived || state.placements[item].projectId !== source.projectId)) return null;
  return { projectId: source.projectId, assetIds };
}

/** Revalidate against current placements and access at drop time, not just drag start. */
export function folderDropAction(drag: AssetDrag | null, projectId: string, folderId: string | null, state: FolderState, access: FolderAccess): Extract<FolderAction, { type: 'move' }> | null {
  if (!drag?.assetIds.length || drag.projectId !== projectId || !access.isAdmin || !access.editableProjectIds.includes(projectId)) return null;
  if (folderId !== null && !state.folders.some(folder => folder.id === folderId && folder.projectId === projectId)) return null;
  if (drag.assetIds.some(id => !state.placements[id] || state.placements[id].archived || state.placements[id].projectId !== projectId)) return null;
  if (drag.assetIds.every(id => (state.placements[id].folderId ?? null) === folderId)) return null;
  return { type: 'move', projectId, folderId: folderId ?? undefined, assetIds: drag.assetIds };
}
