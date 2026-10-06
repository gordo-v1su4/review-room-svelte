import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { Id } from '../../../convex/_generated/dataModel';
import { db, personal } from '$lib/server/personal';
import { endOwnerSession, requireOwner } from '$lib/server/owner-auth';

function value(form: FormData, name: string) { return String(form.get(name) ?? '').trim(); }
function origins(form: FormData) { return value(form, 'origins').split(/[\s,]+/).filter(Boolean); }
function done() { redirect(303, '/?sharing=1'); }

export const load: PageServerLoad = async ({ cookies, setHeaders }) => {
  requireOwner(cookies);
  redirect(303, '/?sharing=1');
};

export const actions: Actions = {
  logout: async ({ cookies }) => { endOwnerSession(cookies); redirect(303, '/studio/sign-in'); },
  createProject: async ({ cookies, request }) => {
    requireOwner(cookies); const form = await request.formData();
    await db().mutation(personal.createProject, { title: value(form, 'title'), description: value(form, 'description') }); done();
  },
  updateProject: async ({ cookies, request }) => {
    requireOwner(cookies); const form = await request.formData();
    await db().mutation(personal.updateProject, { projectId: value(form, 'projectId') as Id<'projects'>,
      title: value(form, 'title'), description: value(form, 'description'),
      clientName: form.has('clientName') ? value(form, 'clientName') : undefined,
      brandColor: form.has('brandColor') ? value(form, 'brandColor') : undefined }); done();
  },
  createFolder: async ({ cookies, request }) => {
    requireOwner(cookies); const form = await request.formData();
    await db().mutation(personal.createFolder, { projectId: value(form, 'projectId') as Id<'projects'>,
      title: value(form, 'title'), parentFolderId: value(form, 'parentFolderId') ? value(form, 'parentFolderId') as Id<'projectFolders'> : undefined }); done();
  },
  renameFolder: async ({ cookies, request }) => {
    requireOwner(cookies); const form = await request.formData();
    await db().mutation(personal.renameFolder, { folderId: value(form, 'folderId') as Id<'projectFolders'>,
      title: value(form, 'title') }); done();
  },
  moveFolder: async ({ cookies, request }) => {
    requireOwner(cookies); const form = await request.formData();
    await db().mutation(personal.moveFolder, { folderId: value(form, 'folderId') as Id<'projectFolders'>,
      parentFolderId: value(form, 'parentFolderId') ? value(form, 'parentFolderId') as Id<'projectFolders'> : undefined }); done();
  },
  moveAssets: async ({ cookies, request }) => {
    requireOwner(cookies); const form = await request.formData();
    await db().mutation(personal.moveAssets, { projectId: value(form, 'projectId') as Id<'projects'>,
      folderId: value(form, 'folderId') ? value(form, 'folderId') as Id<'projectFolders'> : undefined,
      assetIds: form.getAll('assetIds').map(String) as Id<'videos'>[] }); done();
  },
  removeFolder: async ({ cookies, request }) => {
    requireOwner(cookies); const form = await request.formData();
    const assetDisposition = value(form, 'assetDisposition');
    if (assetDisposition !== 'move_to_root' && assetDisposition !== 'archive_assets') throw new Error('Invalid folder disposition');
    await db().mutation(personal.removeFolder, { folderId: value(form, 'folderId') as Id<'projectFolders'>, assetDisposition }); done();
  },
  archiveProject: async ({ cookies, request }) => {
    requireOwner(cookies); const form = await request.formData();
    await db().mutation(personal.updateProject, { projectId: value(form, 'projectId') as Id<'projects'>,
      archived: value(form, 'archived') === 'true' }); done();
  },
  approveAsset: async ({ cookies, request }) => {
    requireOwner(cookies); const form = await request.formData();
    await db().mutation(personal.approveAsset, { assetId: value(form, 'assetId') as Id<'videos'> }); done();
  },
  createLink: async ({ cookies, request }) => {
    requireOwner(cookies); const form = await request.formData();
    const expiry = value(form, 'expiresAt');
    await db().mutation(personal.createReviewLink, { projectId: value(form, 'projectId') as Id<'projects'>,
      passcode: value(form, 'passcode') || undefined,
      expiresAt: expiry ? new Date(expiry).getTime() : undefined }); done();
  },
  revokeLink: async ({ cookies, request }) => {
    requireOwner(cookies); const form = await request.formData();
    await db().mutation(personal.revokeReviewLink, { linkId: value(form, 'linkId') as Id<'reviewLinks'> }); done();
  },
  publish: async ({ cookies, request }) => {
    requireOwner(cookies); const form = await request.formData();
    await db().mutation(personal.publishAsset, { assetId: value(form, 'assetId') as Id<'videos'>,
      versionId: value(form, 'versionId') as Id<'assetVersions'>, allowedOrigins: origins(form) }); done();
  },
  replace: async ({ cookies, request }) => {
    requireOwner(cookies); const form = await request.formData();
    await db().mutation(personal.replacePublication, { publicationId: value(form, 'publicationId') as Id<'publications'>,
      versionId: value(form, 'versionId') as Id<'assetVersions'> }); done();
  },
  revokePublication: async ({ cookies, request }) => {
    requireOwner(cookies); const form = await request.formData();
    await db().mutation(personal.revokePublication, { publicationId: value(form, 'publicationId') as Id<'publications'> }); done();
  },
  saveShowcase: async ({ cookies, request }) => {
    requireOwner(cookies); const form = await request.formData();
    await db().mutation(personal.saveShowcase, { showcaseId: value(form, 'showcaseId') ? value(form, 'showcaseId') as Id<'showcases'> : undefined,
      title: value(form, 'title'), publicationIds: form.getAll('publicationIds').map(String) as Id<'publications'>[],
      allowedOrigins: origins(form) }); done();
  }
};
