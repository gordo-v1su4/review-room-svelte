import { convexTest } from 'convex-test';
import schema from '../convex/schema';
import { internal } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';

const modules = Object.fromEntries([...new Bun.Glob('**/*.{ts,js}').scanSync({ cwd: 'convex' })]
  .map(file => [`../convex/${file}`, () => import(`../convex/${file}`)]));

export const cspDigest = 'e'.repeat(64);
let counter = 0;
export const call = (keyDigest = cspDigest) => ({ keyDigest, requestKey: `series-request-${++counter}`, bodyDigest: (counter % 16).toString(16).repeat(64) });

/** A project with a Creative Studio Pro credential restricted to it and a locked EP101 / 010 PAR tree. */
export async function seriesFixture() {
  const t = convexTest(schema, modules);
  const { project, owner } = await t.run(async ctx => {
    const user = await ctx.db.insert('users', { email: 'owner@review-room.invalid' });
    const owner = await ctx.db.insert('appUsers', { authUserId: user, name: 'Owner', role: 'admin' });
    const project = await ctx.db.insert('projects', { title: 'Blood Rush', slug: 'blood-rush', createdBy: owner, createdAt: 1, updatedAt: 1, downloadEnabledByDefault: false });
    return { project, owner };
  });
  await t.mutation(internal.automation.issue, { name: 'Creative Studio Pro', keyDigest: cspDigest, projectId: project, actions: ['folders:write', 'media:upload', 'media:read'] });
  const episode: Id<'projectFolders'> = await t.mutation(internal.automation.createFolder, { ...call(), projectId: project, title: 'EP101 — The Late Shift', ownerApp: 'creative-studio-pro' });
  const scene: Id<'projectFolders'> = await t.mutation(internal.automation.createFolder, { ...call(), projectId: project, title: '010 PAR — Parking Lot', parentFolderId: episode, ownerApp: 'creative-studio-pro' });
  return { t, project, owner, episode, scene };
}
type Fixture = Awaited<ReturnType<typeof seriesFixture>>;

/** Begin, claim and finalize an automation upload (storage is not involved at this layer). */
export async function automationUpload(f: Pick<Fixture, 't' | 'project'>, input: { folderId?: Id<'projectFolders'>; assetCode?: string; name?: string; mimeType?: string }) {
  const session = await f.t.mutation(internal.automation.beginUpload, { ...call(), projectId: f.project, folderId: input.folderId, ...(input.assetCode ? { assetCode: input.assetCode } : {}),
    originalFilename: input.name ?? 'take.mp4', mimeType: input.mimeType ?? 'video/mp4', sizeBytes: 100 });
  await f.t.mutation(internal.automation.claimUpload, { keyDigest: cspDigest, sessionId: session.sessionId });
  const dir = session.objectKey.slice(0, session.objectKey.lastIndexOf('/'));
  const result = await f.t.mutation(internal.automation.finalizeUpload, { keyDigest: cspDigest, sessionId: session.sessionId, verifiedSizeBytes: 100,
    posterKey: `${dir}/poster.jpg`, durationSec: (input.mimeType ?? 'video/mp4').startsWith('image/') ? 0 : 4, width: 1920, height: 1080 });
  return result as { assetId: Id<'videos'>; jobId?: Id<'mediaJobs'> };
}

/** Workspace (signed-in owner) upload through the same begin/finalize commands the studio uses. */
export async function workspaceUpload(f: Pick<Fixture, 't' | 'project'>, input: { folderId?: Id<'projectFolders'>; name: string; mimeType?: string }) {
  const session = await f.t.mutation(internal.personal.beginUpload, { projectId: f.project, folderId: input.folderId, originalFilename: input.name, mimeType: input.mimeType ?? 'video/mp4', sizeBytes: 100 });
  await f.t.run(ctx => ctx.db.patch(session.sessionId, { status: 'finalizing', finalizingAt: Date.now() }));
  const dir = session.objectKey.slice(0, session.objectKey.lastIndexOf('/'));
  return await f.t.mutation(internal.personal.finalizeUpload, { sessionId: session.sessionId, verifiedSizeBytes: 100, posterKey: `${dir}/poster.jpg`, durationSec: 4, width: 1920, height: 1080 }) as Id<'videos'>;
}
