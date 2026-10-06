<script lang="ts">
  import {
    HOVER_FRAME_EDGE, HOVER_FRAME_POSITIONS, hoverFrameCache, hoverPreviewCoordinator,
    type CanvasHoverFrame,
  } from '$lib/playback/hover-frame-cache';

  let { src, poster, sprite, type, name, availability = 'ready' }: {
    src: string; poster?: string; sprite?: string; type: 'video' | 'image'; name: string; availability?: 'queued' | 'running' | 'error' | 'ready';
  } = $props();

  let hovered = $state(false);
  let pointerPct = $state<number | null>(null);
  let preview = $state<HTMLVideoElement>();
  let display = $state<HTMLCanvasElement>();
  let canvasReady = $state(false);
  let frameReady = $state(false);
  let spriteImage = $state<HTMLImageElement>();
  let readySprite = $state('');
  let failedSprite = $state('');
  let failedPoster = $state('');
  let frames: ReturnType<typeof hoverFrameCache.retain> | undefined;
  let releaseActive: (() => void) | undefined;
  let loadedSource = '';
  let duration = 0;
  let desiredPosition: number | undefined;
  let seekingPosition: number | undefined;

  function bindSource() {
    const source = src;
    if (type !== 'video' || !source) return;
    frames = hoverFrameCache.retain(source);
    duration = 0;
    return () => {
      endPreview();
      frames?.release();
      frames = undefined;
    };
  }

  function updatePointer(event: PointerEvent) {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    pointerPct = Math.max(0, Math.min(1, (event.clientX - box.left) / Math.max(1, box.width)));
    desiredPosition = Math.round(pointerPct * (HOVER_FRAME_POSITIONS - 1));
  }

  function beginPreview(event: PointerEvent) {
    if (event.pointerType === 'touch' || event.pointerType === 'pen' || type !== 'video' || availability !== 'ready' || !src) return;
    releaseActive = hoverPreviewCoordinator.activate(endPreview);
    hovered = true;
    updatePointer(event);
    requestPreview();
  }

  function seekPreview(event: PointerEvent) {
    if (!hovered || type !== 'video') return;
    updatePointer(event);
    requestPreview();
  }

  function showFrame(frame: CanvasHoverFrame) {
    if (!display) return;
    if (display.width !== frame.width) display.width = frame.width;
    if (display.height !== frame.height) display.height = frame.height;
    const context = display.getContext('2d');
    if (!context) return;
    context.drawImage(frame.image, 0, 0);
    canvasReady = true;
  }

  function requestPreview() {
    if (!hovered || desiredPosition === undefined) return;
    if (sprite && failedSprite !== sprite) {
      if (readySprite !== sprite || !spriteImage || !display || !spriteImage.naturalWidth || !spriteImage.naturalHeight) return;
      const width = Math.round(spriteImage.naturalWidth / 10);
      const height = spriteImage.naturalHeight;
      const position = Math.min(9, Math.floor((pointerPct ?? 0) * 10));
      if (display.width !== width) display.width = width;
      if (display.height !== height) display.height = height;
      const context = display.getContext('2d');
      if (context) { context.drawImage(spriteImage, position * width, 0, width, height, 0, 0, width, height); canvasReady = true; }
      return;
    }
    if (!preview) return;
    const cached = frames?.get(desiredPosition);
    if (cached) {
      showFrame(cached);
      return;
    }
    if (loadedSource !== src) {
      loadedSource = src;
      preview.src = src;
      preview.load();
      return;
    }
    if (!frameReady || seekingPosition !== undefined || preview.seeking || duration <= 0) return;
    const target = desiredPosition / (HOVER_FRAME_POSITIONS - 1) * Math.max(0, duration - 0.001);
    seekingPosition = desiredPosition;
    if (Math.abs(preview.currentTime - target) < 0.005) {
      finishSeek();
      return;
    }
    try {
      preview.currentTime = target;
    } catch {
      seekingPosition = undefined;
    }
  }

  function finishSeek() {
    if (!hovered || !preview || preview.seeking || loadedSource !== src || seekingPosition === undefined) return;
    const position = seekingPosition;
    seekingPosition = undefined;
    if (preview.videoWidth && preview.videoHeight && preview.readyState >= 2) {
      const scale = Math.min(1, HOVER_FRAME_EDGE / Math.max(preview.videoWidth, preview.videoHeight));
      const image = document.createElement('canvas');
      image.width = Math.max(1, Math.round(preview.videoWidth * scale));
      image.height = Math.max(1, Math.round(preview.videoHeight * scale));
      const context = image.getContext('2d');
      if (context) {
        try {
          context.drawImage(preview, 0, 0, image.width, image.height);
          const frame: CanvasHoverFrame = {
            image, width: image.width, height: image.height,
            close() { image.width = 0; image.height = 0; },
          };
          // Finished uncached work remains useful during a sweep; a newer cache hit wins.
          const latest = desiredPosition === undefined ? undefined : frames?.get(desiredPosition);
          showFrame(latest ?? frame);
          frames?.set(position, frame);
        } catch {
          image.width = 0; image.height = 0;
        }
      }
    }
    // Do not queue intermediate pointer positions or repeatedly retry a failed capture.
    if (desiredPosition !== position) requestPreview();
  }

  function readyPreview() {
    if (!hovered || !preview || loadedSource !== src || preview.readyState < 2) return;
    duration = Number.isFinite(preview.duration) ? preview.duration : 0;
    frameReady = true;
    requestPreview();
  }

  function endPreview() {
    releaseActive?.();
    releaseActive = undefined;
    hovered = false;
    pointerPct = null;
    desiredPosition = undefined;
    seekingPosition = undefined;
    frameReady = false;
    canvasReady = false;
    if (preview && loadedSource) {
      preview.pause();
      preview.removeAttribute('src');
      preview.load();
    }
    loadedSource = '';
    if (display) { display.width = 0; display.height = 0; }
  }
