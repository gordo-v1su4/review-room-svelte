<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import ImportOptions from '$lib/components/ImportOptions.svelte';
  import FolderActions from '$lib/components/FolderActions.svelte';
  import { transitionFolderState, type FolderState, type FolderAction } from '$lib/project-folders';
  import { updateTags } from '$lib/bulk-tags';
  import StillViewer from '$lib/components/StillViewer.svelte';
  import { annotationsEqual } from '$lib/annotations';
  import MediaCards from '$lib/components/MediaCards.svelte';
  import AssetDetails from '$lib/components/AssetDetails.svelte';
  import SelectionBar from '$lib/components/SelectionBar.svelte';
  import { transitionSelection, type SelectionState } from '$lib/media-selection';
  import { normalizeAppearance, type AppearanceValue } from '$lib/appearance';
  import AppearanceMenu from '$lib/components/AppearanceMenu.svelte';
  import ProjectTree from '$lib/components/ProjectTree.svelte';
  import WorkspacePanes from '$lib/components/WorkspacePanes.svelte';
  import FolderArtwork from '$lib/components/FolderArtwork.svelte';
  import ReviewNotes from '$lib/components/ReviewNotes.svelte';
  import WorkspaceFilters from '$lib/components/WorkspaceFilters.svelte';
  import AssetTable from '$lib/components/AssetTable.svelte';
  import { queryWorkspace, groupWorkspaceAssets, type WorkspaceMediaType, type WorkspaceFilterState } from '$lib/workspace';
  import type { VideoStatus } from '../../../src/lib/types';
  import { Dialog, Tabs } from 'bits-ui';
  import { ArrowUpRight, ArrowLeft, ArrowRight, Check, ChevronDown, Film, Folder, Grid2X2, Table2, List, MessageSquare, Menu, Plus, Search, SlidersHorizontal, Star, Upload, X, Bookmark, Clock3, Image, PanelRightClose, PanelLeftClose, PanelLeftOpen, PanelRightOpen, ChevronRight } from 'lucide-svelte';
  import Player from '$lib/playback/Player.svelte';
  import { createThumbnailExtractor } from '$lib/playback/thumbnails';
  import { openLocalAsset, type LocalAsset } from '$lib/review';
  import { createReviewSession, transitionReviewSession, type ReviewAction, type ReviewAccess } from '$lib/review-session';
  let media = $state<LocalAsset[]>([]);
  let session = $state.raw(createReviewSession([]));
  // This owner role is for device-local review only, never live authorization.
  const localAccess: ReviewAccess = { kind: 'project', memberRole: 'owner' };
  let projects = $state([{ id: 'studio', name: 'Studio project' }]);
  let projectId = $state('studio');
  let organization = $state.raw<FolderState>({ folders: [], placements: {} });
  let activeFolderId = $state<string | null>(null);
  let importOptions = $state<{ folderId: string | null; assetClass: 'VID' | 'IMG' | 'CTX' | 'STB' }>({ folderId: null, assetClass: 'VID' });
  let archived = $state(false);
  const folderAccess = $derived({ isAdmin: true, editableProjectIds: projects.map(project => project.id) });
  const projectFolders = $derived(organization.folders.filter(folder => folder.projectId === projectId));
  const activeFolder = $derived(projectFolders.find(folder => folder.id === activeFolderId));
  let folderOpen = $state(false);
  let navCollapsed = $state(false);
  let projectDialog = $state(false), projectName = $state('');
  const allAssets = $derived(media.map(asset => ({ ...asset, ...session.assets[asset.id], ...organization.placements[asset.id], status: organization.placements[asset.id]?.archived ? 'archived' as VideoStatus : session.assets[asset.id].status, folderName: organization.folders.find(folder => folder.id === organization.placements[asset.id]?.folderId)?.title, commentsCount: session.assets[asset.id]?.comments.length ?? 0 })));
  const assets = $derived(allAssets.filter(asset => asset.projectId === projectId && (Boolean(asset.archived) === archived || (!archived && filters.statuses.includes('archived')))));
  const project = $derived(projects.find(item => item.id === projectId)!);
  const treeProjects = $derived(projects.map(project => {
    const items = allAssets.filter(asset => asset.projectId === project.id && !asset.archived);
    return { ...project, folders: organization.folders.filter(folder => folder.projectId === project.id).map(folder => ({ ...folder, count: items.filter(asset => asset.folderId === folder.id).length })), archivedCount: allAssets.filter(asset => asset.projectId === project.id && asset.archived).length, videoCount: items.filter(asset => asset.type === 'video').length, imageCount: items.filter(asset => asset.type === 'image').length, shortlistCount: items.filter(asset => asset.shortlisted).length };
  }));
  const activeId = $derived(session.activeAssetId);
  function review(action: ReviewAction) { session = transitionReviewSession(session, action, localAccess); }
  type FilterId = 'all' | 'selected' | VideoStatus;
  let query = $state(''), view = $state<'grid' | 'list' | 'table'>('grid');
  let mediaType = $state<WorkspaceMediaType | 'all'>('all');
  const defaultFilters = (): WorkspaceFilterState => ({ search: '', statuses: [], assetClasses: [], tags: [], selectedOnly: false, minRating: 0, hasComments: false, sort: 'newest', groupBy: 'none' });
  let filters = $state<WorkspaceFilterState>(defaultFilters());
  const filter = $derived<FilterId>(filters.selectedOnly ? 'selected' : filters.statuses.length === 1 ? filters.statuses[0] : 'all');
  let appearance = $state<AppearanceValue>(normalizeAppearance(null));
  let checked = $state<SelectionState>({ ids: [], anchorId: null });
  let player = $state<ReturnType<typeof Player>>();
  let currentTime = $state(0), pinTime = $state(true), feedback = $state('');
  let navOpen = $state(false), showInspector = $state(false);
  let inspectorTab = $state('notes');
  const knownTags = $derived([...new Set(assets.flatMap(asset => asset.tags))]);
  let picker: HTMLInputElement;
  const thumbnails = createThumbnailExtractor({ concurrency: 2 });
  let disposed = false;
  const active = $derived(assets.find(asset => asset.id === activeId));
  const visible = $derived(queryWorkspace(activeFolderId ? assets.filter(asset => asset.folderId === activeFolderId) : assets, { ...filters, search: query, shortlisted: filters.selectedOnly ? true : undefined, mediaTypes: mediaType === 'all' ? undefined : [mediaType] }));
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
  function importFiles(files: FileList | null) {
    if (!files) return;
    const added: LocalAsset[] = [];
    const skipped: string[] = [];
    for (const file of files) {
      try {
        const asset = openLocalAsset(file);
        if (asset.type === 'image') asset.assetClass = importOptions.assetClass === 'VID' ? 'IMG' : importOptions.assetClass;
        added.push(asset);
      } catch { skipped.push(file.name); }
    }
    if (!added.length) {
      if (skipped.length) feedback = 'Choose video or image files to import.';
      return;
    }
    const today = new Date();
    const dateKey = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    try {
      organization = transitionFolderState(organization, {
        type: 'register', projectId, assetIds: added.map(asset => asset.id),
        folderId: importOptions.folderId ?? undefined,
        dateFolder: { id: crypto.randomUUID(), dateKey }
      }, folderAccess);
    } catch (cause) {
      for (const asset of added) URL.revokeObjectURL(asset.url);
      feedback = cause instanceof Error ? cause.message : 'Could not import media.';
      return;
    }
    media.push(...added);
    review({ type: 'add-assets', assets: added });
    const destination = organization.placements[added[0].id].folderId!;
    openRealFolder(projectId, destination);
    feedback = skipped.length ? `Imported ${added.length}. Skipped ${skipped.length} unsupported ${skipped.length === 1 ? 'file' : 'files'}.` : '';
    for (const asset of added) if (asset.type === 'video') {
      void thumbnails.extract(asset.sourceFile).then(({ blob, duration, sourceWidth, sourceHeight }) => {
        if (disposed) return;
        const poster = URL.createObjectURL(blob);
        media = media.map(item => item.id === asset.id ? { ...item, poster, duration, width: sourceWidth, height: sourceHeight } : item);
      }).catch(() => { /* The film placeholder remains usable when decoding fails. */ });
    }
  }

  function select(id: string | null) {
    if (id === activeId) return;
    review({ type: 'select', assetId: id });
    currentTime = 0;
  }
  function navigate(delta: number) {
    const index = visibleIds.indexOf(activeId ?? '');
    const next = visibleIds[index + delta]; if (next) select(next);
  }
  function updateDraft(body: string) {
    if (!active) return;
    review({ type: 'draft', assetId: active.id, body, timecodeSec: active.draft.body ? active.draft.timecodeSec : pinTime && active.type === 'video' ? currentTime : null });
  }
  function comment() {
    if (!active?.draft.body.trim()) return;
    review({ type: 'publish-comment', assetId: active.id, commentId: crypto.randomUUID() });
  }
  function openFolder(id: string, collection: 'all' | 'video' | 'image' | 'selected') {
    select(null);
    projectId = id;
    activeFolderId = null; archived = false; importOptions.folderId = null;
    mediaType = collection === 'video' || collection === 'image' ? collection : 'all';
    filters = { ...defaultFilters(), selectedOnly: collection === 'selected' };
    query = ''; checked = transitionSelection(checked, { type: 'clear' });
    folderOpen = true; navOpen = false; feedback = '';
  }
  const locationName = $derived(archived ? 'Archived' : activeFolder?.title ?? (mediaType === 'video' ? 'Videos' : mediaType === 'image' ? 'Images' : filter === 'selected' ? 'Shortlist' : 'All media'));
  function organize(action: FolderAction) { organization = transitionFolderState(organization, action, folderAccess); }
  function openRealFolder(id: string, folderId: string) { openFolder(id, 'all'); activeFolderId = folderId; importOptions.folderId = folderId; }
  function openProject(id: string) { openFolder(id, 'all'); folderOpen = false; }
  function openArchived(id: string) { openFolder(id, 'all'); archived = true; }
  function createFolder(title: string) {
    const id = crypto.randomUUID();
    organize({ type: 'create', id, projectId, title });
    openRealFolder(projectId, id);
  }
  function removeFolder(folderId: string, disposition: 'move_to_root' | 'archive_assets') {
    organize({ type: 'remove', folderId, disposition });
    if (activeFolderId === folderId) openFolder(projectId, 'all');
  }
  function moveChecked(folderId: string | null) {
    const assetIds = checked.ids.filter(id => visibleIds.includes(id));
    organize({ type: 'move', projectId, folderId: folderId ?? undefined, assetIds });
    if (activeFolderId && activeFolderId !== folderId && activeId && assetIds.includes(activeId)) select(null);
    checked = transitionSelection(checked, { type: 'clear' });
    feedback = `Moved ${assetIds.length} ${assetIds.length === 1 ? 'asset' : 'assets'} to ${projectFolders.find(folder => folder.id === folderId)?.title ?? 'Project root'}.`;
  }
  function restoreChecked() {
    const assetIds = checked.ids.filter(id => visibleIds.includes(id));
    organize({ type: 'restore', projectId, assetIds });
    select(null); checked = transitionSelection(checked, { type: 'clear' });
    feedback = `Restored ${assetIds.length} ${assetIds.length === 1 ? 'asset' : 'assets'} to Project root.`;
  }
  function changeAppearance(value: typeof appearance) {
    appearance = value;
    try { localStorage.setItem('review-room.appearance', JSON.stringify(value)); } catch { /* Preferences are optional. */ }
  }
  onMount(() => {
    try {
      const value = JSON.parse(localStorage.getItem('review-room.appearance') ?? 'null');
      appearance = normalizeAppearance(value);
    } catch { /* Retain defaults when storage is unavailable. */ }
  });
  function projectOverview() {
    select(null); activeFolderId = null; archived = false; importOptions.folderId = null; folderOpen = false; mediaType = 'all'; filters = defaultFilters(); query = ''; checked = transitionSelection(checked, { type: 'clear' }); navOpen = false;
  }
  function createProject(event: SubmitEvent) {
    event.preventDefault();
    const name = projectName.trim(); if (!name) return;
    const id = crypto.randomUUID();
    projects = [...projects, { id, name }];
    openFolder(id, 'all'); folderOpen = false;
    projectName = ''; projectDialog = false;
  }
  function filterBy(value: FilterId) { importOptions.folderId = null; activeFolderId = null; archived = false; filters = { ...defaultFilters(), statuses: value === 'all' || value === 'selected' ? [] : [value], selectedOnly: value === 'selected' }; query = ''; mediaType = 'all'; folderOpen = true; navOpen = false; }
  onDestroy(() => {
    disposed = true;
    thumbnails.dispose();
    for (const asset of media) {
      URL.revokeObjectURL(asset.url);
      if (asset.poster) URL.revokeObjectURL(asset.poster);
    }
  });
