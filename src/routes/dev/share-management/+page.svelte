<script lang="ts">
  import ShareDialog from '$lib/components/ShareDialog.svelte';
  import { DEFAULT_APPEARANCE } from '$lib/appearance';
  import type { ReviewLink, ShareGateway } from '$lib/share-management';
  let fail = $state(false), owner = $state(true), hold = $state(false), queued = $state(0);
  let sequence = 0;
  let links: ReviewLink[] = [];
  const releases = new Set<() => void>();
  const gateway: ShareGateway = {
    list: async () => ({ kind: 'ready', links }),
    async create(_projectId, request, signal) {
      if (hold) await new Promise<void>((resolve, reject) => {
        const cleanup = () => { releases.delete(release); queued = releases.size; signal.removeEventListener('abort', abort); };
        const release = () => { cleanup(); resolve(); };
        const abort = () => { cleanup(); reject(new Error('Cancelled')); };
        releases.add(release); queued = releases.size;
        if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
      });
      if (signal.aborted) throw new Error('Cancelled');
      if (fail) { fail = false; throw new Error('Fixture failure'); }
      const link = { id: `fixture-${++sequence}`, path: `/review/fixture_preview_${sequence}`, protected: !!request.passcode, canDownload: request.canDownload, createdAt: Date.now() };
      links = [link, ...links];
      return link;
    }
  };
</script>
<svelte:head><title>Share administration — development checks</title><meta name="robots" content="noindex"/></svelte:head>
<main style="padding:24px"><h1>Local share fixture</h1><p>These links are test data and do not grant access to any review.</p>
<label><input type="checkbox" bind:checked={owner}/>Project owner</label>
<label><input type="checkbox" bind:checked={fail}/>Fail next create</label>
<label><input type="checkbox" bind:checked={hold}/>Hold creates</label>
<button onclick={() => { for (const release of [...releases]) release(); }} disabled={!queued}>Release creates {queued}</button>
<ShareDialog projectId="fixture" projectTitle="North coast" canManage={owner} appearance={DEFAULT_APPEARANCE} {gateway}/>
</main>
