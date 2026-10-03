import assert from 'node:assert/strict';
import { ConvexHttpClient } from 'convex/browser';
const client = new ConvexHttpClient(process.env.REVIEW_ROOM_CONVEX_URL);
client.setAdminAuth(process.env.REVIEW_ROOM_CONVEX_ADMIN_KEY);
const base = 'https://review-room.v1su4.dev';
const snapshot = await client.query('personal:snapshot', {});
const project = snapshot.projects.find(p => p.title === 'V1S-136-137 verification');
assert(project, 'Use only the named synthetic verification project');
const asset = snapshot.assets.find(a => a.projectId === project._id && a.processingStatus === 'ready');
assert(asset, 'Synthetic clip must be ready');
const version = snapshot.versions.find(v => v._id === asset.currentVersionId);
const get = (path, headers) => fetch(base + path, { headers, redirect: 'manual' });
const owner = await get(`/api/owner-media/${asset._id}`);
assert.equal(owner.status, 303); console.log('PASS anonymous owner media requires sign-in');
const invalid = await get(`/api/review-media/invalid-verification-token/${asset._id}`);
assert.equal(invalid.status, 404); console.log('PASS invalid review token denied');
const link = await client.mutation('personal:createReviewLink', { projectId: project._id });
try {
 const path = `/api/review-media/${link.token}/${asset._id}`;
 const range = await get(path, { Range: 'bytes=0-65535' });
 assert.equal(range.status, 206); assert.equal((await range.arrayBuffer()).byteLength, 65536);
 assert.equal(range.headers.get('cache-control'), 'private, no-cache');
 const etag = range.headers.get('etag');
 const head = await fetch(base + path, { method: 'HEAD' });
 assert.equal(head.status, 200); assert.equal(Number(head.headers.get('content-length')), version.sizeBytes);
 const validated = await get(path, { 'If-None-Match': etag }); assert.equal(validated.status, 304);
 const malformed = await get(path, { Range: 'bytes=4-2' }); assert.equal(malformed.status, 416);
 const wrongScope = await get(`/api/review-media/${link.token}/m97d5kdphq5aextmqafs3s1q3n8fgy6z`);
 assert.equal(wrongScope.status, 404);
 console.log('PASS deployed range, HEAD, ETag, malformed range, and token scope');
 await client.mutation('personal:revokeReviewLink', { linkId: link.linkId });
 const revoked = await get(path, { Range: 'bytes=0-65535' }); assert.equal(revoked.status, 404);
 console.log('PASS revoked token denied after warming media cache');
} finally { await client.mutation('personal:revokeReviewLink', { linkId: link.linkId }); }
const expiring = await client.mutation('personal:createReviewLink', { projectId: project._id, expiresAt: Date.now() + 3000 });
try {
 const path = `/api/review-media/${expiring.token}/${asset._id}`;
 assert.equal((await get(path, { Range: 'bytes=0-10' })).status, 206);
 await new Promise(resolve => setTimeout(resolve, 3500));
 assert.equal((await get(path, { Range: 'bytes=0-10' })).status, 404);
 console.log('PASS expired review token denied after warming media cache');
} finally { await client.mutation('personal:revokeReviewLink', { linkId: expiring.linkId }); }
