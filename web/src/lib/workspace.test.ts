import { describe, expect, test } from 'bun:test';
import { groupWorkspaceAssets, queryWorkspace, type WorkspaceAsset, type WorkspaceFilter } from './workspace';

const assets: WorkspaceAsset[] = [
  { id: 'b', name: 'Bravo', status: 'approved', rating: 4, shortlisted: true, type: 'video', assetClass: 'VID', commentsCount: 2, importedAt: 2 },
  { id: 'a', name: 'Alpha', status: 'needs_changes', rating: 2, shortlisted: false, type: 'image', assetClass: 'IMG', commentsCount: 1, importedAt: 3 },
  { id: 'c', name: 'Charlie', status: 'final', rating: 5, shortlisted: false, type: 'video', assetClass: 'VID', commentsCount: 0, importedAt: 1 },
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
  test('supports multiple statuses, independent classes, and comments sorting', () => {
    expect(queryWorkspace(assets, { statuses: ['approved', 'final'], assetClasses: ['VID'], sort: 'comments' }).map((asset) => asset.id)).toEqual(['b', 'c']);
    expect(queryWorkspace(assets, { sort: 'newest' }).map((asset) => asset.id)).toEqual(['a', 'b', 'c']);
  });
  test('groups by status and class without changing the source collection', () => {
    expect(groupWorkspaceAssets(assets, 'class').map((group) => [group.id, group.assets.length])).toEqual([['IMG', 1], ['VID', 2]]);
  });
});

test('tag search ignores case and surrounding spaces while requiring all requested tags', () => {
  const tagged = [{ ...assets[0], tags: ['Night', 'Teal'] }, { ...assets[1], tags: ['Night'] }];
  expect(queryWorkspace(tagged, { tags: [' night ', 'TEAL'] }).map(asset => asset.id)).toEqual(['b']);
});
