<script lang="ts">
  import ReviewPlaybackMenu from '$lib/components/ReviewPlaybackMenu.svelte';
  import { nextReviewAsset, type ReviewPlaybackMode } from '$lib/playback/review-order';
  let reviewPlaybackMode = $state<ReviewPlaybackMode>('once');
  let orderedStart: { id: string; source: string } | null = null;
  function cancelOrderedStart() {
    if (orderedStart) { orderedStart = null; player?.pause(); }
  }
  function changePlaybackMode(mode: ReviewPlaybackMode) {
    cancelOrderedStart(); reviewPlaybackMode = mode;
  }
  function reviewEnded(source: string) {
    if (preview) { advancePreview(source); return; }
    if (reviewPlaybackMode !== 'order' || active?.url !== source) return;
    const next = nextReviewAsset(visibleIds, active.id);
    if (!next) return;
    select(next);
    const asset = allAssets.find(asset => asset.id === next);
    if (asset?.type === 'video') orderedStart = { id: next, source: asset.url };
  }

  import { onDestroy, onMount, tick, untrack } from 'svelte';
  import { startShortlistPreview, advanceShortlistPreview, type ShortlistPreview } from '$lib/playback/shortlist-preview';
  import { ASSET_DRAG_TYPE, beginAssetDrag, folderDropAction, type AssetDrag } from '$lib/asset-drag';
  import CollectionActions from '$lib/components/CollectionActions.svelte';
  import { transitionCollectionState, collectionIsConfigured, queryCollectionAssets, type CollectionState, type CollectionAction } from '$lib/collections';
  import ImportQueue from '$lib/components/ImportQueue.svelte';
  import { createImportQueue, type ImportJob, type ImportTarget } from '$lib/import-queue';
  import { prepareLocalImport } from '$lib/local-import';
  import ImportOptions from '$lib/components/ImportOptions.svelte';
  import FolderActions from '$lib/components/FolderActions.svelte';
  import ProjectIdentityDialog from '$lib/components/ProjectIdentityDialog.svelte';
  import ShareDialog from '$lib/components/ShareDialog.svelte';
  import ProjectAccessDialog from '$lib/components/ProjectAccessDialog.svelte';
  import AccountDialog from '$lib/components/AccountDialog.svelte';
  import WorkspaceSwitcher from '$lib/components/WorkspaceSwitcher.svelte';
  import Stage1SharingDialog from '$lib/components/Stage1SharingDialog.svelte';
  import ArchivedProjects from '$lib/components/ArchivedProjects.svelte';
  import { updateProjectIdentity, setProjectArchived, prepareProjectBanner, type ProjectIdentity, type ProjectIdentityDraft } from '$lib/project-identity';
  import { transitionFolderState, folderCoverUrl, type FolderState, type FolderAction } from '$lib/project-folders';
  import { updateTags } from '$lib/bulk-tags';
  import StillViewer from '$lib/components/StillViewer.svelte';
  import { annotationsEqual } from '$lib/annotations';
  import MediaCards from '$lib/components/MediaCards.svelte';
  import MetadataSheet from '$lib/components/MetadataSheet.svelte';
  import AssetDetails from '$lib/components/AssetDetails.svelte';
  import SelectionBar from '$lib/components/SelectionBar.svelte';
  import { transitionSelection, type SelectionState } from '$lib/media-selection';
  import { normalizeAppearance, type AppearanceValue } from '$lib/appearance';
  import { createAppearancePreferences } from '$lib/appearance-preferences';
  import AppearanceMenu from '$lib/components/AppearanceMenu.svelte';
  import ProjectTree from '$lib/components/ProjectTree.svelte';
  import WorkspacePanes from '$lib/components/WorkspacePanes.svelte';
  import FolderArtwork from '$lib/components/FolderArtwork.svelte';
  import FeedbackNotifications from '$lib/components/FeedbackNotifications.svelte';
  import FeedbackInbox from '$lib/components/FeedbackInbox.svelte';
  import { feedbackDigests, type FeedbackNote } from '$lib/feedback-inbox';
  import ReviewNotes from '$lib/components/ReviewNotes.svelte';
  import WorkspaceFilters from '$lib/components/WorkspaceFilters.svelte';
  import AssetTable from '$lib/components/AssetTable.svelte';
  import { queryWorkspace, groupWorkspaceAssets, type WorkspaceMediaType, type WorkspaceFilterState } from '$lib/workspace';
  import type { VideoStatus } from '$lib/types';
  import { stepInList } from '$lib/mediaNavigation';
  import { Dialog, Tabs, DropdownMenu } from 'bits-ui';
  import { Play, Square, Repeat, ArrowUpRight, ArrowLeft, ArrowRight, Check, ChevronDown, Film, Folder, Grid2X2, Table2, List, MessageSquare, Menu, Plus, Search, SlidersHorizontal, Star, Upload, X, Bookmark, Clock3, Image, PanelRightClose, PanelLeftClose, PanelLeftOpen, PanelRightOpen, ChevronRight } from 'lucide-svelte';
  import Player from '$lib/playback/Player.svelte';
  import { createThumbnailExtractor } from '$lib/playback/thumbnails';
  import { type LocalAsset, type ReviewAsset } from '$lib/review';
  import { createReviewSession, transitionReviewSession, type ReviewAction, type ReviewAccess } from '$lib/review-session';
  import { observeProcessing, processingSource, processingPoster, type ProcessingUpdate } from '$lib/processing';
  let { data } = $props();
  const live = !!data.snapshot;
  let media = $state<ReviewAsset[]>([]);
  let processing = $state.raw<ProcessingUpdate[]>([]);
  let processingObserver: ReturnType<typeof observeProcessing> | undefined;
  let session = $state.raw(createReviewSession([]));
  // This owner role is for device-local review only, never live authorization.
  const localAccess: ReviewAccess = { kind: 'project', memberRole: 'owner' };
  let projects = $state<ProjectIdentity[]>(data.snapshot?.projects.length
    ? data.snapshot.projects.map(item => ({ id: item._id, name: item.title, description: item.description, clientName: item.clientName, archived: item.archived }))
    : [live ? { id: '__empty__', name: 'Create a project' } : { id: 'studio', name: 'Studio project' }]);
  let projectId = $state(projects.find(item => !item.archived)?.id ?? projects[0].id);
  const activeProjects = $derived(projects.filter(item => !item.archived));
  const archivedProjects = $derived(projects.filter(item => item.archived));
  const projectOwnerAccess = $derived({ isAdmin: true, ownedProjectIds: projects.map(item => item.id) });
  let collections = $state.raw<CollectionState>({ collections: [] });
  let activeCollectionId = $state<string | null>(null);
  const activeCollection = $derived(collections.collections.find(collection => collection.id === activeCollectionId && collection.projectId === projectId));
  const collectionAccess = $derived({ projectRoles: Object.fromEntries(activeProjects.map(project => [project.id, 'owner' as const])) });
  let organization = $state.raw<FolderState>({ folders: [], placements: {} });
  let activeFolderId = $state<string | null>(null);
  let importOptions = $state<{ folderId: string | null; assetClass: 'VID' | 'IMG' | 'CTX' | 'STB' }>({ folderId: null, assetClass: 'VID' });
  let archived = $state(false);
  const folderAccess = $derived({ isAdmin: true, editableProjectIds: activeProjects.map(project => project.id) });
  const projectFolders = $derived(organization.folders.filter(folder => folder.projectId === projectId));
  const activeFolder = $derived(projectFolders.find(folder => folder.id === activeFolderId));
  let folderOpen = $state(false);
  let navCollapsed = $state(false);
  let projectDialog = $state(false), projectName = $state('');
  let identityDialogOpen = $state(false);
  const allAssets = $derived(media.map(asset => ({ ...asset, ...session.assets[asset.id], ...organization.placements[asset.id], status: organization.placements[asset.id]?.archived ? 'archived' as VideoStatus : session.assets[asset.id].status, folderName: organization.folders.find(folder => folder.id === organization.placements[asset.id]?.folderId)?.title, commentsCount: session.assets[asset.id]?.comments.length ?? 0 })));
  const assets = $derived(projects.find(item => item.id === projectId)?.archived ? [] : allAssets.filter(asset => asset.projectId === projectId && (Boolean(asset.archived) === archived || (!archived && filters.statuses.includes('archived')))));
  const project = $derived(projects.find(item => item.id === projectId)!);
  const inbox = $derived(feedbackDigests(activeProjects, allAssets, { isAdmin: folderAccess.isAdmin, projectIds: folderAccess.editableProjectIds }));
  let inboxSeek = $state<{ assetId: string; time: number } | null>(null);
  const treeProjects = $derived(activeProjects.map(project => {
    const items = allAssets.filter(asset => asset.projectId === project.id && !asset.archived);
    return { ...project, collections: collections.collections.filter(collection => collection.projectId === project.id).map(collection => ({ ...collection, count: queryCollectionAssets(collection, allAssets).length })), folders: organization.folders.filter(folder => folder.projectId === project.id).map(folder => ({ ...folder, count: items.filter(asset => asset.folderId === folder.id).length })), archivedCount: allAssets.filter(asset => asset.projectId === project.id && asset.archived).length, videoCount: items.filter(asset => asset.type === 'video').length, imageCount: items.filter(asset => asset.type === 'image').length, shortlistCount: items.filter(asset => asset.shortlisted).length };
  }));
  const activeId = $derived(session.activeAssetId);
  function review(action: ReviewAction) {
    if (live && action.type === 'toggle-comment-complete') {
      void fetch(`/api/owner-comment/${action.commentId}/complete`, { method: 'POST' })
        .then(async response => { if (!response.ok) throw new Error(await response.text()); session = transitionReviewSession(session, action, localAccess); })
        .catch(cause => feedback = `Comment change was not saved: ${String(cause)}`);
      return;
    }
    if (live && 'assetId' in action && action.assetId && ['status', 'rate', 'shortlist', 'mark-viewed'].includes(action.type)) {
      const body = { assetId: action.assetId,
        ...(action.type === 'status' ? { status: action.status } : {}),
        ...(action.type === 'rate' ? { rating: action.rating } : {}),
        ...(action.type === 'shortlist' ? { shortlisted: action.shortlisted } : {}),
        ...(action.type === 'mark-viewed' ? { viewed: true } : {}) };
      void fetch('/api/owner-review', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
        .then(async response => { if (!response.ok) throw new Error(await response.text()); session = transitionReviewSession(session, action, localAccess); })
        .catch(cause => feedback = `Review change was not saved: ${String(cause)}`);
      return;
    }
    session = transitionReviewSession(session, action, localAccess);
  }
  type FilterId = 'all' | 'selected' | VideoStatus;
  let query = $state(''), view = $state<'grid' | 'list' | 'table'>('grid');
  let mediaType = $state<WorkspaceMediaType | 'all'>('all');
  const defaultFilters = (): WorkspaceFilterState => ({ search: '', statuses: [], assetClasses: [], tags: [], selectedOnly: false, minRating: 0, hasComments: false, sort: 'newest', groupBy: 'none' });
  let filters = $state<WorkspaceFilterState>(defaultFilters());
  const filter = $derived<FilterId>(filters.selectedOnly ? 'selected' : filters.statuses.length === 1 ? filters.statuses[0] : 'all');
  let appearance = $state<AppearanceValue>(normalizeAppearance(null));
  let appearancePreferences: ReturnType<typeof createAppearancePreferences> | undefined;
  let checked = $state<SelectionState>({ ids: [], anchorId: null });
  async function deleteChecked(ids: string[]) {
    if (!projectOwnerAccess.isAdmin || !projectOwnerAccess.ownedProjectIds.includes(projectId)) throw new Error('Project owner required.');
    if (ids.some(id => !allAssets.some(asset => asset.id === id && asset.projectId === projectId))) throw new Error('Selection changed. Select the clips again.');
    if (live) {
      const response = await fetch('/api/owner-assets/delete', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({projectId,assetIds:ids}) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Could not delete clips. Try again.');
    }
    stopPreview();
    if (activeId && ids.includes(activeId)) select(null);
    const removed = new Set(ids);
    for (const asset of media.filter(asset => removed.has(asset.id))) {
      if (asset.url.startsWith('blob:')) URL.revokeObjectURL(asset.url);
      if (asset.poster?.startsWith('blob:')) URL.revokeObjectURL(asset.poster);
    }
    media = media.filter(asset => !removed.has(asset.id));
    processing = processing.filter(asset => !removed.has(asset.assetId));
    session = { ...session, assets: Object.fromEntries(Object.entries(session.assets).filter(([id]) => !removed.has(id))) };
    checked = transitionSelection(checked, { type:'reconcile', allIds:media.map(asset => asset.id) });
    feedback = `${ids.length} ${ids.length === 1 ? 'clip deleted' : 'clips deleted'}.`;
  }
  let player = $state<ReturnType<typeof Player>>();
  let preview = $state.raw<ShortlistPreview | null>(null);
  let loopPreview = $state(false), readySource = $state('');
  const shortlistIds = $derived(allAssets.filter(asset => asset.projectId === projectId && !asset.archived && asset.shortlisted).map(asset => asset.id));
  let currentTime = $state(0), pinTime = $state(true), feedback = $state('');
  let navOpen = $state(false), showInspector = $state(false);
  let inspectorTab = $state('notes');
  let compactInspector = $state(false);
  let notesTrigger = $state<HTMLButtonElement | null>(null);
  let explorerHeading = $state<HTMLHeadingElement>(), reviewHeading = $state<HTMLHeadingElement>();
  let projectHeading = $state<HTMLHeadingElement>();
  let restoringFromNavigation = false;
  const knownTags = $derived([...new Set(assets.flatMap(asset => asset.tags))]);
  let picker: HTMLInputElement;
  const thumbnails = createThumbnailExtractor({ concurrency: 2 });
  let disposed = false;
  let importJobs = $state.raw<readonly ImportJob[]>([]);
  const importQueue = createImportQueue({
    prepare: prepareLocalImport,
    commit: commitImport,
    release: asset => { URL.revokeObjectURL(asset.url); if (asset.poster) URL.revokeObjectURL(asset.poster); },
    onChange: jobs => importJobs = jobs,
    concurrency: 2
  });
  const coverRequests = new Map<string, symbol>();
  const identityRequests = new Map<string, symbol>();
  const active = $derived(assets.find(asset => asset.id === activeId));
  const activeMediaJob = $derived(processing.find(item => item.assetId === active?.id)?.job);
  const scopedAssets = $derived(activeCollection?.sourceFolderId
    ? assets.filter(asset => asset.folderId === activeCollection.sourceFolderId)
    : activeFolderId ? assets.filter(asset => asset.folderId === activeFolderId) : assets);
  const visible = $derived(activeCollection && !collectionIsConfigured(activeCollection) ? [] : queryWorkspace(scopedAssets, {
    ...filters, search: query, shortlisted: filters.selectedOnly ? true : undefined,
    mediaTypes: mediaType === 'all' ? undefined : [mediaType]
  }));
  const groups = $derived(groupWorkspaceAssets(visible, filters.groupBy));
  const visibleIds = $derived(groups.flatMap(group => group.assets.map(asset => asset.id)));
  $effect(() => {
    const next = transitionSelection(checked, { type: 'reconcile', allIds: visibleIds });
    if (next !== checked) checked = next;
  });
  function checkAsset(id: string, event: MouseEvent, toggle = false) {
    checked = transitionSelection(checked, { type: 'click', id, visibleIds, shiftKey: event.shiftKey, metaKey: toggle || event.metaKey, ctrlKey: event.ctrlKey });
  }
  function batchReview(action: { type: 'status'; status: VideoStatus } | { type: 'rate'; rating: number } | { type: 'shortlist'; shortlisted: boolean }) {
    const ids = new Set(checked.ids.filter(id => visibleIds.includes(id)));
    let next = session;
    for (const asset of assets) if (ids.has(asset.id)) next = transitionReviewSession(next, { ...action, assetId: asset.id }, localAccess);
    session = next;
  }
  function batchTags(tags: string[], mode: 'add' | 'remove') {
    const ids = new Set(checked.ids.filter(id => visibleIds.includes(id)));
    media = media.map(asset => ids.has(asset.id) ? { ...asset, tags: updateTags(asset.tags, tags, mode) } : asset);
  }
  function updateAsset(id: string, fields: Partial<Pick<LocalAsset, 'assetClass' | 'assetCode' | 'tags' | 'duration' | 'width' | 'height' | 'fps' | 'codec' | 'metadata'>>) {
    media = media.map(asset => asset.id === id ? { ...asset, ...fields } : asset);
  }
  const approved = $derived(assets.filter(a => a.status === 'approved').length);
  async function ownerAction(action: string, fields: Record<string, string>) {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    const response = await fetch(`/studio?/${action}`, { method: 'POST', body: form });
    if (!response.ok) throw new Error(`Could not save ${action} (${response.status}).`);
    location.reload();
  }
  async function retryMediaJob(jobId: string) {
    const response = await fetch(`/api/media-jobs/${encodeURIComponent(jobId)}/retry`, { method: 'POST' });
    if (!response.ok) { feedback = `Could not retry processing (${response.status}).`; return; }
    processingObserver?.refresh();
  }
  async function uploadOriginal(file: File) {
    if (!file.type.startsWith('video/')) throw new Error('Canonical upload currently accepts video files.');
    feedback = `Preparing preview for ${file.name}…`;
    const preview = await thumbnails.extract(file);
    feedback = `Uploading ${file.name}…`;
    const begin = await fetch('/api/uploads/begin', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectId, folderId: importOptions.folderId, name: file.name, type: file.type, size: file.size }) });
    if (!begin.ok) throw new Error(await begin.text());
    const session = await begin.json();
    const put = await fetch(session.url, { method: 'PUT', headers: { 'content-type': file.type }, body: file });
    if (!put.ok) throw new Error(`Storage rejected the upload (${put.status}).`);
    const posterPut = await fetch(session.posterUrl, { method: 'PUT', headers: { 'content-type': 'image/jpeg' }, body: preview.blob });
    if (!posterPut.ok) throw new Error(`Storage rejected the preview (${posterPut.status}).`);
    feedback = `Verifying ${file.name}…`;
    const finish = await fetch('/api/uploads/complete', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: session.sessionId, posterSizeBytes: preview.blob.size,
        durationSec: preview.duration, width: preview.sourceWidth, height: preview.sourceHeight }) });
    if (!finish.ok) throw new Error(await finish.text());
  }
  function importFiles(files: FileList | readonly File[] | null) {
    if (!files?.length) return;
    if (project.archived) { feedback = 'Restore this project before adding media.'; return; }
    if (live) {
      if (projectId === '__empty__') { feedback = 'Create a project before adding media.'; projectDialog = true; return; }
      void (async () => {
        try { for (const file of files) await uploadOriginal(file); location.reload(); }
        catch (cause) { feedback = cause instanceof Error ? cause.message : String(cause); }
      })();
      return;
    }
    const today = new Date();
    const dateKey = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const target: ImportTarget = { projectId, folderId: importOptions.folderId ?? undefined, dateKey, dateFolderId: crypto.randomUUID(), assetClass: importOptions.assetClass };
    const destinationLabel = `${project.name} / ${projectFolders.find(folder => folder.id === target.folderId)?.title ?? dateKey}`;
    importQueue.enqueue(Array.from(files, file => ({ file, target, destinationLabel })));
  }
  function commitImport(asset: LocalAsset, target: ImportTarget) {
    if (disposed) throw new Error('The workspace is closed.');
    if (media.some(item => item.id === asset.id)) throw new Error('This import is already in the workspace.');
    if (asset.type === 'image') asset.assetClass = target.assetClass === 'VID' ? 'IMG' : target.assetClass;
    const sequenceKey = 'review-room:v1su4:next-asset-number';
    const previous = Number(localStorage.getItem(sequenceKey)) || 1;
    const highest = allAssets.reduce((max, item) => Math.max(max, Number(item.assetCode.match(/_(\d+)$/)?.[1]) || 0), 0);
    const number = Math.max(previous, highest + 1);
    if (!Number.isSafeInteger(number)) throw new Error('Asset sequence exhausted.');
    localStorage.setItem(sequenceKey, String(number + 1));
    asset.assetCode = `${asset.assetClass}_${target.dateKey}_${String(number).padStart(5, '0')}`;
    asset.name = asset.assetCode;
    const next = transitionFolderState(organization, {
      type: 'register', projectId: target.projectId, assetIds: [asset.id], folderId: target.folderId,
      dateFolder: { id: target.dateFolderId, dateKey: target.dateKey }
    }, folderAccess);
    const previousActive = activeId;
    const enterImportedFolder = projectId === target.projectId && !folderOpen && !previousActive;
    organization = next;
    media = [...media, asset];
    review({ type: 'add-assets', assets: [asset] });
    review({ type: 'select', assetId: previousActive });
    // An import must not move someone who has since navigated to another project or review.
    if (enterImportedFolder) openRealFolder(target.projectId, next.placements[asset.id].folderId!);
    if (asset.type === 'video') {
      void thumbnails.extract(asset.sourceFile).then(({ blob, duration, sourceWidth, sourceHeight }) => {
        if (disposed) return;
        const poster = URL.createObjectURL(blob);
        media = media.map(item => item.id === asset.id ? { ...item, poster, duration, width: sourceWidth, height: sourceHeight } : item);
      }).catch(() => { /* Native playback remains available if a poster cannot be generated. */ });
    }
  }
  function dragFiles(event: DragEvent) {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault(); event.dataTransfer.dropEffect = 'copy';
  }
  function dropFiles(event: DragEvent) {
    if (!event.dataTransfer?.files.length) return;
    event.preventDefault(); importFiles(event.dataTransfer.files);
  }

  function select(id: string | null) {
    cancelOrderedStart();
    stopPreview();
    if (id === activeId) return;
    inboxSeek = null; readySource = '';
    review({ type: 'select', assetId: id });
    currentTime = 0;
  }
  async function openReview(id: string, event: MouseEvent) {
    select(id);
    // Keyboard and assistive activation enter the newly opened review; pointer browsing stays put.
    if (event.detail === 0) {
      await tick();
      if (activeId === id) reviewHeading?.focus();
    }
  }
  async function closeReview() {
    const previous = activeId;
    select(null);
    await tick();
    if (activeId !== null || !folderOpen) return;
    const card = previous ? document.querySelector<HTMLButtonElement>(`button[data-asset-id="${CSS.escape(previous)}"]`) : null;
    if (card?.getClientRects().length) card.focus();
    else explorerHeading?.focus();
  }
  function stopPreview() {
    if (preview) { preview = null; player?.pause(); }
  }
  function applyPreview(next: ShortlistPreview | null) {
    if (!next) { stopPreview(); return; }
    if (activeId !== next.currentId) readySource = '';
    review({ type: 'select', assetId: next.currentId });
    currentTime = 0; preview = next;
  }
  function startPreview() {
    const ids = [...shortlistIds];
    const alreadyReady = readySource;
    const firstSource = allAssets.find(asset => asset.id === ids[0])?.url;
    openFolder(projectId, 'selected');
    applyPreview(startShortlistPreview(ids));
    // Svelte keeps the existing media node when the final selection is unchanged.
    if (firstSource === alreadyReady) readySource = alreadyReady;
  }
  function advancePreview(source: string) {
    if (!preview || active?.url !== source || active.id !== preview.currentId) return;
    applyPreview(advanceShortlistPreview(preview, shortlistIds, loopPreview));
  }
  function previewFailed(source: string) {
    if (orderedStart?.source === source) cancelOrderedStart();
    if (!preview || active?.url !== source) return;
    stopPreview(); feedback = 'Preview stopped because this media could not be loaded.';
  }
  function mediaReady(source: string) {
    readySource = source; applyInboxSeek(source);
    const request = orderedStart;
    if (!request || request.source !== source) return;
    if (reviewPlaybackMode !== 'order' || activeId !== request.id || !visibleIds.includes(request.id) || preview) {
      cancelOrderedStart(); return;
    }
    void player?.playFromStart(source).then(started => {
      if (orderedStart !== request) return;
      orderedStart = null;
      if (!visibleIds.includes(request.id)) player?.pause();
      else if (!started) feedback = 'Playback paused. Press Play to continue.';
    });
  }
  $effect(() => {
    const eligible = shortlistIds;
    if (preview && !eligible.includes(preview.currentId)) {
      untrack(() => { if (preview) applyPreview(advanceShortlistPreview(preview, eligible, loopPreview)); });
    }
  });
  $effect(() => {
    const run = preview;
    const source = readySource;
    if (!run || !source) return;
    // Metadata and review edits must not restart a running preview.
    return untrack(() => {
      if (!active || active.id !== run.currentId || active.url !== source) return;
      if (active.type === 'image') {
        const timer = setTimeout(() => { if (preview === run) advancePreview(source); }, 2500);
        return () => clearTimeout(timer);
      }
      void player?.playFromStart(source).then(started => {
        if (!started && preview === run) {
          stopPreview(); feedback = 'Preview stopped. Press Play to review this clip, or try Preview shortlist again.';
        }
      });
    });
  });
  function navigate(direction: -1 | 1) {
    const next = stepInList(visibleIds, activeId, direction);
    if (next && next !== activeId) select(next);
  }
  function mediaKeydown(event: KeyboardEvent) {
    if (!folderOpen || project.archived || event.defaultPrevented || event.isComposing
      || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
      || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    // Portal overlays and navigation own their keyboard focus. Only the workspace browses media.
    if (target !== document.body && !target.closest('main')) return;
    if (target.isContentEditable || target.closest('input, textarea, select, [contenteditable], [role="slider"], [role="separator"], [role="tablist"], [role="menu"], [role="listbox"], [role="combobox"], [role="tree"], [role="application"], [role="dialog"], [role="alertdialog"]')) return;
    const next = stepInList(visibleIds, activeId, event.key === 'ArrowRight' ? 1 : -1);
    if (next && next !== activeId) {
      event.preventDefault(); select(next);
    }
  }
  function updateDraft(body: string) {
    if (!active) return;
    review({ type: 'draft', assetId: active.id, body, timecodeSec: active.draft.body ? active.draft.timecodeSec : pinTime && active.type === 'video' ? currentTime : null });
  }
  function comment() {
    if (!active?.draft.body.trim()) return;
    if (live) {
      const assetId = active.id;
      const body = active.draft.body;
      const timecodeSec = active.draft.timecodeSec;
      void fetch('/api/owner-comment', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assetId, body, timecodeSec }) })
        .then(async response => {
          if (!response.ok) throw new Error(await response.text());
          const saved = await response.json();
          review({ type: 'publish-comment', assetId, commentId: saved.id, author: { name: 'Owner', role: 'admin' }, createdAt: Date.now() });
        }).catch(cause => feedback = `Comment was not saved: ${String(cause)}`);
      return;
    }
    review({ type: 'publish-comment', assetId: active.id, commentId: crypto.randomUUID(), author: { name: 'You', role: 'admin' }, createdAt: Date.now() });
  }
  function openFolder(id: string, collection: 'all' | 'video' | 'image' | 'selected') {
    if (!activeProjects.some(item => item.id === id)) return;
    select(null);
    projectId = id;
    if (appearancePreferences) appearance = appearancePreferences.load(id);
    activeCollectionId = null; activeFolderId = null; archived = false; importOptions.folderId = null;
    mediaType = collection === 'video' || collection === 'image' ? collection : 'all';
    filters = { ...defaultFilters(), selectedOnly: collection === 'selected' };
    query = ''; checked = transitionSelection(checked, { type: 'clear' });
    folderOpen = true; navOpen = false; feedback = '';
  }
  function focusInboxDestination() {
    if (!notesTrigger?.getClientRects().length) return false;
    notesTrigger.focus();
    return true;
  }
  function openInboxNote(note: FeedbackNote) {
    const asset = allAssets.find(item => item.id === note.assetId && item.projectId === note.projectId && !item.archived);
    if (!asset || !inbox.some(group => group.comments.some(item => item.commentId === note.commentId && item.assetId === note.assetId))) return;
    const sameAsset = activeId === asset.id;
    openFolder(asset.projectId, 'all');
    activeFolderId = asset.folderId ?? null;
    importOptions.folderId = activeFolderId;
    select(asset.id); showInspector = true; inspectorTab = 'notes';
    if (asset.type === 'video' && note.timecodeSec !== null) {
      inboxSeek = { assetId: asset.id, time: note.timecodeSec };
      if (sameAsset && player?.seek(note.timecodeSec)) inboxSeek = null;
    }
  }
  function applyInboxSeek(source: string) {
    if (!inboxSeek || active?.id !== inboxSeek.assetId || active.url !== source) return;
    if (player?.seek(inboxSeek.time)) inboxSeek = null;
  }
  function toggleInboxNote(note: FeedbackNote) {
    if (!inbox.some(group => group.comments.some(item => item.commentId === note.commentId && item.assetId === note.assetId))) return;
    review({ type: 'toggle-comment-complete', assetId: note.assetId, commentId: note.commentId, actorId: 'local-reviewer', at: Date.now() });
  }
  const locationName = $derived(archived ? 'Archived' : activeCollection?.title ?? activeFolder?.title ?? (mediaType === 'video' ? 'Videos' : mediaType === 'image' ? 'Images' : filter === 'selected' ? 'Shortlist' : 'All media'));
  function changeCollections(action: CollectionAction) { collections = transitionCollectionState(collections, action, collectionAccess, organization.folders); }
  function openCollection(id: string, collectionId: string) {
    const collection = collections.collections.find(item => item.id === collectionId && item.projectId === id);
    if (!collection) return;
    openFolder(id, 'all');
    activeCollectionId = collectionId;
    filters = collection.filters ? { ...collection.filters } : defaultFilters();
    query = filters.search;
    mediaType = collection.mediaType ?? 'all';
  }
  function createCollection(title: string) {
    const id = crypto.randomUUID();
    changeCollections({ type: 'create', id, projectId, title });
    openCollection(projectId, id);
  }
  function saveCollection(collectionId: string, sourceFolderId: string | undefined) {
    changeCollections({ type: 'settings', collectionId, sourceFolderId, filters: { ...filters, search: query }, mediaType: mediaType === 'all' ? undefined : mediaType });
    feedback = 'Collection rules saved for this session.';
  }
  function removeCollection(collectionId: string) {
    changeCollections({ type: 'remove', collectionId });
    if (activeCollectionId === collectionId) openFolder(projectId, 'all');
    feedback = 'Collection deleted. Your media is unchanged.';
  }
  function organize(action: FolderAction) { organization = transitionFolderState(organization, action, folderAccess); }
  function openRealFolder(id: string, folderId: string) { openFolder(id, 'all'); activeFolderId = folderId; importOptions.folderId = folderId; }
  function openProject(id: string) { openFolder(id, 'all'); folderOpen = false; }
  async function editProject(id: string) {
    openProject(id);
    await tick();
    identityDialogOpen = true;
  }
  function openArchived(id: string) { openFolder(id, 'all'); archived = true; }
  function createFolder(title: string) {
    if (live) { void ownerAction('createFolder', { projectId, title }).catch(cause => feedback = String(cause)); return; }
    const id = crypto.randomUUID();
    organize({ type: 'create', id, projectId, title });
    openRealFolder(projectId, id);
  }
  function renameFolder(folderId: string, title: string) {
    if (live) { void ownerAction('renameFolder', { folderId, title }).catch(cause => feedback = String(cause)); return; }
    organize({ type: 'rename', folderId, title });
  }
  async function setFolderCover(folderId: string, file: File | null) {
    if (file && !file.type.startsWith('image/')) throw new Error('Choose an image for the folder cover.');
    const request = Symbol();
    coverRequests.set(folderId, request);
    let url: string | undefined;
    try {
      if (file) {
        const source = URL.createObjectURL(file);
        try {
          const image = new window.Image();
          image.src = source;
          await image.decode();
          const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Image preview is unavailable.');
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Could not prepare the cover.')), 'image/webp', 0.85));
          url = URL.createObjectURL(blob);
        } catch {
          throw new Error('This image could not be opened. Choose another image.');
        } finally { URL.revokeObjectURL(source); }
      }
      if (disposed || coverRequests.get(folderId) !== request) throw new Error('This cover request is no longer active.');
      const previous = organization.folders.find(folder => folder.id === folderId)?.coverImageUrl;
      organize({ type: 'cover-image', folderId, url });
      if (previous) URL.revokeObjectURL(previous);
    } catch (cause) {
      if (url) URL.revokeObjectURL(url);
      throw cause;
    } finally {
      if (coverRequests.get(folderId) === request) coverRequests.delete(folderId);
    }
  }
  function removeFolder(folderId: string, disposition: 'move_to_root' | 'archive_assets') {
    const previous = organization.folders.find(folder => folder.id === folderId)?.coverImageUrl;
    organize({ type: 'remove', folderId, disposition });
    coverRequests.delete(folderId);
    if (previous) URL.revokeObjectURL(previous);
    if (activeFolderId === folderId) openFolder(projectId, 'all');
  }
  function moveAssets(assetIds: readonly string[], folderId: string | null) {
    organize({ type: 'move', projectId, folderId: folderId ?? undefined, assetIds });
    checked = transitionSelection(checked, { type: 'clear' });
    feedback = `Moved ${assetIds.length} ${assetIds.length === 1 ? 'asset' : 'assets'} to ${projectFolders.find(folder => folder.id === folderId)?.title ?? 'Project root'}.`;
  }
  function moveChecked(folderId: string | null) {
    moveAssets(checked.ids.filter(id => visibleIds.includes(id)), folderId);
  }
  let dragged = $state<AssetDrag | null>(null);
  let dragToken = '';
  function endAssetDrag() { dragged = null; dragToken = ''; }
  function startAssetDrag(event: DragEvent, id: string) {
    endAssetDrag();
    if (!event.dataTransfer || !folderAccess.isAdmin || archived) { event.preventDefault(); return; }
    dragged = beginAssetDrag(id, checked.ids, visibleIds, organization);
    if (!dragged || !folderAccess.editableProjectIds.includes(dragged.projectId)) { event.preventDefault(); endAssetDrag(); return; }
    dragToken = crypto.randomUUID();
    event.dataTransfer.setData(ASSET_DRAG_TYPE, dragToken);
    event.dataTransfer.effectAllowed = 'move';
  }
  function canDropAssets(targetProjectId: string, folderId: string | null) {
    return !!folderDropAction(dragged, targetProjectId, folderId, organization, folderAccess);
  }
  function dropAssets(event: DragEvent, targetProjectId: string, folderId: string | null) {
    const action = folderDropAction(dragged, targetProjectId, folderId, organization, folderAccess);
    const ownDrag = !!dragToken && event.dataTransfer?.getData(ASSET_DRAG_TYPE) === dragToken;
    endAssetDrag();
    if (!action || !ownDrag) return;
    try { moveAssets(action.assetIds, folderId); }
    catch (cause) { feedback = cause instanceof Error ? cause.message : 'Could not move media.'; }
  }
  function restoreChecked() {
    const assetIds = checked.ids.filter(id => visibleIds.includes(id));
    organize({ type: 'restore', projectId, assetIds });
    select(null); checked = transitionSelection(checked, { type: 'clear' });
    feedback = `Restored ${assetIds.length} ${assetIds.length === 1 ? 'asset' : 'assets'} to Project root.`;
  }
  async function focusProjectHeading() {
    const id = projectId;
    await tick();
    if (projectId === id) projectHeading?.focus();
  }
  function archiveProject(id: string) {
    if (live) { void ownerAction('archiveProject', { projectId: id, archived: 'true' }).catch(cause => feedback = String(cause)); return; }
    const original = projects.find(item => item.id === id);
    if (!original) return;
    const next = setProjectArchived(original, true, projectOwnerAccess);
    if (projectId === id) projectOverview();
    identityRequests.delete(id);
    for (const folder of organization.folders) if (folder.projectId === id) coverRequests.delete(folder.id);
    projects = projects.map(item => item.id === id ? next : item);
    for (const job of importJobs) if (job.target.projectId === id && (job.status === 'queued' || job.status === 'preparing')) importQueue.cancel(job.id);
    feedback = '';
  }
  function restoreProject(id: string) {
    if (live) { void ownerAction('archiveProject', { projectId: id, archived: 'false' }).catch(cause => feedback = String(cause)); return; }
    const original = projects.find(item => item.id === id);
    if (!original) return;
    const next = setProjectArchived(original, false, projectOwnerAccess);
    restoringFromNavigation = navOpen;
    projects = projects.map(item => item.id === id ? next : item);
    openProject(id);
    feedback = 'Project restored.';
  }
  function changeAppearance(value: typeof appearance) {
    appearance = appearancePreferences?.save(projectId, value) ?? normalizeAppearance(value);
  }
  onMount(() => {
    if (data.snapshot) {
      processing = data.snapshot.assets.map(item => {
        const job = data.snapshot.mediaJobs.find(job => job.assetId === item._id && job.versionId === item.currentVersionId);
        const version = data.snapshot.versions.find(version => version._id === item.currentVersionId);
        return { assetId: item._id, versionId: item.currentVersionId ?? null, versionNumber: version?.version ?? 0,
          updatedAt: Math.max(item.updatedAt, job?.updatedAt ?? 0), job,
          ready: item.processingStatus === 'ready' && version?.processingState === 'ready',
          hasPoster: !!version?.posterKey, duration: item.durationSec, width: item.width, height: item.height };
      });
      organization = {
        folders: data.snapshot.folders.map(folder => ({ id: folder._id, projectId: folder.projectId,
          title: folder.title, order: folder.order })),
        placements: Object.fromEntries(data.snapshot.assets.map(asset => [asset._id,
          { projectId: asset.projectId, ...(asset.folderId ? { folderId: asset.folderId } : {}) }]))
      };
      const fromServer = data.snapshot.assets.map(item => ({
        id: item._id, projectId: item.projectId, name: item.assetCode ?? item.title,
        url: processingSource(processing.find(update => update.assetId === item._id)!), type: 'video' as const,
        poster: processingPoster(processing.find(update => update.assetId === item._id)!),
        duration: item.durationSec, width: item.width, height: item.height,
        size: item.sizeBytes ?? 0, sourceFile: { name: item.originalFilename ?? item.title, type: item.mimeType ?? 'video/mp4' },
        assetClass: 'VID' as const, importedAt: item.uploadedAt,
        tags: item.tags, assetCode: item.assetCode ?? ''
      }));
      session = createReviewSession(data.snapshot.assets.map(item => ({
        id: item._id, status: item.status as VideoStatus,
        rating: item.rating, shortlisted: item.isSelect, viewed: item.viewed,
        comments: (data.snapshot.comments ?? []).filter(comment => comment.videoId === item._id).map(comment => ({
          id: comment._id, body: comment.body, timecodeSec: comment.timecodeSec ?? null,
          authorName: comment.authorName, authorRole: comment.authorRole,
          createdAt: comment.createdAt, completedAt: comment.completedAt
        }))
      })));
      media = fromServer;
      processingObserver = observeProcessing(() => processing
        .filter(item => !item.ready || item.assetId === activeId).map(item => item.assetId), applyProcessing);
      return () => processingObserver?.stop();
    }
  });
  function applyProcessing(updates: ProcessingUpdate[]) {
    for (const update of updates) {
      const previous = processing.find(item => item.assetId === update.assetId);
      if (!previous || update.versionNumber < previous.versionNumber ||
          (update.versionId !== previous.versionId && update.versionNumber <= previous.versionNumber) ||
          (update.versionId === previous.versionId && update.updatedAt < previous.updatedAt) ||
          (previous.job?._id === update.job?._id && (update.job?.attempt ?? 0) < (previous.job?.attempt ?? 0))) continue;
      processing = processing.map(item => item.assetId === update.assetId ? update : item);
      media = media.map(item => item.id === update.assetId ? { ...item,
        url: processingSource(update), poster: processingPoster(update),
        duration: update.duration ?? item.duration, width: update.width ?? item.width,
        height: update.height ?? item.height } : item);
    }
  }
  onMount(() => {
    const query = window.matchMedia('(max-width: 760px)');
    const sync = () => { compactInspector = query.matches; };
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  });
  onMount(() => {
    let storage: Storage | undefined;
    try { storage = localStorage; } catch { /* Some browsers deny storage entirely. */ }
    appearancePreferences = createAppearancePreferences(projectId, storage);
    appearance = appearancePreferences.load(projectId);
  });
  function projectOverview() {
    select(null); activeCollectionId = null; activeFolderId = null; archived = false; importOptions.folderId = null; folderOpen = false; mediaType = 'all'; filters = defaultFilters(); query = ''; checked = transitionSelection(checked, { type: 'clear' }); navOpen = false;
  }
  function createProject(event: SubmitEvent) {
    event.preventDefault();
    const name = projectName.trim(); if (!name) return;
    if (live) { void ownerAction('createProject', { title: name, description: '' }).catch(cause => feedback = String(cause)); return; }
    const id = crypto.randomUUID();
    projects = [...projects, { id, name }];
    openFolder(id, 'all'); folderOpen = false;
    projectName = ''; projectDialog = false;
  }
  async function saveProjectIdentity(id: string, draft: ProjectIdentityDraft) {
    if (live) { await ownerAction('updateProject', { projectId: id, title: draft.name, description: draft.description, clientName: draft.clientName, brandColor: draft.brandColor }); return; }
    const original = projects.find(item => item.id === id);
    if (!original || disposed) throw new Error('Project editing is unavailable.');
    updateProjectIdentity(original, draft, folderAccess);
    const request = Symbol(id);
    identityRequests.set(id, request);
    let prepared: string | undefined;
    try {
      if (draft.banner) prepared = await prepareProjectBanner(draft.banner);
      if (disposed || identityRequests.get(id) !== request) return;
      const current = projects.find(item => item.id === id);
      if (!current) throw new Error('Project editing is unavailable.');
      const next = updateProjectIdentity(current, { ...draft, bannerUrl: draft.banner === null ? null : prepared }, folderAccess);
      projects = projects.map(item => item.id === id ? next : item);
      if (current.bannerUrl && current.bannerUrl !== next.bannerUrl) URL.revokeObjectURL(current.bannerUrl);
      prepared = undefined;
      feedback = 'Project settings saved for this session.';
    } finally {
      if (prepared) URL.revokeObjectURL(prepared);
      if (identityRequests.get(id) === request) identityRequests.delete(id);
    }
  }
  function filterBy(value: FilterId) { stopPreview(); if (project.archived) return; activeCollectionId = null; importOptions.folderId = null; activeFolderId = null; archived = false; filters = { ...defaultFilters(), statuses: value === 'all' || value === 'selected' ? [] : [value], selectedOnly: value === 'selected' }; query = ''; mediaType = 'all'; folderOpen = true; navOpen = false; }
  onDestroy(() => {
    disposed = true;
    coverRequests.clear();
    identityRequests.clear();
    for (const item of projects) if (item.bannerUrl) URL.revokeObjectURL(item.bannerUrl);
    importQueue.dispose();
    thumbnails.dispose();
    for (const folder of organization.folders) if (folder.coverImageUrl) URL.revokeObjectURL(folder.coverImageUrl);
    for (const asset of media) {
      URL.revokeObjectURL(asset.url);
      if (asset.poster) URL.revokeObjectURL(asset.poster);
    }
  });
