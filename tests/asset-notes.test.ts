import { test, expect } from 'bun:test';
import { internal } from '../convex/_generated/api';
import { automationUpload, cspDigest, seriesFixture } from './series-api-helpers';

async function fixture() {
  const f = await seriesFixture();
  const { assetId } = await automationUpload(f, { folderId: f.scene, assetCode: 'BLR_EP101_PAR_0010' });
  return { ...f, assetId };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;

function note(f: Fixture, fields: { body: string; createdAt: number; timecodeSec?: number; completedAt?: number; authorRole?: 'admin' | 'client'; authorName?: string }) {
  return f.t.run(ctx => ctx.db.insert('comments', { videoId: f.assetId, projectId: f.project,
    authorName: fields.authorName ?? 'Mara', authorRole: fields.authorRole ?? 'client', body: fields.body, createdAt: fields.createdAt,
    ...(fields.timecodeSec !== undefined ? { timecodeSec: fields.timecodeSec } : {}),
    ...(fields.completedAt !== undefined ? { completedAt: fields.completedAt, completedBy: f.owner } : {}) }));
}

test('notes are read oldest first, with and without a timecode and with a completed note', async () => {
  const f = await fixture();
  const later = await note(f, { body: 'Hold the last frame', createdAt: 300, authorRole: 'admin', authorName: 'Owner' });
  const timed = await note(f, { body: 'Cut here', createdAt: 100, timecodeSec: 12.5 });
  const done = await note(f, { body: 'Too dark', createdAt: 200, timecodeSec: 0, completedAt: 250 });
  const result = await f.t.mutation(internal.automation.assetNotes, { keyDigest: cspDigest, assetId: f.assetId });
  expect(result).toEqual({ assetId: f.assetId, assetCode: 'BLR_EP101_PAR_0010', notes: [
    { id: timed, body: 'Cut here', timecodeSec: 12.5, authorName: 'Mara', authorRole: 'client', createdAt: 100, completedAt: null },
    { id: done, body: 'Too dark', timecodeSec: 0, authorName: 'Mara', authorRole: 'client', createdAt: 200, completedAt: 250 },
    { id: later, body: 'Hold the last frame', timecodeSec: null, authorName: 'Owner', authorRole: 'admin', createdAt: 300, completedAt: null },
  ] });
});

test('an asset without a code or notes reads as null and an empty list', async () => {
  const f = await fixture();
  const plain = await f.t.run(ctx => ctx.db.insert('videos', { projectId: f.project, title: 'Take', originalFilename: 'take.mp4', storageKey: 'private/take.mp4', mimeType: 'video/mp4', status: 'awaiting_review', viewed: false, rating: 0, isSelect: false, commentCount: 0, tags: [], downloadEnabled: false, order: 0, uploadedBy: f.owner, uploadedAt: 1, updatedAt: 1 }));
  expect(await f.t.mutation(internal.automation.assetNotes, { keyDigest: cspDigest, assetId: plain })).toEqual({ assetId: plain, assetCode: null, notes: [] });
});

test('a notes read never returns another asset\'s notes, storage keys or who completed a note', async () => {
  const f = await fixture();
  const other = await automationUpload(f, { folderId: f.scene, assetCode: 'BLR_EP101_PAR_0020' });
  await f.t.run(ctx => ctx.db.insert('comments', { videoId: other.assetId, projectId: f.project, authorName: 'Mara', authorRole: 'client', body: 'Other shot', createdAt: 50 }));
  await note(f, { body: 'This shot', createdAt: 60, completedAt: 70 });
  const result = await f.t.mutation(internal.automation.assetNotes, { keyDigest: cspDigest, assetId: f.assetId });
  expect(result.notes.map(item => item.body)).toEqual(['This shot']);
  expect(Object.keys(result.notes[0]).sort()).toEqual(['authorName', 'authorRole', 'body', 'completedAt', 'createdAt', 'id', 'timecodeSec']);
  expect(JSON.stringify(result)).not.toContain('private/');
});

test('a credential without media:read is refused', async () => {
  const f = await fixture();
  const writeOnly = '1'.repeat(64);
  await f.t.mutation(internal.automation.issue, { name: 'Folders only', keyDigest: writeOnly, projectId: f.project, actions: ['folders:write'] });
  await expect(f.t.mutation(internal.automation.assetNotes, { keyDigest: writeOnly, assetId: f.assetId })).rejects.toThrow('Automation scope denied');
});

test('a credential restricted to another project is refused', async () => {
  const f = await fixture();
  const elsewhere = '2'.repeat(64);
  const otherProject = await f.t.run(ctx => ctx.db.insert('projects', { title: 'Other', slug: 'other', createdBy: f.owner, createdAt: 1, updatedAt: 1, downloadEnabledByDefault: false }));
  await f.t.mutation(internal.automation.issue, { name: 'Other series', keyDigest: elsewhere, projectId: otherProject, actions: ['media:read'] });
  await expect(f.t.mutation(internal.automation.assetNotes, { keyDigest: elsewhere, assetId: f.assetId })).rejects.toThrow('Automation scope denied');
});

test('an archived project, an unknown credential and another owner\'s asset are unavailable', async () => {
  const f = await fixture();
  await expect(f.t.mutation(internal.automation.assetNotes, { keyDigest: '3'.repeat(64), assetId: f.assetId })).rejects.toThrow('Automation credential unavailable');
  const foreign = await f.t.run(async ctx => {
    const user = await ctx.db.insert('users', { email: 'someone@review-room.invalid' });
    const someone = await ctx.db.insert('appUsers', { authUserId: user, name: 'Someone', role: 'admin' });
    const project = await ctx.db.insert('projects', { title: 'Theirs', slug: 'theirs', createdBy: someone, createdAt: 1, updatedAt: 1, downloadEnabledByDefault: false });
    return await ctx.db.insert('videos', { projectId: project, title: 'Take', originalFilename: 'take.mp4', storageKey: 'private/take.mp4', mimeType: 'video/mp4', status: 'awaiting_review', viewed: false, rating: 0, isSelect: false, commentCount: 0, tags: [], downloadEnabled: false, order: 0, uploadedBy: someone, uploadedAt: 1, updatedAt: 1 });
  });
  const unrestricted = '4'.repeat(64);
  await f.t.mutation(internal.automation.issue, { name: 'Whole catalog', keyDigest: unrestricted, actions: ['media:read'] });
  await expect(f.t.mutation(internal.automation.assetNotes, { keyDigest: unrestricted, assetId: foreign })).rejects.toThrow('Asset unavailable');
  await f.t.run(ctx => ctx.db.patch(f.project, { archived: true }));
  await expect(f.t.mutation(internal.automation.assetNotes, { keyDigest: cspDigest, assetId: f.assetId })).rejects.toThrow('Asset unavailable');
});

test('an asset that no longer exists is unavailable, even to a credential restricted to one project', async () => {
  const f = await fixture();
  await f.t.run(ctx => ctx.db.delete(f.assetId));
  await expect(f.t.mutation(internal.automation.assetNotes, { keyDigest: cspDigest, assetId: f.assetId })).rejects.toThrow('Asset unavailable');
  const writeOnly = '5'.repeat(64);
  await f.t.mutation(internal.automation.issue, { name: 'Folders only', keyDigest: writeOnly, projectId: f.project, actions: ['folders:write'] });
  await expect(f.t.mutation(internal.automation.assetNotes, { keyDigest: writeOnly, assetId: f.assetId })).rejects.toThrow('Automation scope denied');
});
