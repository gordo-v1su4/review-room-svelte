import { expect, test } from 'bun:test';
import { codeFromFilename, compareCodes, formatVersion, parseProductionCode } from '../../convex/lib/shotCode';

test('shot and deliverable codes parse into their parts', () => {
  expect(parseProductionCode('BLR_EP101_PAR_0020')).toEqual({ kind: 'shot', code: 'BLR_EP101_PAR_0020', show: 'BLR', season: 1, episode: 1, scene: 'PAR', shot: 20 });
  expect(parseProductionCode('blr_ep101_epc')).toEqual({ kind: 'deliverable', code: 'BLR_EP101_EPC', show: 'BLR', season: 1, episode: 1, deliverable: 'EPC' });
  expect(parseProductionCode('BLR_S1_TRL01')).toEqual({ kind: 'deliverable', code: 'BLR_S1_TRL01', show: 'BLR', season: 1, deliverable: 'TRL', index: 1 });
  for (const bad of ['', 'VID_20261017_00001', 'BLR_EP101_PAR_20', 'BLR_EP101_PAR_0020_v003', 'BLR_EP1_PAR_0020', 'BLR_S1_XYZ']) expect(parseProductionCode(bad)).toBeNull();
});

test('reference codes (character, location, prop) parse; a malformed one does not', () => {
  expect(parseProductionCode('BLR_REF_CHR_KAI_HOODIE_SANTANA')).toEqual({ kind: 'reference', code: 'BLR_REF_CHR_KAI_HOODIE_SANTANA', show: 'BLR', reference: 'CHR', name: 'KAI_HOODIE_SANTANA' });
  expect(parseProductionCode('blr_ref_loc_college_quad')?.kind).toBe('reference');
  expect(parseProductionCode('BLR_REF_PRP_VIAL')).toMatchObject({ reference: 'PRP', name: 'VIAL' });
  for (const bad of ['BLR_REF_XYZ_KAI', 'BLR_REF_CHR_', 'BLR_REF_CHR_KAI__SANTANA', `BLR_REF_CHR_${'A'.repeat(41)}`]) expect(parseProductionCode(bad)).toBeNull();
  expect(codeFromFilename('BLR_REF_CHR_MARA_VOSS_v002.png')).toEqual({ code: parseProductionCode('BLR_REF_CHR_MARA_VOSS')!, version: 2 });
});

test('filenames yield the code and ignore extension case; their own version is reported separately', () => {
  expect(codeFromFilename('blr_ep101_par_0020_v004.mov')).toEqual({ code: parseProductionCode('BLR_EP101_PAR_0020')!, version: 4 });
  expect(codeFromFilename('BLR_EP101_PAR_0020.mp4')?.version).toBeUndefined();
  expect(codeFromFilename('BLR_S1_TRL01_v003.mp4')?.code.code).toBe('BLR_S1_TRL01');
  expect(codeFromFilename('render final.mp4')).toBeNull();
});

test('versions display as v###, and codes sort naturally', () => {
  expect(formatVersion(3)).toBe('v003');
  expect(formatVersion(1200)).toBe('v1200');
  expect(['BLR_EP101_PAR_0100', 'BLR_EP110_PAR_0010', 'BLR_EP101_PAR_0020', 'BLR_EP101_DIN_0010'].sort(compareCodes))
    .toEqual(['BLR_EP101_DIN_0010', 'BLR_EP101_PAR_0020', 'BLR_EP101_PAR_0100', 'BLR_EP110_PAR_0010']);
});
