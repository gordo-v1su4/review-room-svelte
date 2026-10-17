import { expect, test } from 'bun:test';
import { canDropFolder, folderTreeRows, loadCollapsed, revealFolder, saveCollapsed } from './folder-tree';
import type { ProjectFolder } from './project-folders';

const folders: ProjectFolder[] = [
  { id: 'ep', projectId: 'p', title: 'EP101 — The Late Shift', order: 1, locked: true },
  { id: 'sc', projectId: 'p', title: '010 PAR — Parking Lot', order: 1, parentFolderId: 'ep', locked: true },
  { id: 'shot', projectId: 'p', title: 'Takes', order: 1, parentFolderId: 'sc', locked: true },
  { id: 'a', projectId: 'p', title: 'Selects', order: 2 },
  { id: 'b', projectId: 'p', title: 'Pickups', order: 3, parentFolderId: 'a' },
  { id: 'orphan', projectId: 'p', title: 'Orphan', order: 4, parentFolderId: 'missing' },
];

test('tree rows nest three levels deep in order and hide collapsed descendants', () => {
  const rows = folderTreeRows(folders, new Set());
  expect(rows.map(row => [row.folder.id, row.depth, row.hasChildren])).toEqual([
    ['ep', 0, true], ['sc', 1, true], ['shot', 2, false], ['a', 0, true], ['b', 1, false], ['orphan', 0, false]]);
  const collapsed = folderTreeRows(folders, new Set(['sc']));
  expect(collapsed.map(row => row.folder.id)).toEqual(['ep', 'sc', 'a', 'b', 'orphan']);
  expect(collapsed.find(row => row.folder.id === 'sc')?.expanded).toBe(false);
  expect(folderTreeRows(folders, new Set(['ep'])).map(row => row.folder.id)).toEqual(['ep', 'a', 'b', 'orphan']);
});

test('cyclic legacy folders are shown once without looping', () => {
  const cyclic = [{ id: 'x', title: 'X', parentFolderId: 'y' }, { id: 'y', title: 'Y', parentFolderId: 'x' }];
  expect(folderTreeRows(cyclic, new Set()).map(row => row.folder.id).sort()).toEqual(['x', 'y']);
});

test('normal folders drop onto other normal folders or the root; locked folders never move', () => {
  expect(canDropFolder(folders, 'b', null)).toBe(true);
  expect(canDropFolder(folders, 'a', 'orphan')).toBe(true);
  expect(canDropFolder(folders, 'b', 'a')).toBe(false); // already there
  expect(canDropFolder(folders, 'a', 'b')).toBe(false); // into its own descendant
  expect(canDropFolder(folders, 'a', 'a')).toBe(false);
  expect(canDropFolder(folders, 'a', 'ep')).toBe(false); // into a locked folder
  expect(canDropFolder(folders, 'sc', null)).toBe(false); // locked folder
  expect(canDropFolder([...folders, { id: 'q', projectId: 'other', title: 'Q', order: 1 }], 'a', 'q')).toBe(false);
});

test('revealing a folder opens its ancestors only', () => {
  expect([...revealFolder(new Set(['ep', 'sc', 'shot', 'a']), folders, 'shot')].sort()).toEqual(['a', 'shot']);
  expect([...revealFolder(new Set(['ep']), folders, null)]).toEqual(['ep']);
});

test('collapsed state is remembered per project and tolerates bad or blocked storage', () => {
  const data = new Map<string, string>();
  const store = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  saveCollapsed(store, 'p1', ['ep', 'ep', 'sc']);
  saveCollapsed(store, 'p2', ['x']);
  expect(loadCollapsed(store, 'p1')).toEqual(['ep', 'sc']);
  expect(loadCollapsed(store, 'p2')).toEqual(['x']);
  data.set('review-room.folder-tree.v1.p3', '{"not":"a list"}');
  expect(loadCollapsed(store, 'p3')).toEqual([]);
  data.set('review-room.folder-tree.v1.p4', 'not json');
  expect(loadCollapsed(store, 'p4')).toEqual([]);
  const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  expect(loadCollapsed(blocked, 'p1')).toEqual([]);
  expect(() => saveCollapsed(blocked, 'p1', ['a'])).not.toThrow();
  expect(loadCollapsed(undefined, 'p1')).toEqual([]);
});
