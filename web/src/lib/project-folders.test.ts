import { expect, test } from 'bun:test';
import { transitionFolderState, type FolderState } from './project-folders';
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
