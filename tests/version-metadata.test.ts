import { test, expect } from 'bun:test';
import { convexTest } from 'convex-test';
import schema from '../convex/schema';
import { internal } from '../convex/_generated/api';

const modules = Object.fromEntries([...new Bun.Glob('**/*.{ts,js}').scanSync({ cwd: 'convex' })]
  .map(file => [`../convex/${file}`, () => import(`../convex/${file}`)]));

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const user = await ctx.db.insert('users', { email: 'owner@review-room.invalid' });
    const owner = await ctx.db.insert('appUsers', { authUserId: user, name: 'Owner', role: 'admin' });
    const project = await ctx.db.insert('projects', { title: 'Metadata', slug: 'metadata', createdBy: owner, createdAt: 1, updatedAt: 1, downloadEnabledByDefault: false });
    const asset = await ctx.db.insert('videos', { projectId: project, title: 'Clip', originalFilename: 'clip.mp4', storageKey: 'private/clip.mp4', mimeType: 'video/mp4', status: 'awaiting_review', viewed: false, rating: 0, isSelect: false, commentCount: 0, tags: [], downloadEnabled: false, order: 0, uploadedBy: owner, uploadedAt: 1, updatedAt: 1 });
    const versions = [];
    for (const version of [1, 2]) versions.push(await ctx.db.insert('assetVersions', { assetId: asset, version, originalKey: `private/clip-${version}.mp4`, mimeType: 'video/mp4', sizeBytes: 100, processingState: 'ready', createdAt: version }));
    await ctx.db.patch(asset, { currentVersionId: versions[1] });
    return { project, asset, versions };
  });
  return { t, ...ids };
}

test('creative metadata persists on the exact version without changing another version or its original', async () => {
  const { t, versions } = await fixture();
  await t.mutation(internal.personal.updateVersionMetadata, { versionId: versions[0], metadata: { model: 'sora-2', prompt: 'Neon rain', sourceLabel: 'Original V1', sourceCreatedAt: 1234, referenceImageVersionIds: [] } });
  const view = await t.query(internal.personal.snapshot, {});
  const first = view.versions.find(version => version._id === versions[0])!;
  const second = view.versions.find(version => version._id === versions[1])!;
  expect(first.creativeMetadata).toEqual({ model: 'sora-2', prompt: 'Neon rain', sourceLabel: 'Original V1', sourceCreatedAt: 1234, referenceImageVersionIds: [] });
  expect(first.originalKey).toBe('private/clip-1.mp4');
  expect(second.creativeMetadata).toBeUndefined();
  const details = await t.query(internal.personal.versionDetails, { versionId: versions[0] });
  expect(details?.metadata).toEqual(first.creativeMetadata);
  expect(details?.metadataUpdatedAt).toBe(first.metadataUpdatedAt);
  expect(JSON.stringify(details)).not.toContain('private/');
  expect(await t.query(internal.personal.versionDetails, { versionId: 'invalid' })).toBeNull();
});

test('metadata read through a scoped agent credential includes exact version data without storage keys', async () => {
  const { t, project, versions } = await fixture();
  await t.mutation(internal.personal.updateVersionMetadata, { versionId: versions[0], metadata: { model: '', prompt: 'Private creative detail', sourceLabel: '', referenceImageVersionIds: [] } });
  const keyDigest = 'a'.repeat(64);
  await t.mutation(internal.automation.issue, { name: 'Read metadata', keyDigest, projectId: project, actions: ['media:read'] });
  const result = await t.mutation(internal.automation.versionMetadata, { keyDigest, versionId: versions[0] });
  expect(result.metadata.prompt).toBe('Private creative detail');
  expect(result.versionId).toBe(versions[0]);
  expect(JSON.stringify(result)).not.toContain('private/');
});

test('production notes and custom creative fields survive a version metadata save', async () => {
  const { t, versions } = await fixture();
  const metadata = { model: 'Seedance 2.5', prompt: '', sourceLabel: '', referenceImageVersionIds: [], notes: 'Keep the first take', releaseDate: '2026-10-05', releasePlatforms: ['Portfolio'], customFields: [{ id: 'seed', label: 'Seed', kind: 'number' as const, value: 42 }] };
  await t.mutation(internal.personal.updateVersionMetadata, { versionId: versions[1], metadata });
  const view = await t.query(internal.personal.snapshot, {});
  expect(view.versions.find(version => version._id === versions[1])!.creativeMetadata).toEqual(metadata);
});

test('custom field identities use the same trimmed form for persistence and duplicate detection', async () => {
  const { t, versions } = await fixture();
  await t.mutation(internal.personal.updateVersionMetadata, { versionId: versions[0], metadata: {
    model: '', prompt: '', sourceLabel: '', referenceImageVersionIds: [], releaseDate: '',
    customFields: [{ id: ' seed ', label: 'Seed', kind: 'number', value: 7 }, { id: 'date', label: 'Date', kind: 'date', value: '' }],
  } });
  const view = await t.query(internal.personal.versionDetails, { versionId: versions[0] });
  expect(view?.metadata?.customFields?.[0].id).toBe('seed');
  expect(view?.metadata?.releaseDate).toBe('');
  expect(view?.metadata?.customFields?.[1].value).toBe('');
});

