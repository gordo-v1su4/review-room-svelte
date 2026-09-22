import { expect, test } from 'bun:test';
import { collectionIsConfigured, queryCollectionAssets, transitionCollectionState, type CollectionAccess, type CollectionState, type ProjectCollection } from './collections';
import type { WorkspaceAsset, WorkspaceFilterState } from './workspace';

const owner: CollectionAccess = { projectRoles: { studio: 'owner' } };
const empty: CollectionState = { collections: [] };
const defaults: WorkspaceFilterState = { search: '', tags: [], statuses: [], assetClasses: [], selectedOnly: false, minRating: 0, hasComments: false, sort: 'newest', groupBy: 'none' };
const folders = [{ id: 'finals', projectId: 'studio', title: 'Finals', order: 1 }, { id: 'foreign', projectId: 'other', title: 'Other', order: 1 }];
const assets: (WorkspaceAsset & { projectId: string; archived?: boolean })[] = [
  { id: 'night', projectId: 'studio', folderId: 'finals', name: 'Night cut', status: 'approved', rating: 5, shortlisted: true, type: 'video', tags: ['Night'], importedAt: 1 },
  { id: 'day', projectId: 'studio', folderId: 'finals', name: 'Day still', status: 'needs_changes', rating: 3, shortlisted: false, type: 'image', tags: ['Day'], importedAt: 2 },
  { id: 'root', projectId: 'studio', name: 'Root cut', status: 'approved', rating: 4, shortlisted: true, type: 'video', tags: ['Night'], importedAt: 3 },
  { id: 'foreign', projectId: 'other', folderId: 'finals', name: 'Foreign cut', status: 'approved', rating: 5, shortlisted: true, type: 'video', tags: ['Night'], importedAt: 4 },
  { id: 'archived', projectId: 'studio', folderId: 'finals', name: 'Archived cut', status: 'archived', archived: true, rating: 4, shortlisted: false, type: 'video', tags: ['Night'], importedAt: 5 },
];
const collection: ProjectCollection = { id: 'cuts', projectId: 'studio', title: 'Cuts', kind: 'user' };

test('owners and editors can create, rename and delete their project collections without changing previous state', () => {
  const created = transitionCollectionState(empty, { type: 'create', id: 'cuts', projectId: 'studio', title: '  Cuts  ' }, owner, []);
  expect(created.collections).toEqual([{ id: 'cuts', projectId: 'studio', title: 'Cuts', kind: 'user' }]);
  const renamed = transitionCollectionState(created, { type: 'rename', collectionId: 'cuts', title: '  ' }, { projectRoles: { studio: 'editor' } }, []);
  expect(renamed.collections[0].title).toBe('Untitled Collection');
  const removed = transitionCollectionState(renamed, { type: 'remove', collectionId: 'cuts' }, owner, []);
  expect(removed.collections).toEqual([]);
  expect(created.collections[0].title).toBe('Cuts');
  expect(empty.collections).toEqual([]);
  for (const access of [{ projectRoles: { studio: 'viewer' } }, { projectRoles: { other: 'owner' } }, { projectRoles: {} }] as CollectionAccess[]) {
    expect(() => transitionCollectionState(empty, { type: 'create', id: 'cuts', projectId: 'studio', title: 'Cuts' }, access, [])).toThrow('Project editor required');
    expect(() => transitionCollectionState(created, { type: 'remove', collectionId: 'cuts' }, access, [])).toThrow('Project editor required');
  }
});

test('an unconfigured collection stays empty while folder-only and media-type-only collections match their project', () => {
  expect(collectionIsConfigured(collection)).toBe(false);
  expect(queryCollectionAssets(collection, assets)).toEqual([]);
  const sortingOnly = { ...collection, filters: { ...defaults, sort: 'rating' as const, groupBy: 'status' as const } };
  expect(collectionIsConfigured(sortingOnly)).toBe(false);
  expect(queryCollectionAssets(sortingOnly, assets)).toEqual([]);
  expect(collectionIsConfigured({ ...collection, sourceFolderId: 'finals' })).toBe(true);
  expect(queryCollectionAssets({ ...collection, sourceFolderId: 'finals' }, assets).map(asset => asset.id)).toEqual(['night', 'day']);
  expect(queryCollectionAssets({ ...collection, mediaType: 'image' }, assets).map(asset => asset.id)).toEqual(['day']);
  expect(queryCollectionAssets({ ...collection, sourceFolderId: 'removed' }, assets)).toEqual([]);
});

