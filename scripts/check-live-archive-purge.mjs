import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { ConvexHttpClient } from 'convex/browser';
import { anyApi } from 'convex/server';
import { S3Client, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Run through the BWS process wrapper. Fixture imports only append new QA rows.
const url = 'https://review-convex.v1su4.dev';
const client = new ConvexHttpClient(url);
assert(process.env.REVIEW_ROOM_CONVEX_SELF_HOSTED_ADMIN_KEY, 'Use the protected BWS wrapper');
client.setAdminAuth(process.env.REVIEW_ROOM_CONVEX_SELF_HOSTED_ADMIN_KEY);
const storage = new S3Client({ endpoint: 'https://s3.v1su4.dev', region: 'us-east-1', forcePathStyle: true,
  credentials: { accessKeyId: process.env.REVIEW_ROOM_S3_ACCESS_KEY, secretAccessKey: process.env.REVIEW_ROOM_S3_SECRET_KEY } });
const bucket = 'review-room-svelte';
const directory = '.scratch/release-readiness/archive-purge';
mkdirSync(directory, { recursive: true });
const statePath = `${directory}/state.json.local`;
const summaryPath = 'docs/verification/evidence/archive-purge-20261007.json';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const cliEnv = { ...process.env, CONVEX_SELF_HOSTED_URL: url,
  CONVEX_SELF_HOSTED_ADMIN_KEY: process.env.REVIEW_ROOM_CONVEX_SELF_HOSTED_ADMIN_KEY };
async function append(table, rows) {
  assert(rows.length && rows.every(row => !('_id' in row)), 'Only new fixture records may be appended');
  const path = `${directory}/${table}.json.local`;
  writeFileSync(path, JSON.stringify(rows));
  const proc = Bun.spawn(['bunx', 'convex', 'import', '--append', '--table', table, '--format', 'jsonArray', path],
    { env: cliEnv, stdout: 'pipe', stderr: 'pipe' });
  const [output, errors, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  assert.equal(code, 0, `Synthetic ${table} append failed: ${errors.replaceAll(process.env.REVIEW_ROOM_CONVEX_SELF_HOSTED_ADMIN_KEY, '<REDACTED>')}`);
  console.log(`Appended ${rows.length} synthetic ${table} rows`);
}
async function dependentCounts(state) {
  const query = `const projectId=${JSON.stringify(state.projectId)}, assetId=${JSON.stringify(state.assetId)}, token=${JSON.stringify(state.runId)};
    return { uploadSessions:(await ctx.db.query('uploadSessions').withIndex('by_project',q=>q.eq('projectId',projectId)).collect()).length,
      commentReactions:(await ctx.db.query('commentReactions').withIndex('by_project',q=>q.eq('projectId',projectId)).collect()).length,
      preferences:(await ctx.db.query('workspacePreferences').withIndex('by_project_user',q=>q.eq('projectId',projectId)).collect()).length,
      reviewerSessions:(await ctx.db.query('reviewerSessions').withIndex('by_token',q=>q.eq('token',token)).collect()).length };`;
  // Use the same readonly run_test_function protocol as the installed Convex CLI;
  // its Windows process prints the result then crashes during libuv shutdown.
  const response = await fetch(url + '/api/run_test_function', { method: 'POST', headers: { 'content-type': 'application/json',
    authorization: `Convex ${process.env.REVIEW_ROOM_CONVEX_SELF_HOSTED_ADMIN_KEY}` }, body: JSON.stringify({
      adminKey: process.env.REVIEW_ROOM_CONVEX_SELF_HOSTED_ADMIN_KEY, args: {}, format: 'convex_encoded_json',
      bundle: { path: 'testQuery.js', source: `import { query } from "convex:/_system/repl/wrappers.js"; export default query({handler:async(ctx)=>{${query}}});` } }) });
  assert(response.ok, `Readonly fixture observation failed (${response.status})`);
  const result = await response.json();
  assert.equal(result.status, 'success', 'Readonly fixture observation failed');
  return result.value;
}
const snapshot = () => client.query(anyApi.personal.snapshot, {});
async function head(key) {
  try { const result = await storage.send(new HeadObjectCommand({ Bucket: bucket, Key: key })); return { status: 200, bytes: result.ContentLength }; }
  catch (error) {
    if (error.$metadata?.httpStatusCode === 404) return { status: 404 };
    // Scoped credentials can return 403 for a missing HEAD because the request
    // has no bucket-prefix condition. A successful exact-prefix list proves absence.
    if (error.$metadata?.httpStatusCode === 403) {
      const listed = await storage.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: key, MaxKeys: 100 }));
      assert(!listed.IsTruncated, 'Bounded exact-prefix object listing must be complete');
      const found = listed.Contents?.find(row => row.Key === key);
      if (found) return { status: 200, bytes: found.Size, existenceVerifiedByScopedListing: true };
      return { status: 404, absenceVerifiedByScopedListing: true };
    }
    throw error;
  }
}
function scoped(s, projectId) {
  const assets = s.assets.filter(row => row.projectId === projectId);
  const ids = new Set(assets.map(row => row._id));
  return { projects: s.projects.filter(row => row._id === projectId), folders: s.folders.filter(row => row.projectId === projectId),
    assets, versions: s.versions.filter(row => ids.has(row.assetId)), jobs: s.mediaJobs.filter(row => ids.has(row.assetId)),
    comments: s.comments.filter(row => row.projectId === projectId), links: s.links.filter(row => row.projectId === projectId) };
}
const stage = process.argv[2] ?? 'setup';
let state;
if (stage === 'setup') {
  const before = await snapshot();
  const canonical = before.projects.find(row => row.title === 'Trailer Feed');
  assert(canonical && scoped(before, canonical._id).assets.length === 13, 'Canonical baseline must remain thirteen assets');
  const ownerId = canonical.createdBy;
  const existing = before.projects.filter(row => row.title.startsWith('Scheduled purge QA 2026-10-07 '));
  assert(existing.length <= 1, 'Resolve multiple disposable purge fixtures before setup');
  const existingAsset = existing[0] && before.assets.find(row => row.projectId === existing[0]._id);
  const run = existingAsset?.title.replace('VID_PURGE_QA_', '') ?? randomUUID();
  const title = `Scheduled purge QA 2026-10-07 ${run.slice(0, 8)}`;
  const projectId = existing[0]?._id ?? await client.mutation(anyApi.personal.createProject, { title, description: 'Disposable scheduled-purge runtime fixture. No canonical media.' });
  const prefix = `assets/${projectId}/purge-qa-${run}`;
  const keys = { original: `${prefix}/original.mp4`, poster: `${prefix}/poster.jpg`, sprite: `${prefix}/sprite.jpg`,
    cover: `${prefix}/cover.jpg`, pending: `${prefix}/pending/original.mp4`, pendingSeal: `${prefix}/pending/original.mp4.pending`,
    pendingPoster: `${prefix}/pending/poster.jpg`, pendingPosterSeal: `${prefix}/pending/poster.jpg.pending` };
  const bytes = readFileSync('output/playwright/processing.mp4');
  for (const key of Object.values(keys)) await storage.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes }));
  if (!existing[0]) await append('projectFolders', Array.from({ length: 110 }, (_, i) => ({ projectId, title: `QA folder ${i}`, order: i, createdBy: ownerId,
    createdAt: Date.now(), updatedAt: Date.now(), ...(i === 0 ? { coverImageKey: keys.cover } : {}) })));
  if (!existingAsset) await append('videos', [{ projectId, title: `VID_PURGE_QA_${run}`, originalFilename: 'synthetic.mp4', storageKey: keys.original,
    thumbnailKey: keys.poster, mimeType: 'video/mp4', assetClass: 'VID', sizeBytes: bytes.length, status: 'approved', viewed: false,
    rating: 0, isSelect: false, commentCount: 1, tags: [], downloadEnabled: false, order: 0, uploadedBy: ownerId,
    uploadedAt: Date.now(), updatedAt: Date.now(), processingStatus: 'ready' }]);
  let s = await snapshot();
  const asset = s.assets.find(row => row.projectId === projectId);
  assert(asset, 'Synthetic asset setup failed');
  if (!s.versions.some(row => row.assetId === asset._id)) await append('assetVersions', Array.from({ length: 101 }, (_, i) => ({ assetId: asset._id, version: i + 1,
    originalKey: i === 0 ? keys.original : `${prefix}/version-${i + 1}.mp4`, posterKey: keys.poster,
    mimeType: 'video/mp4', sizeBytes: bytes.length, processingState: 'ready', createdAt: Date.now() })));
  s = await snapshot();
  const version = s.versions.find(row => row.assetId === asset._id && row.version === 1);
  if (!s.mediaJobs.some(row => row.assetId === asset._id)) await append('mediaJobs', [{ assetId: asset._id, versionId: version._id, status: 'queued', stage: 'verify', attempt: 1,
    createdAt: Date.now(), updatedAt: Date.now() }]);
  if (!s.comments.some(row => row.projectId === projectId)) await append('comments', [{ videoId: asset._id, projectId, authorName: 'Synthetic purge QA', authorRole: 'admin', body: 'Disposable fixture', createdAt: Date.now() }]);
  s = await snapshot();
  const comment = s.comments.find(row => row.projectId === projectId);
  await append('commentReactions', Array.from({ length: 101 }, () => ({ commentId: comment._id, videoId: asset._id, projectId,
    appUserId: ownerId, emoji: 'thumbs_up', createdAt: Date.now() })));
  await append('workspacePreferences', Array.from({ length: 101 }, () => ({ projectId, appUserId: ownerId, visibleCardFields: [], updatedAt: Date.now() })));
  const token = `purge-qa-${run}`;
  await append('reviewLinks', [{ projectId, token, canDownload: false, createdAt: Date.now() }]);
  await append('reviewerSessions', Array.from({ length: 101 }, () => ({ token, displayName: 'Synthetic QA', accessKeyHash: hash(run), expiresAt: Date.now() - 1, createdAt: Date.now() })));
  const expiresAt = Date.now() + 20_000;
  await append('uploadSessions', Array.from({ length: 51 }, (_, i) => ({ projectId,
    objectKey: i === 0 ? keys.pending : `${prefix}/pending-${i}/original.mp4`, originalFilename: 'synthetic.mp4',
    mimeType: 'video/mp4', sizeBytes: bytes.length, status: 'pending', expiresAt: i === 0 ? expiresAt : Date.now() - 1, createdAt: Date.now() })));
  s = await snapshot();
  state = { title, projectId, ownerId, assetId: asset._id, versionId: version._id,
    jobId: s.mediaJobs.find(row => row.assetId === asset._id)._id, runId: `purge-qa-${run}`, expiresAt, keys,
    canonicalId: canonical._id, canonicalDigest: hash(scoped(before, canonical._id)),
    canonicalKey: before.versions.find(row => before.assets.find(asset => asset._id === row.assetId)?.projectId === canonical._id).originalKey };
  writeFileSync(statePath, JSON.stringify(state));
  await client.mutation(anyApi.personal.updateProject, { projectId, archived: true });
  const receipt = await client.mutation(anyApi.personal.purgeArchivedProject, { projectId });
  assert.equal(receipt.status, 'queued');
  await assert.rejects(client.mutation(anyApi.personal.updateProject, { projectId, archived: false }), /deletion is in progress/);
  const waiting = scoped(await snapshot(), projectId);
  assert.equal(waiting.versions.length, 101, 'Purge must wait for the active synthetic upload');
  console.log(JSON.stringify({ stage, projectId, queued: true, restoreLocked: true, activeUploadWait: true, syntheticVersions: 101, syntheticFolders: 110 }));
} else {
  state = JSON.parse(readFileSync(stage === 'cleanup-orphan' ? `${directory}/pre-fix-state.json.local` : statePath, 'utf8'));
  assert(state.title.startsWith('Scheduled purge QA 2026-10-07 ') && Object.values(state.keys).every(key => key.startsWith(`assets/${state.projectId}/purge-qa-`)), 'Fixture scope mismatch');
  if (stage === 'release') {
    assert(Date.now() > state.expiresAt, 'Allow the bounded twenty-second synthetic upload expiry');
    await client.mutation(anyApi.personal.continueArchivedPurge, { projectId: state.projectId, ownerId: state.ownerId });
    assert.equal(scoped(await snapshot(), state.projectId).versions.length, 101, 'Queued job must retain versions');
    await client.mutation(anyApi.mediaJobs.markStage, { jobId: state.jobId, attempt: 1, runId: state.runId, stage: 'derivatives' });
    await client.mutation(anyApi.personal.continueArchivedPurge, { projectId: state.projectId, ownerId: state.ownerId });
    assert.equal(scoped(await snapshot(), state.projectId).versions.length, 101, 'Running job must retain versions');
    await client.mutation(anyApi.mediaJobs.markStage, { jobId: state.jobId, attempt: 1, runId: state.runId, stage: 'finalize' });
    await client.mutation(anyApi.mediaJobs.complete, { jobId: state.jobId, attempt: 1, runId: state.runId, durationSec: 4,
      width: 320, height: 180, thumbnailKey: state.keys.poster, spriteKey: state.keys.sprite });
    const retry = await client.mutation(anyApi.personal.purgeArchivedProject, { projectId: state.projectId });
    assert.equal(retry.status, 'queued');
    // A fresh worker invocation of the same captured continuation proves recovery;
    // every following dependency transaction is scheduled by the real implementation.
    await client.mutation(anyApi.personal.continueArchivedPurge, { projectId: state.projectId, ownerId: state.ownerId });
    console.log(JSON.stringify({ stage, queuedJobWait: true, runningJobWait: true, duplicateStartIdempotent: true, resumedContinuation: true }));
  } else if (stage === 'cleanup-orphan') {
    const s = await snapshot();
    assert(!s.projects.some(row => row._id === state.projectId), 'Old disposable project must already be purged');
    assert(state.keys.cover.endsWith('/cover.jpg'), 'Only the exact known synthetic cover orphan may be removed');
    await storage.send(new DeleteObjectCommand({ Bucket: bucket, Key: state.keys.cover }));
    assert.equal((await head(state.keys.cover)).status, 404, 'Exact synthetic orphan must be absent');
    const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
    summary.oldSyntheticOrphanCleanup = { projectId: state.projectId, exactObjects: 1, objectAbsent: true };
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary.oldSyntheticOrphanCleanup));
  } else if (stage === 'check') {
    const after = await snapshot();
    const remaining = scoped(after, state.projectId);
    const actual = await Promise.all(Object.entries(state.keys).map(async ([kind, key]) => ({ kind, ...await head(key) })));
    const summary = { observedAt: new Date().toISOString(), projectId: state.projectId,
      remaining: { ...Object.fromEntries(Object.entries(remaining).map(([table, rows]) => [table, rows.length])), ...await dependentCounts(state) }, storage: actual,
      canonicalCount: scoped(after, state.canonicalId).assets.length,
      canonicalUnchanged: hash(scoped(after, state.canonicalId)) === state.canonicalDigest,
      canonicalObject: await head(state.canonicalKey) };
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary));
    assert(Object.values(summary.remaining).every(count => count === 0), 'Scheduled dependency cleanup incomplete');
    assert(summary.canonicalUnchanged && summary.canonicalCount === 13 && summary.canonicalObject.status === 200, 'Unrelated canonical media must remain intact');
    assert(actual.every(item => item.status === 404), 'Scheduled purge left synthetic storage objects');
  } else throw new Error('Unknown stage');
}
