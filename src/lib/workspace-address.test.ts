import { describe, expect, test } from 'bun:test';
import { parseWorkspaceAddress, resolveWorkspaceAddress, workspaceSearch, type AddressData } from './workspace-address';

const data: AddressData = {
  projects: [{ id: 'p1' }, { id: 'p2' }, { id: 'gone', archived: true }],
  folders: [{ id: 'f1', projectId: 'p1' }, { id: 'f2', projectId: 'p1' }, { id: 'g1', projectId: 'p2' }, { id: 'old', projectId: 'gone' }],
  assets: [
    { id: 'a1', projectId: 'p1', folderId: 'f1', code: 'BLR_TR100_SHT_0010' },
    { id: 'a2', projectId: 'p1', code: 'BLR_TR100_SHT_0020' },
    { id: 'a1copy', projectId: 'p1', folderId: 'f2', code: 'BLR_TR100_SHT_0010', copy: true },
    { id: 'a3', projectId: 'p1', folderId: 'f2', code: 'BLR_TR100_SHT_0030', archived: true },
    { id: 'b1', projectId: 'p2', folderId: 'g1', code: 'BLR_TR100_SHT_0010' },
    { id: 'z1', projectId: 'gone', folderId: 'old', code: 'OLD_TR100_SHT_0010' },
  ],
  versions: [
    { id: 'v-a1-1', assetId: 'a1', version: 1 }, { id: 'v-a1-2', assetId: 'a1', version: 2 }, { id: 'v-a1-12', assetId: 'a1', version: 12 },
    { id: 'v-a2-1', assetId: 'a2', version: 1 }, { id: 'v-b1-3', assetId: 'b1', version: 3 },
  ],
};
const resolve = (search: string) => resolveWorkspaceAddress(parseWorkspaceAddress(search), data);
const nothing = { projectId: null, folderId: null, assetId: null, versionId: null, t: null };

describe('parse', () => {
  test('reads the five parts and ignores everything else', () => {
    expect(parseWorkspaceAddress('?project=p1&folder=f1&asset=a1&version=v003&t=12.5&sharing=1')).toEqual({ project: 'p1', folder: 'f1', asset: 'a1', version: 'v003', t: 12.5 });
    expect(parseWorkspaceAddress(new URLSearchParams('asset=BLR_TR100_SHT_0010'))).toEqual({ asset: 'BLR_TR100_SHT_0010' });
    expect(parseWorkspaceAddress('')).toEqual({});
    expect(parseWorkspaceAddress('?sharing=1')).toEqual({});
  });

  test('empty values, repeated keys and unusable seek times are dropped', () => {
    expect(parseWorkspaceAddress('?project=&folder=%20&asset=a1&asset=a2')).toEqual({ asset: 'a1' });
    for (const t of ['-1', 'abc', 'Infinity', 'NaN', '', '1e999']) expect(parseWorkspaceAddress(`?project=p1&t=${t}`)).toEqual({ project: 'p1' });
    expect(parseWorkspaceAddress('?t=0')).toEqual({ t: 0 });
    expect(parseWorkspaceAddress('?t=90')).toEqual({ t: 90 });
  });
});

describe('serialise', () => {
  test('writes the parts in order and leaves unrelated params in place', () => {
    expect(workspaceSearch('?sharing=1&project=old&t=3', { project: 'p1', folder: 'f1', asset: 'a1', version: 'v002' })).toBe('?project=p1&folder=f1&asset=a1&version=v002&sharing=1');
    expect(workspaceSearch('', { project: 'p1' })).toBe('?project=p1');
    expect(workspaceSearch('?project=p1&folder=f1&asset=a1&version=v002&t=4', {})).toBe('');
    expect(workspaceSearch(new URLSearchParams('utm=x&utm=y'), { project: 'p1', t: 12.5 })).toBe('?project=p1&t=12.5&utm=x&utm=y');
  });

  test('seek times are written short and what is written parses back', () => {
    expect(workspaceSearch('', { project: 'p1', asset: 'a1', t: 12.3456789 })).toBe('?project=p1&asset=a1&t=12.346');
    expect(workspaceSearch('', { project: 'p1', asset: 'a1', t: 0 })).toBe('?project=p1&asset=a1&t=0');
    expect(workspaceSearch('', { project: 'p1', asset: 'a1', t: -4 })).toBe('?project=p1&asset=a1');
    const address = { project: 'p 1', folder: 'f&1', asset: 'BLR_TR100_SHT_0010', version: 'v012', t: 7 };
    expect(parseWorkspaceAddress(workspaceSearch('?sharing=1', address))).toEqual(address);
  });
});

