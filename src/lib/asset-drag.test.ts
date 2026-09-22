import { expect, test } from 'bun:test';
import { beginAssetDrag, folderDropAction } from './asset-drag';
import type { FolderState } from './project-folders';

const state: FolderState = { folders: [{ id: 'cuts', projectId: 'p', title: 'Cuts', order: 0 }], placements: { a: { projectId: 'p' }, b: { projectId: 'p' }, c: { projectId: 'q' }, archived: { projectId: 'p', archived: true } } };
const access = { isAdmin: true, editableProjectIds: ['p', 'q'] };
test('dragging a checked card moves only visible checked assets; an unchecked card moves alone', () => {
  expect(beginAssetDrag('a', ['a', 'b', 'c'], ['a', 'b'], state)?.assetIds).toEqual(['a', 'b']);
  expect(beginAssetDrag('b', ['a'], ['a', 'b'], state)?.assetIds).toEqual(['b']);
  expect(beginAssetDrag('c', ['c'], ['a', 'b'], state)).toBeNull();
  expect(beginAssetDrag('archived', [], ['archived'], state)).toBeNull();
});
test('drop rejects cross-project, stale, archived and unauthorized destinations', () => {
  const drag = beginAssetDrag('a', [], ['a'], state)!;
  expect(folderDropAction(drag, 'q', null, state, access)).toBeNull();
  expect(folderDropAction(drag, 'p', 'missing', state, access)).toBeNull();
  expect(folderDropAction(drag, 'p', 'cuts', state, { ...access, isAdmin: false })).toBeNull();
  expect(folderDropAction(drag, 'p', 'cuts', state, { ...access, editableProjectIds: [] })).toBeNull();
  expect(folderDropAction(drag, 'p', 'cuts', { ...state, placements: {} }, access)).toBeNull();
  expect(folderDropAction(drag, 'p', 'cuts', { ...state, placements: { a: { projectId: 'p', archived: true } } }, access)).toBeNull();
});
test('real folder and project root drops resolve moves while same-location drops do nothing', () => {
  const drag = beginAssetDrag('a', [], ['a'], state)!;
  expect(folderDropAction(drag, 'p', 'cuts', state, access)).toEqual({ type: 'move', projectId: 'p', folderId: 'cuts', assetIds: ['a'] });
  expect(folderDropAction(drag, 'p', null, state, access)).toBeNull();
  const moved = { ...state, placements: { a: { projectId: 'p', folderId: 'cuts' } } };
  expect(folderDropAction(drag, 'p', null, moved, access)).toEqual({ type: 'move', projectId: 'p', folderId: undefined, assetIds: ['a'] });
});