</script>
<svelte:window onkeydown={mediaKeydown}/>
<svelte:head><title>Review Room — Studio</title><meta name="description" content="A focused space to watch, consider, and refine your work."/></svelte:head>
<input class="visually-hidden" tabindex="-1" aria-label="Choose local media" bind:this={picker} type="file" accept="video/*,image/*" multiple onchange={() => { importFiles(picker.files); picker.value = ''; }}/>
{#snippet navigation()}
  <div class="brand">review room.</div>
  <WorkspaceSwitcher/>
  <ProjectTree onEditProject={editProject} canEditProject={id => folderAccess.isAdmin && folderAccess.editableProjectIds.includes(id)} {canDropAssets} onDropAssets={dropAssets} dragActive={!!dragged} selectedCustomCollectionId={activeCollectionId} onCollection={openCollection} overview={!folderOpen} selectedFolderId={activeFolderId} {archived} onFolder={openRealFolder} onArchive={openArchived} onProject={openProject} projects={treeProjects} selectedProjectId={projectId} selectedCollection={filter === 'selected' ? 'selected' : mediaType} onOpen={openFolder} onCreate={() => { navOpen = false; projectDialog = true; }}/>
  <ArchivedProjects projects={archivedProjects} onRestore={restoreProject} closeOnRestore={navOpen} onNavigateFocus={focusProjectHeading}/>
  {#if folderAccess.isAdmin}<FeedbackInbox groups={inbox} onNavigateFocus={focusInboxDestination} onOpenNote={openInboxNote} onToggleComplete={toggleInboxNote}/>{/if}
  <div class="nav-divider"></div><span class="nav-heading">REVIEW STATUS</span>
  <button class:nav-active={!activeCollection && filter === 'awaiting_review'} class="nav-item" disabled={!!project.archived} onclick={() => filterBy('awaiting_review')}><span class="status-dot pending"></span> Awaiting review</button>
  <button class:nav-active={!activeCollection && filter === 'needs_changes'} class="nav-item" disabled={!!project.archived} onclick={() => filterBy('needs_changes')}><span class="status-dot changes"></span> Needs changes</button>
  <button class:nav-active={!activeCollection && filter === 'approved'} class="nav-item" disabled={!!project.archived} onclick={() => filterBy('approved')}><span class="status-dot approved"></span> Approved <span>{approved}</span></button>
  <div class="sidebar-bottom"><span class="mode-label"><span class="status-dot"></span> {live ? 'V1su4 workspace' : 'Local session'}</span><p>{live ? 'Projects and videos saved privately.' : 'Stored in this tab until reload.'}</p></div>
{/snippet}
<div class="app-shell" class:nav-collapsed={navCollapsed} style:--project-accent={project.brandColor ?? "#14b8a6"}>
  <aside class="sidebar" inert={navCollapsed} aria-hidden={navCollapsed}>{@render navigation()}</aside>
  <main ondragover={dragFiles} ondrop={dropFiles}>
    <header class="topbar">
      <button class="icon-button desktop-nav-toggle" aria-label={navCollapsed ? 'Expand navigation' : 'Collapse navigation'} aria-expanded={!navCollapsed} onclick={() => navCollapsed = !navCollapsed}>{#if navCollapsed}<PanelLeftOpen size={18}/>{:else}<PanelLeftClose size={18}/>{/if}</button>
      <Dialog.Root bind:open={navOpen}><Dialog.Trigger class="icon-button mobile-menu" aria-label="Open navigation"><Menu size={20}/></Dialog.Trigger><Dialog.Portal><Dialog.Overlay class="dialog-overlay"/><Dialog.Content class="nav-drawer" onCloseAutoFocus={event => { if (restoringFromNavigation) { event.preventDefault(); restoringFromNavigation = false; void focusProjectHeading(); } }} style={`--project-accent: ${project.brandColor ?? "#14b8a6"}`}><Dialog.Title class="visually-hidden">Workspace navigation</Dialog.Title><Dialog.Description class="visually-hidden">Browse local media and review status</Dialog.Description><Dialog.Close class="icon-button drawer-close" aria-label="Close navigation"><X size={20}/></Dialog.Close>{@render navigation()}</Dialog.Content></Dialog.Portal></Dialog.Root>
      <div class="breadcrumb"><button onclick={projectOverview}>{project.name}</button>{#if folderOpen}<ChevronRight size={13}/><strong>{locationName}</strong>{/if}</div>{#if data.snapshot}<Stage1SharingDialog snapshot={data.snapshot}/>{/if}{#if folderAccess.isAdmin}<FeedbackNotifications groups={inbox} onNavigateFocus={focusInboxDestination} onOpenNote={openInboxNote} onToggleComplete={toggleInboxNote}/>{/if}{#if !live}<AccountDialog/>{/if}
    </header>
    <div class="page-content" class:folder-workspace={folderOpen}>
      <section class="project-heading" class:identity-banner={!folderOpen && !!project.bannerUrl} style:--project-accent={project.brandColor ?? "#14b8a6"}>{#if !folderOpen && project.bannerUrl}<img class="project-banner" src={project.bannerUrl} alt=""/>{/if}<div class="project-heading-copy"><h1 bind:this={projectHeading} tabindex="-1">{folderOpen ? locationName : project.name}</h1>{#if !folderOpen}<p class="subtitle" title={project.description}>{project.archived ? "Archived project" : project.clientName || project.description || "Choose a folder to start reviewing."}</p>{/if}</div><div class="project-tools"><ImportQueue jobs={importJobs} onRetry={importQueue.retry} onCancel={importQueue.cancel} onClear={importQueue.clearFinished}/>{#if !project.archived}{#if !live}<ProjectAccessDialog projectId={project.id} projectTitle={project.name}/><ShareDialog projectId={project.id} projectTitle={project.name} canManage={projectOwnerAccess.isAdmin && projectOwnerAccess.ownedProjectIds.includes(project.id)} {appearance}/>{/if}<ProjectIdentityDialog bind:open={identityDialogOpen} {project} persistent={live} canEdit={folderAccess.isAdmin && folderAccess.editableProjectIds.includes(project.id)} canArchive={projectOwnerAccess.isAdmin && projectOwnerAccess.ownedProjectIds.includes(project.id)} onArchive={() => archiveProject(project.id)} onArchiveFocus={focusProjectHeading} onSave={draft => saveProjectIdentity(project.id, draft)}/>{#if !archived}<FolderActions coverUrl={activeFolder ? folderCoverUrl(activeFolder, allAssets) : undefined} hasCustomCover={!!(activeFolder?.coverImageUrl || activeFolder?.coverAssetId)} onCover={setFolderCover} folders={projectFolders} {activeFolderId} canManage={true} selectedCount={checked.ids.length} onCreate={createFolder} onRename={renameFolder} onRemove={removeFolder} onMove={moveChecked}/>{:else if checked.ids.length}<button class="secondary-button" onclick={restoreChecked}>Restore {checked.ids.length}</button>{/if}{#if active}<button class="secondary-button" aria-pressed={showInspector} onclick={() => showInspector = !showInspector}><PanelRightOpen size={16}/> Notes & info</button>{/if}<ImportOptions folders={projectFolders} folderId={importOptions.folderId} assetClass={importOptions.assetClass} onChange={value => importOptions = value}/><button class="primary-button" title={`Add media to ${projectFolders.find(folder => folder.id === importOptions.folderId)?.title ?? "today’s date folder"}`} onclick={() => picker.click()}><Plus size={18}/> Add media</button>{/if}</div></section>
      {#if feedback}<div class="notice" role="status">{feedback}<button class="icon-button" aria-label="Dismiss message" onclick={() => feedback = ''}><X size={16}/></button></div>{/if}
      {#if project.archived}<section class="archived-project-state" aria-label="Archived project">
        <h2>This project is archived.</h2><p>Your media, folders and feedback are retained.</p>
        <div><button class="primary-button" onclick={() => { restoreProject(project.id); void focusProjectHeading(); }}>Restore project</button><button class="secondary-button" onclick={() => projectDialog = true}>New project</button></div>
      </section>{:else if !folderOpen}<section class="folder-shelf" aria-label="Media collections">
        {#each projectFolders as folder (folder.id)}
          <button class="folder-card" onclick={() => openRealFolder(projectId, folder.id)}><FolderArtwork coverSrc={folderCoverUrl(folder, allAssets)} empty={!assets.some(asset => asset.folderId === folder.id)}/><strong>{folder.title}</strong><span>{assets.filter(asset => asset.folderId === folder.id).length} items</span></button>
        {/each}
        {#each [{ type: 'video' as const, name: 'Videos' }, { type: 'image' as const, name: 'Images' }] as collection (collection.type)}
          <button class="folder-card" class:folder-active={mediaType === collection.type} aria-pressed={mediaType === collection.type} onclick={() => openFolder(projectId, collection.type)}>
            <FolderArtwork empty={!assets.some(asset => asset.type === collection.type)}/><strong>{collection.name}</strong><span>{assets.filter(asset => asset.type === collection.type).length} items</span>
          </button>
        {/each}
        <button class="folder-card" class:folder-active={filter === 'selected'} aria-pressed={filter === 'selected'} onclick={() => openFolder(projectId, 'selected')}><FolderArtwork empty={!assets.some(asset => asset.shortlisted)}/><strong>Shortlist</strong><span>{assets.filter(asset => asset.shortlisted).length} items</span></button>
      </section>{/if}
      {#snippet explorer()}
      <div class="collection-bar"><div class="collection-title"><h2 bind:this={explorerHeading} tabindex="-1">Media</h2><span class="count">{visible.length}</span></div><CollectionActions {activeCollection} folders={projectFolders} canEdit={true} onCreate={createCollection} onRename={(collectionId, title) => changeCollections({ type: 'rename', collectionId, title })} onRemove={removeCollection} onSave={saveCollection}/></div>
      <div class="toolbar explorer-toolbar"><label class="search" class:has-query={!!query} title={query ? `Search media: ${query}` : "Search media"}><Search size={16}/><input aria-label="Search media" placeholder="Find a clip or image…" bind:value={query} onkeydown={event => { if (event.key === "Escape") { event.stopPropagation(); event.currentTarget.blur(); } }}/><kbd>⌕</kbd></label>
        <WorkspaceFilters value={filters} onChange={values => { filters = values; }}/>

        <AppearanceMenu value={appearance} onChange={changeAppearance}/>
        <div class="view-switch" aria-label="Media layout"><button class:chosen={view === 'grid'} aria-label="Grid view" title="Grid view" aria-pressed={view === 'grid'} onclick={() => view = 'grid'}><Grid2X2 size={16}/></button><button class:chosen={view === 'list'} aria-label="List view" title="List view" aria-pressed={view === 'list'} onclick={() => view = 'list'}><List size={18}/></button><button class:chosen={view === 'table'} aria-label="Table view" title="Table view" aria-pressed={view === 'table'} onclick={() => view = 'table'}><Table2 size={17}/></button></div>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger class="secondary-button compact-view-trigger" aria-label={`Media layout: ${view}`} title="Media layout">{#if view === 'grid'}<Grid2X2 size={16}/>{:else if view === 'list'}<List size={18}/>{:else}<Table2 size={17}/>{/if}</DropdownMenu.Trigger>
          <DropdownMenu.Portal><DropdownMenu.Content class="compact-view-menu" sideOffset={6} align="end" aria-label="Media layout">
            <DropdownMenu.Item class="compact-view-option" onSelect={() => view = 'grid'}><Grid2X2 size={16}/>Grid view{#if view === 'grid'}<Check size={14}/>{/if}</DropdownMenu.Item>
            <DropdownMenu.Item class="compact-view-option" onSelect={() => view = 'list'}><List size={18}/>List view{#if view === 'list'}<Check size={14}/>{/if}</DropdownMenu.Item>
            <DropdownMenu.Item class="compact-view-option" onSelect={() => view = 'table'}><Table2 size={17}/>Table view{#if view === 'table'}<Check size={14}/>{/if}</DropdownMenu.Item>
          </DropdownMenu.Content></DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      {#if !archived && (shortlistIds.length || preview)}
        <div class="shortlist-preview" aria-label="Shortlist playback">
          <button class="secondary-button" onclick={preview ? stopPreview : startPreview}>{#if preview}<Square size={12} fill="currentColor"/>Stop preview{:else}<Play size={13}/>Preview shortlist{/if}</button>
          <button class="preview-loop" aria-label="Loop shortlist" aria-pressed={loopPreview} onclick={() => loopPreview = !loopPreview}><Repeat size={14}/></button>
          <span role="status">{preview ? `${preview.ids.indexOf(preview.currentId) + 1} / ${preview.ids.length}` : `${shortlistIds.length} selected`}</span>
        </div>
      {/if}
      {#if checked.ids.length}
            <SelectionBar count={checked.ids.length} visibleCount={visible.length} access={localAccess} canEditMetadata={true} onTags={batchTags}
              selectedAssets={allAssets.filter(asset => checked.ids.includes(asset.id)).map(asset => ({id:asset.id,title:asset.name,shortlisted:asset.shortlisted}))} onDelete={deleteChecked}
              onselectvisible={() => checked = transitionSelection(checked, { type: 'select-visible', visibleIds })}
              onclear={() => checked = transitionSelection(checked, { type: 'clear' })}
              onshortlist={shortlisted => batchReview({ type: 'shortlist', shortlisted })}
              onstatus={status => batchReview({ type: 'status', status })}
              onrate={rating => batchReview({ type: 'rate', rating })}/>
      {/if}
        <section class="library" aria-label="Media collection">
          {#if activeCollection && !collectionIsConfigured(activeCollection)}<div class="empty-state compact"><Folder size={28}/><h2>Configure this collection</h2><p>Set your filters, then choose Save collection rules in the collection menu. You can also scope it to a folder.</p></div>
          {:else if activeCollection?.sourceFolderId && !projectFolders.some(folder => folder.id === activeCollection.sourceFolderId)}<div class="empty-state compact"><Folder size={28}/><h2>Source folder unavailable</h2><p>Choose another source in the collection settings.</p></div>
          {:else if archived && !assets.length}<div class="empty-state compact"><Folder size={28}/><h2>No archived media</h2><p>Restored assets are available in All media.</p><button class="secondary-button" onclick={() => openFolder(projectId, 'all')}>All media</button></div>
          {:else if !assets.length || (activeFolderId && !assets.some(asset => asset.folderId === activeFolderId))}<div class="empty-state"><div class="empty-art"><Folder size={58} strokeWidth={1}/><span class="empty-plus"><Plus size={20}/></span></div><h2>{activeFolderId ? 'This folder is empty' : 'Add your first media'}</h2><p>Open a video or image to start reviewing. {live ? 'Videos are saved privately to this workspace.' : 'Media stays on this device.'}</p><button class="primary-button" onclick={() => picker.click()}><Upload size={17}/> {live ? 'Add video' : 'Open local media'}</button></div>
          {:else if !visible.length}<div class="empty-state compact"><Search size={28}/><h2>No matching media</h2><p>Try another search or clear your filters.</p><button class="secondary-button" onclick={() => { query = ''; filters = defaultFilters(); mediaType = 'all'; }}>Clear filters</button></div>
          {:else}
            {#if !checked.ids.length}<div class="selection-tools"><button class="select-visible-button" onclick={() => checked = transitionSelection(checked, { type: 'select-visible', visibleIds })}>Select all {visible.length}</button></div>{/if}

            {#each groups as group (group.id)}
              <section class="media-group" aria-label={filters.groupBy === 'none' ? 'Assets' : group.label}>
                {#if filters.groupBy !== 'none'}<h3 class="group-heading">{group.label}<span>{group.assets.length}</span></h3>{/if}
                {#if view === 'table'}<AssetTable onDragStart={startAssetDrag} onDragEnd={endAssetDrag} assets={group.assets} {activeId} checkedIds={checked.ids} onSelect={openReview} onCheck={checkAsset} onReview={review}/>
                {:else}<MediaCards onDragStart={startAssetDrag} onDragEnd={endAssetDrag} access={localAccess} onReview={review} assets={group.assets} {activeId} checkedIds={checked.ids} {appearance} {view} onOpen={openReview} onCheck={checkAsset}/>{/if}
              </section>
            {/each}
          {/if}
        </section>
      {/snippet}
      {#snippet viewer()}
        {#if active}<section class="review-pane" aria-label="Asset review"><div class="review-title"><div><h2 bind:this={reviewHeading} tabindex="-1" aria-live="polite">{active.name}</h2></div><button class="icon-button" aria-label="Close review" onclick={closeReview}><PanelRightClose size={18}/></button></div>
          {#if activeMediaJob}<div class="media-job" role="status"><span>Processing: {activeMediaJob.status === 'ready' ? 'Ready' : activeMediaJob.status === 'error' ? 'Needs attention' : activeMediaJob.status === 'queued' ? 'Queued' : `${activeMediaJob.stage} in progress`}</span>{#if activeMediaJob.runId}<a href={`https://trigger.v1su4.dev/orgs/v1su4-91d9/projects/review-room-YXaz/env/prod/runs/${activeMediaJob.runId}`} target="_blank" rel="noopener noreferrer">Run {activeMediaJob.runId.slice(-8)}</a>{/if}{#if activeMediaJob.status === 'error' || (activeMediaJob.status === 'queued' && !activeMediaJob.runId)}<button onclick={() => retryMediaJob(activeMediaJob._id)}>{activeMediaJob.status === 'error' ? 'Retry' : 'Start processing'}</button>{:else if activeMediaJob.status === 'running'}<button onclick={() => processingObserver?.refresh()}>Refresh</button>{/if}</div>{/if}
          {#if active.type === 'video'}<Player bind:this={player} onready={mediaReady} onended={reviewEnded} loop={!preview && reviewPlaybackMode === 'loop'} onfailure={previewFailed} sourceBlob={active.sourceFile instanceof File ? active.sourceFile : undefined} onViewed={() => { if (!active.viewed) review({ type: 'mark-viewed', assetId: active.id }); }} diagnostics={false} src={active.url} name={active.name} onmetadata={info => updateAsset(active.id, { duration: info.duration, width: info.width, height: info.height, fps: info.estimatedFps, codec: info.codec })} ontime={t => currentTime = t}/>{:else}<StillViewer onfailure={previewFailed} assetId={active.id} src={active.url} name={active.name} strokes={active.annotations.draft} dirty={!annotationsEqual(active.annotations.draft, active.annotations.saved)} canAnnotate={!preview}
              canDownload={true} onChange={strokes => review({ type: 'annotate', assetId: active.id, action: { type: 'replace', strokes } })} onSave={() => review({ type: 'annotate', assetId: active.id, action: { type: 'save' } })} onViewed={() => { if (!active.viewed) review({ type: 'mark-viewed', assetId: active.id }); }} onmetadata={info => { updateAsset(active.id, info); readySource = active.url; }}/>{/if}
          <div class="review-actions"><div class="review-feedback"><button class="shortlist-toggle" class:shortlisted={active.shortlisted} aria-label={active.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'} aria-pressed={active.shortlisted} title={active.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'} onclick={() => review({ type: 'shortlist', assetId: active.id, shortlisted: !active.shortlisted })}><Bookmark size={17} fill={active.shortlisted ? 'currentColor' : 'none'}/></button><div class="rating" aria-label="Rating">{#each [1,2,3,4,5] as rating (rating)}<button aria-label={`Rate ${rating} stars`} aria-pressed={active.rating === rating} onclick={() => review({ type: 'rate', assetId: active.id, rating: active.rating === rating ? 0 : rating })}><Star size={17} fill={active.rating >= rating ? 'currentColor' : 'none'}/></button>{/each}</div></div><div class="review-outcome"><button class:decision-active={active.status === 'needs_changes'} class="secondary-button" onclick={() => review({ type: 'status', assetId: active.id, status: active.status === 'needs_changes' ? 'awaiting_review' : 'needs_changes' })}>Request changes</button><button class="primary-button" onclick={() => review({ type: 'status', assetId: active.id, status: active.status === 'approved' ? 'awaiting_review' : 'approved' })}><Check size={16}/>{active.status === 'approved' ? 'Approved' : 'Approve'}</button><div class="asset-nav">{#if active.type === 'video'}<ReviewPlaybackMenu mode={reviewPlaybackMode} onChange={changePlaybackMode} disabled={!!preview}/>{/if}<button class="icon-button" aria-label="Previous asset" aria-keyshortcuts="ArrowLeft" title="Previous asset (←)" disabled={visibleIds.indexOf(activeId ?? '') <= 0} onclick={() => navigate(-1)}><ArrowLeft size={17}/></button><button class="icon-button" aria-label="Next asset" aria-keyshortcuts="ArrowRight" title="Next asset (→)" disabled={visibleIds.indexOf(activeId ?? '') >= visibleIds.length - 1} onclick={() => navigate(1)}><ArrowRight size={17}/></button></div></div></div>
        </section>{/if}
      {/snippet}
      {#snippet inspector()}
        {#if active}<section class="feedback-pane" aria-label="Asset inspector">
          <Tabs.Root value={compactInspector ? 'notes' : inspectorTab} onValueChange={value => { if (!compactInspector) inspectorTab = value; }}>
            <div class="inspector-heading">
              <Tabs.List class="inspector-tabs" aria-label="Asset inspector panels"><Tabs.Trigger value="notes" bind:ref={notesTrigger}>Notes <span>{active.comments.length}</span></Tabs.Trigger>{#if !compactInspector}<Tabs.Trigger value="fields">Fields</Tabs.Trigger>{/if}</Tabs.List>
              <MetadataSheet asset={active} review={active} {knownTags} canEdit={true} onChange={updateAsset} onOpen={stopPreview} onDesktopClose={() => notesTrigger?.focus()}/>
            </div>
            <Tabs.Content value="notes">
          <ReviewNotes showHeader={false} comments={active.comments} draft={active.draft.body} time={active.draft.body && active.draft.timecodeSec !== null ? active.draft.timecodeSec : currentTime} isVideo={active.type === 'video'} pinTime={active.draft.body ? active.draft.timecodeSec !== null : pinTime} onPinTime={value => { pinTime = value; review({type:'draft',assetId:active.id,body:active.draft.body,timecodeSec:value && active.type === 'video' ? currentTime : null}); }} onDraft={updateDraft} onPublish={comment} onSeek={time => player?.seek(time)} onComplete={commentId => review({type:'toggle-comment-complete',assetId:active.id,commentId,actorId:'local-reviewer',at:Date.now()})} onReact={(commentId,emoji) => review({type:'toggle-comment-reaction',assetId:active.id,commentId,actorId:'local-reviewer',emoji})}/>
          </Tabs.Content>
            <Tabs.Content value="fields"><AssetDetails asset={active} review={active} {knownTags} canEdit={true} onChange={updateAsset}/></Tabs.Content>
          </Tabs.Root>
        </section>{/if}
      {/snippet}
      <div hidden={!folderOpen || !!project.archived}><WorkspacePanes {explorer} {viewer} {inspector} hasActive={!!active} {showInspector}/></div>
      <footer class="workspace-footer"><span>{live ? 'Projects and videos saved privately' : 'Local workspace · unsaved session'}</span><span>review room.</span></footer>
    </div>
  </main>
</div>

<Dialog.Root bind:open={projectDialog}>
  <Dialog.Portal><Dialog.Overlay class="dialog-overlay"/><Dialog.Content class="filter-sheet">
    <Dialog.Title class="dialog-title">New project</Dialog.Title>
    <Dialog.Description class="dialog-description">Includes Videos, Images, and Shortlist.</Dialog.Description>
    <form onsubmit={createProject}>
      <label class="filter-field">Project name<input class="project-name-input" bind:value={projectName} placeholder="Untitled project" required maxlength="100"/></label>
      <div class="filter-actions"><Dialog.Close class="secondary-button">Cancel</Dialog.Close><button class="primary-button" type="submit" disabled={!projectName.trim()}><Plus size={16}/> Create project</button></div>
    </form>
  </Dialog.Content></Dialog.Portal>
</Dialog.Root>

<style>
  .media-job { display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:7px 12px; border-block:1px solid var(--border); background:color-mix(in srgb, var(--teal) 7%, var(--panel)); color:var(--muted); font-size:11px; }
  .media-job span { color:var(--ink); }
  .media-job a { color:var(--teal); }
  .media-job button { border:0; background:transparent; color:var(--teal); cursor:pointer; font:inherit; padding:3px; }
  .shortlist-preview { display: flex; align-items: center; gap: 7px; padding: 0 0 12px; }
  .shortlist-preview .secondary-button,.preview-loop { height: 28px; min-height: 28px; padding: 0 9px; font-size: 11px; }
  .preview-loop { display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--border); border-radius: 5px; color: var(--muted); background: var(--panel); cursor: pointer; }
  .preview-loop[aria-pressed='true'] { color: var(--teal); background: var(--raised); }
  .preview-loop:focus-visible { outline: 1px solid var(--teal); outline-offset: 2px; }
  .shortlist-preview > span { color: var(--muted); font: 10px monospace; }
  @media (pointer: coarse) { .shortlist-preview .secondary-button,.preview-loop { min-width: 44px; min-height: 44px; } }

  .archived-project-state { padding: clamp(28px, 6vw, 72px) 0; }
  .archived-project-state h2 { font-size: 18px; font-weight: 500; }
  .archived-project-state p { margin: 8px 0 20px; color: var(--muted); font-size: 12px; }
  .archived-project-state > div { display: flex; flex-wrap: wrap; gap: 8px; }
  .project-heading { position: relative; isolation: isolate; }
  .project-heading-copy { min-width: 0; }
  .project-heading-copy .subtitle { max-width: 52ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .identity-banner { padding: 16px; border-radius: 8px; background: color-mix(in srgb, var(--project-accent) 18%, #030605); }
  .project-banner { position: absolute; inset: 0; z-index: -1; width: 100%; height: 100%; object-fit: cover; opacity: .2; border-radius: inherit; pointer-events: none; }
</style>
