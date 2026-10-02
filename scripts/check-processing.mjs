import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

// Run against bun dev. The controlled HTTP adapter drives the real mounted workspace.
// Decode real media, never simulated native video events.
await mkdir('output/playwright', { recursive: true });
if (!process.env.PROCESSING_TEST_CLIP) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi',
    '-i', 'testsrc2=size=320x180:rate=24', '-t', '4', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    'output/playwright/processing.mp4']);
}
if (!process.env.PROCESSING_TEST_POSTER) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i',
    process.env.PROCESSING_TEST_CLIP ?? 'output/playwright/processing.mp4', '-frames:v', '1', '-update', '1',
    'output/playwright/processing.jpg']);
}
const clip = await readFile(process.env.PROCESSING_TEST_CLIP ?? 'output/playwright/processing.mp4');
const poster = await readFile(process.env.PROCESSING_TEST_POSTER ?? 'output/playwright/processing.jpg');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
let status = 'queued';
let navigations = 0;
let polls = 0;
let transport = () => states();
let failTransport = false;
let holdNext = false;
let releaseHeld;
const states = () => ['a', 'b'].map(id => ({
  assetId: id, versionId: `version-${id}`, versionNumber: 1, updatedAt: status === 'ready' ? 3 : 2,
  ready: status === 'ready', hasPoster: true, duration: 4, width: 320, height: 180,
  job: { _id: `job-${id}`, assetId: id, versionId: `version-${id}`, attempt: 1,
    status, stage: 'derivatives', createdAt: 1, updatedAt: status === 'ready' ? 3 : 2 }
}));
page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
await page.route('**/api/owner-processing', async route => {
  polls++;
  const ids = route.request().postDataJSON().assetIds;
  assert.ok(ids.length <= 50, 'processing transport must bound each batch');
  const payload = transport().filter(item => ids.includes(item.assetId));
  if (holdNext) {
    holdNext = false;
    await new Promise(resolve => releaseHeld = resolve);
    releaseHeld = undefined;
  }
  await route.fulfill(failTransport ? { status: 503 } : { json: payload }).catch(() => {});
});
await page.route('**/api/owner-media/**', route => route.fulfill(status === 'ready'
  ? { body: clip, contentType: 'video/mp4' } : { status: 404 }));
await page.route('**/api/owner-poster/**', route => route.fulfill(status === 'ready'
  ? { body: poster, contentType: 'image/jpeg' } : { status: 404 }));
await page.route('**/api/owner-review', route => route.fulfill({ json: {} }));

