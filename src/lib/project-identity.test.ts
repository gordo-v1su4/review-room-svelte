import { expect, test } from 'bun:test';
import { setProjectArchived, updateProjectIdentity, type ProjectIdentity } from './project-identity';

const project: ProjectIdentity = { id: 'studio', name: 'Studio', clientName: 'Client', description: 'Previous brief', brandColor: '#14b8a6', bannerUrl: 'blob:old' };
const access = { isAdmin: true, editableProjectIds: ['studio'] };
const draft = { name: '  Final review  ', clientName: '  ', description: '  New brief  ', brandColor: '#A0C4FF' };

test('an admin owner can archive and restore a project without losing its identity', () => {
  const owner = { isAdmin: true, ownedProjectIds: ['studio'] };
  const archived = setProjectArchived(project, true, owner);
  expect(archived).toEqual({ id: 'studio', name: 'Studio', clientName: 'Client', description: 'Previous brief', brandColor: '#14b8a6', bannerUrl: 'blob:old', archived: true });
  expect(project.archived).toBeUndefined();
  expect(setProjectArchived(archived, true, owner)).toEqual(archived);
  expect(setProjectArchived(archived, false, owner)).toEqual(project);
  expect(archived.archived).toBe(true);
});

test('archive and restore reject non-admin owners, editors and unrelated owners without changing the project', () => {
  const archived = Object.freeze({ ...project, archived: true });
  const original = Object.freeze({ ...project });
  const deniedAccess = [
    { isAdmin: false, ownedProjectIds: ['studio'] },
    { isAdmin: true, ownedProjectIds: [], editableProjectIds: ['studio'] },
    { isAdmin: true, ownedProjectIds: ['other'] }
  ];
  for (const denied of deniedAccess) {
    expect(() => setProjectArchived(original, true, denied)).toThrow('Project owner and admin access required');
    expect(() => setProjectArchived(archived, false, denied)).toThrow('Project owner and admin access required');
  }
  expect(original).toEqual(project);
  expect(archived).toEqual({ ...project, archived: true });
});

test('identity edits trim fields, clear optional text and preserve project identity and existing banner', () => {
  const result = updateProjectIdentity(project, draft, access);
  expect(result).toEqual({ id: 'studio', name: 'Final review', description: 'New brief', brandColor: '#a0c4ff', bannerUrl: 'blob:old' });
  expect(project.clientName).toBe('Client');
  expect(updateProjectIdentity(result, { ...draft, description: '', bannerUrl: null }, access).bannerUrl).toBeUndefined();
  expect(updateProjectIdentity(result, { ...draft, description: '' }, access).description).toBeUndefined();
});
test('only an admin with edit access to this project can change identity', () => {
  expect(() => updateProjectIdentity(project, draft, { ...access, isAdmin: false })).toThrow('Project editing is unavailable');
  expect(() => updateProjectIdentity(project, draft, { ...access, editableProjectIds: ['other'] })).toThrow('Project editing is unavailable');
});
test('archived identity cannot be edited until its owner restores the project', () => {
  const archived = Object.freeze({ ...project, archived: true });
  expect(() => updateProjectIdentity(archived, draft, access)).toThrow('Restore the project before editing');
  const restored = setProjectArchived(archived, false, { isAdmin: true, ownedProjectIds: ['studio'] });
  expect(updateProjectIdentity(restored, draft, access).name).toBe('Final review');
  expect(archived.name).toBe('Studio');
  expect(archived.bannerUrl).toBe('blob:old');
});
test('invalid names, colors and remote banner values cannot corrupt local identity', () => {
  expect(() => updateProjectIdentity(project, { ...draft, name: '   ' }, access)).toThrow('Enter a project name');
  expect(() => updateProjectIdentity(project, { ...draft, brandColor: 'red;url(https://example.com)' }, access)).toThrow('Choose a six-digit hex color');
  expect(() => updateProjectIdentity(project, { ...draft, bannerUrl: 'https://example.com/banner' }, access)).toThrow('Choose a local banner image');
  expect(updateProjectIdentity(project, { ...draft, bannerUrl: 'blob:new' }, access).bannerUrl).toBe('blob:new');
});
