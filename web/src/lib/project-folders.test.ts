import { expect, test } from 'bun:test';
import { transitionFolderState, folderCoverUrl, type FolderState } from './project-folders';
const admin = { isAdmin: true, editableProjectIds: ['p'] };
const empty: FolderState = { folders: [], placements: {} };
test('admin creates a flat folder and members register imports without folder management access', () => {
  const state = transitionFolderState(empty, { type: 'create', id: 'f', projectId: 'p', title: '  Rushes  ' }, admin);
  expect(state.folders).toEqual([{ id: 'f', projectId: 'p', title: 'Rushes', order: 1 }]);
  const member = { isAdmin: false, editableProjectIds: [], memberProjectIds: ['p'] };
  const imported = transitionFolderState(state, { type: 'register', projectId: 'p', assetIds: ['a'], folderId: 'f' }, member);
  expect(imported.placements.a).toEqual({ projectId: 'p', folderId: 'f' });
  expect(() => transitionFolderState(imported, { type: 'rename', folderId: 'f', title: 'New' }, member)).toThrow();
  expect(empty.folders).toEqual([]);
});
const populated: FolderState = { folders: [{ id: 'f', projectId: 'p', title: 'Rushes', order: 1 }, { id: 'g', projectId: 'p', title: 'Pickups', order: 2 }], placements: { a: { projectId: 'p', folderId: 'f' }, b: { projectId: 'p' }, foreign: { projectId: 'q' } } };
test('bulk move and cover reject foreign assets atomically; rename validates sibling names', () => {
  expect(() => transitionFolderState(populated, { type: 'move', assetIds: ['a', 'foreign'], projectId: 'p', folderId: 'g' }, admin)).toThrow();
  expect(populated.placements.a?.folderId).toBe('f');
  const moved = transitionFolderState(populated, { type: 'move', assetIds: ['a', 'b'], projectId: 'p', folderId: 'g' }, admin);
  expect(moved.placements.a?.folderId).toBe('g'); expect(moved.placements.b?.folderId).toBe('g');
  const covered = transitionFolderState(moved, { type: 'cover', folderId: 'g', assetId: 'a' }, admin);
  expect(covered.folders[1]?.coverAssetId).toBe('a');
  expect(() => transitionFolderState(moved, { type: 'cover', folderId: 'g', assetId: 'foreign' }, admin)).toThrow();
  expect(() => transitionFolderState(moved, { type: 'rename', folderId: 'g', title: ' rushes ' }, admin)).toThrow();
  expect(transitionFolderState(moved, { type: 'rename', folderId: 'g', title: ' Finals ' }, admin).folders[1]?.title).toBe('Finals');
});
test('folder removal moves to root or archives; restore recovers assets without resurrecting folder', () => {
  const rooted = transitionFolderState(populated, { type: 'remove', folderId: 'f', disposition: 'move_to_root' }, admin);
  expect(rooted.placements.a).toEqual({ projectId: 'p' });
  expect(rooted.folders.map(folder => folder.id)).toEqual(['g']);
  const archived = transitionFolderState(populated, { type: 'remove', folderId: 'f', disposition: 'archive_assets' }, admin);
  expect(archived.placements.a).toEqual({ projectId: 'p', archived: true });
  expect(archived.placements.b).toEqual({ projectId: 'p' });
  const restored = transitionFolderState(archived, { type: 'restore', projectId: 'p', assetIds: ['a'] }, admin);
  expect(restored.placements.a).toEqual({ projectId: 'p', archived: false });
  expect(restored.folders.map(folder => folder.id)).toEqual(['g']);
  expect(() => transitionFolderState(archived, { type: 'restore', projectId: 'p', assetIds: ['a', 'foreign'] }, admin)).toThrow();
});
test('permissions, names, IDs and registration are validated before any bulk mutation', () => {
  const denied = { isAdmin: false, editableProjectIds: ['p'] };
  expect(() => transitionFolderState(populated, { type: 'remove', folderId: 'f', disposition: 'archive_assets' }, denied)).toThrow();
  expect(() => transitionFolderState(populated, { type: 'move', projectId: 'p', assetIds: ['a'], folderId: 'g' }, { isAdmin: true, editableProjectIds: [] })).toThrow();
  expect(() => transitionFolderState(populated, { type: 'create', id: 'new', projectId: 'p', title: '  ' }, admin)).toThrow();
  expect(() => transitionFolderState(populated, { type: 'create', id: 'f', projectId: 'p', title: 'New' }, admin)).toThrow();
  expect(() => transitionFolderState(populated, { type: 'move', projectId: 'p', assetIds: ['a', 'missing'] }, admin)).toThrow();
  expect(() => transitionFolderState(populated, { type: 'register', projectId: 'p', assetIds: ['new', 'a'] }, admin)).toThrow();
  expect(Object.hasOwn(populated.placements, 'new')).toBe(false);
  expect(() => transitionFolderState(populated, { type: 'move', projectId: 'p', assetIds: ['a'], folderId: 'missing' }, admin)).toThrow();
  const duplicate = transitionFolderState(populated, { type: 'create', id: 'new', projectId: 'p', title: 'Rushes' }, admin);
  expect(duplicate.folders[2]?.order).toBe(3); // Backend create permits duplicate titles.
  const covered = transitionFolderState(populated, { type: 'cover', folderId: 'g', assetId: 'a' }, admin);
  expect(transitionFolderState(covered, { type: 'remove', folderId: 'f', disposition: 'archive_assets' }, admin).folders[0]?.coverAssetId).toBeUndefined();
});
test('root imports reuse a flat date folder per project without granting members folder management', () => {
  const member = { isAdmin: false, editableProjectIds: [], memberProjectIds: ['p'] };
  const first = transitionFolderState(empty, { type: 'register', projectId: 'p', assetIds: ['a'], dateFolder: { id: 'day', dateKey: '20260922' } }, member);
  expect(first.folders).toEqual([{ id: 'day', projectId: 'p', title: '20260922', order: 1 }]);
  expect(first.placements.a).toEqual({ projectId: 'p', folderId: 'day' });
  const second = transitionFolderState(first, { type: 'register', projectId: 'p', assetIds: ['b'], dateFolder: { id: 'unused', dateKey: '20260922' } }, member);
  expect(second.folders).toHaveLength(1);
  expect(second.placements.b?.folderId).toBe('day');
  expect(() => transitionFolderState(second, { type: 'create', id: 'manual', projectId: 'p', title: 'Manual' }, member)).toThrow('Project access required');
  const nextDay = transitionFolderState(second, { type: 'register', projectId: 'p', assetIds: ['c'], dateFolder: { id: 'tomorrow', dateKey: '20260923' } }, member);
  expect(nextDay.folders[1]).toEqual({ id: 'tomorrow', projectId: 'p', title: '20260923', order: 2 });
});
test('date import respects explicit destinations and leaves no folders behind on rejected or empty batches', () => {
  const dateFolder = { id: 'day', dateKey: '20260922' };
  const explicit = transitionFolderState(populated, { type: 'register', projectId: 'p', assetIds: ['new'], folderId: 'g', dateFolder }, admin);
  expect(explicit.placements.new?.folderId).toBe('g');
  expect(explicit.folders).toEqual(populated.folders);
  expect(transitionFolderState(empty, { type: 'register', projectId: 'p', assetIds: [], dateFolder }, admin)).toBe(empty);
  expect(() => transitionFolderState(populated, { type: 'register', projectId: 'p', assetIds: ['new', 'a'], dateFolder }, admin)).toThrow();
  expect(() => transitionFolderState(empty, { type: 'register', projectId: 'p', assetIds: ['new'], dateFolder }, { isAdmin: false, editableProjectIds: [] })).toThrow();
  expect(() => transitionFolderState(empty, { type: 'register', projectId: 'p', assetIds: ['new'], dateFolder: { id: 'day', dateKey: '2026-09-22' } }, admin)).toThrow('Upload date must be YYYYMMDD');
  const otherProject: FolderState = { folders: [{ id: 'foreign-day', projectId: 'q', title: '20260922', order: 99 }], placements: {} };
  const own = transitionFolderState(otherProject, { type: 'register', projectId: 'p', assetIds: ['new'], dateFolder }, admin);
  expect(own.placements.new?.folderId).toBe('day');
  expect(own.folders[1]?.order).toBe(1);
  expect(empty.folders).toEqual([]);
});
test('only an editable project admin can replace or reset a custom cover', () => {
  const action = { type: 'cover-image' as const, folderId: 'f', url: 'blob:chosen-cover' };
  expect(() => transitionFolderState(populated, action, { isAdmin: false, editableProjectIds: ['p'] })).toThrow('Project access required');
  expect(() => transitionFolderState(populated, action, { isAdmin: true, editableProjectIds: ['q'] })).toThrow('Project access required');
  const covered = transitionFolderState(populated, action, admin);
  expect(covered.folders[0]?.coverImageUrl).toBe('blob:chosen-cover');
  expect(populated.folders[0]?.coverImageUrl).toBeUndefined();
  const reset = transitionFolderState(covered, { type: 'cover-image', folderId: 'f' }, admin);
  expect(reset.folders[0]?.coverImageUrl).toBeUndefined();
  expect(reset.placements).toEqual(populated.placements);
  const legacy = transitionFolderState(populated, { type: 'cover', folderId: 'f', assetId: 'a' }, admin);
  expect(transitionFolderState(legacy, { type: 'cover-image', folderId: 'f' }, admin).folders[0]?.coverAssetId).toBeUndefined();
});

