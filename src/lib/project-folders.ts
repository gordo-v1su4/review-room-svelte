export type ProjectFolder = Readonly<{ id: string; projectId: string; title: string; order: number; parentFolderId?: string; coverAssetId?: string; coverImageUrl?: string }>;
export function folderAncestors(folders: readonly ProjectFolder[], folderId?: string | null): ProjectFolder[] {
  const result: ProjectFolder[] = [];
  const seen = new Set<string>();
  let folder = folders.find(item => item.id === folderId);
  while (folder && !seen.has(folder.id)) {
    seen.add(folder.id); result.unshift(folder);
    folder = folders.find(item => item.id === folder!.parentFolderId && item.projectId === folder!.projectId);
  }
  return result;
}
export function folderPath(folders: readonly ProjectFolder[], folderId: string): string {
  return folderAncestors(folders, folderId).map(folder => folder.title).join(' / ');
}
export type AssetPlacement = Readonly<{ projectId: string; folderId?: string; archived?: boolean }>;
export type FolderState = Readonly<{ folders: readonly ProjectFolder[]; placements: Readonly<Record<string, AssetPlacement>> }>;
export type FolderAccess = Readonly<{ isAdmin: boolean; editableProjectIds: readonly string[]; memberProjectIds?: readonly string[] }>;
type CoverAsset = Readonly<{ id: string; projectId?: string; folderId?: string; archived?: boolean; type: 'image' | 'video'; importedAt: number; url: string; poster?: string }>;
/** Resolves local presentation URLs; persistent covers remain storage keys in the live adapter. */
export function folderCoverUrl(folder: ProjectFolder, assets: readonly CoverAsset[]): string | undefined {
  if (folder.coverImageUrl) return folder.coverImageUrl;
  const eligible = assets.filter(asset => asset.projectId === folder.projectId && !asset.archived);
  const explicit = eligible.find(asset => asset.id === folder.coverAssetId);
  if (explicit) return explicit.type === 'image' ? explicit.url : explicit.poster;
  const newest = eligible.filter(asset => asset.folderId === folder.id).sort((a, b) => b.importedAt - a.importedAt);
  const image = newest.find(asset => asset.type === 'image');
  return image?.url ?? newest.find(asset => asset.poster)?.poster;
}
export type FolderAction =
  | { type: 'create'; id: string; projectId: string; title: string; parentFolderId?: string }
  | { type: 'reparent'; folderId: string; parentFolderId?: string }
  | { type: 'rename'; folderId: string; title: string }
  | { type: 'move'; assetIds: readonly string[]; projectId: string; folderId?: string }
  | { type: 'register'; assetIds: readonly string[]; projectId: string; folderId?: string; dateFolder?: { id: string; dateKey: string } }
  | { type: 'restore'; assetIds: readonly string[]; projectId: string }
  | { type: 'remove'; folderId: string; disposition: 'move_to_root' | 'archive_assets' }
  | { type: 'cover-image'; folderId: string; url?: string }
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
  const parentId = 'parentFolderId' in action ? action.parentFolderId : undefined;
  if (parentId !== undefined) {
    const parent = state.folders.find(item => item.id === validId(parentId));
    if (!parent || parent.projectId !== projectId) throw new Error('Parent folder not found in project');
    if (folder && folderAncestors(state.folders, parentId).some(item => item.id === folder.id)) throw new Error('A folder cannot contain itself');
  }
  const duplicateSibling = (title: string, parentFolderId?: string) => state.folders.some(item => item.id !== folder?.id && item.projectId === projectId && item.parentFolderId === parentFolderId && item.title.trim().toLowerCase() === title.trim().toLowerCase());
  if (action.type === 'create') {
    validId(action.id);
    if (state.folders.some(folder => folder.id === action.id)) throw new Error('Folder ID already exists');
    const title = titleOf(action.title);
    if (duplicateSibling(title, action.parentFolderId)) throw new Error('A folder with that name already exists');
    const order = state.folders.filter(folder => folder.projectId === projectId).reduce((max, folder) => Math.max(max, folder.order), 0) + 1;
    return { ...state, folders: [...state.folders, { id: action.id, projectId, title, order, ...(action.parentFolderId ? { parentFolderId: action.parentFolderId } : {}) }] };
  }
  if (action.type === 'reparent') {
    if (duplicateSibling(folder!.title, action.parentFolderId)) throw new Error('A folder with that name already exists');
    const order = state.folders.filter(item => item.id !== folder!.id && item.projectId === projectId && item.parentFolderId === action.parentFolderId).reduce((max, item) => Math.max(max, item.order), 0) + 1;
    return { ...state, folders: state.folders.map(item => { if (item.id !== folder!.id) return item; const { parentFolderId: _old, ...rest } = item; return { ...rest, order, ...(action.parentFolderId ? { parentFolderId: action.parentFolderId } : {}) }; }) };
  }
  if (action.type === 'register') {
    const ids = [...new Set(action.assetIds.map(validId))];
    if (ids.some(id => Object.hasOwn(state.placements, id))) throw new Error('Asset already registered');
    if (!ids.length) return state;
    let folders = state.folders;
    let folderId = action.folderId;
    if (action.dateFolder && !/^\d{8}$/.test(action.dateFolder.dateKey)) throw new Error('Upload date must be YYYYMMDD');
    if (folderId === undefined && action.dateFolder) {
      const { id, dateKey } = action.dateFolder;
      folderId = folders.find(item => item.projectId === projectId && !item.parentFolderId && item.title === dateKey)?.id;
      if (!folderId) {
        validId(id);
        if (folders.some(item => item.id === id)) throw new Error('Folder ID already exists');
        const order = folders.filter(item => item.projectId === projectId).reduce((max, item) => Math.max(max, item.order), 0) + 1;
        folders = [...folders, { id, projectId, title: dateKey, order }];
        folderId = id;
      }
    }
    return { folders, placements: { ...state.placements, ...Object.fromEntries(ids.map(id => [id, { projectId, ...(folderId === undefined ? {} : { folderId }) }])) } };
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
    if (duplicateSibling(title, folder!.parentFolderId)) throw new Error('A folder with that name already exists');
    return { ...state, folders: state.folders.map(item => item.id === folder!.id ? { ...item, title } : item) };
  }
  if (action.type === 'cover-image') {
    if (action.url !== undefined && !action.url.startsWith('blob:')) throw new Error('Choose a local cover image');
    return { ...state, folders: state.folders.map(item => {
      if (item.id !== folder!.id) return item;
      const { coverImageUrl: _oldCover, coverAssetId: _oldAsset, ...rest } = item;
      return { ...rest, ...(action.url === undefined ? {} : { coverImageUrl: action.url }) };
    }) };
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
    if (state.folders.some(item => item.parentFolderId === folder!.id)) throw new Error('Move or delete this folder’s subfolders first');
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
