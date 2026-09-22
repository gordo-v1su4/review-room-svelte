import type { ProjectFolder } from './project-folders';
import { queryWorkspace, type WorkspaceAsset, type WorkspaceFilterState, type WorkspaceMediaType } from './workspace';

export type ProjectCollection = Readonly<{
  id: string;
  projectId: string;
  title: string;
  kind: 'user';
  sourceFolderId?: string;
  filters?: WorkspaceFilterState;
  mediaType?: WorkspaceMediaType;
}>;
export type CollectionState = Readonly<{ collections: readonly ProjectCollection[] }>;
/** Roles are resolved by the adapter; live writes still require authoritative server checks. */
export type CollectionAccess = Readonly<{ projectRoles: Readonly<Record<string, 'owner' | 'editor' | 'viewer'>> }>;
export type CollectionAction =
  | { type: 'create'; id: string; projectId: string; title: string }
  | { type: 'rename'; collectionId: string; title: string }
  | { type: 'settings'; collectionId: string; sourceFolderId?: string; filters: WorkspaceFilterState; mediaType?: WorkspaceMediaType }
  | { type: 'remove'; collectionId: string };

export function collectionIsConfigured(collection: ProjectCollection): boolean {
  const filters = collection.filters;
  return !!(collection.sourceFolderId || collection.mediaType || (filters && (
    filters.search.trim() || filters.tags.length || filters.statuses.length || filters.assetClasses.length ||
    filters.selectedOnly || filters.minRating > 0 || filters.hasComments
  )));
}

/** Re-evaluates saved criteria against current metadata; never captures a fixed asset list. */
export function queryCollectionAssets<T extends WorkspaceAsset & { projectId: string; archived?: boolean }>(collection: ProjectCollection, assets: readonly T[]): T[] {
  if (!collectionIsConfigured(collection)) return [];
  const filters = collection.filters;
  const candidates = assets.filter(asset => asset.projectId === collection.projectId &&
    (!collection.sourceFolderId || asset.folderId === collection.sourceFolderId) &&
    (filters?.statuses.includes('archived') || (!asset.archived && asset.status !== 'archived')));
  return queryWorkspace(candidates, {
    ...filters,
    shortlisted: filters?.selectedOnly ? true : undefined,
    mediaTypes: collection.mediaType ? [collection.mediaType] : undefined,
  });
}

function validId(id: string): string {
  if (!id.trim() || id !== id.trim()) throw new Error('Invalid ID');
  return id;
}

/** Local saved queries, independent of media ownership or asset mutation. */
export function transitionCollectionState(state: CollectionState, action: CollectionAction, access: CollectionAccess, folders: readonly ProjectFolder[]): CollectionState {
  const collection = 'collectionId' in action ? state.collections.find(item => item.id === validId(action.collectionId)) : undefined;
  if ('collectionId' in action && !collection) throw new Error('Collection not found');
  const projectId = action.type === 'create' ? validId(action.projectId) : collection!.projectId;
  const role = Object.hasOwn(access.projectRoles, projectId) ? access.projectRoles[projectId] : undefined;
  if (role !== 'owner' && role !== 'editor') throw new Error('Project editor required');
  if (action.type === 'create') {
    validId(action.id);
    if (state.collections.some(item => item.id === action.id)) throw new Error('Collection ID already exists');
    return { collections: [...state.collections, { id: action.id, projectId, title: action.title.trim() || 'Untitled Collection', kind: 'user' }] };
  }
  if (action.type === 'rename') return { collections: state.collections.map(item => item.id === collection!.id ? { ...item, title: action.title.trim() || 'Untitled Collection' } : item) };
  if (action.type === 'settings') {
    if (action.sourceFolderId !== undefined && !folders.some(folder => folder.id === action.sourceFolderId && folder.projectId === projectId)) throw new Error('Folder not found');
    const filters: WorkspaceFilterState = { ...action.filters, tags: [...action.filters.tags], statuses: [...action.filters.statuses], assetClasses: [...action.filters.assetClasses] };
    const { sourceFolderId: _oldFolder, filters: _oldFilters, mediaType: _oldType, ...identity } = collection!;
    const updated = { ...identity, filters, ...(action.sourceFolderId === undefined ? {} : { sourceFolderId: action.sourceFolderId }), ...(action.mediaType === undefined ? {} : { mediaType: action.mediaType }) };
    if (!collectionIsConfigured(updated)) throw new Error('Choose a source folder or set at least one filter.');
    return { collections: state.collections.map(item => item.id === collection!.id ? updated : item) };
  }
  return { collections: state.collections.filter(item => item.id !== collection!.id) };
}
