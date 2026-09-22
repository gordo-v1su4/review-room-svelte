<script lang="ts">
  import { onDestroy } from 'svelte';
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
  let query = $state(''), filter = $state('all'), view = $state<'grid' | 'list'>('grid');
  let currentTime = $state(0), pinTime = $state(true), feedback = $state('');
  let navOpen = $state(false), filterOpen = $state(false);
  let picker: HTMLInputElement;
  const thumbnails = createThumbnailExtractor({ concurrency: 2 });
  let disposed = false;
  const active = $derived(assets.find(asset => asset.id === activeId));
  const visible = $derived(assets.filter(a => a.name.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || (filter === 'selected' ? a.shortlisted : a.status === filter))));
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
    review({ type: 'draft', assetId: active.id, body, timecodeSec: pinTime && active.type === 'video' ? currentTime : null });
  }
  function comment() {
    if (!active?.draft.body.trim()) return;
    updateDraft(active.draft.body);
    review({ type: 'publish-comment', assetId: active.id, commentId: crypto.randomUUID() });
  }
  function filterBy(value: string) { filter = value; navOpen = false; filterOpen = false; }
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
  <div class="brand"><span class="brand-mark">rr<span>.</span></span><span>REVIEW ROOM<small>YOUR CREATIVE WORKSPACE</small></span></div>
  <div class="workspace-name"><span class="workspace-avatar">S</span><div>Studio workspace<small>Personal collection</small></div><ChevronDown size={14}/></div>
  <span class="nav-heading">WORKSPACE</span>
  <button class:nav-active={filter === 'all'} class="nav-item" onclick={() => filterBy('all')}><Folder size={17}/> All media <span>{assets.length}</span></button>
  <button class:nav-active={filter === 'selected'} class="nav-item" onclick={() => filterBy('selected')}><Bookmark size={17}/> Shortlist <span>{assets.filter(a => a.shortlisted).length}</span></button>
  <div class="nav-divider"></div><span class="nav-heading">REVIEW STATUS</span>
  <button class:nav-active={filter === 'awaiting_review'} class="nav-item" onclick={() => filterBy('awaiting_review')}><span class="status-dot pending"></span> Awaiting review</button>
  <button class:nav-active={filter === 'needs_changes'} class="nav-item" onclick={() => filterBy('needs_changes')}><span class="status-dot changes"></span> Needs changes</button>
  <button class:nav-active={filter === 'approved'} class="nav-item" onclick={() => filterBy('approved')}><span class="status-dot approved"></span> Approved <span>{approved}</span></button>
  <div class="sidebar-bottom"><span class="mode-label"><span class="status-dot"></span> Local review</span><p>Files stay on this device.<br/>This session is not saved to the cloud.</p><div class="profile"><span class="avatar">YO</span><div>Your workspace<small>Private by default</small></div></div></div>
{/snippet}
<div class="app-shell">
  <aside class="sidebar">{@render navigation()}</aside>
  <main>
    <header class="topbar">
      <Dialog.Root bind:open={navOpen}><Dialog.Trigger class="icon-button mobile-menu" aria-label="Open navigation"><Menu size={20}/></Dialog.Trigger><Dialog.Portal><Dialog.Overlay class="dialog-overlay"/><Dialog.Content class="nav-drawer"><Dialog.Title class="visually-hidden">Workspace navigation</Dialog.Title><Dialog.Description class="visually-hidden">Browse local media and review status</Dialog.Description><Dialog.Close class="icon-button drawer-close" aria-label="Close navigation"><X size={20}/></Dialog.Close>{@render navigation()}</Dialog.Content></Dialog.Portal></Dialog.Root>
      <div class="breadcrumb">Workspace <span>/</span> <strong>Review studio</strong></div><span class="topbar-right">A little clarity. A better cut.</span><span class="avatar small">YO</span>
    </header>
    <div class="page-content">
      <section class="project-heading"><div><p class="eyebrow">SPACE TO SEE THE DETAILS</p><h1>Your work. <span>In focus.</span></h1><p class="subtitle">Watch closely. Leave a note. Find the final cut.</p></div><button class="primary-button" onclick={() => picker.click()}><Plus size={18}/> Add media</button></section>
      <div class="collection-bar"><div class="collection-title"><Folder size={18}/><h2>Review collection</h2><span class="count">{assets.length}</span></div><span class="local-badge">LOCAL SESSION</span></div>
      <div class="toolbar"><label class="search"><Search size={16}/><input aria-label="Search media" placeholder="Find a clip or image…" bind:value={query}/><kbd>⌕</kbd></label>
        <Dialog.Root bind:open={filterOpen}><Dialog.Trigger class="secondary-button"><SlidersHorizontal size={16}/> Filters{filter !== 'all' ? ' · 1' : ''}</Dialog.Trigger><Dialog.Portal><Dialog.Overlay class="dialog-overlay"/><Dialog.Content class="filter-sheet"><div class="sheet-heading"><Dialog.Title>Filter media</Dialog.Title><Dialog.Close class="icon-button" aria-label="Close filters"><X size={18}/></Dialog.Close></div><Dialog.Description>Focus on the next decision.</Dialog.Description>{#each [['all','All media'],['selected','Shortlisted'],['awaiting_review','Awaiting review'],['needs_changes','Needs changes'],['approved','Approved']] as [value,label]}<button class="filter-option" onclick={() => filterBy(value)}>{label}{#if filter === value}<Check size={16}/>{/if}</button>{/each}</Dialog.Content></Dialog.Portal></Dialog.Root>
        <div class="view-switch" aria-label="Media layout"><button class:chosen={view === 'grid'} aria-label="Grid view" aria-pressed={view === 'grid'} onclick={() => view = 'grid'}><Grid2X2 size={16}/></button><button class:chosen={view === 'list'} aria-label="List view" aria-pressed={view === 'list'} onclick={() => view = 'list'}><List size={18}/></button></div>
      </div>
      {#if feedback}<div class="notice" role="status">{feedback}<button class="icon-button" aria-label="Dismiss message" onclick={() => feedback = ''}><X size={16}/></button></div>{/if}
      <div class:has-active={!!active} class="review-layout">
        <section class="library" aria-label="Media collection">
          {#if !assets.length}<div class="empty-state"><div class="empty-art"><Folder size={58} strokeWidth={1}/><span class="empty-plus"><Plus size={20}/></span></div><p class="eyebrow">EVERY GREAT CUT STARTS HERE</p><h2>Give your work some room.</h2><p>Bring in a video or image to explore the new review experience. Your originals stay untouched.</p><button class="primary-button" onclick={() => picker.click()}><Upload size={17}/> Open local media</button><span class="empty-footnote">Videos and images · nothing uploaded</span></div>
          {:else if !visible.length}<div class="empty-state compact"><Search size={28}/><h2>No matching media</h2><p>Try another search or clear your filters.</p><button class="secondary-button" onclick={() => { query = ''; filter = 'all'; }}>Clear filters</button></div>
          {:else}<div class:list-layout={view === 'list'} class="media-grid">{#each visible as asset (asset.id)}<button class:active-card={activeId === asset.id} class="media-card" onclick={() => select(asset.id)}><div class="thumbnail">{#if asset.type === 'image' || asset.poster}<img src={asset.poster ?? asset.url} alt="" loading="lazy"/>{:else}<Film size={32} strokeWidth={1}/>{/if}<span class="asset-type">{asset.type === 'video' ? 'VID' : 'IMG'}</span>{#if asset.shortlisted}<span class="shortlist-icon"><Bookmark size={13} fill="currentColor"/></span>{/if}</div><div class="card-body"><strong>{asset.name}</strong><div><span>{(asset.size / 1048576).toFixed(1)} MB</span><span class={`status-dot ${asset.status === 'approved' ? 'approved' : asset.status === 'needs_changes' ? 'changes' : 'pending'}`}></span><span>{asset.status.replaceAll('_',' ')}</span></div></div></button>{/each}</div>{/if}
        </section>
        {#if active}<section class="review-pane" aria-label="Asset review"><div class="review-title"><div><span class="eyebrow">IN REVIEW</span><h2>{active.name}</h2></div><button class="icon-button" aria-label="Close review" onclick={() => select(null)}><PanelRightClose size={18}/></button></div>
          {#if active.type === 'video'}<Player src={active.url} name={active.name} ontime={t => currentTime = t}/>{:else}<div class="still-view"><img src={active.url} alt={active.name}/></div>{/if}
          <div class="review-actions"><button class:shortlisted={active.shortlisted} class="secondary-button" aria-pressed={active.shortlisted} onclick={() => review({ type: 'shortlist', assetId: active.id, shortlisted: !active.shortlisted })}><Bookmark size={16}/> {active.shortlisted ? 'Shortlisted' : 'Shortlist'}</button><div class="rating" aria-label="Rating">{#each [1,2,3,4,5] as rating}<button aria-label={`Rate ${rating} stars`} aria-pressed={active.rating === rating} onclick={() => review({ type: 'rate', assetId: active.id, rating: active.rating === rating ? 0 : rating })}><Star size={17} fill={active.rating >= rating ? 'currentColor' : 'none'}/></button>{/each}</div><div class="asset-nav"><button class="icon-button" aria-label="Previous asset" disabled={visible.findIndex(a => a.id === activeId) <= 0} onclick={() => navigate(-1)}><ArrowLeft size={17}/></button><button class="icon-button" aria-label="Next asset" disabled={visible.findIndex(a => a.id === activeId) >= visible.length - 1} onclick={() => navigate(1)}><ArrowRight size={17}/></button></div></div>
          <div class="decision-bar"><button class:decision-active={active.status === 'needs_changes'} class="secondary-button" onclick={() => review({ type: 'status', assetId: active.id, status: active.status === 'needs_changes' ? 'awaiting_review' : 'needs_changes' })}>Request changes</button><button class="primary-button" onclick={() => review({ type: 'status', assetId: active.id, status: active.status === 'approved' ? 'awaiting_review' : 'approved' })}><Check size={16}/>{active.status === 'approved' ? 'Approved' : 'Approve'}</button></div>
          <div class="comments"><div class="comments-title"><h3><MessageSquare size={16}/> Notes <span>{active.comments.length}</span></h3><span>THIS SESSION</span></div>{#if !active.comments.length}<p class="no-comments">A fresh pair of eyes makes all the difference.<br/>Leave the first note.</p>{:else}<div class="comment-list">{#each active.comments as note (note.id)}<article class="comment"><span class="avatar small">YO</span><div><strong>You {#if note.timecodeSec !== null}<span class="note-time">{note.timecodeSec.toFixed(2)}s</span>{/if}</strong><p>{note.body}</p></div></article>{/each}</div>{/if}<form onsubmit={event => { event.preventDefault(); comment(); }}><textarea aria-label="Comment draft" placeholder="What stands out to you?" value={active.draft.body} oninput={event => updateDraft(event.currentTarget.value)} rows="3"></textarea><div class="composer-footer">{#if active.type === 'video'}<label class="time-toggle"><input type="checkbox" bind:checked={pinTime}/><Clock3 size={13}/> {currentTime.toFixed(2)}s</label>{:else}<span></span>{/if}<button class="send-button" aria-label="Add note" disabled={!active.draft.body.trim()}><ArrowUpRight size={18}/></button></div></form></div>
        </section>{/if}
      </div><footer class="workspace-footer"><span>Made for thoughtful feedback.</span><span>REVIEW ROOM <span class="teal">/</span> STUDIO</span></footer>
    </div>
  </main>
</div>
