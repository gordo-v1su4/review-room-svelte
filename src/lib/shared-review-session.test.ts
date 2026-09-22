import { expect, test } from 'bun:test';
import { createReviewSession, type AssetReview, type ReviewAction } from './review-session';
import { createSharedReviewSession, type SharedReviewState, type SharedReviewCommand } from './shared-review-session';

const asset = (id = 'clip'): AssetReview => createReviewSession([{ id }]).assets[id];
const stroke = { id: 'line', color: '#14b8a6', width: 3, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('review decisions wait for the gateway and apply its authoritative result', async () => {
  let state!: SharedReviewState;
  let command!: SharedReviewCommand;
  const response = deferred<AssetReview>();
  const controller = createSharedReviewSession([asset()], { commit: next => { command = next; return response.promise; } }, next => state = next);
  const pending = controller.review({ type: 'rate', assetId: 'clip', rating: 4.7 });
  expect(command).toEqual({ type: 'rate', assetId: 'clip', rating: 5 });
  expect(state.session.assets.clip.rating).toBe(0);
  expect(state.busyIds).toEqual(['clip']);
  response.resolve({ ...asset(), rating: 4 });
  await pending;
  expect(state.session.assets.clip.rating).toBe(4);
  expect(state.busyIds).toEqual([]);
});

test('selection, comment drafts and unsaved markup edits stay local and immediate', async () => {
  let state!: SharedReviewState;
  let writes = 0;
  const controller = createSharedReviewSession([asset(), asset('still')], { commit: async () => { writes++; return asset(); } }, next => state = next);
  await controller.review({ type: 'select', assetId: 'still' });
  await controller.review({ type: 'draft', assetId: 'still', body: 'Local draft', timecodeSec: null });
  await controller.review({ type: 'annotate', assetId: 'still', action: { type: 'replace', strokes: [stroke] } });
  expect(state.session.activeAssetId).toBe('still');
  expect(state.session.assets.still.draft.body).toBe('Local draft');
  expect(state.session.assets.still.annotations.draft).toEqual([stroke]);
  expect(state.session.assets.still.annotations.saved).toEqual([]);
  await controller.review({ type: 'annotate', assetId: 'still', action: { type: 'undo' } });
  expect(state.session.assets.still.annotations.draft).toEqual([]);
  expect(writes).toBe(0);
});

test('publishing captures the submitted draft while preserving newer typing and selection', async () => {
  let state!: SharedReviewState;
  let command!: SharedReviewCommand;
  const response = deferred<AssetReview>();
  const controller = createSharedReviewSession([asset(), asset('other')], { commit: next => { command = next; return response.promise; } }, next => state = next);
  await controller.review({ type: 'draft', assetId: 'clip', body: ' First note ', timecodeSec: 2 });
  const pending = controller.review({ type: 'publish-comment', assetId: 'clip', commentId: 'note', author: { name: 'Forged', role: 'admin' } });
  expect(command).toEqual({ type: 'publish-comment', assetId: 'clip', commentId: 'note', body: 'First note', timecodeSec: 2 });
  expect(state.session.assets.clip.comments).toEqual([]);
  await controller.review({ type: 'draft', assetId: 'clip', body: 'Next note', timecodeSec: 4 });
  await controller.review({ type: 'select', assetId: 'other' });
  response.resolve({ ...asset(), comments: [{ id: 'note', body: 'First note', timecodeSec: 2, authorName: 'Actual reviewer', authorRole: 'client' }] });
  await pending;
  expect(state.session.assets.clip.draft).toEqual({ body: 'Next note', timecodeSec: 4 });
  expect(state.session.assets.clip.comments[0].authorName).toBe('Actual reviewer');
  expect(state.session.activeAssetId).toBe('other');
});

test('annotation saving keeps newer unsaved strokes over the confirmed saved markup', async () => {
  let state!: SharedReviewState;
  let command!: SharedReviewCommand;
  const response = deferred<AssetReview>();
  const controller = createSharedReviewSession([asset()], { commit: next => { command = next; return response.promise; } }, next => state = next);
  await controller.review({ type: 'annotate', assetId: 'clip', action: { type: 'replace', strokes: [stroke] } });
  const pending = controller.review({ type: 'annotate', assetId: 'clip', action: { type: 'save' } });
  expect(command).toEqual({ type: 'save-annotations', assetId: 'clip', strokes: [stroke] });
  expect(state.session.assets.clip.annotations.saved).toEqual([]);
  const newer = { ...stroke, id: 'new' };
  await controller.review({ type: 'annotate', assetId: 'clip', action: { type: 'replace', strokes: [stroke, newer] } });
  response.resolve({ ...asset(), annotations: { saved: [stroke], draft: [stroke] } });
  await pending;
  expect(state.session.assets.clip.annotations).toEqual({ saved: [stroke], draft: [stroke, newer] });
});

test('share status, shortlist and viewed writes also require confirmation', async () => {
  for (const action of [
    { type: 'status', assetId: 'clip', status: 'approved' },
    { type: 'shortlist', assetId: 'clip', shortlisted: true },
    { type: 'mark-viewed', assetId: 'clip' }
  ] as const) {
    let state!: SharedReviewState;
    const response = deferred<AssetReview>();
    let command!: SharedReviewCommand;
    const controller = createSharedReviewSession([asset()], { commit: next => { command = next; return response.promise; } }, next => state = next);
    const pending = controller.review(action);
    expect(command).toEqual(action);
    expect(state.session.assets.clip).toEqual(asset());
    const confirmed = { ...asset(), status: 'approved' as const, shortlisted: true, viewed: true };
    response.resolve(confirmed);
    await pending;
    expect(state.session.assets.clip).toEqual(confirmed);
  }
});

test('production and administrative actions are denied without writing or mutating state', async () => {
  let state!: SharedReviewState;
  let writes = 0;
  const controller = createSharedReviewSession([asset()], { commit: async () => { writes++; return asset(); } }, next => state = next);
  const before = state.session;
  for (const action of [
    { type: 'add-assets', assets: [{ id: 'injected' }] },
    { type: 'status', assetId: 'clip', status: 'archived' },
    { type: 'status', assetId: 'clip', status: 'final' },
    { type: 'toggle-comment-complete', assetId: 'clip', commentId: 'note', actorId: 'viewer', at: 1 },
    { type: 'toggle-comment-reaction', assetId: 'clip', commentId: 'note', actorId: 'viewer', emoji: 'heart' }
  ] satisfies ReviewAction[]) {
    await controller.review(action);
    expect(state.session).toEqual(before);
    expect(state.error).toBe('This action is unavailable in shared reviews.');
  }
  expect(writes).toBe(0);
});

test('duplicate writes are deduplicated per asset while different assets remain independent', async () => {
  let state!: SharedReviewState;
  const first = deferred<AssetReview>(), second = deferred<AssetReview>();
  const commands: SharedReviewCommand[] = [];
  const controller = createSharedReviewSession([asset(), asset('other')], { commit: command => { commands.push(command); return command.assetId === 'clip' ? first.promise : second.promise; } }, next => state = next);
  const a = controller.review({ type: 'rate', assetId: 'clip', rating: 4 });
  void controller.review({ type: 'rate', assetId: 'clip', rating: 5 });
  const b = controller.review({ type: 'shortlist', assetId: 'other', shortlisted: true });
  expect(commands.length).toBe(2);
  expect(state.busyIds).toEqual(['clip', 'other']);
  second.resolve({ ...asset('other'), shortlisted: true }); await b;
  expect(state.busyIds).toEqual(['clip']);
  first.resolve({ ...asset(), rating: 4 }); await a;
  expect(state.session.assets.clip.rating).toBe(4);
  expect(state.session.assets.other.shortlisted).toBe(true);
});

test('failed writes preserve drafts and saved state, report a safe error and allow retry', async () => {
  let state!: SharedReviewState;
  let fail = true;
  const controller = createSharedReviewSession([asset()], { commit: async () => {
    if (fail) throw new Error('secret gateway diagnostic');
    return { ...asset(), comments: [{ id: 'note', body: 'Keep me', timecodeSec: 1 }] };
  } }, next => state = next);
  await controller.review({ type: 'draft', assetId: 'clip', body: 'Keep me', timecodeSec: 1 });
  await controller.review({ type: 'publish-comment', assetId: 'clip', commentId: 'note' });
  expect(state.session.assets.clip.draft.body).toBe('Keep me');
  expect(state.session.assets.clip.comments).toEqual([]);
  expect(state.busyIds).toEqual([]);
  expect(state.error).toBe('Could not save this review change. Try again.');
  fail = false;
  await controller.review({ type: 'publish-comment', assetId: 'clip', commentId: 'note' });
  expect(state.session.assets.clip.draft).toEqual({ body: '', timecodeSec: null });
  expect(state.session.assets.clip.comments).toHaveLength(1);
  expect(state.error).toBe('');
});

test('disposing aborts pending writes and ignores their late results and subsequent actions', async () => {
  const states: SharedReviewState[] = [];
  let signal!: AbortSignal;
  const response = deferred<AssetReview>();
  const controller = createSharedReviewSession([asset()], { commit: (_command, nextSignal) => { signal = nextSignal; return response.promise; } }, next => states.push(next));
  const pending = controller.review({ type: 'rate', assetId: 'clip', rating: 5 });
  const count = states.length;
  controller.dispose();
  expect(signal.aborted).toBe(true);
  response.resolve({ ...asset(), rating: 5 });
  await pending;
  await controller.review({ type: 'draft', assetId: 'clip', body: 'After dispose', timecodeSec: null });
  expect(states).toHaveLength(count);
  expect(states.at(-1)?.session.assets.clip.rating).toBe(0);
});

test('a mismatched gateway asset cannot overwrite the selected review', async () => {
  let state!: SharedReviewState;
  const controller = createSharedReviewSession([asset()], { commit: async () => ({ ...asset('foreign'), rating: 5 }) }, next => state = next);
  await controller.review({ type: 'rate', assetId: 'clip', rating: 5 });
  expect(state.session.assets.clip).toEqual(asset());
  expect(state.error).toBe('Could not save this review change. Try again.');
});

test('annotation save reports failure to its caller and confirms only a successful retry', async () => {
  let fail = true;
  const controller = createSharedReviewSession([asset()], { commit: async () => {
    if (fail) throw new Error('private failure');
    return { ...asset(), annotations: { saved: [stroke], draft: [stroke] } };
  } }, () => {});
  await controller.review({ type: 'annotate', assetId: 'clip', action: { type: 'replace', strokes: [stroke] } });
  expect(await controller.review({ type: 'annotate', assetId: 'clip', action: { type: 'save' } })).toBe(false);
  fail = false;
  expect(await controller.review({ type: 'annotate', assetId: 'clip', action: { type: 'save' } })).toBe(true);
});

test('viewed intent queues once behind a save and waits for its own confirmation', async () => {
  let state!: SharedReviewState;
  const saved = deferred<AssetReview>(), viewed = deferred<AssetReview>();
  const commands: SharedReviewCommand[] = [];
  const controller = createSharedReviewSession([asset()], { commit: command => {
    commands.push(command);
    return command.type === 'mark-viewed' ? viewed.promise : saved.promise;
  } }, next => state = next);
  const save = controller.review({ type: 'rate', assetId: 'clip', rating: 4 });
  const queued = controller.review({ type: 'mark-viewed', assetId: 'clip' });
  expect(await controller.review({ type: 'mark-viewed', assetId: 'clip' })).toBe(false);
  expect(commands).toHaveLength(1);
  saved.resolve({ ...asset(), rating: 4 });
  expect(await save).toBe(true);
  expect(commands.map(command => command.type)).toEqual(['rate', 'mark-viewed']);
  expect(state.session.assets.clip.viewed).toBe(false);
  expect(state.busyIds).toEqual(['clip']);
  viewed.resolve({ ...asset(), rating: 4, viewed: true });
  expect(await queued).toBe(true);
  expect(state.session.assets.clip.viewed).toBe(true);
  expect(state.busyIds).toEqual([]);
});

test('queued viewed confirmation preserves a failed comment save and its unsent draft', async () => {
  let state!: SharedReviewState;
  const failedSave = deferred<AssetReview>();
  const controller = createSharedReviewSession([asset()], { commit: command => command.type === 'mark-viewed'
    ? Promise.resolve({ ...asset(), viewed: true }) : failedSave.promise }, next => state = next);
  await controller.review({ type: 'draft', assetId: 'clip', body: 'Keep this note', timecodeSec: 2 });
  const save = controller.review({ type: 'publish-comment', assetId: 'clip', commentId: 'note' });
  const queued = controller.review({ type: 'mark-viewed', assetId: 'clip' });
  failedSave.reject(new Error('private diagnostics'));
  expect(await save).toBe(false);
  expect(await queued).toBe(true);
  expect(state.session.assets.clip.draft).toEqual({ body: 'Keep this note', timecodeSec: 2 });
  expect(state.session.assets.clip.comments).toEqual([]);
  expect(state.session.assets.clip.viewed).toBe(true);
  expect(state.error).toBe('Could not save this review change. Try again.');
});

test('failed queued viewed tracking does not automatically retry, even after repeat viewing events', async () => {
  let state!: SharedReviewState;
  const saved = deferred<AssetReview>(), tracked = deferred<AssetReview>();
  const commands: SharedReviewCommand[] = [];
  const controller = createSharedReviewSession([asset()], { commit: command => {
    commands.push(command); return command.type === 'mark-viewed' ? tracked.promise : saved.promise;
  } }, next => state = next);
  const save = controller.review({ type: 'rate', assetId: 'clip', rating: 4 });
  const queued = controller.review({ type: 'mark-viewed', assetId: 'clip' });
  saved.resolve({ ...asset(), rating: 4 }); await save;
  expect(await controller.review({ type: 'mark-viewed', assetId: 'clip' })).toBe(false);
  tracked.reject(new Error('private diagnostics'));
  expect(await queued).toBe(false);
  expect(commands.map(command => command.type)).toEqual(['rate', 'mark-viewed']);
  expect(state.session.assets.clip.rating).toBe(4);
  expect(state.session.assets.clip.viewed).toBe(false);
  expect(state.busyIds).toEqual([]);
  expect(state.error).toBe('Could not save this review change. Try again.');
});

test('disposal settles queued viewed intent without starting a late gateway write', async () => {
  const saved = deferred<AssetReview>();
  const commands: SharedReviewCommand[] = [];
  const states: SharedReviewState[] = [];
  const controller = createSharedReviewSession([asset()], { commit: command => {
    commands.push(command); return saved.promise;
  } }, next => states.push(next));
  const save = controller.review({ type: 'rate', assetId: 'clip', rating: 4 });
  const queued = controller.review({ type: 'mark-viewed', assetId: 'clip' });
  const before = states.length;
  controller.dispose();
  expect(await queued).toBe(false);
  saved.resolve({ ...asset(), rating: 4 });
  expect(await save).toBe(false);
  expect(commands.map(command => command.type)).toEqual(['rate']);
  expect(states).toHaveLength(before);
});