test('metadata rejects invalid dates and duplicate custom field identities without replacing saved notes', async () => {
  const { t, versions } = await fixture();
  const metadata = { model: '', prompt: '', sourceLabel: '', referenceImageVersionIds: [], notes: 'Retained' };
  await t.mutation(internal.personal.updateVersionMetadata, { versionId: versions[0], metadata });
  for (const invalid of [
    {},
    { ...metadata, prompt: 42 },
    { ...metadata, referenceImageVersionIds: ['invalid'] },
    { ...metadata, customFields: [{ id: 'bad', label: 'Bad', kind: 'number', value: 'wrong type' }] },
    { ...metadata, unrecognized: 'field' },
    { ...metadata, releaseDate: '2026-02-30' },
    { ...metadata, customFields: [{ id: 'same', label: 'First', kind: 'text' as const, value: '' }, { id: 'same', label: 'Second', kind: 'text' as const, value: '' }] },
  ]) await expect(t.mutation(internal.personal.updateVersionMetadata, { versionId: versions[0], metadata: invalid })).rejects.toThrow('Invalid creative metadata');
  const view = await t.query(internal.personal.snapshot, {});
  expect(view.versions.find(version => version._id === versions[0])!.creativeMetadata?.notes).toBe('Retained');
});

test('stale session saves cannot overwrite newer version metadata', async () => {
  const { t, versions } = await fixture();
  const metadata = { model: '', prompt: '', sourceLabel: '', referenceImageVersionIds: [] };
  await t.mutation(internal.personal.updateVersionMetadata, { versionId: versions[0], metadata, expectedUpdatedAt: null });
  await expect(t.mutation(internal.personal.updateVersionMetadata, { versionId: versions[0], metadata: { ...metadata, prompt: 'Stale' }, expectedUpdatedAt: null })).rejects.toThrow('Metadata changed');
  await expect(t.mutation(internal.personal.updateVersionMetadata, { versionId: versions[0], metadata, expectedUpdatedAt: null })).rejects.toMatchObject({ data: { code: 'METADATA_CONFLICT' } });
  await expect(t.mutation(internal.personal.updateVersionMetadata, { versionId: 'invalid', metadata })).rejects.toMatchObject({ data: { code: 'VERSION_UNAVAILABLE' } });
  const view = await t.query(internal.personal.snapshot, {});
  expect(view.versions.find(version => version._id === versions[0])!.creativeMetadata?.prompt).toBe('');
});

test('image references stay pinned to an authorized exact version and reject another project', async () => {
  const { t, project, asset, versions } = await fixture();
  const images = await t.run(async ctx => {
    const source = (await ctx.db.get(asset))!;
    const otherProject = await ctx.db.insert('projects', { title: 'Other', slug: 'other', createdBy: source.uploadedBy, createdAt: 1, updatedAt: 1, downloadEnabledByDefault: false });
    const result = [];
    for (const projectId of [project, otherProject]) {
      const image = await ctx.db.insert('videos', { ...Object.fromEntries(Object.entries(source).filter(([key]) => !['_id', '_creationTime', 'currentVersionId'].includes(key))) as Omit<typeof source, '_id' | '_creationTime'>, projectId, assetClass: 'IMG', mimeType: 'image/png', processingStatus: 'ready' });
      const version = await ctx.db.insert('assetVersions', { assetId: image, version: 1, originalKey: 'private/image.png', mimeType: 'image/png', sizeBytes: 100, processingState: 'ready', createdAt: 1 });
      await ctx.db.patch(image, { currentVersionId: version });
      result.push({ image, version });
    }
    return result;
  });
  const metadata = { model: '', prompt: '', sourceLabel: '', gridImageVersionId: images[0].version, referenceImageVersionIds: [images[0].version] };
  await t.mutation(internal.personal.updateVersionMetadata, { versionId: versions[0], metadata });
  expect((await t.query(internal.personal.ownerMedia, { assetId: images[0].image, versionId: images[0].version, poster: false }))?.key).toBe('private/image.png');
  await expect(t.mutation(internal.personal.updateVersionMetadata, { versionId: versions[0], metadata: { ...metadata, referenceImageVersionIds: [images[1].version] } })).rejects.toThrow('Image reference unavailable');
  expect(await t.query(internal.personal.ownerMedia, { assetId: images[0].image, versionId: images[1].version, poster: false })).toBeNull();
  expect(await t.query(internal.personal.ownerMedia, { assetId: images[0].image, versionId: 'invalid', poster: false })).toBeNull();
  expect(await t.query(internal.personal.ownerMedia, { assetId: 'invalid', poster: true })).toBeNull();
});

