export type ProjectFolder = Readonly<{ id: string; projectId: string; title: string; order: number; coverAssetId?: string }>;
export type AssetPlacement = Readonly<{ projectId: string; folderId?: string; archived?: boolean }>;
export type FolderState = Readonly<{ folders: readonly ProjectFolder[]; placements: Readonly<Record<string, AssetPlacement>> }>;
export type FolderAccess = Readonly<{ isAdmin: boolean; editableProjectIds: readonly string[]; memberProjectIds?: readonly string[] }>;
export type FolderAction =
  | { type: 'create'; id: string; projectId: string; title: string }
  | { type: 'rename'; folderId: string; title: string }
  | { type: 'move' | 'register'; assetIds: readonly string[]; projectId: string; folderId?: string }
  | { type: 'restore'; assetIds: readonly string[]; projectId: string }
  | { type: 'remove'; folderId: string; disposition: 'move_to_root' | 'archive_assets' }
  | { type: 'cover'; folderId: string; assetId?: string };

const validId = (id: string) => { if (typeof id !== 'string' || !id.trim() || id !== id.trim()) throw new Error('Invalid ID'); return id; };
const titleOf = (title: string) => { const result = title.trim(); if (!result) throw new Error('Folder name is required'); return result; };
/** Local organization only; live adapters still require authoritative server access checks. */
export function transitionFolderState(state: FolderState, action: FolderAction, access: FolderAccess): FolderState {
  const folder = 'folderId' in action && action.folderId !== undefined ? state.folders.find(folder => folder.id === validId(action.folderId!)) : undefined;
  if ('folderId' in action && action.folderId !== undefined && !folder) throw new Error('Folder not found');
  const projectId = 'projectId' in action ? validId(action.projectId) : folder!.projectId;
  const allowed = action.type === 'register'
    ? access.editableProjectIds.includes(projectId) || !!access.memberProjectIds?.includes(projectId)
    : access.isAdmin && access.editableProjectIds.includes(projectId);
  if (!allowed) throw new Error('Project access required');
  if (folder && folder.projectId !== projectId) throw new Error('Folder belongs to another project');
  if (action.type === 'create') {
    validId(action.id);
    if (state.folders.some(folder => folder.id === action.id)) throw new Error('Folder ID already exists');
    const title = titleOf(action.title);
    const order = state.folders.filter(folder => folder.projectId === projectId).reduce((max, folder) => Math.max(max, folder.order), 0) + 1;
    return { ...state, folders: [...state.folders, { id: action.id, projectId, title, order }] };
  }
  if (action.type === 'register') {
    const ids = [...new Set(action.assetIds.map(validId))];
    if (ids.some(id => Object.hasOwn(state.placements, id))) throw new Error('Asset already registered');
    return { ...state, placements: { ...state.placements, ...Object.fromEntries(ids.map(id => [id, { projectId, ...(action.folderId === undefined ? {} : { folderId: action.folderId }) }])) } };
  }
  const asset = (id: string) => {
    validId(id);
    const placement = Object.hasOwn(state.placements, id) ? state.placements[id] : undefined;
    if (!placement || placement.projectId !== projectId) throw new Error('Asset not found in project');
    return placement;
  };
  if (action.type === 'move' || action.type === 'restore') {
    const ids = [...new Set(action.assetIds.map(validId))];
    ids.forEach(asset);
    const placements = { ...state.placements };
    for (const id of ids) {
      const previous = asset(id);
      if (action.type === 'restore') placements[id] = { ...previous, archived: false };
      else {
        const { folderId: _oldFolder, ...rest } = previous;
        placements[id] = { ...rest, ...(action.folderId === undefined ? {} : { folderId: action.folderId }) };
      }
    }
    return { ...state, placements };
  }
  if (action.type === 'rename') {
    const title = titleOf(action.title);
    if (state.folders.some(item => item.id !== folder!.id && item.projectId === projectId && item.title.trim().toLowerCase() === title.toLowerCase())) throw new Error('A folder with that name already exists');
    return { ...state, folders: state.folders.map(item => item.id === folder!.id ? { ...item, title } : item) };
  }
  if (action.type === 'cover') {
    if (action.assetId !== undefined && asset(action.assetId).archived) throw new Error('Archived asset cannot be a cover');
    return { ...state, folders: state.folders.map(item => {
      if (item.id !== folder!.id) return item;
      const { coverAssetId: _oldCover, ...rest } = item;
      return { ...rest, ...(action.assetId === undefined ? {} : { coverAssetId: action.assetId }) };
    }) };
  }
  if (action.type === 'remove') {
    const placements = Object.fromEntries(Object.entries(state.placements).map(([id, placement]) => {
      if (placement.projectId !== projectId || placement.folderId !== folder!.id) return [id, placement];
      const { folderId: _oldFolder, ...rest } = placement;
      return [id, { ...rest, ...(action.disposition === 'archive_assets' ? { archived: true } : {}) }];
    }));
    const folders = state.folders.filter(item => item.id !== folder!.id).map(item => {
      if (action.disposition === 'archive_assets' && item.projectId === projectId && item.coverAssetId && Object.hasOwn(state.placements, item.coverAssetId) && state.placements[item.coverAssetId]?.folderId === folder!.id) {
        const { coverAssetId: _oldCover, ...rest } = item;
        return rest;
      }
      return item;
    });
    return { folders, placements };
  }
  throw new Error('Unsupported folder action');
}