</script>
<svelte:head><title>Review Room — Studio</title><meta name="description" content="A focused space to watch, consider, and refine your work."/></svelte:head>
<input class="visually-hidden" tabindex="-1" aria-label="Choose local media" bind:this={picker} type="file" accept="video/*,image/*" multiple onchange={() => { importFiles(picker.files); picker.value = ''; }}/>
{#snippet navigation()}
  <div class="brand">review room.</div>
  <button class="workspace-name" onclick={projectOverview}>Personal workspace</button>
  <ProjectTree overview={!folderOpen} selectedFolderId={activeFolderId} {archived} onFolder={openRealFolder} onArchive={openArchived} onProject={openProject} projects={treeProjects} selectedProjectId={projectId} selectedCollection={filter === 'selected' ? 'selected' : mediaType} onOpen={openFolder} onCreate={() => { navOpen = false; projectDialog = true; }}/>
  <div class="nav-divider"></div><span class="nav-heading">REVIEW STATUS</span>
  <button class:nav-active={filter === 'awaiting_review'} class="nav-item" onclick={() => filterBy('awaiting_review')}><span class="status-dot pending"></span> Awaiting review</button>
  <button class:nav-active={filter === 'needs_changes'} class="nav-item" onclick={() => filterBy('needs_changes')}><span class="status-dot changes"></span> Needs changes</button>
  <button class:nav-active={filter === 'approved'} class="nav-item" onclick={() => filterBy('approved')}><span class="status-dot approved"></span> Approved <span>{approved}</span></button>
  <div class="sidebar-bottom"><span class="mode-label"><span class="status-dot"></span> Local session</span><p>Stored in this tab until reload.</p></div>
{/snippet}
<div class="app-shell" class:nav-collapsed={navCollapsed}>
  <aside class="sidebar" inert={navCollapsed} aria-hidden={navCollapsed}>{@render navigation()}</aside>
  <main>
    <header class="topbar">
      <button class="icon-button desktop-nav-toggle" aria-label={navCollapsed ? 'Expand navigation' : 'Collapse navigation'} aria-expanded={!navCollapsed} onclick={() => navCollapsed = !navCollapsed}>{#if navCollapsed}<PanelLeftOpen size={18}/>{:else}<PanelLeftClose size={18}/>{/if}</button>
      <Dialog.Root bind:open={navOpen}><Dialog.Trigger class="icon-button mobile-menu" aria-label="Open navigation"><Menu size={20}/></Dialog.Trigger><Dialog.Portal><Dialog.Overlay class="dialog-overlay"/><Dialog.Content class="nav-drawer"><Dialog.Title class="visually-hidden">Workspace navigation</Dialog.Title><Dialog.Description class="visually-hidden">Browse local media and review status</Dialog.Description><Dialog.Close class="icon-button drawer-close" aria-label="Close navigation"><X size={20}/></Dialog.Close>{@render navigation()}</Dialog.Content></Dialog.Portal></Dialog.Root>
      <div class="breadcrumb"><button onclick={projectOverview}>{project.name}</button>{#if folderOpen}<ChevronRight size={13}/><strong>{locationName}</strong>{/if}</div><span class="avatar small">YO</span>
    </header>
    <div class="page-content" class:folder-workspace={folderOpen}>
      <section class="project-heading"><div><h1>{folderOpen ? locationName : project.name}</h1>{#if !folderOpen}<p class="subtitle">Choose a folder to start reviewing.</p>{/if}</div><div class="project-tools">{#if !archived}<FolderActions folders={projectFolders} {activeFolderId} canManage={true} selectedCount={checked.ids.length} onCreate={createFolder} onRename={(folderId, title) => organize({ type: 'rename', folderId, title })} onRemove={removeFolder} onMove={moveChecked}/>{:else if checked.ids.length}<button class="secondary-button" onclick={restoreChecked}>Restore {checked.ids.length}</button>{/if}{#if active}<button class="secondary-button" aria-pressed={showInspector} onclick={() => showInspector = !showInspector}><PanelRightOpen size={16}/> Notes & info</button>{/if}<ImportOptions folders={projectFolders} folderId={importOptions.folderId} assetClass={importOptions.assetClass} onChange={value => importOptions = value}/><button class="primary-button" title={`Add media to ${projectFolders.find(folder => folder.id === importOptions.folderId)?.title ?? "today’s date folder"}`} onclick={() => picker.click()}><Plus size={18}/> Add media</button></div></section>
      {#if feedback}<div class="notice" role="status">{feedback}<button class="icon-button" aria-label="Dismiss message" onclick={() => feedback = ''}><X size={16}/></button></div>{/if}
      {#if !folderOpen}<section class="folder-shelf" aria-label="Media collections">
        {#each projectFolders as folder (folder.id)}
          <button class="folder-card" onclick={() => openRealFolder(projectId, folder.id)}><FolderArtwork empty={!assets.some(asset => asset.folderId === folder.id)}/><strong>{folder.title}</strong><span>{assets.filter(asset => asset.folderId === folder.id).length} items</span></button>
        {/each}
        {#each [{ type: 'video' as const, name: 'Videos' }, { type: 'image' as const, name: 'Images' }] as collection (collection.type)}
          <button class="folder-card" class:folder-active={mediaType === collection.type} aria-pressed={mediaType === collection.type} onclick={() => openFolder(projectId, collection.type)}>
            <FolderArtwork empty={!assets.some(asset => asset.type === collection.type)}/><strong>{collection.name}</strong><span>{assets.filter(asset => asset.type === collection.type).length} items</span>
          </button>
        {/each}
        <button class="folder-card" class:folder-active={filter === 'selected'} aria-pressed={filter === 'selected'} onclick={() => openFolder(projectId, 'selected')}><FolderArtwork empty={!assets.some(asset => asset.shortlisted)}/><strong>Shortlist</strong><span>{assets.filter(asset => asset.shortlisted).length} items</span></button>
      </section>{/if}
      {#snippet explorer()}
      <div class="collection-bar"><div class="collection-title"><h2>Media</h2><span class="count">{visible.length}</span></div><span class="local-badge">LOCAL SESSION</span></div>
      <div class="toolbar"><label class="search"><Search size={16}/><input aria-label="Search media" placeholder="Find a clip or image…" bind:value={query}/><kbd>⌕</kbd></label>
        <WorkspaceFilters value={filters} onChange={values => { filters = values; }}/>

        <AppearanceMenu value={appearance} onChange={changeAppearance}/>
        <div class="view-switch" aria-label="Media layout"><button class:chosen={view === 'grid'} aria-label="Grid view" aria-pressed={view === 'grid'} onclick={() => view = 'grid'}><Grid2X2 size={16}/></button><button class:chosen={view === 'list'} aria-label="List view" aria-pressed={view === 'list'} onclick={() => view = 'list'}><List size={18}/></button><button class:chosen={view === 'table'} aria-label="Table view" aria-pressed={view === 'table'} onclick={() => view = 'table'}><Table2 size={17}/></button></div>
      </div>
      {#if checked.ids.length}
            <SelectionBar count={checked.ids.length} visibleCount={visible.length} access={localAccess} canEditMetadata={true} onTags={batchTags}
              onselectvisible={() => checked = transitionSelection(checked, { type: 'select-visible', visibleIds })}
              onclear={() => checked = transitionSelection(checked, { type: 'clear' })}
              onshortlist={shortlisted => batchReview({ type: 'shortlist', shortlisted })}
              onstatus={status => batchReview({ type: 'status', status })}
              onrate={rating => batchReview({ type: 'rate', rating })}/>
      {/if}
        <section class="library" aria-label="Media collection">
          {#if archived && !assets.length}<div class="empty-state compact"><Folder size={28}/><h2>No archived media</h2><p>Restored assets are available in All media.</p><button class="secondary-button" onclick={() => openFolder(projectId, 'all')}>All media</button></div>
          {:else if !assets.length || (activeFolderId && !assets.some(asset => asset.folderId === activeFolderId))}<div class="empty-state"><div class="empty-art"><Folder size={58} strokeWidth={1}/><span class="empty-plus"><Plus size={20}/></span></div><h2>{activeFolderId ? 'This folder is empty' : 'Add your first media'}</h2><p>Open a video or image to start reviewing. Media stays on this device.</p><button class="primary-button" onclick={() => picker.click()}><Upload size={17}/> Open local media</button></div>
          {:else if !visible.length}<div class="empty-state compact"><Search size={28}/><h2>No matching media</h2><p>Try another search or clear your filters.</p><button class="secondary-button" onclick={() => { query = ''; filters = defaultFilters(); mediaType = 'all'; }}>Clear filters</button></div>
          {:else}
            <div class="selection-tools"><button class="select-visible-button" onclick={() => checked = transitionSelection(checked, { type: 'select-visible', visibleIds })}>Select all {visible.length}</button></div>

            {#each groups as group (group.id)}
              <section class="media-group" aria-label={filters.groupBy === 'none' ? 'Assets' : group.label}>
                {#if filters.groupBy !== 'none'}<h3 class="group-heading">{group.label}<span>{group.assets.length}</span></h3>{/if}
                {#if view === 'table'}<AssetTable assets={group.assets} {activeId} checkedIds={checked.ids} onSelect={select} onCheck={checkAsset} onReview={review}/>
                {:else}<MediaCards assets={group.assets} {activeId} checkedIds={checked.ids} {appearance} {view} onOpen={select} onCheck={checkAsset}/>{/if}
              </section>
            {/each}
          {/if}
        </section>
      {/snippet}
      {#snippet viewer()}
        {#if active}<section class="review-pane" aria-label="Asset review"><div class="review-title"><div><h2>{active.name}</h2></div><button class="icon-button" aria-label="Close review" onclick={() => select(null)}><PanelRightClose size={18}/></button></div>
          {#if active.type === 'video'}<Player bind:this={player} sourceBlob={active.sourceFile} onViewed={() => { if (!active.viewed) review({ type: 'mark-viewed', assetId: active.id }); }} diagnostics={false} src={active.url} name={active.name} onmetadata={info => updateAsset(active.id, { duration: info.duration, width: info.width, height: info.height, fps: info.estimatedFps, codec: info.codec })} ontime={t => currentTime = t}/>{:else}<StillViewer assetId={active.id} src={active.url} name={active.name} strokes={active.annotations.draft} dirty={!annotationsEqual(active.annotations.draft, active.annotations.saved)} canAnnotate={true}
              canDownload={true} onChange={strokes => review({ type: 'annotate', assetId: active.id, action: { type: 'replace', strokes } })} onSave={() => review({ type: 'annotate', assetId: active.id, action: { type: 'save' } })} onViewed={() => { if (!active.viewed) review({ type: 'mark-viewed', assetId: active.id }); }} onmetadata={info => updateAsset(active.id, info)}/>{/if}
          <div class="review-actions"><button class:shortlisted={active.shortlisted} class="secondary-button" aria-pressed={active.shortlisted} onclick={() => review({ type: 'shortlist', assetId: active.id, shortlisted: !active.shortlisted })}><Bookmark size={16}/> {active.shortlisted ? 'Shortlisted' : 'Shortlist'}</button><div class="rating" aria-label="Rating">{#each [1,2,3,4,5] as rating (rating)}<button aria-label={`Rate ${rating} stars`} aria-pressed={active.rating === rating} onclick={() => review({ type: 'rate', assetId: active.id, rating: active.rating === rating ? 0 : rating })}><Star size={17} fill={active.rating >= rating ? 'currentColor' : 'none'}/></button>{/each}</div><div class="asset-nav"><button class="icon-button" aria-label="Previous asset" disabled={visibleIds.indexOf(activeId ?? '') <= 0} onclick={() => navigate(-1)}><ArrowLeft size={17}/></button><button class="icon-button" aria-label="Next asset" disabled={visibleIds.indexOf(activeId ?? '') >= visibleIds.length - 1} onclick={() => navigate(1)}><ArrowRight size={17}/></button></div></div>
          <div class="decision-bar"><button class:decision-active={active.status === 'needs_changes'} class="secondary-button" onclick={() => review({ type: 'status', assetId: active.id, status: active.status === 'needs_changes' ? 'awaiting_review' : 'needs_changes' })}>Request changes</button><button class="primary-button" onclick={() => review({ type: 'status', assetId: active.id, status: active.status === 'approved' ? 'awaiting_review' : 'approved' })}><Check size={16}/>{active.status === 'approved' ? 'Approved' : 'Approve'}</button></div>
        </section>{/if}
      {/snippet}
      {#snippet inspector()}
        {#if active}<section class="feedback-pane" aria-label="Asset inspector">
          <Tabs.Root bind:value={inspectorTab}>
            <Tabs.List class="inspector-tabs" aria-label="Asset inspector panels"><Tabs.Trigger value="notes">Notes <span>{active.comments.length}</span></Tabs.Trigger><Tabs.Trigger value="fields">Fields</Tabs.Trigger></Tabs.List>
            <Tabs.Content value="notes">
          <ReviewNotes showHeader={false} comments={active.comments} draft={active.draft.body} time={active.draft.body && active.draft.timecodeSec !== null ? active.draft.timecodeSec : currentTime} isVideo={active.type === 'video'} pinTime={active.draft.body ? active.draft.timecodeSec !== null : pinTime} onPinTime={value => { pinTime = value; review({type:'draft',assetId:active.id,body:active.draft.body,timecodeSec:value && active.type === 'video' ? currentTime : null}); }} onDraft={updateDraft} onPublish={comment} onSeek={time => player?.seek(time)} onComplete={commentId => review({type:'toggle-comment-complete',assetId:active.id,commentId,actorId:'local-reviewer',at:Date.now()})} onReact={(commentId,emoji) => review({type:'toggle-comment-reaction',assetId:active.id,commentId,actorId:'local-reviewer',emoji})}/>
          </Tabs.Content>
            <Tabs.Content value="fields"><AssetDetails asset={active} review={active} {knownTags} canEdit={true} onChange={updateAsset}/></Tabs.Content>
          </Tabs.Root>
        </section>{/if}
      {/snippet}
      <div hidden={!folderOpen}><WorkspacePanes {explorer} {viewer} {inspector} hasActive={!!active} {showInspector}/></div>
      <footer class="workspace-footer"><span>Local workspace · unsaved session</span><span>review room.</span></footer>
    </div>
  </main>
</div>

<Dialog.Root bind:open={projectDialog}>
  <Dialog.Portal><Dialog.Overlay class="dialog-overlay"/><Dialog.Content class="filter-sheet">
    <Dialog.Title class="dialog-title">New project folder</Dialog.Title>
    <Dialog.Description class="dialog-description">Includes Videos, Images, and Shortlist.</Dialog.Description>
    <form onsubmit={createProject}>
      <label class="filter-field">Project name<input class="project-name-input" bind:value={projectName} placeholder="Untitled project" required maxlength="100"/></label>
      <div class="filter-actions"><Dialog.Close class="secondary-button">Cancel</Dialog.Close><button class="primary-button" type="submit" disabled={!projectName.trim()}><Plus size={16}/> Create project</button></div>
    </form>
  </Dialog.Content></Dialog.Portal>
</Dialog.Root>