test('automatic cover prefers the newest image in the folder, then video posters, and ignores other folders and archived assets', () => {
  const folder = populated.folders[0]!;
  const image = { id: 'old', projectId: 'p', folderId: 'f', type: 'image' as const, importedAt: 1, url: 'blob:old-image' };
  const video = { ...image, id: 'video', type: 'video' as const, importedAt: 5, url: 'blob:video', poster: 'blob:poster' };
  const assets = [image, video, { ...image, id: 'new', importedAt: 2, url: 'blob:new-image' }, { ...image, id: 'foreign', projectId: 'q', importedAt: 9, url: 'blob:foreign' }, { ...image, id: 'moved', folderId: 'g', importedAt: 10, url: 'blob:moved' }, { ...image, id: 'archived', archived: true, importedAt: 11, url: 'blob:archived' }];
  expect(folderCoverUrl(folder, assets)).toBe('blob:new-image');
  expect(folderCoverUrl({ ...folder, coverImageUrl: 'blob:custom' }, assets)).toBe('blob:custom');
  expect(folderCoverUrl(folder, [video])).toBe('blob:poster');
  expect(folderCoverUrl(folder, [{ ...video, poster: undefined }])).toBeUndefined();
  expect(folderCoverUrl(folder, [])).toBeUndefined();
});
