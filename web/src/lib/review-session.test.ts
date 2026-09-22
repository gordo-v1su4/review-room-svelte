import { expect, test } from 'bun:test';
import { createReviewSession, transitionReviewSession } from './review-session';

test('switching assets keeps their independent comment drafts and active selection', () => {
  const initial = createReviewSession([{ id: 'clip' }, { id: 'still' }]);
  const drafted = transitionReviewSession(initial, { type: 'draft', assetId: 'clip', body: 'Trim opening', timecodeSec: 1.25 });
  const other = transitionReviewSession(drafted, { type: 'select', assetId: 'still' });
  const returned = transitionReviewSession(other, { type: 'select', assetId: 'clip' });
  expect(returned.activeAssetId).toBe('clip');
  expect(returned.assets.clip.draft).toEqual({ body: 'Trim opening', timecodeSec: 1.25 });
  expect(returned.assets.still.draft).toEqual({ body: '', timecodeSec: null });
  expect(initial.assets.clip.draft.body).toBe('');
});

test('publishing a comment retains its timecode and clears only that asset draft', () => {
  let session = createReviewSession([{ id: 'clip', draft: { body: '  Trim opening  ', timecodeSec: 0 } }, { id: 'still', draft: { body: 'Keep this', timecodeSec: null } }]);
  session = transitionReviewSession(session, { type: 'publish-comment', assetId: 'clip', commentId: 'comment-1' }, { kind: 'project', memberRole: 'viewer' });
  expect(session.assets.clip.comments).toEqual([{ id: 'comment-1', body: 'Trim opening', timecodeSec: 0 }]);
  expect(session.assets.clip.draft).toEqual({ body: '', timecodeSec: null });
  expect(session.assets.still.draft.body).toBe('Keep this');
});

test('review facets stay independent while a reviewer rates and shortlists a clip', () => {
  const initial = createReviewSession([{ id: 'clip', status: 'final' }]);
  const rated = transitionReviewSession(initial, { type: 'rate', assetId: 'clip', rating: 4.6 }, { kind: 'share' });
  const selected = transitionReviewSession(rated, { type: 'shortlist', assetId: 'clip', shortlisted: true }, { kind: 'project', memberRole: 'viewer' });
  expect(selected.assets.clip.rating).toBe(5);
  expect(selected.assets.clip.shortlisted).toBe(true);
  expect(selected.assets.clip.status).toBe('final');
  expect(initial.assets.clip.shortlisted).toBe(false);
});

test('status choices follow project membership and the restricted share-link workflow', () => {
  const initial = createReviewSession([{ id: 'clip' }]);
  const apply = (status: 'approved' | 'in_progress' | 'final' | 'omitted' | 'archived' | 'not_started', access: Parameters<typeof transitionReviewSession>[2]) => transitionReviewSession(initial, { type: 'status', assetId: 'clip', status }, access);
  expect(apply('approved', { kind: 'share' }).assets.clip.status).toBe('approved');
  expect(apply('in_progress', { kind: 'share' }).assets.clip.status).toBe('in_progress');
  expect(() => apply('final', { kind: 'share' })).toThrow('Status change not allowed');
  expect(() => apply('approved', { kind: 'project', memberRole: 'viewer' })).toThrow('Status change not allowed');
  for (const status of ['final', 'omitted', 'archived', 'not_started'] as const) {
    expect(apply(status, { kind: 'project', memberRole: 'editor' }).assets.clip.status).toBe(status);
  }
});

test('invalid timecodes cannot corrupt a saved draft', () => {
  const initial = createReviewSession([{ id: 'clip' }]);
  for (const timecodeSec of [-1, NaN, Infinity]) {
    expect(() => transitionReviewSession(initial, { type: 'draft', assetId: 'clip', body: 'Note', timecodeSec })).toThrow('Timecode must be nonnegative and finite');
  }
  expect(initial.assets.clip.draft.body).toBe('');
});

test('revoked access blocks review writes and preserves the unsent draft', () => {
  const initial = createReviewSession([{ id: 'clip', draft: { body: 'Keep me', timecodeSec: null } }]);
  const actions = [
    { type: 'publish-comment', assetId: 'clip', commentId: 'c1' },
    { type: 'rate', assetId: 'clip', rating: 5 },
    { type: 'shortlist', assetId: 'clip', shortlisted: true },
    { type: 'status', assetId: 'clip', status: 'approved' }
  ] as const;
  for (const action of actions) expect(() => transitionReviewSession(initial, action)).toThrow('Review access required');
  expect(initial.assets.clip.draft.body).toBe('Keep me');
  expect(initial.assets.clip.comments).toEqual([]);
});

test('empty comments and missing assets fail without losing user state', () => {
  const initial = createReviewSession([{ id: 'clip', draft: { body: '  ', timecodeSec: null } }]);
  expect(() => transitionReviewSession(initial, { type: 'publish-comment', assetId: 'clip', commentId: 'c1' }, { kind: 'share' })).toThrow('Comment cannot be empty');
  expect(() => transitionReviewSession(initial, { type: 'select', assetId: 'missing' })).toThrow('Asset not found');
  expect(initial.activeAssetId).toBe('clip');
  expect(initial.assets.clip.draft.body).toBe('  ');
});

