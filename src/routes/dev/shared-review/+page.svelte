<script lang="ts">
  import { onDestroy } from 'svelte';
  import SharedReview from '$lib/public-review/SharedReview.svelte';
  import type { SharedReviewPayload } from '$lib/public-review/shared-review';
  import { prepareLocalImport } from '$lib/local-import';
  import { createReviewSession, transitionReviewSession } from '$lib/review-session';
  import type { SharedReviewGateway } from '$lib/shared-review-session';
  let payload = $state.raw<SharedReviewPayload | null>(null);
  let server = createReviewSession([]);
  let failNext = $state(false), hold = $state(false), allowDownloads = $state(false);
  let message = $state(''), queued = $state(0);
  const releases = new Set<() => void>();
  const lifetime = new AbortController();
  const urls: string[] = [];
  let loading = $state(false);
  async function load(files: FileList | null) {
    if (!files || loading) return;
    loading = true; message = '';
    try {
      const assets = await Promise.all([...files].map(file => prepareLocalImport(file, lifetime.signal)));
      urls.push(...assets.map(asset => asset.url));
      if (lifetime.signal.aborted) { for (const asset of assets) URL.revokeObjectURL(asset.url); return; }
      server = createReviewSession(assets);
      payload = { project: { id: 'local-fixture', title: 'North coast', description: 'Local shared-review fixture. No live backend.', canDownload: allowDownloads }, assets: assets.map(asset => ({ ...asset, sourceBlob: asset.sourceFile, downloadEnabled: true, review: server.assets[asset.id] })) };
    } catch { message = 'Could not load fixture media.'; }
    finally { loading = false; }
  }
  const gateway: SharedReviewGateway = {
    async commit(command, signal) {
      if (hold) await new Promise<void>((resolve, reject) => {
        const cleanup = () => { releases.delete(release); queued = releases.size; signal.removeEventListener('abort', abort); };
        const release = () => { cleanup(); resolve(); };
        const abort = () => { cleanup(); reject(new Error('Cancelled')); };
        releases.add(release); queued = releases.size;
        if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
      });
      if (signal.aborted) throw new Error('Cancelled');
      if (failNext) { failNext = false; throw new Error('Fixture save rejected'); }
      if (command.type === 'publish-comment') {
        server = transitionReviewSession(server, { type: 'draft', assetId: command.assetId, body: command.body, timecodeSec: command.timecodeSec });
        server = transitionReviewSession(server, { type: 'publish-comment', assetId: command.assetId, commentId: command.commentId, author: { name: 'Avery Lee', role: 'client' }, createdAt: Date.now() }, { kind: 'share' });
      } else if (command.type === 'save-annotations') {
        server = transitionReviewSession(server, { type: 'annotate', assetId: command.assetId, action: { type: 'replace', strokes: command.strokes } }, { kind: 'share' });
        server = transitionReviewSession(server, { type: 'annotate', assetId: command.assetId, action: { type: 'save' } }, { kind: 'share' });
      } else server = transitionReviewSession(server, command, { kind: 'share' });
      return server.assets[command.assetId];
    }
  };
  onDestroy(() => { lifetime.abort(); for (const url of urls) URL.revokeObjectURL(url); });
</script>

<svelte:head><title>Shared review — development checks</title><meta name="robots" content="noindex"/></svelte:head>
<aside class="fixture-tools" aria-label="Development fixtures">
  <label>Load local fixture media <input type="file" accept="video/*,image/*" multiple disabled={loading} onchange={event => load(event.currentTarget.files)}/></label>
  <label><input type="checkbox" bind:checked={failNext}/>Fail next save</label>
  <label><input type="checkbox" bind:checked={hold}/>Hold saves</label>
  <button disabled={!queued} onclick={() => { for (const release of [...releases]) release(); }}>Release saves {queued}</button>
  <label><input type="checkbox" bind:checked={allowDownloads} disabled={!!payload}/>Allow downloads for loaded fixture</label>
  <span role="status">{loading ? 'Loading…' : message}</span>
</aside>
{#if payload}<SharedReview {payload} reviewerName="Avery Lee" {gateway} onDownload={async id => { message = `Fixture download requested: ${payload?.assets.find(asset => asset.id === id)?.name}`; }}/>{:else}<p class="fixture-empty">Choose real local media to exercise the shared viewer. These checks do not prove live persistence or authorization.</p>{/if}

<style>
  .fixture-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 12px; color: var(--muted); background: var(--panel); font-size: 11px; }
  .fixture-tools label { display: flex; gap: 5px; align-items: center; }
  .fixture-tools input[type='file'] { max-width: 240px; }
  .fixture-tools button { background: var(--raised); color: var(--ink); padding: 4px 8px; border-radius: 4px; }
  .fixture-empty { padding: 32px; color: var(--muted); font-size: 13px; }
</style>
