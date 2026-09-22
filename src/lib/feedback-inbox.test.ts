import { expect, test } from 'bun:test';
import { feedbackDigests } from './feedback-inbox';

const projects = [{ id: 'p', name: 'Studio' }, { id: 'other', name: 'Other' }];
const access = { isAdmin: true, projectIds: ['p'] };
test('feedback groups by project and UTC day, retaining exact asset, folder and zero-time links', () => {
  const groups = feedbackDigests(projects, [{ id: 'clip', projectId: 'p', folderId: 'rushes', name: 'Take 1', comments: [
    { id: 'late', body: 'Trim', timecodeSec: 0, authorName: 'Casey', authorRole: 'client', createdAt: Date.parse('2026-09-22T23:59:00Z') },
    { id: 'next', body: 'Keep', timecodeSec: null, createdAt: Date.parse('2026-09-23T00:01:00Z'), completedAt: 1790112000000 }
  ] }], access);
  expect(groups.map(group => [group.dateKey, group.needsAttentionCount])).toEqual([['2026-09-23', 0], ['2026-09-22', 1]]);
  expect(groups[1].comments[0]).toMatchObject({ projectId: 'p', assetId: 'clip', folderId: 'rushes', commentId: 'late', timecodeSec: 0, authorName: 'Casey', authorRole: 'client' });
});

test('inbox excludes inaccessible projects and archived assets without changing source notes', () => {
  const comments = [{ id: 'c', body: 'Note', timecodeSec: null }];
  const assets = [
    { id: 'allowed', name: 'Allowed', projectId: 'p', comments },
    { id: 'foreign', name: 'Private', projectId: 'other', comments },
    { id: 'archived', name: 'Archived', projectId: 'p', archived: true, comments },
    { id: 'status-archived', name: 'Archived status', projectId: 'p', status: 'archived', comments }
  ];
  expect(feedbackDigests(projects, assets, access).flatMap(group => group.comments.map(note => note.assetId))).toEqual(['allowed']);
  expect(feedbackDigests(projects, assets, { ...access, isAdmin: false })).toEqual([]);
  expect(feedbackDigests([{ ...projects[0], archived: true }], assets, access)).toEqual([]);
  expect(comments).toEqual([{ id: 'c', body: 'Note', timecodeSec: null }]);
});
