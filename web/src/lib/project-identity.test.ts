import { expect, test } from 'bun:test';
import { updateProjectIdentity, type ProjectIdentity } from './project-identity';

const project: ProjectIdentity = { id: 'studio', name: 'Studio', clientName: 'Client', description: 'Previous brief', brandColor: '#14b8a6', bannerUrl: 'blob:old' };
const access = { isAdmin: true, editableProjectIds: ['studio'] };
const draft = { name: '  Final review  ', clientName: '  ', description: '  New brief  ', brandColor: '#A0C4FF' };

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
test('invalid names, colors and remote banner values cannot corrupt local identity', () => {
  expect(() => updateProjectIdentity(project, { ...draft, name: '   ' }, access)).toThrow('Enter a project name');
  expect(() => updateProjectIdentity(project, { ...draft, brandColor: 'red;url(https://example.com)' }, access)).toThrow('Choose a six-digit hex color');
  expect(() => updateProjectIdentity(project, { ...draft, bannerUrl: 'https://example.com/banner' }, access)).toThrow('Choose a local banner image');
  expect(updateProjectIdentity(project, { ...draft, bannerUrl: 'blob:new' }, access).bannerUrl).toBe('blob:new');
});