test('saving settings validates the source folder and snapshots filters independently of later input changes', () => {
  const created = transitionCollectionState(empty, { type: 'create', id: 'cuts', projectId: 'studio', title: 'Cuts' }, owner, folders);
  const tags = ['Night'];
  const filters = { ...defaults, tags };
  const saved = transitionCollectionState(created, { type: 'settings', collectionId: 'cuts', sourceFolderId: 'finals', filters, mediaType: 'video' }, owner, folders);
  tags.push('Day'); filters.search = 'Changed';
  expect(saved.collections[0]).toEqual({ id: 'cuts', projectId: 'studio', title: 'Cuts', kind: 'user', sourceFolderId: 'finals', filters: { ...defaults, tags: ['Night'] }, mediaType: 'video' });
  expect(created.collections[0].filters).toBeUndefined();
  for (const sourceFolderId of ['foreign', 'missing']) {
    expect(() => transitionCollectionState(saved, { type: 'settings', collectionId: 'cuts', sourceFolderId, filters: defaults }, owner, folders)).toThrow('Folder not found');
  }
  expect(() => transitionCollectionState(saved, { type: 'settings', collectionId: 'cuts', filters: defaults }, { projectRoles: { studio: 'viewer' } }, folders)).toThrow('Project editor required');
  const cleared = transitionCollectionState(saved, { type: 'settings', collectionId: 'cuts', filters: { ...defaults, tags: ['Night'] } }, owner, folders);
  expect(cleared.collections[0].sourceFolderId).toBeUndefined();
  expect(cleared.collections[0].mediaType).toBeUndefined();
  expect(saved.collections[0].sourceFolderId).toBe('finals');
});

test('saving an empty definition gives an actionable error and leaves the configured collection intact', () => {
  const state = { collections: [{ ...collection, sourceFolderId: 'finals' }] };
  expect(() => transitionCollectionState(state, { type: 'settings', collectionId: 'cuts', filters: { ...defaults, sort: 'rating', groupBy: 'status' } }, owner, folders)).toThrow('Choose a source folder or set at least one filter.');
  expect(state.collections[0].sourceFolderId).toBe('finals');
});

test('saved folder and rules combine and respond to current tags, review status and media moves', () => {
  const saved = { ...collection, sourceFolderId: 'finals', filters: { ...defaults, tags: ['Night'], statuses: ['approved' as const] } };
  const before = structuredClone(assets);
  expect(queryCollectionAssets(saved, assets).map(asset => asset.id)).toEqual(['night']);
  const changed = assets.map(asset => asset.id === 'night' ? { ...asset, status: 'needs_changes' as const } : asset.id === 'day' ? { ...asset, tags: ['Night'], status: 'approved' as const } : asset);
  expect(queryCollectionAssets(saved, changed).map(asset => asset.id)).toEqual(['day']);
  expect(queryCollectionAssets(saved, changed.map(asset => asset.id === 'day' ? { ...asset, folderId: undefined } : asset))).toEqual([]);
  expect(assets).toEqual(before);
  const removed = transitionCollectionState({ collections: [saved] }, { type: 'remove', collectionId: 'cuts' }, owner, folders);
  expect(removed.collections).toEqual([]);
  expect(assets).toEqual(before);
});

test('saved archive and shortlist criteria reuse the explorer query without leaking other projects', () => {
  const archived = { ...collection, filters: { ...defaults, statuses: ['archived' as const] } };
  expect(queryCollectionAssets(archived, assets).map(asset => asset.id)).toEqual(['archived']);
  const shortlist = { ...collection, filters: { ...defaults, selectedOnly: true, minRating: 5 } };
  expect(queryCollectionAssets(shortlist, assets).map(asset => asset.id)).toEqual(['night']);
  const stills = { ...collection, filters: { ...defaults, assetClasses: ['IMG' as const] } };
  expect(queryCollectionAssets(stills, assets).map(asset => asset.id)).toEqual(['day']);
});
