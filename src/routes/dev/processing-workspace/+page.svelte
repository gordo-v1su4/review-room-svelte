<script lang="ts">
  import Workspace from '../../+page.svelte';
  import type { Id } from '../../../../convex/_generated/dataModel';
  import type { PageData } from '../../$types';
  let mounted = $state(true);
  const projectId = 'project' as Id<'projects'>;
  const folderId = 'folder' as Id<'projectFolders'>;
  const ownerId = 'owner' as Id<'appUsers'>;
  const snapshot: NonNullable<PageData['snapshot']> = {
    projects: [{ _id: projectId, _creationTime: 1, title: 'Processing checks', slug: 'checks',
      downloadEnabledByDefault: false, createdBy: ownerId, createdAt: 1, updatedAt: 1 }],
    folders: [{ _id: folderId, _creationTime: 1, projectId, title: '20261002', order: 1,
      createdBy: ownerId, createdAt: 1, updatedAt: 1 }],
    assets: ['a', 'b'].map((id, index) => ({
      _id: id as Id<'videos'>, _creationTime: 1, projectId, folderId, title: `Clip ${id}`,
      currentVersionId: `version-${id}` as Id<'assetVersions'>, processingStatus: 'processing',
      assetCode: `VID_CHECK_${id}`, originalFilename: `${id}.mp4`, mimeType: 'video/mp4',
      status: 'awaiting_review', rating: 0, isSelect: false, viewed: false,
      tags: [], uploadedAt: index + 1, updatedAt: 1, uploadedBy: ownerId,
      storageKey: `fixture-${id}`, commentCount: 0, downloadEnabled: false, order: index
    })),
    versions: ['a', 'b'].map(id => ({ _id: `version-${id}` as Id<'assetVersions'>,
      _creationTime: 1, assetId: id as Id<'videos'>, posterKey: `poster-${id}`,
      originalKey: `fixture-${id}`, mimeType: 'video/mp4', sizeBytes: 100,
      processingState: 'processing', version: 1, createdAt: 1 })),
    mediaJobs: ['a', 'b'].map(id => ({
      _id: `job-${id}` as Id<'mediaJobs'>, _creationTime: 1, assetId: id as Id<'videos'>,
      versionId: `version-${id}` as Id<'assetVersions'>, attempt: 1,
      status: 'queued', stage: 'verify', createdAt: 1, updatedAt: 1
    })),
    comments: [], publications: [], showcases: [], links: [], importedMetadata: [], projectIds: [projectId]
  };
</script>

<button onclick={() => mounted = !mounted}>{mounted ? 'Unmount workspace' : 'Mount workspace'}</button>
{#if mounted}<Workspace data={{ snapshot }}/>{/if}
