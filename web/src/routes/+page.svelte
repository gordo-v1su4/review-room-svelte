<script lang="ts">
  import { onDestroy } from 'svelte';
  import { page } from '$app/state';
  import FolderArtwork from '$lib/components/FolderArtwork.svelte';
  import ReviewNotes from '$lib/components/ReviewNotes.svelte';
  import { queryWorkspace, type WorkspaceMediaType, type WorkspaceFilter } from '$lib/workspace';
  import type { VideoStatus } from '../../../src/lib/types';
  import { Dialog } from 'bits-ui';
  import { ArrowUpRight, ArrowLeft, ArrowRight, Check, ChevronDown, Film, Folder, Grid2X2, List, MessageSquare, Menu, Plus, Search, SlidersHorizontal, Star, Upload, X, Bookmark, Clock3, Image, PanelRightClose } from 'lucide-svelte';
  import Player from '$lib/playback/Player.svelte';
  import { createThumbnailExtractor } from '$lib/playback/thumbnails';
  import { openLocalAsset, type LocalAsset } from '$lib/review';
  import { createReviewSession, transitionReviewSession, type ReviewAction, type ReviewAccess } from '$lib/review-session';
  let media = $state<LocalAsset[]>([]);
  let session = $state.raw(createReviewSession([]));
  // This owner role is for device-local review only, never live authorization.
  const localAccess: ReviewAccess = { kind: 'project', memberRole: 'owner' };
  const assets = $derived(media.map(asset => ({ ...asset, ...session.assets[asset.id] })));
  const activeId = $derived(session.activeAssetId);
  function review(action: ReviewAction) { session = transitionReviewSession(session, action, localAccess); }
  type FilterId = 'all' | 'selected' | VideoStatus;
  let query = $state(''), filter = $state<FilterId>('all'), view = $state<'grid' | 'list'>('grid');
  let mediaType = $state<WorkspaceMediaType | 'all'>('all');
  let minRating = $state(0), sort = $state<WorkspaceFilter['sort']>();
  let player = $state<ReturnType<typeof Player>>();
  let currentTime = $state(0), pinTime = $state(true), feedback = $state('');
  let navOpen = $state(false), filterOpen = $state(false);
  let picker: HTMLInputElement;
  const thumbnails = createThumbnailExtractor({ concurrency: 2 });
  let disposed = false;
  const active = $derived(assets.find(asset => asset.id === activeId));
  const visible = $derived(queryWorkspace(assets, { search: query, statuses: filter !== 'all' && filter !== 'selected' ? [filter] : undefined, shortlisted: filter === 'selected' ? true : undefined, mediaTypes: mediaType === 'all' ? undefined : [mediaType], minRating, sort }));
  const approved = $derived(assets.filter(a => a.status === 'approved').length);
  function importFiles(files: FileList | null) {
    if (!files) return;
    const added: LocalAsset[] = [];
    for (const file of files) {
      try {
        const asset = openLocalAsset(file);
        added.push(asset);
        if (asset.type === 'video') {
          void thumbnails.extract(file).then(({ blob }) => {
            if (disposed) return;
            const poster = URL.createObjectURL(blob);
            media = media.map(item => item.id === asset.id ? { ...item, poster } : item);
          }).catch(() => { /* The film placeholder remains usable when decoding fails. */ });
        }
      } catch { feedback = `Skipped ${file.name}: choose a video or image.`; }
    }
    media.push(...added);
    review({ type: 'add-assets', assets: added });
  }
  function select(id: string | null) {
    if (id === activeId) return;
    review({ type: 'select', assetId: id });
    currentTime = 0;
  }
  function navigate(delta: number) {
    const index = visible.findIndex(a => a.id === activeId);
    const next = visible[index + delta]; if (next) select(next.id);
  }
  function updateDraft(body: string) {
    if (!active) return;
    review({ type: 'draft', assetId: active.id, body, timecodeSec: active.draft.body ? active.draft.timecodeSec : pinTime && active.type === 'video' ? currentTime : null });
  }
  function comment() {
    if (!active?.draft.body.trim()) return;
    review({ type: 'publish-comment', assetId: active.id, commentId: crypto.randomUUID() });
  }
  function filterBy(value: FilterId) { filter = value; mediaType = 'all'; navOpen = false; filterOpen = false; }
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
  <div class="workspace-name">Personal workspace</div>
  <span class="nav-heading">WORKSPACE</span>
  <button class:nav-active={filter === 'all'} class="nav-item" onclick={() => filterBy('all')}><Folder size={17}/> All media <span>{assets.length}</span></button>
  <button class:nav-active={filter === 'selected'} class="nav-item" onclick={() => filterBy('selected')}><Bookmark size={17}/> Shortlist <span>{assets.filter(a => a.shortlisted).length}</span></button>
  <div class="nav-divider"></div><span class="nav-heading">REVIEW STATUS</span>
  <button class:nav-active={filter === 'awaiting_review'} class="nav-item" onclick={() => filterBy('awaiting_review')}><span class="status-dot pending"></span> Awaiting review</button>
  <button class:nav-active={filter === 'needs_changes'} class="nav-item" onclick={() => filterBy('needs_changes')}><span class="status-dot changes"></span> Needs changes</button>
  <button class:nav-active={filter === 'approved'} class="nav-item" onclick={() => filterBy('approved')}><span class="status-dot approved"></span> Approved <span>{approved}</span></button>
  <div class="sidebar-bottom"><span class="mode-label"><span class="status-dot"></span> Local session</span><p>Stored in this tab until reload.</p></div>
{/snippet}
<div class="app-shell">
  <aside class="sidebar">{@render navigation()}</aside>
  <main>
    <header class="topbar">
      <Dialog.Root bind:open={navOpen}><Dialog.Trigger class="icon-button mobile-menu" aria-label="Open navigation"><Menu size={20}/></Dialog.Trigger><Dialog.Portal><Dialog.Overlay class="dialog-overlay"/><Dialog.Content class="nav-drawer"><Dialog.Title class="visually-hidden">Workspace navigation</Dialog.Title><Dialog.Description class="visually-hidden">Browse local media and review status</Dialog.Description><Dialog.Close class="icon-button drawer-close" aria-label="Close navigation"><X size={20}/></Dialog.Close>{@render navigation()}</Dialog.Content></Dialog.Portal></Dialog.Root>
      <div class="breadcrumb">Personal workspace</div><span class="avatar small">YO</span>
    </header>
    <div class="page-content">
      <section class="project-heading"><div><h1>Media library</h1><p class="subtitle">Review your media and feedback.</p></div><button class="primary-button" onclick={() => picker.click()}><Plus size={18}/> Add media</button></section>
      <section class="folder-shelf" aria-label="Media collections">
        {#each [{ type: 'video' as const, name: 'Videos' }, { type: 'image' as const, name: 'Images' }] as collection}
          <button class="folder-card" class:folder-active={mediaType === collection.type} aria-pressed={mediaType === collection.type} onclick={() => { mediaType = mediaType === collection.type ? 'all' : collection.type; filter = 'all'; }}>
            <FolderArtwork empty={!assets.some(asset => asset.type === collection.type)}/><strong>{collection.name}</strong><span>{assets.filter(asset => asset.type === collection.type).length} items</span>
          </button>
        {/each}
        <button class="folder-card" class:folder-active={filter === 'selected'} aria-pressed={filter === 'selected'} onclick={() => filterBy(filter === 'selected' ? 'all' : 'selected')}><FolderArtwork empty={!assets.some(asset => asset.shortlisted)}/><strong>Shortlist</strong><span>{assets.filter(asset => asset.shortlisted).length} items</span></button>
      </section>
      <div class="collection-bar"><div class="collection-title"><h2>{mediaType === 'video' ? 'Videos' : mediaType === 'image' ? 'Images' : filter === 'selected' ? 'Shortlist' : 'All media'}</h2><span class="count">{visible.length}</span></div><span class="local-badge">LOCAL SESSION</span></div>
      <div class="toolbar"><label class="search"><Search size={16}/><input aria-label="Search media" placeholder="Find a clip or image…" bind:value={query}/><kbd>⌕</kbd></label>
        <Dialog.Root bind:open={filterOpen}><Dialog.Trigger class="secondary-button"><SlidersHorizontal size={16}/> Filters{filter !== 'all' ? ' · 1' : ''}</Dialog.Trigger><Dialog.Portal><Dialog.Overlay class="dialog-overlay"/><Dialog.Content class="filter-sheet"><div class="sheet-heading"><Dialog.Title>Filter media</Dialog.Title><Dialog.Close class="icon-button" aria-label="Close filters"><X size={18}/></Dialog.Close></div><Dialog.Description>Focus on the next decision.</Dialog.Description>{#each [['all','All media'],['selected','Shortlisted'],['awaiting_review','Awaiting review'],['needs_changes','Needs changes'],['approved','Approved']] as [value,label]}<button class="filter-option" onclick={() => filterBy(value as FilterId)}>{label}{#if filter === value}<Check size={16}/>{/if}</button>{/each}</Dialog.Content></Dialog.Portal></Dialog.Root>
        <div class="view-switch" aria-label="Media layout"><button class:chosen={view === 'grid'} aria-label="Grid view" aria-pressed={view === 'grid'} onclick={() => view = 'grid'}><Grid2X2 size={16}/></button><button class:chosen={view === 'list'} aria-label="List view" aria-pressed={view === 'list'} onclick={() => view = 'list'}><List size={18}/></button></div>
      </div>
      {#if feedback}<div class="notice" role="status">{feedback}<button class="icon-button" aria-label="Dismiss message" onclick={() => feedback = ''}><X size={16}/></button></div>{/if}
      <div class:has-active={!!active} class="review-layout">
        <section class="library" aria-label="Media collection">
          {#if !assets.length}<div class="empty-state"><div class="empty-art"><Folder size={58} strokeWidth={1}/><span class="empty-plus"><Plus size={20}/></span></div><h2>Start with a cut.</h2><p>Open a video or image to start reviewing. Media stays on this device.</p><button class="primary-button" onclick={() => picker.click()}><Upload size={17}/> Open local media</button></div>
          {:else if !visible.length}<div class="empty-state compact"><Search size={28}/><h2>No matching media</h2><p>Try another search or clear your filters.</p><button class="secondary-button" onclick={() => { query = ''; filter = 'all'; mediaType = 'all'; minRating = 0; }}>Clear filters</button></div>
          {:else}<div class:list-layout={view === 'list'} class="media-grid">{#each visible as asset (asset.id)}<button class:active-card={activeId === asset.id} class="media-card" onclick={() => select(asset.id)}><div class="thumbnail">{#if asset.type === 'image' || asset.poster}<img src={asset.poster ?? asset.url} alt="" loading="lazy"/>{:else}<Film size={32} strokeWidth={1}/>{/if}<span class="asset-type">{asset.type === 'video' ? 'VID' : 'IMG'}</span>{#if asset.shortlisted}<span class="shortlist-icon"><Bookmark size={13} fill="currentColor"/></span>{/if}</div><div class="card-body"><strong>{asset.name}</strong><div><span>{(asset.size / 1048576).toFixed(1)} MB</span><span class={`status-dot ${asset.status === 'approved' ? 'approved' : asset.status === 'needs_changes' ? 'changes' : 'pending'}`}></span><span>{asset.status.replaceAll('_',' ')}</span></div></div></button>{/each}</div>{/if}
        </section>
        {#if active}<section class="review-pane" aria-label="Asset review"><div class="review-title"><div><h2>{active.name}</h2></div><button class="icon-button" aria-label="Close review" onclick={() => select(null)}><PanelRightClose size={18}/></button></div>
          {#if active.type === 'video'}<Player bind:this={player} diagnostics={page.url.searchParams.has('diagnostics')} src={active.url} name={active.name} ontime={t => currentTime = t}/>{:else}<div class="still-view"><img src={active.url} alt={active.name}/></div>{/if}
          <div class="review-actions"><button class:shortlisted={active.shortlisted} class="secondary-button" aria-pressed={active.shortlisted} onclick={() => review({ type: 'shortlist', assetId: active.id, shortlisted: !active.shortlisted })}><Bookmark size={16}/> {active.shortlisted ? 'Shortlisted' : 'Shortlist'}</button><div class="rating" aria-label="Rating">{#each [1,2,3,4,5] as rating}<button aria-label={`Rate ${rating} stars`} aria-pressed={active.rating === rating} onclick={() => review({ type: 'rate', assetId: active.id, rating: active.rating === rating ? 0 : rating })}><Star size={17} fill={active.rating >= rating ? 'currentColor' : 'none'}/></button>{/each}</div><div class="asset-nav"><button class="icon-button" aria-label="Previous asset" disabled={visible.findIndex(a => a.id === activeId) <= 0} onclick={() => navigate(-1)}><ArrowLeft size={17}/></button><button class="icon-button" aria-label="Next asset" disabled={visible.findIndex(a => a.id === activeId) >= visible.length - 1} onclick={() => navigate(1)}><ArrowRight size={17}/></button></div></div>
          <div class="decision-bar"><button class:decision-active={active.status === 'needs_changes'} class="secondary-button" onclick={() => review({ type: 'status', assetId: active.id, status: active.status === 'needs_changes' ? 'awaiting_review' : 'needs_changes' })}>Request changes</button><button class="primary-button" onclick={() => review({ type: 'status', assetId: active.id, status: active.status === 'approved' ? 'awaiting_review' : 'approved' })}><Check size={16}/>{active.status === 'approved' ? 'Approved' : 'Approve'}</button></div>
          <ReviewNotes comments={active.comments} draft={active.draft.body} time={active.draft.body && active.draft.timecodeSec !== null ? active.draft.timecodeSec : currentTime} isVideo={active.type === 'video'} pinTime={active.draft.body ? active.draft.timecodeSec !== null : pinTime} onPinTime={value => { pinTime = value; review({type:'draft',assetId:active.id,body:active.draft.body,timecodeSec:value && active.type === 'video' ? currentTime : null}); }} onDraft={updateDraft} onPublish={comment} onSeek={time => player?.seek(time)} onComplete={commentId => review({type:'toggle-comment-complete',assetId:active.id,commentId,actorId:'local-reviewer',at:Date.now()})} onReact={(commentId,emoji) => review({type:'toggle-comment-reaction',assetId:active.id,commentId,actorId:'local-reviewer',emoji})}/>

        </section>{/if}
      </div><footer class="workspace-footer"><span>Local workspace · unsaved session</span><span>review room.</span></footer>
    </div>
  </main>
</div>