try {
  await page.goto(`${process.env.PROCESSING_TEST_URL ?? 'http://127.0.0.1:5173'}/dev/processing-workspace`);
  await page.getByRole('button', { name: '20261002', exact: false }).first().click();
  await page.getByRole('button', { name: 'Open VID_CHECK_a', exact: true }).click();
  await page.getByText('Processing: Queued', { exact: true }).waitFor();
  const beforeProcessing = navigations;
  status = 'running';
  await page.getByText('Processing: derivatives in progress', { exact: true }).waitFor({ timeout: 12000 });
  status = 'ready';
  await page.getByText('Processing: Ready', { exact: true }).waitFor({ timeout: 12000 });
  await page.waitForFunction(() => document.querySelector('video[aria-label="VID_CHECK_a"]')?.readyState >= 2);
  await page.waitForFunction(() => [...document.images].some(image => image.src.includes('/api/owner-poster/a') && image.naturalWidth > 0));
  assert.equal(navigations, beforeProcessing, 'processing completion must not navigate or reload');
  assert.equal(await page.getByRole('heading', { name: 'VID_CHECK_a', exact: true }).count(), 1);
  console.log('PASS: queued → running → ready updates badge, thumbnail and native playback without reload');

  // The current version wins even when two backend writes share a millisecond.
  transport = () => states().map(item => item.assetId === 'a' ? { ...item,
    versionId: 'version-a2', versionNumber: 2, updatedAt: 4,
    job: { ...item.job, _id: 'job-a2', versionId: 'version-a2', updatedAt: 4 }
  } : item);
  await page.waitForFunction(() => document.querySelector('video[aria-label="VID_CHECK_a"]')?.src.includes('version-a2'));
  const currentVersion = await page.locator('video[aria-label="VID_CHECK_a"]').getAttribute('src');
  const beforeStale = polls;
  transport = () => states().map(item => ({ ...item, updatedAt: 4 }));
  await page.waitForTimeout(3500);
  assert.ok(polls > beforeStale, 'stale update was delivered');
  assert.equal(await page.locator('video[aria-label="VID_CHECK_a"]').getAttribute('src'), currentVersion,
    'an older version cannot replace the current review source');
  console.log('PASS: an older version cannot replace the current review source');

  const latest = states().map(item => item.assetId === 'a' ? { ...item,
    versionId: 'version-a2', versionNumber: 2, updatedAt: 5,
    job: { ...item.job, _id: 'job-a2', versionId: 'version-a2', attempt: 2, updatedAt: 5 }
  } : item);
  transport = () => latest;
  await page.waitForFunction(() => document.querySelector('video[aria-label="VID_CHECK_a"]')?.src.includes('attempt=2'));
  const beforeAttempt = polls;
  transport = () => latest.map(item => item.assetId === 'a' ? { ...item, updatedAt: 6,
    job: { ...item.job, attempt: 1, updatedAt: 6 }
  } : item);
  await page.waitForTimeout(3500);
  assert.ok(polls > beforeAttempt, 'older attempt was delivered');
  assert.ok((await page.locator('video[aria-label="VID_CHECK_a"]').getAttribute('src')).includes('attempt=2'));
  console.log('PASS: a late result from an older attempt cannot replace the current source');

  transport = () => latest;
  holdNext = true;
  for (let tries = 0; !releaseHeld && tries < 80; tries++) await page.waitForTimeout(50);
  assert.ok(releaseHeld, 'a processing response is held while switching assets');
  await page.getByRole('button', { name: 'Open VID_CHECK_b', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('video[aria-label="VID_CHECK_b"]')?.readyState >= 2);
  releaseHeld();
  await page.waitForTimeout(150);
  assert.equal(await page.getByRole('heading', { name: 'VID_CHECK_b', exact: true }).count(), 1);
  console.log('PASS: resolving an earlier processing request does not change the selected asset');

  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('video[aria-label="VID_CHECK_b"]')?.currentTime >= 1);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Notes & info', exact: true }).click();
  await page.getByRole('textbox', { name: 'Comment draft' }).fill('Keep this unsent note');
  const beforeError = polls;
  failTransport = true;
  await page.waitForTimeout(3500);
  assert.ok(polls > beforeError, 'transport failure was exercised');
  assert.equal(await page.getByRole('textbox', { name: 'Comment draft' }).inputValue(), 'Keep this unsent note');
  assert.ok(await page.locator('video[aria-label="VID_CHECK_b"]').evaluate(video => video.currentTime >= 0.99 && video.paused && video.readyState >= 2));
  failTransport = false;
  transport = () => latest.map(item => item.assetId === 'b' ? { ...item, updatedAt: 7,
    job: { ...item.job, stage: 'finalize', runId: 'run-recovery', updatedAt: 7 }
  } : item);
  const beforeRecovery = polls;
  await page.waitForTimeout(3500);
  assert.ok(polls > beforeRecovery, 'transport recovered');
  await page.getByRole('link', { name: 'Run recovery', exact: true }).waitFor();
  assert.ok(await page.locator('video[aria-label="VID_CHECK_b"]').evaluate(video => video.currentTime >= 0.99 && video.paused && video.readyState >= 2));
  assert.equal(await page.getByRole('textbox', { name: 'Comment draft' }).inputValue(), 'Keep this unsent note');
  assert.equal(await page.getByRole('heading', { name: '20261002', exact: true }).count(), 1);
  assert.equal(navigations, beforeProcessing, 'the entire observation journey stays on the open page');
  await page.screenshot({ path: 'output/playwright/processing-ready.png', fullPage: true });
  console.log('PASS: transport failures recover without losing ready playback, playhead, folder or draft');

  holdNext = true;
  for (let tries = 0; !releaseHeld && tries < 80; tries++) await page.waitForTimeout(50);
  assert.ok(releaseHeld, 'processing request is pending on unmount');
  await page.getByRole('button', { name: 'Unmount workspace', exact: true }).click();
  const afterUnmount = polls;
  releaseHeld();
  await page.waitForTimeout(3500);
  assert.equal(polls, afterUnmount, 'unmounted workspace must stop observation');
  assert.equal(await page.getByRole('region', { name: 'Asset review' }).count(), 0);
  console.log('PASS: unmount stops polling and ignores pending responses');

  const unauthorized = await page.request.post(`${process.env.PROCESSING_TEST_URL ?? 'http://127.0.0.1:5173'}/api/owner-processing`, {
    data: { assetIds: ['a'] }, maxRedirects: 0
  });
  assert.equal(unauthorized.status(), 303, 'processing endpoint must require the owner session');
  console.log('PASS: unauthenticated observation is redirected before any backend access');
} finally {
  await browser.close();
}
