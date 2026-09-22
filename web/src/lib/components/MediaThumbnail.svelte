<script lang="ts">
  import { onDestroy } from 'svelte';
  let {
    src,
    poster,
    type,
    name,
  }: { src: string; poster?: string; type: 'video' | 'image'; name: string } = $props();

  let hovered = $state(false);
  let pointerPct = $state<number | null>(null);
  let preview = $state<HTMLVideoElement>();
  let pendingTime: number | undefined;
  let seeking = false;
  let frameReady = $state(false);
  let loadedSource = '';

  function beginPreview(event: PointerEvent) {
    if (event.pointerType === 'touch' || event.pointerType === 'pen') return;
    if (type !== 'video' || !preview) return;
    hovered = true;
    frameReady = false;
    if (loadedSource !== src) {
      preview.src = src;
      loadedSource = src;
      preview.load();
    }
  }

  function seekPreview(event: PointerEvent) {
    if (type !== 'video' || !hovered || !preview) return;
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    pointerPct = Math.max(0, Math.min(1, (event.clientX - box.left) / Math.max(1, box.width)));
    if (!Number.isFinite(preview.duration) || preview.duration <= 0) return;
    pendingTime = pointerPct * preview.duration;
    flushSeek();
  }

  function flushSeek() {
    if (!preview || seeking || pendingTime === undefined || !frameReady) return;
    if (Math.abs(preview.currentTime - pendingTime) < 0.01) {
      pendingTime = undefined;
      seeking = false;
      return;
    }
    seeking = true;
    preview.currentTime = pendingTime;
    pendingTime = undefined;
  }

  function finishSeek() {
    seeking = false;
    flushSeek();
  }

  function endPreview() {
    if (type !== 'video' || !preview) return;
    hovered = false;
    pointerPct = null;
    pendingTime = undefined;
    seeking = false;
    preview.pause();
    preview.removeAttribute('src');
    preview.load();
    loadedSource = '';
    frameReady = false;
  }

  function seekPreviewFromPointer() {
    if (!preview || pointerPct === null || !Number.isFinite(preview.duration) || preview.duration <= 0) return;
    pendingTime = pointerPct * preview.duration;
    flushSeek();
  }

  $effect(() => {
    const currentSource = src;
    if (type !== 'video' || !preview || !loadedSource || loadedSource === currentSource) return;
    preview.pause();
    preview.removeAttribute('src');
    preview.load();
    loadedSource = '';
    frameReady = false;
    pendingTime = undefined;
    seeking = false;
  });

  onDestroy(() => {
    if (type !== 'video' || !preview) return;
    preview.pause();
    preview.removeAttribute('src');
    preview.load();
  });
</script>

<!-- The wrapper stays passive so a surrounding media-card button receives clicks. -->
<div
  class="media-thumbnail"
  role="presentation"
  onpointerenter={beginPreview}
  onpointermove={seekPreview}
  onpointerleave={endPreview}
>
  {#if type === 'image'}
    <img src={poster ?? src} alt="" loading="lazy" />
  {:else}
    {#if poster}<img class="poster" class:hidden={hovered && frameReady} src={poster} alt="" loading="lazy" />{:else}<div class="poster-placeholder" class:hidden={hovered && frameReady}>Preview</div>{/if}
    <!-- svelte-ignore a11y_media_has_caption -->
    <video
      bind:this={preview}
      class:visible={hovered && frameReady}
      muted
      playsinline
      preload="none"
      aria-hidden="true" tabindex="-1"
      onloadeddata={() => { frameReady = true; seekPreviewFromPointer(); }}
      onseeked={finishSeek}
    ></video>
  {/if}
  {#if type === 'video' && hovered && pointerPct !== null}
    <span class="scrub-line" style:left={`${pointerPct * 100}%`}></span>
  {/if}
</div>

<style>
  .media-thumbnail { position: relative; width: 100%; height: 100%; min-height: 0; overflow: hidden; background: #171b1b; }
  .media-thumbnail img, .media-thumbnail video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: var(--card-fit, cover); display: block; }
  .media-thumbnail img { opacity: 1; transition: opacity 110ms ease-out; }
  .poster-placeholder { position: absolute; inset: 0; display: grid; place-items: center; color: #6f7c78; font-size: 10px; letter-spacing: .05em; }
  .poster-placeholder.hidden { opacity: 0; }
  .media-thumbnail img.hidden { opacity: 0; }
  .media-thumbnail video { opacity: 0; pointer-events: none; }
  .media-thumbnail video.visible { opacity: 1; }
  .scrub-line { position: absolute; inset-block: 0; width: 2px; transform: translateX(-1px); background: #79d7c5; box-shadow: 0 0 9px #79d7c599; pointer-events: none; }
  @media (prefers-reduced-motion: reduce) { .media-thumbnail img { transition: none; } }
</style>
