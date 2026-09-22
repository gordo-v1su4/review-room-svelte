import type { VideoStatus } from '../../../src/lib/types';

export type WorkspaceMediaType = 'video' | 'image';
export type WorkspaceAsset = Readonly<{
  id: string;
  name: string;
  status: VideoStatus;
  rating: number;
  shortlisted: boolean;
  type: WorkspaceMediaType;
}>;

export type WorkspaceFilter = Readonly<{
  search?: string;
  statuses?: readonly VideoStatus[];
  shortlisted?: boolean;
  minRating?: number;
  mediaTypes?: readonly WorkspaceMediaType[];
  visibleIds?: readonly string[];
  sort?: 'name' | 'status' | 'rating';
}>;

const STATUS_ORDER: readonly VideoStatus[] = [
  'not_started', 'in_progress', 'awaiting_review', 'needs_changes', 'approved', 'final', 'omitted', 'archived',
];

/** Query workspace assets without owning or mutating review/session state. */
export function queryWorkspace<T extends WorkspaceAsset>(assets: readonly T[], filter: WorkspaceFilter = {}): T[] {
  const search = filter.search?.trim().toLocaleLowerCase() ?? '';
  const statuses = filter.statuses?.length ? new Set(filter.statuses) : undefined;
  const mediaTypes = filter.mediaTypes?.length ? new Set(filter.mediaTypes) : undefined;
  const visibleIds = filter.visibleIds === undefined ? undefined : new Set(filter.visibleIds);
  const minimum = Number.isFinite(filter.minRating) ? Math.max(0, filter.minRating ?? 0) : 0;
  const result = assets.filter((asset) =>
    (!search || asset.name.toLocaleLowerCase().includes(search)) &&
    (!statuses || statuses.has(asset.status)) &&
    (filter.shortlisted === undefined || asset.shortlisted === filter.shortlisted) &&
    asset.rating >= minimum &&
    (!mediaTypes || mediaTypes.has(asset.type)) &&
    (!visibleIds || visibleIds.has(asset.id)),
  );
  return [...result].sort((left, right) => {
    if (filter.sort === 'name') return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
    if (filter.sort === 'rating') return right.rating - left.rating || left.id.localeCompare(right.id);
    if (filter.sort === 'status') return STATUS_ORDER.indexOf(left.status) - STATUS_ORDER.indexOf(right.status) || left.id.localeCompare(right.id);
    return 0;
  });
}
