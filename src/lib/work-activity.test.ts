import { expect, test } from 'bun:test';
import { createActivityFeed } from './work-activity';

test('activity remains visible while queued/running and retires successful work after a short completion window', () => {
  let now = 1000;
  const feed = createActivityFeed(() => now);
  feed.upsert({ id: 'upload:one', kind: 'upload', label: 'clip.mp4', project: 'Neon', state: 'queued', stage: 'Waiting to upload', updatedAt: now });
  expect(feed.snapshot().counts.queued).toBe(1);
  feed.upsert({ id: 'upload:one', kind: 'upload', label: 'clip.mp4', project: 'Neon', state: 'running', stage: 'Uploading', progress: 35, updatedAt: ++now });
  expect(feed.snapshot().counts.active).toBe(1);
  feed.upsert({ id: 'upload:one', kind: 'upload', label: 'clip.mp4', project: 'Neon', state: 'complete', stage: 'Uploaded', updatedAt: ++now });
  expect(feed.snapshot().items[0].stage).toBe('Uploaded');
  now += 8001;
  feed.tick();
  expect(feed.snapshot().items).toEqual([]);
});

test('a delayed completion observation removes an active item without replaying an old success toast', () => {
  let now = 1000;
  const feed = createActivityFeed(() => now);
  feed.upsert({ id: 'transfer:one', kind: 'transfer', label: 'V1', project: 'Neon', state: 'running', stage: 'Transferring', updatedAt: now });
  now = 20000;
  feed.observe([{ id: 'transfer:one', kind: 'transfer', label: 'V1', project: 'Neon', state: 'complete', stage: 'Synced', updatedAt: 2000 }]);
  expect(feed.snapshot().items).toEqual([]);
});

test('failures remain actionable, dismissal survives polls, and an actual retry reappears', () => {
  let now = 1000;
  const feed = createActivityFeed(() => now);
  const failed = { id: 'transfer:one', kind: 'transfer' as const, label: 'V1', project: 'Neon', state: 'failed' as const, stage: 'Needs attention', updatedAt: now };
  feed.observe([failed]);
  now += 60000; feed.tick();
  expect(feed.snapshot().counts.failed).toBe(1);
  feed.dismiss(failed.id); feed.observe([failed]);
  expect(feed.snapshot().items).toEqual([]);
  feed.observe([{ ...failed, state: 'queued', stage: 'Retry queued', updatedAt: now }]);
  expect(feed.snapshot().counts.queued).toBe(1);
  expect(feed.snapshot().pulse).toBe(1);
});

test('transient or limited observation retains work; an authoritative absence does not invent success', () => {
  const feed = createActivityFeed(() => 1000);
  feed.observe([{ id: 'ingest:one', kind: 'ingest', label: 'V1', project: 'Neon', state: 'running', stage: 'Preparing previews', updatedAt: 1000 }]);
  feed.unavailable();
  expect(feed.snapshot().stale).toBe(true);
  expect(feed.snapshot().counts.active).toBe(1);
  feed.observe([], true);
  expect(feed.snapshot().counts.active).toBe(1);
  feed.observe([]);
  expect(feed.snapshot().items).toEqual([]);
  expect(feed.snapshot().counts.complete).toBe(0);
});

test('success history is capped and nonfinite progress is never displayed', () => {
  const feed = createActivityFeed(() => 1000);
  for (let i = 0; i < 8; i++) feed.upsert({ id: `upload:${i}`, kind: 'upload', label: 'Clip', project: 'Neon', state: 'complete', stage: 'Uploaded', updatedAt: 1000 });
  expect(feed.snapshot().items).toHaveLength(5);
  feed.upsert({ id: 'upload:new', kind: 'upload', label: 'Clip', project: 'Neon', state: 'running', stage: 'Uploading', progress: NaN, updatedAt: 1000 });
  expect(feed.snapshot().items[0].progress).toBeUndefined();
});

test('a fast fresh completion opens the feed once, without replaying on every poll', () => {
  const feed = createActivityFeed(() => 1000);
  const item = { id: 'transfer:fast', kind: 'transfer' as const, label: 'V1', project: 'Neon', state: 'complete' as const, stage: 'Synced', updatedAt: 1000 };
  feed.observe([item]);
  expect(feed.snapshot().pulse).toBe(1);
  feed.observe([item]);
  expect(feed.snapshot().pulse).toBe(1);
});
