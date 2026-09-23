import { expect, test } from 'bun:test';
import { createShareManagement, type ShareManagementState, type ReviewLink, type ShareGateway } from './share-management';
import { DEFAULT_APPEARANCE } from './appearance';

const link: ReviewLink = { id: 'link-1', path: '/review/0123456789abcdef', canDownload: true, protected: true, createdAt: 100 };
const draft = { passcode: ' secret ', canDownload: true, appearance: { ...DEFAULT_APPEARANCE, size: 'large' as const, aspect: 'portrait' as const, fit: 'fit' as const, showInfo: false } };

test('share creation displays only the confirmed link and preserves the legacy appearance contract', async () => {
  let state!: ShareManagementState;
  let confirm!: (value: ReviewLink) => void;
  let captured: unknown;
  const gateway: ShareGateway = {
    list: async () => ({ kind: 'ready', links: [] }),
    create: async (_project, request) => { captured = request; return new Promise(resolve => { confirm = resolve; }); },
  };
  const sharing = createShareManagement(gateway, value => { state = value; });
  await sharing.load('project-a', true);
  const pending = sharing.create(draft);
  expect(state).toMatchObject({ kind: 'ready', creating: true, links: [] });
  expect(captured).toEqual({ passcode: ' secret ', canDownload: true, appearance: { gridSize: 'lg', aspectRatio: 'portrait', thumbnailScale: 'fit', showCardInfo: false } });
  confirm(link);
  expect(await pending).toBe(true);
  expect(state).toMatchObject({ kind: 'ready', creating: false, links: [link] });
  sharing.dispose();
});

test('a failed creation keeps existing links, blocks duplicate submission, and allows retry without leaking gateway errors', async () => {
  let state!: ShareManagementState;
  let reject!: (reason: Error) => void;
  let retry = false;
  const sharing = createShareManagement({
    list: async () => ({ kind: 'ready', links: [link] }),
    create: async () => retry ? { ...link, id: 'link-2' } : new Promise((_resolve, no) => { reject = no; }),
  }, value => { state = value; });
  await sharing.load('project-a', true);
  const pending = sharing.create(draft);
  expect(await sharing.create(draft)).toBe(false);
  reject(new Error('private gateway credentials'));
  expect(await pending).toBe(false);
  expect(state).toMatchObject({ kind: 'ready', creating: false, links: [link], error: 'Could not create the review link. Try again.' });
  retry = true;
  expect(await sharing.create(draft)).toBe(true);
  expect(state.links.map(item => item.id)).toEqual(['link-2', 'link-1']);
  expect(state.error).toBeUndefined();
  sharing.dispose();
});

test('changing projects discards late links and permission revocation clears all share data', async () => {
  let state!: ShareManagementState;
  let resolveList!: (value: { kind: 'ready'; links: ReviewLink[] }) => void;
  let resolveCreate!: (value: ReviewLink) => void;
  const signals: AbortSignal[] = [];
  const sharing = createShareManagement({
    list: async (id, signal) => { signals.push(signal); return id === 'project-a' ? new Promise(resolve => { resolveList = resolve; }) : { kind: 'ready', links: [] }; },
    create: async (_id, _draft, signal) => { signals.push(signal); return new Promise(resolve => { resolveCreate = resolve; }); },
  }, value => { state = value; });
  const oldLoad = sharing.load('project-a', true);
  await sharing.load('project-b', true);
  resolveList({ kind: 'ready', links: [link] });
  await oldLoad;
  expect(state.links).toEqual([]);
  expect(signals[0].aborted).toBe(true);
  const pending = sharing.create(draft);
  await sharing.load('project-b', false);
  resolveCreate(link);
  expect(await pending).toBe(false);
  expect(state).toEqual({ kind: 'denied', links: [], creating: false });
  expect(signals.at(-1)?.aborted).toBe(true);
  expect(await sharing.create(draft)).toBe(false);
  sharing.dispose();
});

test('list failures recover on retry and closing discards a late failure without publishing', async () => {
  let state!: ShareManagementState;
  let reject!: (reason: Error) => void;
  let retry = false;
  const sharing = createShareManagement({
    list: async () => { if (!retry) throw new Error('private endpoint'); return { kind: 'ready', links: [link] }; },
    create: async () => new Promise((_resolve, no) => { reject = no; }),
  }, value => { state = value; });
  await sharing.load('project-a', true);
  expect(state).toEqual({ kind: 'unavailable', links: [], creating: false, error: 'Could not load review links. Try again.' });
  retry = true;
  await sharing.load('project-a', true);
  expect(state.links).toEqual([link]);
  const pending = sharing.create(draft);
  const beforeClose = state;
  sharing.dispose();
  reject(new Error('late private failure'));
  expect(await pending).toBe(false);
  expect(state).toBe(beforeClose);
});

test('the unconfigured gateway cannot create a usable link, and malformed link destinations are never exposed', async () => {
  const { offlineShareGateway } = await import('./share-management');
  let state!: ShareManagementState;
  const offline = createShareManagement(offlineShareGateway, value => { state = value; });
  await offline.load('project-a', true);
  expect(state).toEqual({ kind: 'unavailable', links: [], creating: false });
  expect(await offline.create(draft)).toBe(false);
  offline.dispose();
  const malformed = createShareManagement({
    list: async () => ({ kind: 'ready', links: [] }),
    create: async () => ({ ...link, path: 'https://another-site.example/review/token', passcodeHash: 'private' }),
  }, value => { state = value; });
  await malformed.load('project-a', true);
  expect(await malformed.create(draft)).toBe(false);
  expect(state.links).toEqual([]);
  malformed.dispose();
});
