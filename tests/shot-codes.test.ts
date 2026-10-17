import { test, expect } from 'bun:test';
import { internal } from '../convex/_generated/api';
import { automationUpload, call, seriesFixture } from './series-api-helpers';

test('the automation API names a new asset by its shot code', async () => {
  const f = await seriesFixture();
  const { assetId } = await automationUpload(f, { folderId: f.scene, assetCode: 'blr_ep101_par_0020' });
  const asset = await f.t.run(ctx => ctx.db.get(assetId));
  expect(asset?.assetCode).toBe('BLR_EP101_PAR_0020');
  expect(asset?.title).toBe('BLR_EP101_PAR_0020');
  const deliverable = await automationUpload(f, { assetCode: 'BLR_S1_TRL01' });
  expect((await f.t.run(ctx => ctx.db.get(deliverable.assetId)))?.assetCode).toBe('BLR_S1_TRL01');
});

test('codes that are not shot or deliverable codes are refused', async () => {
  const f = await seriesFixture();
  for (const assetCode of ['VID_20261017_00001', 'BLR_EP101_PAR_0020_v003', 'hello'])
    await expect(f.t.mutation(internal.automation.beginUpload, { ...call(), projectId: f.project, assetCode, originalFilename: 'take.mp4', mimeType: 'video/mp4', sizeBytes: 100 })).rejects.toThrow('Asset code must be');
});

test('a code is unique within the project', async () => {
  const f = await seriesFixture();
  await automationUpload(f, { folderId: f.scene, assetCode: 'BLR_EP101_PAR_0020' });
  await expect(f.t.mutation(internal.automation.beginUpload, { ...call(), projectId: f.project, folderId: f.episode, assetCode: 'BLR_EP101_PAR_0020', originalFilename: 'take.mp4', mimeType: 'video/mp4', sizeBytes: 100 })).rejects.toThrow('Asset code already exists');
});

test('uploads without a code keep the generated VID code', async () => {
  const f = await seriesFixture();
  const { assetId } = await automationUpload(f, {});
  expect((await f.t.run(ctx => ctx.db.get(assetId)))?.assetCode).toMatch(/^VID_\d{8}_\d{5}$/);
});