test('import backfill targets mapped versions and preserves deliberate empty edits and the raw archive', async () => {
  const { t, project, asset, versions } = await fixture();
  const folderId = await t.mutation(internal.personal.createFolder, { projectId: project, title: 'Import' });
  const sourceDocumentsJson = JSON.stringify({ artifacts: [{ artifact_id: 'clip', title: 'Source title', video_model: 'Imported model', version_prompt: 'Imported prompt', created_at: '2026-10-01T00:00:00Z' }] });
  const importId = await t.mutation(internal.sourceImports.save, { sourceProjectId: 'source', projectId: project, folderId, sourceDocumentsJson, mediaMappingsJson: JSON.stringify([{ assetId: asset, versionId: versions[0], sourceArtifactId: 'clip', kind: 'video' }]) });
  await t.mutation(internal.sourceImports.backfillVersionMetadata, { importId });
  let view = await t.query(internal.personal.snapshot, {});
  expect(view.versions.find(v => v._id === versions[0])!.creativeMetadata?.model).toBe('Imported model');
  expect(view.versions.find(v => v._id === versions[1])!.creativeMetadata).toBeUndefined();
  await t.mutation(internal.personal.updateVersionMetadata, { versionId: versions[0], metadata: { model: '', prompt: '', sourceLabel: '', referenceImageVersionIds: [] } });
  await t.mutation(internal.sourceImports.backfillVersionMetadata, { importId });
  view = await t.query(internal.personal.snapshot, {});
  expect(view.versions.find(v => v._id === versions[0])!.creativeMetadata?.model).toBe('');
  expect((await t.query(internal.sourceImports.list, {}))[0].sourceDocumentsJson).toBe(sourceDocumentsJson);
});

test('scoped metadata reads reject upload-only, foreign-project and revoked credentials', async () => {
  const { t, project, versions } = await fixture();
  const other = await t.mutation(internal.personal.createProject, { title: 'Other scope' });
  for (const [keyDigest, actions, projectId] of [
    ['b'.repeat(64), ['media:upload'], project],
    ['c'.repeat(64), ['media:read'], other],
  ] as const) {
    await t.mutation(internal.automation.issue, { name: 'Denied', keyDigest, projectId, actions: [...actions] });
    await expect(t.mutation(internal.automation.versionMetadata, { keyDigest, versionId: versions[0] })).rejects.toThrow('Automation scope denied');
  }
  const keyDigest = 'd'.repeat(64);
  const credentialId = await t.mutation(internal.automation.issue, { name: 'Revoked', keyDigest, projectId: project, actions: ['media:read'] });
  await t.mutation(internal.automation.revoke, { credentialId });
  await expect(t.mutation(internal.automation.versionMetadata, { keyDigest, versionId: versions[0] })).rejects.toThrow('Automation credential unavailable');
});

test('importing multiple source artifacts into one asset preserves each mapped version metadata', async () => {
  const { t, project, asset, versions } = await fixture();
  const folderId = await t.mutation(internal.personal.createFolder, { projectId: project, title: 'Versions' });
  const importId = await t.mutation(internal.sourceImports.save, { sourceProjectId: 'multi', projectId: project, folderId,
    sourceDocumentsJson: JSON.stringify({ artifacts: [{ artifact_id: 'first', video_model: 'First model', version_prompt: 'First prompt' }, { artifact_id: 'second', video_model: 'Second model', version_prompt: 'Second prompt' }] }),
    mediaMappingsJson: JSON.stringify([{ assetId: asset, versionId: versions[0], sourceArtifactId: 'first', kind: 'video' }, { assetId: asset, versionId: versions[1], sourceArtifactId: 'second', kind: 'video' }]),
  });
  await t.mutation(internal.sourceImports.backfillVersionMetadata, { importId });
  const view = await t.query(internal.personal.snapshot, {});
  expect(view.versions.find(v => v._id === versions[0])!.creativeMetadata?.prompt).toBe('First prompt');
  expect(view.versions.find(v => v._id === versions[1])!.creativeMetadata?.model).toBe('Second model');
});

test('an ambiguous legacy import mapping reports its identity while valid mappings still migrate', async () => {
  const { t, project, asset, versions } = await fixture();
  const folderId = await t.mutation(internal.personal.createFolder, { projectId: project, title: 'Mixed import' });
  const importId = await t.mutation(internal.sourceImports.save, { sourceProjectId: 'mixed', projectId: project, folderId,
    sourceDocumentsJson: JSON.stringify({ artifacts: [{ artifact_id: 'ambiguous', video_model: 'Unknown version' }, { artifact_id: 'valid', video_model: 'Ready model' }] }),
    mediaMappingsJson: JSON.stringify([{ assetId: asset, sourceArtifactId: 'ambiguous', kind: 'video' }, { assetId: asset, versionId: versions[1], sourceArtifactId: 'valid', kind: 'video' }]),
  });
  const result = await t.mutation(internal.sourceImports.backfillVersionMetadata, { importId });
  expect(result.migrated).toBe(1);
  expect(result.failures).toEqual([{ sourceArtifactId: 'ambiguous', code: 'VERSION_MAPPING_UNAVAILABLE' }]);
  const view = await t.query(internal.personal.snapshot, {});
  expect(view.versions.find(version => version._id === versions[0])!.creativeMetadata).toBeUndefined();
  expect(view.versions.find(version => version._id === versions[1])!.creativeMetadata?.model).toBe('Ready model');
});
