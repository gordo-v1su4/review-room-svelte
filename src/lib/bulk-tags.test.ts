import { expect, test } from 'bun:test';
import { updateTags } from './bulk-tags';

test('adding tags normalizes whitespace and deduplicates without changing existing spelling', () => {
  const current = ['Hero', 'Wide Shot'];
  expect(updateTags(current, [' hero ', 'WIDE   shot', ' Night ', '', 'night'], 'add')).toEqual(['Hero', 'Wide Shot', 'Night']);
  expect(current).toEqual(['Hero', 'Wide Shot']);
});

test('removing case and whitespace variants preserves unrelated tags and never adds requested tags', () => {
  expect(updateTags(['Hero', 'Wide Shot', 'Night'], [' HERO ', 'wide   SHOT', 'Missing'], 'remove')).toEqual(['Night']);
  expect(updateTags(['Hero'], [], 'remove')).toEqual(['Hero']);
  expect(updateTags([], ['Night'], 'remove')).toEqual([]);
});