describe('resolve', () => {
  test('project, folder, asset and version by ID, with a seek time', () => {
    expect(resolve('?project=p1&folder=f1&asset=a1&version=v-a1-2&t=12.5')).toEqual({ projectId: 'p1', folderId: 'f1', assetId: 'a1', versionId: 'v-a1-2', t: 12.5 });
    expect(resolve('?project=p1&folder=f2')).toEqual({ ...nothing, projectId: 'p1', folderId: 'f2' });
    expect(resolve('?project=p2')).toEqual({ ...nothing, projectId: 'p2' });
    expect(resolve('')).toEqual(nothing);
  });

  test('an asset code is looked up only inside the given project, and prefers the original over a copy', () => {
    expect(resolve('?project=p1&asset=BLR_TR100_SHT_0010')).toMatchObject({ projectId: 'p1', folderId: 'f1', assetId: 'a1' });
    expect(resolve('?project=p1&asset=blr_tr100_sht_0010')).toMatchObject({ assetId: 'a1' });
    expect(resolve('?project=p2&asset=BLR_TR100_SHT_0010')).toMatchObject({ projectId: 'p2', folderId: 'g1', assetId: 'b1' });
    expect(resolve('?asset=BLR_TR100_SHT_0010')).toEqual(nothing);
    expect(resolve('?project=missing&asset=BLR_TR100_SHT_0010')).toEqual(nothing);
    expect(resolve('?project=p2&asset=BLR_TR100_SHT_0020')).toEqual({ ...nothing, projectId: 'p2' });
  });

  test('an asset ID alone finds its project, and an asset always opens in the folder it lives in', () => {
    expect(resolve('?asset=a1')).toMatchObject({ projectId: 'p1', folderId: 'f1', assetId: 'a1' });
    expect(resolve('?project=missing&asset=b1')).toMatchObject({ projectId: 'p2', folderId: 'g1', assetId: 'b1' });
    expect(resolve('?project=p1&folder=f2&asset=a1')).toMatchObject({ folderId: 'f1', assetId: 'a1' });
    expect(resolve('?project=p1&folder=f1&asset=a2')).toMatchObject({ folderId: null, assetId: 'a2' });
    expect(resolve('?project=p1&asset=a1copy')).toMatchObject({ folderId: 'f2', assetId: 'a1copy' });
  });

  test('an asset from another project never opens inside the given project', () => {
    expect(resolve('?project=p1&folder=f1&asset=b1')).toEqual({ ...nothing, projectId: 'p1', folderId: 'f1' });
  });

  test('a version is found by ID or by its number, only among that asset\'s versions', () => {
    for (const version of ['v002', 'V2', '2', 'v-a1-2']) expect(resolve(`?project=p1&asset=a1&version=${version}`).versionId).toBe('v-a1-2');
    expect(resolve('?project=p1&asset=a1&version=v012').versionId).toBe('v-a1-12');
    for (const version of ['v003', 'v-a2-1', 'v-b1-3', 'latest', 'v0', '-1', '1.5']) expect(resolve(`?project=p1&asset=a1&version=${version}`)).toMatchObject({ assetId: 'a1', versionId: null });
    expect(resolve('?project=p1&version=v002&t=4')).toEqual({ ...nothing, projectId: 'p1' });
  });

  test('unknown and archived parts fall back to the deepest part that exists', () => {
    expect(resolve('?project=p1&folder=f1&asset=missing&version=v002&t=9')).toEqual({ ...nothing, projectId: 'p1', folderId: 'f1' });
    expect(resolve('?project=p1&folder=missing&asset=missing')).toEqual({ ...nothing, projectId: 'p1' });
    expect(resolve('?project=p1&folder=g1')).toEqual({ ...nothing, projectId: 'p1' });
    expect(resolve('?project=p1&folder=f2&asset=a3')).toEqual({ ...nothing, projectId: 'p1', folderId: 'f2' });
    expect(resolve('?project=p1&asset=BLR_TR100_SHT_0030')).toEqual({ ...nothing, projectId: 'p1' });
    expect(resolve('?project=gone&folder=old&asset=z1')).toEqual(nothing);
    expect(resolve('?asset=z1')).toEqual(nothing);
    expect(resolve('?project=missing&folder=f1')).toEqual(nothing);
  });
});
