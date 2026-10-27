<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.title} · Review Room</title>
  <meta name="description" content={data.intro} />
</svelte:head>
<header class="docs-heading">
  <p class="docs-kicker">Reference</p>
  <h1>{data.title}</h1>
  <p class="docs-lead">{data.intro}</p>
</header>
<p class="docs-diagram-hint" id="reference-scroll-hint">The complete diagram is static. On smaller screens, scroll the canvas to inspect the detail.</p>
<!-- These fragments come only from the two allowlisted repository documents. -->
<!-- A focusable scroll region lets keyboard users pan the full-size SVG. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="docs-reference-canvas" role="region" aria-label="Diagram canvas" aria-describedby="reference-scroll-hint" tabindex="0">{@html data.svg}</div>
<div class="docs-reference-notes">{@html data.notes}</div>
<footer class="docs-footer">{data.footer}</footer>
