<script lang="ts">
  import AccountPanel from '$lib/components/AccountPanel.svelte';
</script>

<svelte:head><title>Sign in — Review Room</title><meta name="robots" content="noindex"/></svelte:head>
<main>
  <a class="brand" href="/">review room.</a>
  <section aria-label="Workspace account"><h1>Your workspace</h1><AccountPanel/></section>
  <a class="return-link" href="/">Back to local workspace</a>
</main>

<style>
  main { width: min(360px, calc(100% - 40px)); margin: 0 auto; padding: max(36px, 10svh) 0 36px; }
  .brand { color: var(--ink); font-size: 20px; font-weight: 600; letter-spacing: -.8px; text-decoration: none; }
  section { margin: 36px 0 24px; } h1 { font-size: 22px; margin: 0 0 20px; }
  .return-link { display: inline-flex; align-items: center; min-height: 32px; color: var(--muted); font-size: 12px; }
  a:focus-visible { outline: 1px solid var(--focus-ring); outline-offset: 3px; }
  @media (pointer: coarse) { .return-link { min-height: 44px; } }
</style>
