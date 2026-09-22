import { expect, test } from 'bun:test';
import { transitionSelection } from './media-selection';

test('checked assets toggle independently and Shift replaces with visible range', () => {
  const initial = { ids: ['hidden'], anchorId: null };
  const a = transitionSelection(initial, { type: 'click', id: 'b', visibleIds: ['a', 'b', 'c', 'd'], metaKey: true });
  expect(a.ids).toEqual(['hidden', 'b']);
  const range = transitionSelection(a, { type: 'click', id: 'd', visibleIds: ['a', 'b', 'c', 'd'], shiftKey: true });
  expect(range.ids).toEqual(['b', 'c', 'd']);
  expect(transitionSelection(range, { type: 'click', id: 'c', visibleIds: ['a', 'b', 'c', 'd'], ctrlKey: true }).ids).toEqual(['b', 'd']);
  expect(initial).toEqual({ ids: ['hidden'], anchorId: null });
});

test('visible/all selection replaces checked ids and reconciliation removes deleted anchors', () => {
  const state = { ids: ['hidden', 'deleted'], anchorId: 'deleted' };
  expect(transitionSelection(state, { type: 'select-visible', visibleIds: ['b', 'a', 'b'] })).toEqual({ ids: ['b', 'a'], anchorId: null });
  expect(transitionSelection(state, { type: 'select-all', allIds: ['hidden', 'a', 'b'] }).ids).toEqual(['hidden', 'a', 'b']);
  expect(transitionSelection(state, { type: 'reconcile', allIds: ['hidden', 'a'] })).toEqual({ ids: ['hidden'], anchorId: null });
  expect(transitionSelection(state, { type: 'select-visible', visibleIds: [] }).ids).toEqual([]);
  expect(transitionSelection(state, { type: 'clear' })).toEqual({ ids: [], anchorId: null });
});

test('batch controls follow project and share review permissions', async () => {
  const { selectionPermissions } = await import('./media-selection');
  expect(selectionPermissions({ kind: 'none' })).toEqual({ rate: false, shortlist: false, statuses: [] });
  expect(selectionPermissions({ kind: 'project', memberRole: 'viewer' })).toEqual({ rate: true, shortlist: true, statuses: [] });
  expect(selectionPermissions({ kind: 'share' }).statuses).toEqual(['awaiting_review', 'in_progress', 'needs_changes', 'approved']);
  expect(selectionPermissions({ kind: 'project', memberRole: 'owner' }).statuses).toContain('final');
  expect(selectionPermissions({ kind: 'project', memberRole: 'owner' }).statuses).not.toContain('archived');
});

test('missing filtered anchor falls back to clicked asset; stale clicks do nothing', () => {
  const state = { ids: ['hidden'], anchorId: 'hidden' };
  expect(transitionSelection(state, { type: 'click', id: 'b', visibleIds: ['a', 'b'], shiftKey: true }).ids).toEqual(['b']);
  expect(transitionSelection(state, { type: 'click', id: 'gone', visibleIds: ['a', 'b'], metaKey: true })).toBe(state);
  expect(transitionSelection(state, { type: 'reconcile', allIds: ['hidden', 'a', 'b'] })).toBe(state);
});