</script>

<!-- The wrapper stays passive so a surrounding media-card button receives clicks. -->
<div
  class="media-thumbnail"
  role="presentation"
  data-preview-mode={sprite && failedSprite !== sprite ? "sprite" : "video"}
  {@attach bindSource}
  onpointerenter={beginPreview}
  onpointermove={seekPreview}
  onpointerleave={endPreview}
  onpointercancel={endPreview}
>
  {#if availability !== 'ready'}
    <div class="poster-placeholder" role="status" aria-label={`${name}: ${availability === 'error' ? 'Processing failed' : availability === 'running' ? 'Processing' : 'Queued'}`}>{availability === 'error' ? 'Processing failed' : availability === 'running' ? 'Processing…' : 'Queued'}</div>
  {:else if type === 'image'}
    {#if failedPoster !== (poster ?? src)}<img src={poster ?? src} alt="" loading="lazy" onerror={() => failedPoster = poster ?? src} />{:else}<div class="poster-placeholder">Preview unavailable</div>{/if}
  {:else}
    {#if poster && failedPoster !== poster}<img class="poster" class:hidden={hovered && (frameReady || canvasReady)} src={poster} alt="" loading="lazy" onerror={() => failedPoster = poster ?? ''} />{:else}<div class="poster-placeholder" class:hidden={hovered && (frameReady || canvasReady)}>{poster ? 'Preview unavailable' : 'Preview'}</div>{/if}
    {#if sprite}<img class="sprite-source" bind:this={spriteImage} src={sprite} alt="" loading="lazy" aria-hidden="true" onload={() => { readySprite = sprite ?? ''; requestPreview(); }} onerror={() => { failedSprite = sprite ?? ''; requestPreview(); }}/>{/if}
    <video
      bind:this={preview}
      class:visible={hovered && frameReady && !canvasReady}
      muted
      playsinline
      preload="none"
      aria-hidden="true" tabindex="-1"
      onloadeddata={readyPreview}
      onseeked={finishSeek}
      onerror={endPreview}
    ></video>
    <canvas width="0" height="0" bind:this={display} class:visible={hovered && canvasReady} aria-hidden="true"></canvas>
  {/if}
  {#if type === 'video' && hovered && pointerPct !== null}
    <span class="scrub-line" style:left={`${pointerPct * 100}%`}></span>
  {/if}
</div>

<style>
  .media-thumbnail { position: relative; width: 100%; height: 100%; min-height: 0; overflow: hidden; background: #080b0c; }
  .media-thumbnail img, .media-thumbnail video, .media-thumbnail canvas { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: var(--card-fit, cover); display: block; }
  .media-thumbnail img { opacity: 1; transition: opacity 110ms ease-out; }
  .poster-placeholder { position: absolute; inset: 0; display: grid; place-items: center; color: var(--muted); font-size: 10px; letter-spacing: .05em; }
  .poster-placeholder.hidden { opacity: 0; }
  .media-thumbnail img.hidden { opacity: 0; }
  .media-thumbnail video, .media-thumbnail canvas { opacity: 0; pointer-events: none; }
  .media-thumbnail video.visible, .media-thumbnail canvas.visible { opacity: 1; }
  .media-thumbnail .sprite-source { width:1px;height:1px;opacity:0;pointer-events:none; }
  .scrub-line { position: absolute; inset-block: 0; width: 2px; transform: translateX(-1px); background: #79d7c5; box-shadow: 0 0 9px #79d7c599; pointer-events: none; }
  @media (prefers-reduced-motion: reduce) { .media-thumbnail img { transition: none; } }
</style>
