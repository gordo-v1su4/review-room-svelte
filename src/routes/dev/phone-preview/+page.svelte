<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  let width = $state(430);
  let height = $state(768);
  const workspaceUrl = $derived('/' + page.url.search);
</script>

<svelte:head><title>Phone preview · Review Room</title></svelte:head>
<main class="preview-workbench">
  <header>
    <div><h1>Phone preview</h1><p>Live local app · {width} × {height} viewport</p></div>
    <div class="preview-options">
      <label>Width <select bind:value={width}><option value={320}>320</option><option value={390}>390</option><option value={430}>430</option></select></label>
      <label>Height <select bind:value={height}><option value={640}>640</option><option value={768}>768</option><option value={880}>880</option></select></label>
      <a href={resolve('/') + page.url.search} target="_blank" rel="noreferrer">Open desktop view</a>
    </div>
  </header>
  <div class="device-stage">
    <div class="phone-frame" style:width={`${width}px`}>
      <iframe title="Live phone workspace" src={workspaceUrl} {width} {height} allow="fullscreen" allowfullscreen></iframe>
    </div>
  </div>
</main>

<style>
  .preview-workbench { min-height:100dvh;background:#202525;color:#e0e8e5;font:12px system-ui,sans-serif; }
  header { position:sticky;top:0;z-index:1;display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;padding:16px 24px;background:#171c1b;border-bottom:1px solid #ffffff12; }
  h1 { margin:0;font-size:15px;font-weight:550; } p { margin:5px 0 0;color:#9daea7; }
  .preview-options { display:flex;align-items:center;flex-wrap:wrap;gap:12px; }
  label { display:flex;align-items:center;gap:6px; } select { height:28px;padding:0 8px;background:#101615;color:inherit;border:1px solid #ffffff24;border-radius:5px;font:inherit; }
  a { color:#a5d6c8;text-decoration:none; } a:hover { text-decoration:underline; }
  .device-stage { display:flex;justify-content:center;align-items:flex-start;min-width:max-content;padding:24px; }
  .phone-frame { box-sizing:content-box;flex:none;border:8px solid #080c0b;border-radius:24px;overflow:hidden;box-shadow:0 18px 60px #0006; }
  iframe { display:block;border:0;background:#080c0b; }
</style>
