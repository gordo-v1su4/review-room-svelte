<script lang="ts">
  import ReviewAccessGate from '$lib/public-review/ReviewAccessGate.svelte';
  import type { PublicReviewGateway } from '$lib/public-review-access';
  let scenario = $state('passcode');
  function fixture(kind: string): PublicReviewGateway<null> {
    return {
      async load() {
        if (kind === 'error') throw new Error('Private diagnostic must never be rendered');
        if (kind === 'expired' || kind === 'missing' || kind === 'unavailable') return { kind: 'unavailable', reason: kind };
        if (kind === 'saved-name') return { kind: 'ready', projectTitle: 'North coast', viewerName: 'Avery', data: null };
        return { kind: kind === 'name' ? 'name' : 'passcode', projectTitle: 'North coast' };
      },
      async unlock(_token, passcode) {
        return passcode === 'studio'
          ? { kind: 'name', projectTitle: 'North coast' }
          : { kind: 'passcode', projectTitle: 'North coast', rejection: 'incorrect-passcode' };
      },
      async identify(_token, name) { return { kind: 'ready', projectTitle: 'North coast', viewerName: name, data: null }; }
    };
  }
  const gateway = $derived(fixture(scenario));
</script>

<svelte:head><title>Review access — development checks</title><meta name="robots" content="noindex"/></svelte:head>
<aside class="qa-controls" aria-label="Development fixtures">
  <label>QA scenario <select bind:value={scenario}><option value="passcode">Passcode</option><option value="name">Name</option><option value="saved-name">Returning reviewer</option><option value="expired">Expired</option><option value="missing">Missing</option><option value="unavailable">Unavailable</option><option value="error">Transport failure</option></select></label>
  <span>Local fixture · passcode: studio · no backend</span>
</aside>
<ReviewAccessGate token="local-fixture" {gateway}>
  {#snippet children(access)}
    <main class="qa-ready"><h1>Access confirmed</h1><p>{access.projectTitle} · {access.viewerName}</p><p>This fixture verifies the gate, not live authorization or the shared viewer.</p></main>
  {/snippet}
</ReviewAccessGate>

<style>
  .qa-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 12px; background: var(--panel); color: var(--muted); font-size: 12px; }
  select { background: var(--raised); color: var(--ink); border: 1px solid var(--border); padding: 4px; }
  .qa-ready { padding: 32px; color: var(--ink); }
</style>
