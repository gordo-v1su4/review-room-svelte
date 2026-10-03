import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const clip = await readFile('output/playwright/processing.mp4');
const poster = await readFile('output/playwright/processing.jpg');
const broken = Buffer.from(clip);
const mdat = broken.indexOf(Buffer.from('mdat'));
const length = broken.readUInt32BE(mdat - 4);
broken.fill(0, mdat + 4, mdat - 4 + length);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
let posterUnavailable = false;
let status = 'error', updatedAt = 10, attempt = 1, delivery = 'ready';
const updates = () => ['a', 'b'].map(id => ({ assetId: id, versionId: `version-${id}`, versionNumber: 1,
  updatedAt, ready: status === 'ready', hasPoster: true,
  job: { _id: `job-${id}`, assetId: id, versionId: `version-${id}`, attempt, status, stage: 'derivatives', createdAt: 1, updatedAt } }));
await page.route('**/api/owner-processing', route => route.fulfill({ json: updates() }));
await page.route('**/api/media-jobs/*/retry', route => {
  status = 'running'; updatedAt++; attempt++; return route.fulfill({ json: {} });
});
await page.route('**/api/owner-media/**', route => route.fulfill(delivery === 'unavailable' ? { status: 404 }
  : delivery === 'expired' ? { status: 403 }
  : { body: delivery === 'decoder' ? broken : clip, contentType: 'video/mp4' }));
await page.route('**/api/owner-poster/**', route => route.fulfill(posterUnavailable ? { status: 404 } : { body: poster, contentType: 'image/jpeg' }));
await page.route('**/api/owner-review', route => route.fulfill({ json: {} }));
async function open() {
  await page.goto('http://127.0.0.1:5173/dev/processing-workspace');
  await page.getByRole('button', { name: '20261002', exact: false }).first().click();
  await page.getByRole('button', { name: 'Open VID_CHECK_a', exact: true }).click();
}
try {
  await open();
  await page.getByText('Processing failed. Retry processing above.', { exact: true }).waitFor();
  assert.equal(await page.locator('video[aria-label="VID_CHECK_a"]').getAttribute('src'), null);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await page.getByText('Processing video…', { exact: true }).waitFor();
  status = 'ready'; updatedAt++;
  await page.waitForFunction(() => document.querySelector('video[aria-label="VID_CHECK_a"]')?.readyState >= 2);
  console.log('PASS: failed ingest offers retry and becomes playable without reloading');
  for (const failure of ['unavailable', 'expired', 'decoder']) {
    delivery = failure;
    await open();
    const text = failure === 'unavailable' ? 'Media is unavailable.' : failure === 'expired' ? 'Your media access has expired.' : 'This video could not be decoded.';
    await page.getByRole('alert').filter({ hasText: text }).waitFor();
    if (failure === 'decoder') assert.equal(await page.locator('video[aria-label="VID_CHECK_a"]').evaluate(v => v.error?.code), 3);
    delivery = 'ready';
    await page.getByRole('button', { name: 'Retry playback', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('video[aria-label="VID_CHECK_a"]')?.readyState >= 2);
    console.log(`PASS: ${failure} is accurate and retry restores actual playback`);
  }
  posterUnavailable = true;
  await open();
  await page.getByText('Preview unavailable', { exact: true }).first().waitFor();
  assert.equal(await page.locator('img').evaluateAll(images => images.filter(image => image.complete && image.naturalWidth === 0).length), 0);
  console.log('PASS: missing poster uses a deliberate placeholder without a broken image');
} finally { await browser.close(); }
