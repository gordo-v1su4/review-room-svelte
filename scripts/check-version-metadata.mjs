import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
let saved;
let reads = 0;
let revision = 2;
let delayRead = false;
const details = id => ({ id, assetId: 'a', version: id === 'version-a' ? 2 : 1,
  processingState: 'ready', hasPoster: false, sizeBytes: 100, mimeType: 'video/mp4',
  metadata: id === 'version-a' ? saved?.metadata ?? null : null,
  metadataUpdatedAt: id === 'version-a' && saved ? revision : null });
await page.route('**/api/owner-processing', route => route.fulfill({ json: [] }));
await page.route('**/api/owner-review', route => route.fulfill({ json: {} }));
await page.route('**/api/owner-media/**', route => route.fulfill({ status: 404 }));
await page.route('**/api/owner-version-metadata**', async route => {
  if (route.request().method() === 'POST') {
    const request = route.request().postDataJSON();
    if (saved && request.expectedUpdatedAt !== revision) return route.fulfill({ status: 409, json: { message: 'Metadata changed in another session. Your draft is retained.' } });
    saved = request;
    return route.fulfill({ json: { updatedAt: revision } });
  }
  reads++;
  if (delayRead) await new Promise(resolve => setTimeout(resolve, 500));
  return route.fulfill({ json: details(new URL(route.request().url()).searchParams.get('versionId')) });
});
try {
  await page.goto('http://127.0.0.1:5173/dev/version-metadata');
  await page.getByRole('button', { name: 'Imported clips', exact: false }).first().click();
  await page.getByRole('button', { name: 'Open VID_CHECK_a', exact: true }).click();
  await page.getByRole('button', { name: 'Notes & info', exact: true }).click();
  await page.getByRole('tab', { name: 'Fields', exact: true }).click();
  const prompt = page.getByRole('textbox', { name: 'Prompt', exact: true });
  const label = page.getByRole('textbox', { name: 'Source label', exact: true });
  await prompt.waitFor();
  assert.equal(await prompt.inputValue(), 'Imported prompt');
  assert.equal(await label.inputValue(), 'Imported title');
  assert.equal(await page.getByLabel('Source created (UTC)', { exact: true }).inputValue(), '2026-10-01T00:00');
  const version = page.getByLabel('Asset version', { exact: true });
  await version.selectOption('version-old');
  await page.waitForFunction(() => document.querySelector('textarea[aria-label="Prompt"]')?.value === '');
  assert.equal(await page.getByText('known-original.mov', { exact: true }).count(), 1);
  const refreshed = page.waitForResponse(r => r.url().includes('owner-version-metadata?versionId=version-a'));
  await version.selectOption('version-a');
  await page.waitForFunction(() => document.querySelector('textarea[aria-label="Prompt"]')?.value === 'Imported prompt');
  // Wait for the explicit refresh response to be applied, not just the synchronous switch.
  await refreshed;
  await page.evaluate(() => new Promise(requestAnimationFrame));
  assert.equal(await prompt.inputValue(), 'Imported prompt');
  assert.equal(await label.inputValue(), 'Imported title');
  assert.equal(await page.getByText('known-original.mov', { exact: true }).count(), 1);
  console.log('PASS: exact-version switch and refresh retain imported metadata and filename; unrelated version stays empty');
  await page.getByRole('button', { name: 'Save version metadata', exact: true }).click();
  await page.getByText('Saved', { exact: true }).waitFor();
  assert.equal(saved.versionId, 'version-a');
  assert.equal(saved.expectedUpdatedAt, null);
  assert.equal(saved.metadata.prompt, 'Imported prompt');
  assert.equal(saved.metadata.model, 'Imported model');
  assert.equal(saved.metadata.sourceLabel, 'Imported title');
  assert.equal(saved.metadata.sourceCreatedAt, Date.parse('2026-10-01T00:00:00Z'));
  console.log('PASS: save after refresh sends all imported identity and creative fields on the exact version');
  await prompt.fill('');
  await label.fill('');
  await page.getByRole('button', { name: 'Save version metadata', exact: true }).click();
  await page.getByText('Saved', { exact: true }).waitFor();
  assert.equal(saved.metadata.prompt, '');
  await version.selectOption('version-old');
  const savedRefresh = page.waitForResponse(r => r.url().includes('owner-version-metadata?versionId=version-a'));
  await version.selectOption('version-a');
  await savedRefresh;
  await page.evaluate(() => new Promise(requestAnimationFrame));
  assert.equal(await prompt.inputValue(), '');
  assert.equal(await label.inputValue(), '');
  assert.equal(await page.getByText('known-original.mov', { exact: true }).count(), 1);
  assert.ok(reads >= 4);
  console.log('PASS: deliberately cleared saved fields remain empty after switching and refresh');
  saved = { ...saved, metadata: { ...saved.metadata, prompt: 'Newer session prompt' } };
  revision = 3;
  await prompt.fill('My retained draft');
  await page.getByRole('button', { name: 'Save version metadata', exact: true }).click();
  const reload = page.getByRole('button', { name: 'Discard draft and reload latest metadata', exact: true });
  await reload.waitFor();
  assert.equal(await prompt.inputValue(), 'My retained draft');
  delayRead = true;
  await reload.click();
  assert.ok(await prompt.isDisabled(), 'Metadata edits must be disabled during discard/reload');
  await page.getByText('Reloaded latest metadata', { exact: true }).waitFor();
  assert.equal(await prompt.inputValue(), 'Newer session prompt');
  delayRead = false;
  await prompt.fill('After conflict recovery');
  await page.getByRole('button', { name: 'Save version metadata', exact: true }).click();
  await page.getByText('Saved', { exact: true }).waitFor();
  assert.equal(saved.expectedUpdatedAt, 3);
  assert.equal(saved.metadata.prompt, 'After conflict recovery');
  console.log('PASS: conflicts retain edits until explicit discard/reload, then save with the latest revision');
  await mkdir('output/playwright', { recursive: true });
  await page.screenshot({ path: 'output/playwright/pr15-metadata-verification.png' });
} finally { await browser.close(); }
