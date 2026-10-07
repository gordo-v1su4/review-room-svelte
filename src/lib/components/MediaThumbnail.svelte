<script lang="ts">
  let { src, poster, sprite, type, name, availability = 'ready' }: {
    src: string; poster?: string; sprite?: string; type: 'video' | 'image'; name: string; availability?: 'queued' | 'running' | 'error' | 'ready';
  } = $props();
  let hovered = $state(false);
  let pointerPct = $state<number | null>(null);
  let spriteImage = $state<HTMLImageElement>();
  let display = $state<HTMLCanvasElement>();
  let readySprite = $state('');
  let failedSprite = $state('');
  let failedPoster = $state('');
  let paintedSprite = $state('');
  const spriteReady = $derived(!!sprite && readySprite === sprite && failedSprite !== sprite);
  const visiblePreview = $derived(hovered && spriteReady && paintedSprite === sprite);

  function seekPreview(event: PointerEvent) {
    if (event.pointerType === 'touch' || event.pointerType === 'pen' || type !== 'video' || availability !== 'ready' || !sprite || failedSprite === sprite) return;
    hovered = true;
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    pointerPct = Math.max(0, Math.min(1, (event.clientX - box.left) / Math.max(1, box.width)));
    paintPreview();
  }
  function paintPreview() {
    if (!hovered || !spriteReady || !spriteImage || !display || !spriteImage.naturalWidth || !spriteImage.naturalHeight) return;
    const width = Math.round(spriteImage.naturalWidth / 10);
    const height = spriteImage.naturalHeight;
    const position = Math.min(9, Math.floor((pointerPct ?? 0) * 10));
    if (display.width !== width) display.width = width;
    if (display.height !== height) display.height = height;
    const context = display.getContext('2d');
    if (!context) return;
    context.drawImage(spriteImage, position * width, 0, width, height, 0, 0, width, height);
    paintedSprite = sprite ?? '';
  }
  function endPreview() { hovered = false; pointerPct = null; }
</script>

<!-- Prepared image strips are the only video-card scrub source. Originals load in the review player. -->
<div class="media-thumbnail" role="presentation" data-preview-mode={type === 'video' && sprite && failedSprite !== sprite ? 'sprite' : 'poster'} onpointerenter={seekPreview} onpointermove={seekPreview} onpointerleave={endPreview} onpointercancel={endPreview}>
  {#if availability !== 'ready'}
    <div class="poster-placeholder" role="status" aria-label={`${name}: ${availability === 'error' ? 'Processing failed' : availability === 'running' ? 'Processing' : 'Queued'}`}>{availability === 'error' ? 'Processing failed' : availability === 'running' ? 'Processing…' : 'Queued'}</div>
  {:else if type === 'image'}
    {#if failedPoster !== (poster ?? src)}<img src={poster ?? src} alt="" loading="lazy" onerror={() => failedPoster = poster ?? src}/>{:else}<div class="poster-placeholder">Preview unavailable</div>{/if}
  {:else}
    {#if poster && failedPoster !== poster}<img class="poster" class:hidden={visiblePreview} src={poster} alt="" loading="lazy" onerror={() => failedPoster = poster ?? ''}/>{:else}<div class="poster-placeholder" class:hidden={visiblePreview}>{poster ? 'Preview unavailable' : 'Preview'}</div>{/if}
    {#if sprite}<img class="sprite-source" bind:this={spriteImage} src={sprite} alt="" loading="lazy" aria-hidden="true" onload={() => { readySprite = sprite ?? ''; paintPreview(); }} onerror={() => { failedSprite = sprite ?? ''; endPreview(); }}/><canvas width="0" height="0" bind:this={display} class:visible={visiblePreview} aria-hidden="true"></canvas>{/if}
  {/if}
  {#if type === 'video' && visiblePreview && pointerPct !== null}<span class="scrub-line" style:left={`${pointerPct * 100}%`}></span>{/if}
</div>
<style>
  .media-thumbnail { position:relative;width:100%;height:100%;min-height:0;overflow:hidden;background:#080b0c; }
  .media-thumbnail img,.media-thumbnail canvas { position:absolute;inset:0;width:100%;height:100%;object-fit:var(--card-fit,cover);display:block; }
  .media-thumbnail img { opacity:1;transition:opacity 110ms ease-out; }
  .poster-placeholder { position:absolute;inset:0;display:grid;place-items:center;color:var(--muted);font-size:10px;letter-spacing:.05em; }
  .poster-placeholder.hidden,.media-thumbnail img.hidden { opacity:0; }
  .media-thumbnail canvas { opacity:0;pointer-events:none; }
  .media-thumbnail canvas.visible { opacity:1; }
  .media-thumbnail .sprite-source { width:1px;height:1px;opacity:0;pointer-events:none; }
  .scrub-line { position:absolute;inset-block:0;width:2px;transform:translateX(-1px);background:#79d7c5;box-shadow:0 0 9px #79d7c599;pointer-events:none; }
  @media(prefers-reduced-motion:reduce) { .media-thumbnail img { transition:none; } }
</style>
