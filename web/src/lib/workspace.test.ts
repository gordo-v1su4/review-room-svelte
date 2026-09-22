import { describe, expect, test } from 'bun:test';
import { queryWorkspace, type WorkspaceAsset, type WorkspaceFilter } from './workspace';

const assets: WorkspaceAsset[] = [
  { id: 'b', name: 'Bravo', status: 'approved', rating: 4, shortlisted: true, type: 'video' },
  { id: 'a', name: 'Alpha', status: 'needs_changes', rating: 2, shortlisted: false, type: 'image' },
  { id: 'c', name: 'Charlie', status: 'final', rating: 5, shortlisted: false, type: 'video' },
];

describe('workspace query interface', () => {
  test('an explicitly empty visible set returns no assets', () => {
    expect(queryWorkspace(assets, { visibleIds: [] })).toEqual([]);
  });
  test('filters by full workflow status, media type, shortlist, rating, and search', () => {
    const filter: WorkspaceFilter = {
      search: 'br', statuses: ['approved'], shortlisted: true, minRating: 4, mediaTypes: ['video'],
    };
    expect(queryWorkspace(assets, filter).map((asset) => asset.id)).toEqual(['b']);
  });

  test('sorts without mutating the caller asset order', () => {
    const original = assets.map((asset) => asset.id);
    expect(queryWorkspace(assets, { sort: 'name' }).map((asset) => asset.id)).toEqual(['a', 'b', 'c']);
    expect(assets.map((asset) => asset.id)).toEqual(original);
  });

  test('supports status and rating sorting with stable ties', () => {
    expect(queryWorkspace(assets, { sort: 'rating' }).map((asset) => asset.id)).toEqual(['c', 'b', 'a']);
    expect(queryWorkspace(assets, { sort: 'status' }).map((asset) => asset.id)).toEqual(['a', 'b', 'c']);
  });

  test('returns visible ids through the same public query interface', () => {
    expect(queryWorkspace(assets, { visibleIds: ['c', 'a'] }).map((asset) => asset.id)).toEqual(['a', 'c']);
  });
});
