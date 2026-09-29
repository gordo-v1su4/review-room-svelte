<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { Tabs } from 'bits-ui';
  import { ArrowLeft, ArrowRight, Bookmark, Check, Download, Grid2X2, List, PanelRightClose, Play, Repeat, Search, Square, Star } from 'lucide-svelte';
  import MediaCards from '$lib/components/MediaCards.svelte';
  import AppearanceMenu from '$lib/components/AppearanceMenu.svelte';
  import AssetDetails from '$lib/components/AssetDetails.svelte';
  import MetadataSheet from '$lib/components/MetadataSheet.svelte';
  import ReviewNotes from '$lib/components/ReviewNotes.svelte';
  import StillViewer from '$lib/components/StillViewer.svelte';
  import WorkspacePanes from '$lib/components/WorkspacePanes.svelte';
  import Player from '$lib/playback/Player.svelte';
  import { normalizeAppearance } from '$lib/appearance';
  import { annotationsEqual } from '$lib/annotations';
  import { createReviewSession, type ReviewAction } from '$lib/review-session';
  import { createSharedReviewSession, type SharedReviewGateway, type SharedReviewState } from '$lib/shared-review-session';
  import { startShortlistPreview, advanceShortlistPreview, type ShortlistPreview } from '$lib/playback/shortlist-preview';
  import type { SharedReviewPayload } from './shared-review';

  let { payload, reviewerName, gateway, onDownload }: {
    payload: SharedReviewPayload;
    reviewerName: string;
    gateway: SharedReviewGateway;
    onDownload?: (assetId: string) => Promise<void>;
  } = $props();
  let reviewState = $state.raw<SharedReviewState>({ session: createReviewSession([]), busyIds: [], error: '' });
  let controller: ReturnType<typeof createSharedReviewSession> | undefined;
  let appearance = $state(normalizeAppearance(null));
  let query = $state(''), shortlistedOnly = $state(false), view = $state<'grid' | 'list'>('grid');
  let showInspector = $state(true), inspectorTab = $state('notes'), compact = $state(false);
  let notesTrigger = $state<HTMLButtonElement | null>(null);
  let player = $state<ReturnType<typeof Player>>();
  let currentTime = $state(0), pinTime = $state(true);
  let preview = $state.raw<ShortlistPreview | null>(null);
  let loop = $state(false), readySource = $state(''), notice = $state('');
  let downloading = $state<string | null>(null);
  let root = $state<HTMLElement>();
  const assets = $derived(payload.assets.filter(item => item.review.status !== 'archived').map(item => ({ ...item, ...(reviewState.session.assets[item.id] ?? item.review) })));
  const activeId = $derived(reviewState.session.activeAssetId);
  const active = $derived(assets.find(item => item.id === activeId));
  const busy = $derived(!!active && reviewState.busyIds.includes(active.id));
  const shortlistIds = $derived(assets.filter(item => item.shortlisted).map(item => item.id));
  const visible = $derived(assets.filter(item => (!shortlistedOnly || item.shortlisted) && item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
  const visibleIds = $derived(visible.map(item => item.id));

  $effect(() => {
    const next = createSharedReviewSession(payload.assets.filter(item => item.review.status !== 'archived').map(item => item.review), gateway, value => { reviewState = value; });
    controller = next;
    appearance = normalizeAppearance(payload.project.appearance);
    return () => { next.dispose(); if (controller === next) controller = undefined; };
  });
  onMount(() => {
    const media = matchMedia('(max-width: 760px)');
    const sync = () => { compact = media.matches; };
    sync(); media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  });
  function review(action: ReviewAction) { return controller?.review(action) ?? Promise.resolve(false); }
  async function saveAnnotations(assetId: string) {
    const saved = await review({ type: 'annotate', assetId, action: { type: 'save' } });
    if (!saved) throw new Error('Could not save markup. Your draft is retained; try again.');
  }
  function stopPreview() { if (preview) { preview = null; player?.pause(); } }
  function select(id: string | null) {
    stopPreview();
    if (activeId === id) return;
    readySource = ''; currentTime = 0;
    void review({ type: 'select', assetId: id });
  }
  async function closeReview() {
    const closedId = activeId;
    select(null);
    await tick();
    const card = [...(root?.querySelectorAll<HTMLButtonElement>('[data-asset-id]') ?? [])].find(element => element.dataset.assetId === closedId);
    if (card) card.focus();
    else root?.querySelector<HTMLInputElement>('[aria-label="Search shared media"]')?.focus();
  }
  function navigate(direction: -1 | 1) {
    const index = visibleIds.indexOf(activeId ?? '');
    const next = visibleIds[Math.max(0, Math.min(visibleIds.length - 1, index + direction))];
    if (next) select(next);
  }
  function keyboard(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || event.defaultPrevented || event.isComposing || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const target = event.target;
    if (!(target instanceof HTMLElement) || !root?.contains(target) || target.closest('input,textarea,select,[contenteditable="true"],[role="slider"],[role="separator"],[role="tablist"],[role="menu"],[role="listbox"],[role="dialog"],[role="application"]')) return;
    if (!visibleIds.length) return;
    event.preventDefault(); navigate(event.key === 'ArrowLeft' ? -1 : 1);
  }
  function draft(body: string) {
    if (active) void review({ type: 'draft', assetId: active.id, body, timecodeSec: active.draft.body ? active.draft.timecodeSec : pinTime && active.type === 'video' ? currentTime : null });
  }
  function viewed(id: string) {
    if (!reviewState.session.assets[id]?.viewed) void review({ type: 'mark-viewed', assetId: id });
  }
  function applyPreview(next: ShortlistPreview | null) {
    if (!next) { stopPreview(); return; }
    if (activeId !== next.currentId) readySource = '';
    void review({ type: 'select', assetId: next.currentId });
    currentTime = 0; preview = next;
  }
  function startPreview() { query = ''; shortlistedOnly = true; applyPreview(startShortlistPreview(shortlistIds)); }
  function advance(source: string) {
    if (preview && active?.url === source && active.id === preview.currentId) applyPreview(advanceShortlistPreview(preview, shortlistIds, loop));
  }
  function failed(source: string) { if (preview && active?.url === source) { stopPreview(); notice = 'Preview stopped because this media could not be loaded.'; } }
  $effect(() => {
    const ids = shortlistIds;
    if (preview && !ids.includes(preview.currentId)) untrack(() => { if (preview) applyPreview(advanceShortlistPreview(preview, ids, loop)); });
  });
  $effect(() => {
    const run = preview, source = readySource;
    if (!run || !source) return;
    return untrack(() => {
      if (!active || active.id !== run.currentId || active.url !== source) return;
      if (active.type === 'image') { const timer = setTimeout(() => { if (preview === run) advance(source); }, 2500); return () => clearTimeout(timer); }
      void player?.playFromStart(source).then(started => { if (!started && preview === run) { stopPreview(); notice = 'Tap Play to continue reviewing this clip.'; } });
    });
  });
  async function download() {
    if (!active || !payload.project.canDownload || !active.downloadEnabled || !onDownload || downloading) return;
    const id = active.id; downloading = id; notice = '';
    try { await onDownload(id); } catch { notice = 'Download could not start. Try again.'; }
    finally { if (downloading === id) downloading = null; }
  }
</script>

<svelte:window onkeydown={keyboard}/>
<main class="shared-review" bind:this={root}>
  <header class="shared-header"><span class="shared-brand">review room.</span><span class="reviewer-name">{reviewerName}</span></header>
  <section class="shared-project"><div><h1>{payload.project.title}</h1>{#if payload.project.description}<p>{payload.project.description}</p>{/if}</div><button class="secondary-button" aria-pressed={showInspector} onclick={() => showInspector = !showInspector}>Notes & info</button></section>
  {#if reviewState.error}<p class="shared-message error" role="alert">{reviewState.error}</p>{/if}
  {#if notice}<p class="shared-message" role="status">{notice}</p>{/if}
  <span class="sr-only" role="status">{reviewState.busyIds.length ? 'Saving review…' : ''}</span>
  {#snippet explorer()}
    <div class="shared-explorer">
      <div class="shared-filters"><button class:chosen={!shortlistedOnly} aria-pressed={!shortlistedOnly} onclick={() => { stopPreview(); shortlistedOnly = false; }}>All <span>{assets.length}</span></button><button class:chosen={shortlistedOnly} aria-pressed={shortlistedOnly} onclick={() => { stopPreview(); shortlistedOnly = true; }}>Shortlist <span>{shortlistIds.length}</span></button></div>
      <div class="toolbar"><label class="search"><Search size={14}/><input aria-label="Search shared media" placeholder="Find media…" bind:value={query}/></label><AppearanceMenu value={appearance} onChange={value => appearance = value}/><div class="view-switch" aria-label="Media layout"><button class:chosen={view === 'grid'} aria-label="Grid view" aria-pressed={view === 'grid'} onclick={() => view = 'grid'}><Grid2X2 size={15}/></button><button class:chosen={view === 'list'} aria-label="List view" aria-pressed={view === 'list'} onclick={() => view = 'list'}><List size={15}/></button></div></div>
      {#if shortlistIds.length}<div class="shortlist-preview" aria-label="Shortlist playback"><button class="secondary-button" onclick={preview ? stopPreview : startPreview}>{#if preview}<Square size={12}/>Stop preview{:else}<Play size={13}/>Preview shortlist{/if}</button><button class="preview-loop" aria-label="Loop shortlist" aria-pressed={loop} onclick={() => loop = !loop}><Repeat size={14}/></button></div>{/if}
      {#if !assets.length}<div class="shared-empty"><h2>No media yet</h2><p>Shared media will appear here when it’s ready.</p></div>
      {:else if !visible.length}<div class="shared-empty"><h2>{shortlistedOnly ? 'No matching shortlisted media' : 'No matching media'}</h2><button class="secondary-button" onclick={() => { query = ''; shortlistedOnly = false; }}>Show all media</button></div>
      {:else}<MediaCards assets={visible} {activeId} {appearance} {view} busyIds={reviewState.busyIds} access={{ kind: 'share' }} onReview={review} onOpen={select}/>{/if}
    </div>
  {/snippet}
  {#snippet viewer()}
    {#if active}<section class="review-pane" aria-label="Shared asset review">
      <div class="review-title"><h2 aria-live="polite">{active.name}</h2><button class="icon-button" aria-label="Close review" onclick={closeReview}><PanelRightClose size={17}/></button></div>
      {#if active.type === 'video'}<Player bind:this={player} src={active.url} name={active.name} sourceBlob={active.sourceBlob} mediaInfo={{ codec: active.codec ?? '', estimatedFps: active.fps, width: active.width ?? 0, height: active.height ?? 0, duration: active.duration ?? 0 }} onready={source => readySource = source} onended={advance} onfailure={failed} onViewed={() => viewed(active.id)} ontime={time => currentTime = time}/>
      {:else}{#key active.id}<StillViewer assetId={active.id} src={active.url} name={active.name} strokes={active.annotations.draft} dirty={!annotationsEqual(active.annotations.draft, active.annotations.saved)} canAnnotate={!preview} saveDisabled={busy} onChange={strokes => review({ type: 'annotate', assetId: active.id, action: { type: 'replace', strokes } })} onSave={() => saveAnnotations(active.id)} onViewed={() => viewed(active.id)} onmetadata={() => readySource = active.url} onfailure={failed}/>{/key}{/if}
      <div class="review-actions"><div class="review-feedback"><button class="shortlist-toggle" class:shortlisted={active.shortlisted} disabled={busy} aria-label={active.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'} aria-pressed={active.shortlisted} title={active.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'} onclick={() => review({ type: 'shortlist', assetId: active.id, shortlisted: !active.shortlisted })}><Bookmark size={17} fill={active.shortlisted ? 'currentColor' : 'none'}/></button><div class="rating" aria-label="Rating">{#each [1,2,3,4,5] as rating}<button disabled={busy} aria-label={`Rate ${rating} stars`} aria-pressed={active.rating === rating} onclick={() => review({ type: 'rate', assetId: active.id, rating: active.rating === rating ? 0 : rating })}><Star size={17} fill={active.rating >= rating ? 'currentColor' : 'none'}/></button>{/each}</div></div><div class="review-outcome"><button class="secondary-button" disabled={busy} onclick={() => review({ type: 'status', assetId: active.id, status: active.status === 'needs_changes' ? 'awaiting_review' : 'needs_changes' })}>Request changes</button><button class="primary-button" disabled={busy} onclick={() => review({ type: 'status', assetId: active.id, status: active.status === 'approved' ? 'awaiting_review' : 'approved' })}><Check size={14}/>{active.status === 'approved' ? 'Approved' : 'Approve'}</button><div class="asset-nav"><button class="icon-button" aria-label="Previous asset" disabled={visibleIds.indexOf(active.id) <= 0} onclick={() => navigate(-1)}><ArrowLeft size={17}/></button><button class="icon-button" aria-label="Next asset" disabled={visibleIds.indexOf(active.id) >= visibleIds.length - 1} onclick={() => navigate(1)}><ArrowRight size={17}/></button></div></div></div>
      {#if payload.project.canDownload && active.downloadEnabled && onDownload}<button class="shared-download secondary-button" disabled={!!downloading} onclick={download}><Download size={14}/>{downloading === active.id ? 'Preparing…' : 'Download original'}</button>{/if}
    </section>{/if}
  {/snippet}
  {#snippet inspector()}
    {#if active}<section class="feedback-pane" aria-label="Shared asset inspector"><Tabs.Root value={compact ? 'notes' : inspectorTab} onValueChange={value => { if (!compact) inspectorTab = value; }}>
      <div class="inspector-heading"><Tabs.List class="inspector-tabs" aria-label="Asset inspector panels"><Tabs.Trigger value="notes" bind:ref={notesTrigger}>Notes <span>{active.comments.length}</span></Tabs.Trigger>{#if !compact}<Tabs.Trigger value="fields">Fields</Tabs.Trigger>{/if}</Tabs.List><MetadataSheet asset={active} review={active} knownTags={[]} canEdit={false} onChange={() => {}} onOpen={stopPreview} onDesktopClose={() => notesTrigger?.focus()}/></div>
      <Tabs.Content value="notes"><ReviewNotes showHeader={false} canManageFeedback={false} posting={busy} comments={active.comments} draft={active.draft.body} time={active.draft.body && active.draft.timecodeSec !== null ? active.draft.timecodeSec : currentTime} isVideo={active.type === 'video'} pinTime={active.draft.body ? active.draft.timecodeSec !== null : pinTime} onPinTime={value => { pinTime = value; void review({ type: 'draft', assetId: active.id, body: active.draft.body, timecodeSec: value && active.type === 'video' ? currentTime : null }); }} onDraft={draft} onPublish={() => review({ type: 'publish-comment', assetId: active.id, commentId: crypto.randomUUID() })} onSeek={time => player?.seek(time)} onComplete={() => {}} onReact={() => {}}/></Tabs.Content>
      <Tabs.Content value="fields"><AssetDetails asset={active} review={active} onChange={() => {}}/></Tabs.Content>
    </Tabs.Root></section>{/if}
  {/snippet}
  <WorkspacePanes {explorer} {viewer} {inspector} hasActive={!!active} {showInspector} storageKey="review-room.shared-panes"/>
</main>

<style>
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
  .shared-review { min-height: 100svh; background: var(--canvas); color: var(--ink); }
  .shared-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; height: 58px; padding: 0 24px; border-bottom: 1px solid var(--border); background: linear-gradient(170deg, #14211d40, transparent); }
  .shared-brand { font-size: 18px; font-weight: 600; letter-spacing: -.8px; }
  .reviewer-name { color: var(--muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .shared-project { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 22px 24px; }
  .shared-project > div { min-width: 0; }
  h1 { margin: 0; font-size: 24px; font-weight: 550; letter-spacing: -.7px; overflow-wrap: anywhere; }
  .shared-project p { margin: 7px 0 0; color: var(--muted); font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
  .shared-explorer { padding: 14px; min-width: 0; }
  .shared-filters { display: flex; gap: 6px; margin-bottom: 12px; }
  .shared-filters button { display: inline-flex; align-items: center; gap: 8px; min-height: 28px; padding: 0 9px; border-radius: 5px; background: transparent; color: var(--muted); font-size: 11px; }
  .shared-filters button.chosen { background: var(--raised); color: var(--ink); }
  .shared-filters span { font-size: 10px; color: var(--muted); }
  .toolbar { padding: 0 0 12px; }
  .shared-empty { padding: 48px 16px; color: var(--muted); text-align: center; }
  .shared-empty h2 { font-size: 16px; font-weight: 500; }
  .shared-empty p { font-size: 12px; }
  .shared-message { margin: 0 24px 12px; font-size: 12px; color: var(--muted); }
  .shared-message.error { color: #e6a79b; }
  .shared-download { margin: 12px 10px; }
  .review-title h2 { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
  @media(max-width: 760px) { .shared-header { padding-inline: 16px; } .shared-project { padding: 18px 16px; flex-wrap: wrap; } h1 { font-size: 22px; } }
  @media(pointer: coarse) { .shared-filters button { min-height: 44px; } }
</style>
