<script lang="ts">let { data } = $props(); let active = $state(0);</script>
<svelte:head><title>{data.showcase.title} · Review Room</title></svelte:head>
<main><header><small>Showcase</small><h1>{data.showcase.title}</h1></header>
  {#if data.showcase.items[active]}
    <video controls playsinline preload="metadata" src={`/api/public-media/${data.showcase.items[active].slug}`} aria-label={data.showcase.items[active].title}></video>
    <div class="current"><strong>{data.showcase.items[active].title}</strong><small>{data.showcase.items[active].projectTitle}</small></div>
  {/if}
  <ol>{#each data.showcase.items as item, index}<li><button class:selected={index === active} onclick={() => active = index}><span>{index + 1}</span><span>{item.title}<small>{item.projectTitle}</small></span></button></li>{/each}</ol>
</main>
<style>main{min-height:100vh;padding:clamp(14px,3vw,30px);background:#101213;color:var(--ink);max-width:1100px;margin:auto}header{margin-bottom:16px}header small{color:var(--teal);text-transform:uppercase;letter-spacing:.12em}h1{font-size:clamp(24px,4vw,38px)}video{display:block;width:100%;max-height:65vh;background:#000;border-radius:8px}.current{display:flex;justify-content:space-between;gap:8px;margin:12px 0 20px}.current small,li small{color:var(--muted)}ol{list-style:none;padding:0;display:grid;gap:7px}li button{width:100%;display:flex;gap:14px;text-align:left;padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--panel)}li button.selected{border-color:var(--teal)}li button span:first-child{color:var(--teal)}li small{display:block}</style>
