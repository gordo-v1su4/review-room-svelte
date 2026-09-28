<script lang="ts">let { data } = $props();</script>
<svelte:head><title>{data.publication.title} · Review Room</title></svelte:head>
<main><video controls playsinline preload="metadata" src={`/api/public-media/${data.publication.slug}`} aria-label={data.publication.title}></video><div class="label"><strong>{data.publication.title}</strong><small>{data.publication.projectTitle}</small></div></main>
<style>main{min-height:100vh;background:#090b0c;color:var(--ink);display:grid;grid-template-rows:minmax(0,1fr) auto}video{display:block;width:100%;height:100%;max-height:calc(100vh - 54px);background:#000}.label{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px}.label small{color:var(--muted)}</style>
