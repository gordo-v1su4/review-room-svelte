import { expect, test } from 'bun:test';
import { startShortlistPreview, advanceShortlistPreview } from './shortlist-preview';

test('plays the shortlist in order once, then finishes', () => {
  const first = startShortlistPreview(['video', 'still', 'last']);
  expect(first?.currentId).toBe('video');
  const second = advanceShortlistPreview(first!, ['video', 'still', 'last'], false);
  expect(second?.currentId).toBe('still');
  const third = advanceShortlistPreview(second!, ['video', 'still', 'last'], false);
  expect(third?.currentId).toBe('last');
  expect(advanceShortlistPreview(third!, ['video', 'still', 'last'], false)).toBeNull();
  expect(startShortlistPreview([])).toBeNull();
});

test('loops one or multiple assets and identifies each new playback step', () => {
  const single = startShortlistPreview(['video'])!;
  const replay = advanceShortlistPreview(single, ['video'], true)!;
  expect(replay.currentId).toBe('video');
  expect(replay.step).toBe(1);
  const pair = startShortlistPreview(['video', 'still'])!;
  const last = advanceShortlistPreview(pair, ['video', 'still'], true)!;
  expect(advanceShortlistPreview(last, ['video', 'still'], true)?.currentId).toBe('video');
});

test('skips removed assets, never introduces a new asset midway, and stops an emptied shortlist', () => {
  const ids = ['video', 'removed', 'still'];
  const run = startShortlistPreview(ids)!;
  ids.push('new');
  const next = advanceShortlistPreview(run, ['video', 'still', 'new'], false)!;
  expect(next.currentId).toBe('still');
  expect(advanceShortlistPreview(next, ['video', 'still', 'new'], false)).toBeNull();
  expect(advanceShortlistPreview(run, [], true)).toBeNull();
});
