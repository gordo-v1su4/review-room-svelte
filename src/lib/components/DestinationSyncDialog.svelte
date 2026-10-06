<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { Dialog } from 'bits-ui';
  import { RefreshCw, X } from 'lucide-svelte';
  type Version = { versionId:string; assetId:string; assetCode:string; title:string; version:number; isCurrent:boolean; expectedMetadataUpdatedAt:number|null; sourceCreatedAt:number; model?:string; sourceLabel?:string; promptPreview?:string; ready:boolean; images:{versionId:string;label:string;ready:boolean;grid:boolean}[] };
  type Connection = { _id:string; folderId?:string; targetRunId:string };
  type Item = { id:string; batchId:string; connectionId:string; consentGeneration:number; versionId:string; state:string; canSyncAgain:boolean; lastError?:string; targetVersionNumber?:number };
  type Removal = { versionId:string; state:"queued"|"sending"|"complete"; attempts:number; lastError?:string };
  type Snapshot = { removals?:Removal[]; reconciliationError?:string; projectTitle:string; folders:{id:string;title:string}[]; versions:Version[]; connections:Connection[]; items:Item[]; batches:{_id:string}[] };
  let { open = $bindable(false), projectId, folderId = null, selectedVersionIds = [] }: { open?:boolean; projectId:string; folderId?:string|null; selectedVersionIds?:string[] } = $props();
  let snapshot = $state.raw<Snapshot|null>(null);
  let scope = $state('');
  let selected = $state<string[]>([]);
  let targetTitle = $state('');
  let targetRunId = $state('');
  let mode = $state<'create'|'connect'>('create');
  let existingRunId = $state('');
  let busy = $state(false);
  let loading = $state(false);
  let message = $state('');
  let consent = $state(false);
  type Confirmation = { action:'confirm'; connectionId:string; confirmationId:string; versions:{versionId:string;expectedMetadataUpdatedAt:number|null}[] };
  type Reactivation = { action:'sync-again'; connectionId:string; confirmationId:string; versionId:string; expectedGeneration:number; expectedMetadataUpdatedAt:number|null };
  let again = $state.raw<{ preview:Version; expectedGeneration:number; connectionId:string }|null>(null);
  let frozenPreview = $state.raw<Version[]>([]);
  let frozen = $state.raw<Confirmation|Reactivation|null>(null);
  let sessionProject = '';
  let epoch = 0;
  let poll:ReturnType<typeof setInterval>|undefined;
  const connection = $derived(snapshot?.connections.find(item => (item.folderId ?? '') === scope));
  const ordered = $derived(frozen ? frozenPreview : again ? [again.preview] : selected.map(id => snapshot?.versions.find(version => version.versionId === id)).filter((version):version is Version => !!version).sort((a,b) => a.sourceCreatedAt - b.sourceCreatedAt || a.versionId.localeCompare(b.versionId)));
  const valid = $derived(ordered.length > 0 && ordered.length <= 100 && ordered.length === selected.length && ordered.every(version => version.ready && version.images.every(image => image.ready)));
  const labels:Record<string,string> = { queued:'Syncing',sending:'Syncing',synced:'Synced',failed:'Failed',disconnected:'Disconnected',source_deleted:'Source deleted' };
  function removalStatus(removal:Removal|undefined) { return removal?.state === 'complete' ? 'Target removal confirmed complete.' : removal?.attempts ? 'Target removal pending; delivery is retrying.' : 'Target removal pending.'; }
  function latest(versionId:string) { return snapshot?.items.filter(item => item.versionId === versionId && item.connectionId === connection?._id).sort((a,b) => b.consentGeneration - a.consentGeneration)[0]; }
  function changed() { if (again) selected = []; again = null; frozen = null; frozenPreview = []; consent = false; message = ''; }
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
      if (initial && !frozen && !again) { selected = selectedVersionIds.filter(id => body.versions.some((version:Version) => version.versionId === id)); targetTitle = scope ? body.folders.find((folder:{id:string}) => folder.id === scope)?.title ?? body.projectTitle : body.projectTitle; }
    } catch (cause) { if (token === epoch) message = cause instanceof Error ? cause.message : 'Could not load destination.'; }
    finally { if (token === epoch) loading = false; }
  }
  $effect(() => {
    const visible = open; const id = projectId;
    untrack(() => {
      if (poll) clearInterval(poll);
      if (!visible) return;
      if (sessionProject !== id) { epoch += 1; loading = false; snapshot = null; scope = folderId ?? ''; selected = []; changed(); sessionProject = id; }
      if (!frozen && !again && scope !== (folderId ?? '')) { epoch += 1; loading = false; scope = folderId ?? ''; snapshot = null; changed(); }
      void load(true);
      poll = setInterval(() => { if (!busy) void load(); },3000);
    });
    return () => { if (poll) clearInterval(poll); };
  });
  onDestroy(() => { epoch += 1; if (poll) clearInterval(poll); });
  async function changeScope(value:string) { epoch += 1; loading = false; scope = value; snapshot = null; selected = []; changed(); existingRunId = ''; await load(true); }
  function toggle(id:string) { selected = selected.includes(id) ? selected.filter(value => value !== id) : [...selected,id]; changed(); }
  async function post(body:Record<string,unknown>) {
    const response = await fetch('/api/owner-sync',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    const result = await response.json();
    if (!response.ok) { if (typeof result.existingRunId === 'string') existingRunId = result.existingRunId; throw new Error(result.message ?? 'Destination operation failed.'); }
    return result;
  }
  async function connect() {
    busy = true; message = ''; existingRunId = '';
    try { await post({action:'connect',projectId,...(scope ? {folderId:scope} : {}),mode,...(mode === 'create' ? {targetTitle:targetTitle.trim()} : {targetRunId:targetRunId.trim()})}); await load(); }
    catch (cause) { message = cause instanceof Error ? cause.message : 'Connection failed.'; }
    finally { busy = false; }
  }
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
</script>
<Dialog.Root bind:open>
  <Dialog.Portal><Dialog.Overlay class="dialog-overlay"/><Dialog.Content class="destination-dialog" onEscapeKeydown={event => { if (busy) event.preventDefault(); }} onInteractOutside={event => { if (busy) event.preventDefault(); }}>
    <div class="dialog-top"><div><Dialog.Title class="dialog-title">Trailer Feed</Dialog.Title><Dialog.Description class="dialog-description">Publish selected versions from {snapshot?.projectTitle ?? 'this project'}.</Dialog.Description></div><Dialog.Close class="icon-button" disabled={busy} aria-label="Close destinations"><X size={18}/></Dialog.Close></div>
    <label>Source scope<select value={scope} disabled={busy || !!frozen || !!again} onchange={event => void changeScope(event.currentTarget.value)}><option value="">Whole project</option>{#each snapshot?.folders ?? [] as folder (folder.id)}<option value={folder.id}>{folder.title}</option>{/each}</select></label>
    {#if !snapshot}<p role="status">{loading ? 'Loading destination…' : 'Destination unavailable.'}</p>{:else}
      {#if !connection}<section><h2>Connect a target project</h2><div class="target-modes"><button class="secondary-button" aria-pressed={mode === 'create'} disabled={busy} onclick={() => { mode = 'create'; changed(); }}>Create new</button><button class="secondary-button" aria-pressed={mode === 'connect'} disabled={busy} onclick={() => { mode = 'connect'; changed(); }}>Use existing</button></div>{#if mode === 'create'}<label>Target project name<input bind:value={targetTitle} disabled={busy}/></label>{:else}<label>Existing Trailer Feed project ID<input bind:value={targetRunId} disabled={busy}/></label>{/if}<button class="secondary-button" disabled={busy || !(mode === 'create' ? targetTitle.trim() : targetRunId.trim())} onclick={connect}>{busy ? 'Connecting…' : 'Connect target'}</button>{#if existingRunId}<p>A project with this name already exists.</p><button class="secondary-button" onclick={() => { mode = 'connect'; targetRunId = existingRunId; existingRunId = ''; }}>Choose existing project</button><button class="secondary-button" onclick={() => { existingRunId = ''; mode = 'create'; }}>Change name</button>{/if}</section>
      {:else}<p class="connection">Connected · {connection.targetRunId}</p><section><h2>Choose exact versions</h2><p>Selections stay pinned when newer versions are uploaded.</p><div class="version-list">{#each snapshot.versions as version (version.versionId)}{@const previous = latest(version.versionId)}<label class="version-option"><input type="checkbox" checked={selected.includes(version.versionId)} disabled={busy || !!frozen || !!again || !!previous} onchange={() => toggle(version.versionId)}/><span><strong>{version.assetCode || version.title} · V{version.version}</strong><small>{version.isCurrent ? 'Current · ' : ''}{version.model ?? 'No model'} · {version.sourceLabel ?? 'No source label'}</small>{#if previous}<small>{labels[previous.state] ?? previous.state}{previous.state === 'disconnected' && !previous.canSyncAgain ? ' · Target removal has not been verified; Sync again is unavailable.' : ''}</small>{:else if !version.ready}<small>Processing — wait before syncing</small>{/if}</span></label>{/each}</div></section>
      <section><h2>{again ? "Sync again · exact version" : `Publication order · ${ordered.length}`}</h2>{#if again}<p>Fresh consent restores only V{again.preview.version}. Newly uploaded versions stay separate. <button class="text-button" disabled={busy} onclick={changed}>Cancel reactivation</button></p>{/if}<p>{again ? "The existing target version number is retained when this exact version is restored." : "Oldest source date first. Trailer Feed assigns version numbers in this order."}</p>{#each ordered as version,index (version.versionId)}<article class="ordered-version"><div><strong>{index + 1}. {version.title} · V{version.version}</strong><p>Model: {version.model || "Not supplied"} · Source: {version.sourceLabel || "Not supplied"}</p><p>Prompt preview: {version.promptPreview || 'No prompt'}</p><small>Source date: {new Date(version.sourceCreatedAt).toISOString()}</small><br/><small>{version.images.length ? 'Included image references:' : 'No image references'}</small>{#each version.images as image (image.versionId)}<div class="reference">{image.grid ? 'Grid' : 'Image'} · {image.label}{!image.ready ? ' · Not ready' : ''}</div>{/each}</div></article>{/each}
      <label class="consent"><input type="checkbox" bind:checked={consent} disabled={busy || !ordered.length}/><span>I authorize Trailer Feed to publish these exact videos, their listed images and metadata publicly. Source uploads remain in Review Room. Approval status does not restrict this publication.</span></label><button class="primary-button" disabled={busy || !consent || (!frozen && !valid)} onclick={sync}>{busy ? 'Saving…' : frozen ? 'Retry same confirmation' : again ? 'Confirm Sync again' : 'Sync selected versions'}</button>{#if frozen}<p>The confirmation is retained until delivery is acknowledged. <button class="text-button" disabled={busy} onclick={changed}>Change selection</button></p>{/if}</section>{/if}
      <section><h2>Saved delivery</h2>{#if snapshot.reconciliationError}<p class="operation-message" role="status">{snapshot.reconciliationError} Displayed delivery statuses may be out of date.</p>{/if}{#if !snapshot.items.length}<p>No versions synced yet.</p>{/if}{#each snapshot.items as item (item.id)}{@const version = snapshot.versions.find(version => version.versionId === item.versionId)}<div class="delivery"><strong>{version?.title ?? 'Version'} · {version ? `V${version.version}` : item.versionId}</strong><span class="delivery-state">{labels[item.state] ?? item.state}{item.targetVersionNumber ? ` · Target V${item.targetVersionNumber}` : ''}</span>{#if item.lastError}<p>{item.lastError}</p>{/if}{#if item.state === 'disconnected'}{#if item.canSyncAgain && version && item.connectionId === connection?._id}<button class="secondary-button" disabled={busy || !!frozen || !version.ready} onclick={() => prepareSyncAgain(item,version)}>Sync again · V{version.version}</button>{:else}<p>Sync again is unavailable until target removal and this exact source version are verified.</p>{/if}{:else if item.state === 'source_deleted'}<p>The source was deleted. This version cannot be reactivated.</p>{@const removal = snapshot.removals?.find(removal => removal.versionId === item.versionId)}<p>{removalStatus(removal)}</p>{#if removal?.lastError && removal.state !== "complete"}<p>{removal.lastError}</p>{/if}{/if}</div>{/each}{#each (snapshot.removals ?? []).filter(removal => !snapshot?.items.some(item => item.versionId === removal.versionId)) as removal (removal.versionId)}{@const reference = snapshot.versions.find(version => version.versionId === removal.versionId)}<div class="delivery"><strong>{reference ? `${reference.title} · V${reference.version}` : "Deleted reference"}</strong><p>{removalStatus(removal)}</p>{#if removal.lastError && removal.state !== "complete"}<p>{removal.lastError}</p>{/if}</div>{/each}{#each [...new Set(snapshot.items.filter(item => item.state === 'failed').map(item => item.batchId))] as batchId (batchId)}<button class="secondary-button" disabled={busy} onclick={() => retry(batchId)}><RefreshCw size={14}/> Retry failed batch</button>{/each}</section>
    {/if}
    {#if message}<p class="operation-message" role="status">{message}</p>{/if}
  </Dialog.Content></Dialog.Portal>
</Dialog.Root>
<style>
  :global(.destination-dialog){position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(760px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;padding:28px;background:var(--panel,#111716);border:1px solid var(--border,#29332f);border-radius:16px;z-index:60;color:var(--text,#e4eae6)}
  .dialog-top{display:flex;justify-content:space-between;gap:20px}:global(.destination-dialog .dialog-title){font-size:24px}:global(.destination-dialog .dialog-description),p,small{color:var(--muted,#a6b3ab)}section{margin-top:24px;padding-top:18px;border-top:1px solid var(--border,#29332f)}h2{font-size:16px;margin:0 0 10px}label{display:grid;gap:8px;margin:14px 0}select,input:not([type=checkbox]){width:100%;padding:10px;background:#0a100e;border:1px solid #34443c;border-radius:8px;color:inherit}.target-modes{display:flex;gap:8px}.version-list{max-height:260px;overflow:auto}.version-option,.consent{display:flex;align-items:flex-start;gap:12px}.version-option span{display:grid;gap:4px}.version-option input,.consent input{margin-top:4px}.ordered-version{display:flex;justify-content:space-between;gap:16px;padding:14px 0;border-bottom:1px solid #29332f}.ordered-version p{white-space:pre-wrap;margin:8px 0;font-size:13px}.reference{font-size:13px;margin:6px 0}.consent{font-size:13px;line-height:1.6}.connection,.delivery-state{font-size:13px;color:#a8c6ba}.delivery{padding:12px 0}.delivery-state{display:block;margin-top:5px}.delivery p{font-size:13px}.operation-message{padding:14px;border:1px solid #52665b;border-radius:8px;white-space:pre-wrap}.text-button{background:transparent;color:inherit;text-decoration:underline;border:0;cursor:pointer}@media(max-width:600px){:global(.destination-dialog){padding:20px}.ordered-version{gap:8px}}
</style>
