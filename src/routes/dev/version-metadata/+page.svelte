<script lang="ts">
  import Workspace from '../../+page.svelte';
  import type { PageData } from '../../$types';
  // Test-only fixture: no live backend or storage credentials.
  const snapshot = {
    projects: [{ _id: 'project', title: 'Version metadata checks', slug: 'checks', createdBy: 'owner', createdAt: 1, updatedAt: 1, downloadEnabledByDefault: false }],
    folders: [{ _id: 'folder', projectId: 'project', title: 'Imported clips', order: 1, createdBy: 'owner', createdAt: 1, updatedAt: 1 }],
    assets: [{ _id: 'a', projectId: 'project', folderId: 'folder', title: 'Clip', assetCode: 'VID_CHECK_a', originalFilename: 'known-original.mov', mimeType: 'video/mp4', currentVersionId: 'version-a', processingStatus: 'ready', status: 'awaiting_review', rating: 0, isSelect: false, viewed: false, tags: [], uploadedAt: 1, updatedAt: 1, uploadedBy: 'owner', storageKey: 'fixture', commentCount: 0, downloadEnabled: false, order: 0 }],
    versions: ['version-old', 'version-a'].map((id, index) => ({ _id: id, assetId: 'a', originalKey: 'fixture', mimeType: 'video/mp4', sizeBytes: 100, processingState: 'ready', version: index + 1, createdAt: 1 })),
    importedMetadata: [{ assetId: 'a', versionId: 'version-a', sourceArtifactId: 'imported', label: 'Imported title', model: 'Imported model', prompt: 'Imported prompt', sourceCreatedAt: '2026-10-01T00:00:00Z' }],
    mediaJobs: [], comments: [], publications: [], showcases: [], links: [], projectIds: ['project']
  } as unknown as NonNullable<PageData['snapshot']>;
</script>
<Workspace data={{ snapshot }}/>
