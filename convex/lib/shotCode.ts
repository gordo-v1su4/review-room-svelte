/**
 * Creative Studio Pro production codes.
 *   Shot:        BLR_EP101_PAR_0020        show · episode (EP101 = season 1, episode 01) · scene · shot (steps of 10)
 *   Deliverable: BLR_EP101_EPC, BLR_S1_TRL01  show · episode or season · kind (+ optional index)
 * A take adds a version suffix, `_v003`; the suffix is never part of the asset code.
 */
export const deliverableKinds = { EPC: 'Episode cut', TSR: 'Teaser', TRL: 'Trailer' } as const;
export type DeliverableKind = keyof typeof deliverableKinds;

export type ProductionCode =
  | { kind: 'shot'; code: string; show: string; season: number; episode: number; scene: string; shot: number }
  | { kind: 'deliverable'; code: string; show: string; season: number; episode?: number; deliverable: DeliverableKind; index?: number };

const show = '([A-Z][A-Z0-9]{1,5})';
const kinds = Object.keys(deliverableKinds).join('|');
const shotPattern = new RegExp(`^${show}_EP(\\d)(\\d{2})_([A-Z][A-Z0-9]{1,5})_(\\d{4})$`);
const episodeDeliverable = new RegExp(`^${show}_EP(\\d)(\\d{2})_(${kinds})(\\d{2})?$`);
const seasonDeliverable = new RegExp(`^${show}_S(\\d{1,2})_(${kinds})(\\d{2})?$`);
const versionSuffix = /_V(\d{1,4})$/;

/** Parses an asset code (no version suffix). Case-insensitive; returns the canonical upper-case code. */
export function parseProductionCode(value: string): ProductionCode | null {
  const code = value.trim().toUpperCase();
  let match = code.match(episodeDeliverable);
  if (match) return { kind: 'deliverable', code, show: match[1], season: Number(match[2]), episode: Number(match[3]), deliverable: match[4] as DeliverableKind, ...(match[5] ? { index: Number(match[5]) } : {}) };
  match = code.match(shotPattern);
  if (match) return { kind: 'shot', code, show: match[1], season: Number(match[2]), episode: Number(match[3]), scene: match[4], shot: Number(match[5]) };
  match = code.match(seasonDeliverable);
  if (match) return { kind: 'deliverable', code, show: match[1], season: Number(match[2]), deliverable: match[3] as DeliverableKind, ...(match[4] ? { index: Number(match[4]) } : {}) };
  return null;
}

/** Reads a dropped filename such as `blr_ep101_par_0020_v004.mov`; the take's own version number is reported but never trusted. */
export function codeFromFilename(filename: string): { code: ProductionCode; version?: number } | null {
  const stem = filename.replace(/\.[A-Za-z0-9]{1,8}$/, '').trim().toUpperCase();
  const version = stem.match(versionSuffix);
  const code = parseProductionCode(version ? stem.slice(0, version.index) : stem);
  return code ? { code, ...(version ? { version: Number(version[1]) } : {}) } : null;
}

export function formatVersion(version: number) { return `v${String(Math.max(0, Math.trunc(version))).padStart(3, '0')}`; }

/** Natural order so BLR_EP101_PAR_0020 < BLR_EP101_PAR_0100 and EP101 < EP110. */
export function compareCodes(left: string, right: string) {
  return left.localeCompare(right, 'en', { numeric: true, sensitivity: 'base' });
}
