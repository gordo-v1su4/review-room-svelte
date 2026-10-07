<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { Dialog } from 'bits-ui';
  import Stage1Select from './Stage1Select.svelte';
  import { RefreshCw, X } from 'lucide-svelte';
  type Version = { versionId:string; assetId:string; assetCode:string; title:string; version:number; isCurrent:boolean; expectedMetadataUpdatedAt:number|null; sourceCreatedAt:number; model?:string; sourceLabel?:string; promptPreview?:string; ready:boolean; images:{versionId:string;label:string;ready:boolean;grid:boolean}[] };
  type Connection = { _id:string; folderId?:string; targetRunId:string; replacedByConnectionId?:string; replacesConnectionId?:string };
  type Item = { id:string; batchId:string; connectionId:string; consentGeneration:number; versionId:string; state:string; canSyncAgain:boolean; lastError?:string; targetVersionNumber?:number };
  type Removal = { versionId:string; state:"queued"|"sending"|"complete"; attempts:number; lastError?:string };
  type Snapshot = { unsyncs?:{id:string;jobId:string;state:string;attempts:number;lastError?:string}[]; refreshes?:{id:string;jobId:string;state:string;lastError?:string}[]; removals?:Removal[]; reconciliationError?:string; projectTitle:string; folders:{id:string;title:string}[]; versions:Version[]; connections:Connection[]; items:Item[]; batches:{_id:string}[] };
  let { open = $bindable(false), projectId, folderId = null, selectedVersionIds = [], embedded = false }: { open?:boolean; projectId:string; folderId?:string|null; selectedVersionIds?:string[]; embedded?:boolean } = $props();
  let snapshot = $state.raw<Snapshot|null>(null);
  let scope = $state('');
  let selected = $state<string[]>([]);
  let selectionMode = $state<'all'|'selected'>('all');
  let targetTitle = $state('');
  let targetRunId = $state('');
  let mode = $state<'create'|'connect'>('create');
  let existingRunId = $state('');
  let busy = $state(false);
  let loading = $state(false);
  let message = $state('');
  let consent = $state(false);
  let replacing = $state(false);
  let replacementConsent = $state(false);
  let replacementId = $state('');
  type Confirmation = { action:'confirm'; connectionId:string; confirmationId:string; versions:{versionId:string;expectedMetadataUpdatedAt:number|null}[] };
  type Reactivation = { action:'sync-again'; connectionId:string; confirmationId:string; versionId:string; expectedGeneration:number; expectedMetadataUpdatedAt:number|null };
  let again = $state.raw<{ preview:Version; expectedGeneration:number; connectionId:string }|null>(null);
  let refreshIntent = $state.raw<{ preview:Version; job:Item; operationId:string }|null>(null);
  let refreshConsent = $state(false);
  let unsyncIntent = $state.raw<{ preview:Version; job:Item }|null>(null);
  let unsyncConsent = $state(false);
  let frozenPreview = $state.raw<Version[]>([]);
  let frozen = $state.raw<Confirmation|Reactivation|null>(null);
  let sessionProject = '';
  let epoch = 0;
  let poll:ReturnType<typeof setInterval>|undefined;
  const scopeConnections = $derived((snapshot?.connections ?? []).filter(item => (item.folderId ?? '') === scope));
  const connection = $derived(scopeConnections.find(item => !item.replacedByConnectionId));
  const visibleItems = $derived((snapshot?.items ?? []).filter(item => scopeConnections.some(candidate => candidate._id === item.connectionId)));
  const allCurrent = $derived((snapshot?.versions ?? []).filter(version => version.isCurrent && !latest(version.versionId)));
  const chosenIds = $derived(selectionMode === 'all' && !again && !frozen ? allCurrent.map(version => version.versionId) : selected);
  const ordered = $derived(frozen ? frozenPreview : again ? [again.preview] : chosenIds.map(id => snapshot?.versions.find(version => version.versionId === id)).filter((version):version is Version => !!version).sort((a,b) => a.sourceCreatedAt - b.sourceCreatedAt || a.versionId.localeCompare(b.versionId)));
  const valid = $derived(ordered.length > 0 && ordered.length <= 100 && ordered.length === chosenIds.length && ordered.every(version => version.ready && version.images.every(image => image.ready)));
  const labels:Record<string,string> = { queued:'Syncing',sending:'Syncing',synced:'Synced',failed:'Failed',disconnected:'Disconnected',source_deleted:'Source deleted' };
  function removalStatus(removal:Removal|undefined) { return removal?.state === 'complete' ? 'Target removal confirmed complete.' : removal?.attempts ? 'Target removal pending; delivery is retrying.' : 'Target removal pending.'; }
  function latest(versionId:string) { return snapshot?.items.filter(item => item.versionId === versionId && item.connectionId === connection?._id).sort((a,b) => b.consentGeneration - a.consentGeneration)[0]; }
  function changed() { if (again) selected = []; again = null; frozen = null; frozenPreview = []; consent = false; refreshIntent = null; refreshConsent = false; unsyncIntent = null; unsyncConsent = false; message = ''; }
  async function load(initial = false) {
    if (loading) return;
    const token = epoch;
    loading = true;
    try {
      const query = new URLSearchParams({projectId}); if (scope) query.set('folderId',scope);
      const response = await fetch(`/api/owner-sync?${query}`,{cache:'no-store'});
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? 'Could not load destination.');
      if (token !== epoch) return;
      snapshot = body;
      if (initial && !frozen && !again) { selected = selectedVersionIds.filter(id => body.versions.some((version:Version) => version.versionId === id)); selectionMode = selected.length ? 'selected' : 'all'; targetTitle = scope ? body.folders.find((folder:{id:string}) => folder.id === scope)?.title ?? body.projectTitle : body.projectTitle; }
    } catch (cause) { if (token === epoch) message = cause instanceof Error ? cause.message : 'Could not load destination.'; }
    finally { if (token === epoch) loading = false; }
  }
  $effect(() => {
    const visible = open; const id = projectId;
    untrack(() => {
      if (poll) clearInterval(poll);
      if (!visible) return;
      if (sessionProject !== id) { epoch += 1; loading = false; snapshot = null; scope = folderId ?? ''; selected = []; replacing = false; replacementConsent = false; replacementId = ''; changed(); sessionProject = id; }
      if (!frozen && !again && scope !== (folderId ?? '')) { epoch += 1; loading = false; scope = folderId ?? ''; snapshot = null; replacing = false; replacementConsent = false; replacementId = ''; changed(); }
      void load(true);
      poll = setInterval(() => { if (!busy) void load(); },3000);
    });
    return () => { if (poll) clearInterval(poll); };
  });
  onDestroy(() => { epoch += 1; if (poll) clearInterval(poll); });
  async function changeScope(value:string) { epoch += 1; loading = false; scope = value; snapshot = null; selected = []; changed(); replacing = false; replacementConsent = false; replacementId = ''; existingRunId = ''; await load(true); }
  function toggle(id:string) { selectionMode = 'selected'; selected = selected.includes(id) ? selected.filter(value => value !== id) : [...selected,id]; changed(); }
  async function post(body:Record<string,unknown>) {
    const response = await fetch('/api/owner-sync',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    const result = await response.json();
    if (!response.ok) { if (typeof result.existingRunId === 'string') existingRunId = result.existingRunId; throw new Error(result.message ?? 'Destination operation failed.'); }
    return result;
  }
  async function connect() {
    if (replacing && (!connection || !replacementConsent)) return;
    busy = true; message = ''; existingRunId = '';
    if (replacing) replacementId ||= crypto.randomUUID();
    try { await post({action:'connect',projectId,...(scope ? {folderId:scope} : {}),mode,...(mode === 'create' ? {targetTitle:targetTitle.trim()} : {targetRunId:targetRunId.trim()}),...(replacing && connection ? {replacesConnectionId:connection._id,replacementId,replacementConsent:true} : {})}); replacing = false; replacementConsent = false; replacementId = ''; changed(); await load(); }
    catch (cause) { message = cause instanceof Error ? cause.message : 'Connection failed.'; }
    finally { busy = false; }
  }
  function changeTargetMode(value:'create'|'connect') { mode = value; replacementId = ''; replacementConsent = false; changed(); }
  function prepareSyncAgain(item:Item, version:Version) {
    if (busy || frozen || !connection || item.connectionId !== connection._id || item.state !== 'disconnected' || !item.canSyncAgain || !version.ready) return;
    changed();
    selected = [version.versionId];
    again = { preview:structuredClone(version), expectedGeneration:item.consentGeneration, connectionId:item.connectionId };
    message = 'Review this exact version and its images, then grant fresh public-publication consent below.';
  }
  async function sync() {
    if (!connection || !consent || (!frozen && !valid)) return;
    if (!frozen) frozenPreview = structuredClone(ordered);
    frozen ??= again ? {action:'sync-again', connectionId:again.connectionId, confirmationId:crypto.randomUUID(), versionId:again.preview.versionId, expectedGeneration:again.expectedGeneration, expectedMetadataUpdatedAt:again.preview.expectedMetadataUpdatedAt} : {action:'confirm',connectionId:connection._id,confirmationId:crypto.randomUUID(),versions:ordered.map(version => ({versionId:version.versionId,expectedMetadataUpdatedAt:version.expectedMetadataUpdatedAt}))};
    busy = true; message = '';
    try { await post(frozen); frozen = null; frozenPreview = []; again = null; consent = false; selected = []; message = 'Saved. Delivery continues after you close this window.'; await load(); }
    catch (cause) { message = cause instanceof Error ? cause.message : 'Could not confirm. Retry the same selection safely.'; }
    finally { busy = false; }
  }
  async function retry(batchId:string) { busy = true; message = ''; try { await post({action:'retry',batchId}); await load(); } catch (cause) { message = cause instanceof Error ? cause.message : 'Retry failed.'; } finally { busy = false; } }
  function prepareRefresh(job:Item, version:Version) {
    if (busy || !version.ready || job.state !== 'synced') return;
    refreshIntent = { preview:structuredClone(version), job:structuredClone(job), operationId:crypto.randomUUID() };
    refreshConsent = false;
  }
  async function refreshMetadata() {
    if (!refreshIntent || !refreshConsent || busy) return;
    busy = true; message = '';
    try {
      await post({action:'refresh',jobId:refreshIntent.job.id,operationId:refreshIntent.operationId,expectedGeneration:refreshIntent.job.consentGeneration,expectedMetadataUpdatedAt:refreshIntent.preview.expectedMetadataUpdatedAt});
      refreshIntent = null; refreshConsent = false; message = 'Refresh saved. Existing Trailer Feed edits and published media URLs are retained.'; await load();
    } catch (cause) { message = cause instanceof Error ? cause.message : 'Refresh failed. Retry the same confirmation.'; }
    finally { busy = false; }
  }
  async function retryRefresh(refreshId:string) { busy = true; message = ''; try { await post({action:'retry-refresh',refreshId}); await load(); } catch (cause) { message = cause instanceof Error ? cause.message : 'Refresh retry failed.'; } finally { busy = false; } }
  function prepareUnsync(job:Item, preview:Version) {
    if (busy || frozen || job.state === 'source_deleted' || job.connectionId !== connection?._id) return;
    changed(); unsyncIntent = { job:structuredClone(job), preview:structuredClone(preview) };
  }
  async function unsync() {
    if (!unsyncIntent || !unsyncConsent || busy) return;
    busy = true; message = '';
    try { await post({action:'unsync',jobId:unsyncIntent.job.id,expectedGeneration:unsyncIntent.job.consentGeneration}); unsyncIntent = null; unsyncConsent = false; message = 'Unsync saved. Public access is revoked; target removal continues until confirmed.'; await load(); }
    catch (cause) { message = cause instanceof Error ? cause.message : 'Unsync failed. Retry this exact version.'; }
    finally { busy = false; }
  }
</script>
{#snippet content()}
    <div class="dialog-top"><div>{#if embedded}<p>Publish selected versions from {snapshot?.projectTitle ?? 'this project'}.</p>{:else}<Dialog.Title class="dialog-title">Trailer Feed</Dialog.Title><Dialog.Description class="dialog-description">Publish selected versions from {snapshot?.projectTitle ?? 'this project'}.</Dialog.Description>{/if}</div>{#if !embedded}<Dialog.Close class="publishing-close" disabled={busy} aria-label="Close destinations"><X size={17}/></Dialog.Close>{/if}</div>
    <div class="field">Source scope<Stage1Select label="Source scope" value={scope || '__project__'} disabled={busy || !!frozen || !!again} items={[{value:'__project__',label:'Whole project'},...(snapshot?.folders ?? []).map(folder => ({value:folder.id,label:folder.title}))]} onValueChange={value => void changeScope(value === '__project__' ? '' : value)}/></div>
    {#if !snapshot}<p role="status">{loading ? 'Loading destination…' : 'Destination unavailable.'}</p>{:else}
      {#if !connection || replacing}<section><h2>{replacing ? 'Replace removed target' : 'Connect a target project'}</h2>{#if replacing}<p>Replace only the deleted target {connection?.targetRunId}. Existing source media and delivery history are retained. Nothing publishes until you confirm selected versions below.</p>{/if}<div class="target-modes"><button class="secondary-button" aria-pressed={mode === 'create'} disabled={busy} onclick={() => changeTargetMode('create')}>Create new</button><button class="secondary-button" aria-pressed={mode === 'connect'} disabled={busy} onclick={() => changeTargetMode('connect')}>Use existing</button></div>{#if mode === 'create'}<label>Target project name<input bind:value={targetTitle} oninput={() => { replacementId = ''; replacementConsent = false; }} disabled={busy}/></label>{:else}<label>Existing Trailer Feed project ID<input bind:value={targetRunId} oninput={() => { replacementId = ''; replacementConsent = false; }} disabled={busy}/></label>{/if}{#if replacing}<label class="consent"><input type="checkbox" bind:checked={replacementConsent} disabled={busy}/><span>I authorize replacing this deleted target connection with the project I chose. Publication needs separate consent.</span></label>{/if}<button class="secondary-button" disabled={busy || (replacing && !replacementConsent) || !(mode === 'create' ? targetTitle.trim() : targetRunId.trim())} onclick={connect}>{busy ? 'Connecting…' : replacing ? 'Confirm replacement' : 'Connect target'}</button>{#if replacing}<button class="text-button" disabled={busy} onclick={() => { replacing = false; replacementConsent = false; replacementId = ''; }}>Cancel replacement</button>{/if}{#if existingRunId}<p>A project with this name already exists.</p><button class="secondary-button" onclick={() => { changeTargetMode('connect'); targetRunId = existingRunId; existingRunId = ''; }}>Choose existing project</button><button class="secondary-button" onclick={() => { existingRunId = ''; changeTargetMode('create'); }}>Change name</button>{/if}</section>
      {:else}<p class="connection">Connected · {connection.targetRunId}</p><button class="text-button" disabled={busy || !!frozen || !!again} onclick={() => { replacing = true; replacementConsent = false; replacementId = ''; targetRunId = ''; targetTitle = ''; changed(); }}>Replace removed target</button><section><h2>Publish videos</h2><div class="target-modes"><button class="secondary-button" aria-pressed={selectionMode === 'all'} disabled={busy || !!frozen || !!again} onclick={() => { changed(); selected = []; selectionMode = 'all'; }}>All videos</button><button class="secondary-button" aria-pressed={selectionMode === 'selected'} disabled={busy || !!frozen || !!again} onclick={() => { changed(); selectionMode = 'selected'; selected = []; }}>Choose versions</button></div>{#if selectionMode === 'all' && !again}<p>Publish every current version in this scope that has not been synced. All videos and their image references must be ready. Future uploads stay private until you publish again.</p>{#if !allCurrent.length}<p>All current videos are already synced or disconnected. Use Saved delivery below for existing versions.</p>{/if}{:else}<p>Selections stay pinned when newer versions are uploaded.</p><div class="version-list">{#each snapshot.versions as version (version.versionId)}{@const previous = latest(version.versionId)}<label class="version-option"><input type="checkbox" checked={selected.includes(version.versionId)} disabled={busy || !!frozen || !!again || !!previous} onchange={() => toggle(version.versionId)}/><span><strong>{version.assetCode || version.title} · V{version.version}</strong><small>{version.isCurrent ? 'Current · ' : ''}{version.model ?? 'No model'} · {version.sourceLabel ?? 'No source label'}</small>{#if previous}<small>{labels[previous.state] ?? previous.state}{previous.state === 'disconnected' && !previous.canSyncAgain ? ' · Target removal has not been verified; Sync again is unavailable.' : ''}</small>{:else if !version.ready}<small>Processing — wait before syncing</small>{/if}</span></label>{/each}</div>{/if}</section>
      <section><h2>{again ? "Sync again · exact version" : `Publication order · ${ordered.length}`}</h2>{#if again}<p>Fresh consent restores only V{again.preview.version}. Newly uploaded versions stay separate. <button class="text-button" disabled={busy} onclick={changed}>Cancel reactivation</button></p>{/if}<p>{again ? "The existing target version number is retained when this exact version is restored." : "Oldest source date first. Trailer Feed assigns version numbers in this order."}</p>{#each ordered as version,index (version.versionId)}<article class="ordered-version"><div><strong>{index + 1}. {version.title} · V{version.version}</strong><p>Model: {version.model || "Not supplied"} · Source: {version.sourceLabel || "Not supplied"}</p><p>Prompt preview: {version.promptPreview || 'No prompt'}</p><small>Source date: {new Date(version.sourceCreatedAt).toISOString()}</small><br/><small>{version.images.length ? 'Included image references:' : 'No image references'}</small>{#each version.images as image (image.versionId)}<div class="reference">{image.grid ? 'Grid' : 'Image'} · {image.label}{!image.ready ? ' · Not ready' : ''}</div>{/each}</div></article>{/each}
      <label class="consent"><input type="checkbox" bind:checked={consent} disabled={busy || !ordered.length}/><span>I authorize Trailer Feed to publish these exact videos, their listed images and metadata publicly. Source uploads remain in Review Room. Approval status does not restrict this publication.</span></label><button class="primary-button" disabled={busy || !consent || (!frozen && !valid)} onclick={sync}>{busy ? 'Saving…' : frozen ? 'Retry same confirmation' : again ? 'Confirm Sync again' : selectionMode === 'all' ? 'Publish all videos' : 'Sync selected versions'}</button>{#if frozen}<p>The confirmation is retained until delivery is acknowledged. <button class="text-button" disabled={busy} onclick={changed}>Change selection</button></p>{/if}</section>{/if}
      <section><h2>Saved delivery</h2>{#if snapshot.reconciliationError}<p class="operation-message" role="status">{snapshot.reconciliationError} Displayed delivery statuses may be out of date.</p>{/if}{#if !visibleItems.length}<p>No versions synced yet.</p>{/if}{#each visibleItems as item (item.id)}{@const version = snapshot.versions.find(version => version.versionId === item.versionId)}<div class="delivery"><strong>{version?.title ?? 'Version'} · {version ? `V${version.version}` : item.versionId}</strong><span class="delivery-state">{#if item.connectionId !== connection?._id}Previous target · {scopeConnections.find(previous => previous._id === item.connectionId)?.targetRunId} · {/if}{labels[item.state] ?? item.state}{item.targetVersionNumber ? ` · Target V${item.targetVersionNumber}` : ''}</span>{#if item.lastError}<p>{item.lastError}</p>{/if}{#if item.state === 'synced' && version && item.connectionId === connection?._id && latest(version.versionId)?.id === item.id}<button class="secondary-button" disabled={busy || !version.ready || !!refreshIntent} onclick={() => prepareRefresh(item,version)}><RefreshCw size={14}/> Refresh metadata &amp; images</button>{/if}{#each (snapshot.refreshes ?? []).filter(refresh => refresh.jobId === item.id) as refresh (refresh.id)}<p>Refresh: {refresh.state === 'complete' ? 'Complete' : refresh.state === 'queued' || refresh.state === 'sending' ? 'Refreshing…' : refresh.state}</p>{#if refresh.lastError}<p>{refresh.lastError}</p>{/if}{#if refresh.state === 'failed'}<button class="secondary-button" disabled={busy} onclick={() => retryRefresh(refresh.id)}>Retry saved Refresh</button>{/if}{/each}{#if version && item.state !== 'source_deleted' && item.connectionId === connection?._id && latest(version.versionId)?.id === item.id}<button class="secondary-button" disabled={busy || !!frozen || !!unsyncIntent} onclick={() => prepareUnsync(item,version)}>Unsync · V{version.version}</button>{/if}{#each (snapshot.unsyncs ?? []).filter(operation => operation.jobId === item.id) as operation (operation.id)}<p>Unsync: {operation.state === 'complete' ? 'Removal confirmed' : 'Removal pending · retrying automatically'}</p>{#if operation.lastError && operation.state !== 'complete'}<p>{operation.lastError}</p>{/if}{/each}{#if item.state === 'disconnected'}{#if item.canSyncAgain && version && item.connectionId === connection?._id}<button class="secondary-button" disabled={busy || !!frozen || !version.ready} onclick={() => prepareSyncAgain(item,version)}>Sync again · V{version.version}</button>{:else}<p>{item.connectionId !== connection?._id ? 'This previous target connection is retired. Publish selected versions above with fresh consent.' : 'Sync again is unavailable until target removal and this exact source version are verified.'}</p>{/if}{:else if item.state === 'source_deleted'}<p>The source was deleted. This version cannot be reactivated.</p>{@const removal = snapshot.removals?.find(removal => removal.versionId === item.versionId)}<p>{removalStatus(removal)}</p>{#if removal?.lastError && removal.state !== "complete"}<p>{removal.lastError}</p>{/if}{/if}</div>{/each}{#each (snapshot.removals ?? []).filter(removal => !snapshot?.items.some(item => item.versionId === removal.versionId)) as removal (removal.versionId)}{@const reference = snapshot.versions.find(version => version.versionId === removal.versionId)}<div class="delivery"><strong>{reference ? `${reference.title} · V${reference.version}` : "Deleted reference"}</strong><p>{removalStatus(removal)}</p>{#if removal.lastError && removal.state !== "complete"}<p>{removal.lastError}</p>{/if}</div>{/each}{#each [...new Set(visibleItems.filter(item => item.state === 'failed' && item.connectionId === connection?._id).map(item => item.batchId))] as batchId (batchId)}<button class="secondary-button" disabled={busy} onclick={() => retry(batchId)}><RefreshCw size={14}/> Retry failed batch</button>{/each}</section>
    {/if}
    {#if refreshIntent}<section><h2>Refresh · {refreshIntent.preview.title} · V{refreshIntent.preview.version}</h2><p>Fill empty Trailer Feed fields only. Existing edits, video order and published video/image URLs stay as they are.</p><p>Model: {refreshIntent.preview.model || 'Not supplied'} · Source: {refreshIntent.preview.sourceLabel || 'Not supplied'}</p><p>Prompt: {refreshIntent.preview.promptPreview || 'No prompt'}</p>{#each refreshIntent.preview.images as image (image.versionId)}<p>{image.grid ? 'Grid' : 'Image'} · {image.label}</p>{/each}<label class="consent"><input type="checkbox" bind:checked={refreshConsent} disabled={busy}/><span>I authorize publishing this metadata and these exact image references to Trailer Feed.</span></label><button class="primary-button" disabled={busy || !refreshConsent} onclick={refreshMetadata}>Confirm Refresh</button><button class="text-button" disabled={busy} onclick={() => { refreshIntent = null; refreshConsent = false; }}>Cancel Refresh</button></section>{/if}
    {#if unsyncIntent}<section><h2>Unsync · {unsyncIntent.preview.assetCode || unsyncIntent.preview.title} · V{unsyncIntent.preview.version}</h2><p>Remove this exact published version and its attached images from Trailer Feed. Review originals and feedback are retained.</p><label class="consent"><input type="checkbox" bind:checked={unsyncConsent} disabled={busy}/><span>Remove this exact version from Trailer Feed; retain Review originals and feedback.</span></label><button class="primary-button" disabled={busy || !unsyncConsent} onclick={unsync}>Confirm Unsync</button><button class="text-button" disabled={busy} onclick={() => { unsyncIntent = null; unsyncConsent = false; }}>Cancel Unsync</button></section>{/if}
    {#if message}<p class="operation-message" role="status">{message}</p>{/if}
{/snippet}
{#if embedded}<div class="destination-body">{@render content()}</div>{:else}
<Dialog.Root bind:open><Dialog.Portal><Dialog.Overlay class="dialog-overlay"/><Dialog.Content class="filter-sheet publishing-sheet destination-dialog" onEscapeKeydown={event => { if (busy) event.preventDefault(); }} onInteractOutside={event => { if (busy) event.preventDefault(); }}>{@render content()}</Dialog.Content></Dialog.Portal></Dialog.Root>
{/if}
<style>
  :global(.destination-dialog){width:min(560px,calc(100vw - 28px));height:auto;color:var(--ink);font-size:11px;line-height:1.5}
  .dialog-top{display:flex;align-items:start;justify-content:space-between;gap:12px;margin-bottom:8px}
  :global(.destination-dialog .dialog-title){margin:0;font-size:15px;font-weight:550}
  :global(.destination-dialog .dialog-description){font-size:11px}
  p,small{color:var(--muted);font-size:11px;line-height:1.5}p{margin:4px 0}
  section{margin-top:16px;padding-top:12px;border-top:1px solid var(--border)}h2{font-size:14px;font-weight:550;margin:2px 0 12px}
  label,.field{display:grid;gap:6px;margin:12px 0;color:var(--muted);font-size:11px;min-width:0}
  input:not([type=checkbox]){width:100%;min-width:0;height:28px;padding:0 9px;background:var(--canvas);border:1px solid var(--border);border-radius:5px;color:var(--ink);font:inherit;font-size:11px}
  button{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:28px;padding:0 10px;border:1px solid var(--border);border-radius:5px;background:var(--raised);color:var(--ink);font:inherit;font-size:11px;cursor:pointer}
  button.primary-button{background:color-mix(in srgb,var(--accent) 22%,var(--panel))}button:hover:not(:disabled){background:color-mix(in srgb,var(--accent) 12%,var(--panel))}button:disabled{opacity:.45;cursor:default}
  .target-modes{display:flex;gap:6px}.target-modes button[aria-pressed=true]{background:color-mix(in srgb,var(--accent) 20%,var(--panel))}
  .version-list{max-height:260px;overflow:auto}.version-option,.consent{display:flex;align-items:flex-start;gap:8px}.version-option span{display:grid;gap:2px;min-width:0}.version-option strong{color:var(--ink);font-weight:500}.version-option input,.consent input{margin-top:3px;accent-color:var(--accent)}
  .ordered-version{padding:10px 0;border-bottom:1px solid var(--border)}.ordered-version p{white-space:pre-wrap;margin:4px 0}.reference{margin:4px 0}.connection,.delivery-state{color:var(--muted);overflow-wrap:anywhere}.delivery{padding:10px 0;border-top:1px solid var(--border)}.delivery strong{font-weight:500}.delivery-state{display:block;margin-top:2px}
  .operation-message{padding:10px;border:1px solid var(--border);border-radius:5px;white-space:pre-wrap}.text-button{padding:0;border:0;background:transparent;text-decoration:underline}
  button:focus-visible,input:focus-visible{outline:1px solid var(--accent);outline-offset:2px}
  @media(pointer:coarse){button,input:not([type=checkbox]){min-height:44px}input:not([type=checkbox]){font-size:16px}}
</style>