test('adding media preserves active review and drafts, while closing only clears selection', () => {
  let session = createReviewSession([{ id: 'first', draft: { body: 'Keep draft', timecodeSec: 2 } }]);
  session = transitionReviewSession(session, { type: 'add-assets', assets: [{ id: 'second' }] });
  expect(session.activeAssetId).toBe('first');
  expect(session.assets.first.draft.body).toBe('Keep draft');
  expect(session.assets.second.status).toBe('awaiting_review');
  session = transitionReviewSession(session, { type: 'select', assetId: null });
  expect(session.activeAssetId).toBe(null);
  expect(session.assets.first.draft.body).toBe('Keep draft');
  expect(transitionReviewSession(session, { type: 'select', assetId: 'first' }).activeAssetId).toBe('first');
});

test('handling every note clears feedback attention and reopening restores it without changing approval', () => {
  let session = createReviewSession([{ id: 'clip', status: 'approved', comments: [
    { id: 'a', body: 'Fix title', timecodeSec: null }, { id: 'b', body: 'Lift sound', timecodeSec: 2 }
  ] }]);
  const access = { kind: 'project', memberRole: 'viewer' } as const;
  session = transitionReviewSession(session, { type: 'toggle-comment-complete', assetId: 'clip', commentId: 'a', actorId: 'me', at: 100 }, access);
  expect(session.assets.clip.comments[0].completedAt).toBe(100);
  expect(session.assets.clip.feedbackNeedsAttention).toBe(true);
  session = transitionReviewSession(session, { type: 'toggle-comment-complete', assetId: 'clip', commentId: 'b', actorId: 'me', at: 101 }, access);
  expect(session.assets.clip.feedbackNeedsAttention).toBe(false);
  session = transitionReviewSession(session, { type: 'toggle-comment-complete', assetId: 'clip', commentId: 'a', actorId: 'me', at: 102 }, access);
  expect(session.assets.clip.comments[0].completedAt).toBeUndefined();
  expect(session.assets.clip.comments[0].completedBy).toBeUndefined();
  expect(session.assets.clip.feedbackNeedsAttention).toBe(true);
  expect(session.assets.clip.status).toBe('approved');
});

test('reactions toggle per person and emoji without removing other reactions', () => {
  const initial = createReviewSession([{ id: 'clip', comments: [{ id: 'a', body: 'Nice', timecodeSec: null }] }]);
  const access = { kind: 'project', memberRole: 'viewer' } as const;
  let session = transitionReviewSession(initial, { type: 'toggle-comment-reaction', assetId: 'clip', commentId: 'a', actorId: 'me', emoji: 'heart' }, access);
  session = transitionReviewSession(session, { type: 'toggle-comment-reaction', assetId: 'clip', commentId: 'a', actorId: 'other', emoji: 'heart' }, access);
  session = transitionReviewSession(session, { type: 'toggle-comment-reaction', assetId: 'clip', commentId: 'a', actorId: 'me', emoji: 'fire' }, access);
  expect(session.assets.clip.comments[0].reactions).toEqual({ heart: ['me', 'other'], fire: ['me'] });
  session = transitionReviewSession(session, { type: 'toggle-comment-reaction', assetId: 'clip', commentId: 'a', actorId: 'me', emoji: 'heart' }, access);
  expect(session.assets.clip.comments[0].reactions).toEqual({ heart: ['other'], fire: ['me'] });
  expect(initial.assets.clip.comments[0].reactions).toBeUndefined();
});

test('share-link access cannot handle or react to comments and missing comments fail safely', () => {
  const session = createReviewSession([{ id: 'clip', comments: [{ id: 'a', body: 'Note', timecodeSec: null }] }]);
  const actions = [
    { type: 'toggle-comment-complete', assetId: 'clip', commentId: 'a', actorId: 'me', at: 100 },
    { type: 'toggle-comment-reaction', assetId: 'clip', commentId: 'a', actorId: 'me', emoji: 'thumbs_up' }
  ] as const;
  for (const action of actions) {
    expect(() => transitionReviewSession(session, action, { kind: 'share' })).toThrow('Project membership required');
    expect(() => transitionReviewSession(session, { ...action, commentId: 'missing' }, { kind: 'project', memberRole: 'viewer' })).toThrow('Comment not found');
  }
  expect(session.assets.clip.comments[0].completedAt).toBeUndefined();
  expect(session.assets.clip.comments[0].reactions).toBeUndefined();
});

test('publishing a new note restores feedback attention after all previous notes were handled', () => {
  const initial = createReviewSession([{ id: 'clip', comments: [{ id: 'a', body: 'Old', timecodeSec: null, completedAt: 10, completedBy: 'me' }], draft: { body: 'One more', timecodeSec: null } }]);
  expect(initial.assets.clip.feedbackNeedsAttention).toBe(false);
  const next = transitionReviewSession(initial, { type: 'publish-comment', assetId: 'clip', commentId: 'b' }, { kind: 'share' });
  expect(next.assets.clip.feedbackNeedsAttention).toBe(true);
  expect(next.assets.clip.comments[0].completedAt).toBe(10);
});
