<script lang="ts">
  import { Pause, Play, Volume2, VolumeX, Maximize, RotateCcw } from 'lucide-svelte';
  import { createPlaybackSession } from './session';
  import { observeNativePlayback, type PlaybackMetrics } from './diagnostics';
  import type { PreviewInfo } from './accelerated/protocol';
  import { createScrubPreview } from './accelerated/preview';
  import { createGpuPreviewRenderer, type GpuPreviewRenderer } from './accelerated/gpu-renderer';
  let { src, name, sourceBlob, onViewed = () => {}, onmetadata = (_: PreviewInfo) => {}, ontime = (_: number) => {} }: { src: string; name: string; sourceBlob?: Blob; diagnostics?: boolean; onViewed?: () => void; onmetadata?: (info: PreviewInfo) => void; ontime?: (time: number) => void } = $props();
  let video: HTMLVideoElement;
  let surface: HTMLDivElement;
  let paused = $state(true), muted = $state(false), time = $state(0), duration = $state(0);
  let mediaWidth = $state(0), mediaHeight = $state(0), sourceInfo = $state<PreviewInfo>();
  const codecLabel = (codec: string) => codec.startsWith('avc') ? 'H.264' : /^(hvc|hev)/.test(codec) ? 'HEVC' : codec.startsWith('av01') ? 'AV1' : codec.startsWith('vp09') ? 'VP9' : codec;
  let error = $state(''), scrubbing = $state(false), ready = $state(false);
  let session: ReturnType<typeof createPlaybackSession> | undefined;
  let monitor: ReturnType<typeof observeNativePlayback> | undefined;
  let metrics = $state<PlaybackMetrics>();
  let previewVisible = $state(false), previewBackend = $state('Native only'), previewCodec = $state('Not checked');
  let previewDecodeMs = $state<number | null>(null), previewRequestMs = $state<number | null>(null);
  let requestPreview: ((time: number) => void) | undefined;
  let cancelPreview: (() => void) | undefined;
  function attachPreview(canvas: HTMLCanvasElement, blob: Blob | undefined) {
    function connect(source: Blob | undefined) {
      sourceInfo = undefined;
      previewVisible = false; previewBackend = 'Native only'; previewCodec = 'Not checked';
      previewDecodeMs = null; previewRequestMs = null;
      if (!source) return () => {};
      let stopped = false, renderReady = false;
      let gpu: GpuPreviewRenderer | null = null;
      let context: CanvasRenderingContext2D | null = null;
      const controller = new AbortController();
      const fallback = (reason: string) => {
        if (stopped) return;
        previewVisible = false; previewBackend = `Native fallback: ${reason}`;
        stopped = true; controller.abort(); gpu?.dispose(); preview.dispose();
      };
      const preview = createScrubPreview(source, {
        onReady(info) { if (!stopped) { previewCodec = info.codec; sourceInfo = info; onmetadata(info); } },
        onFallback: fallback,
        onFrame(frame) {
          if (stopped || !scrubbing || !renderReady) { frame.bitmap.close(); return; }
          let shown = false;
          if (gpu) shown = gpu.render(frame.bitmap);
          else if (context) {
            try {
              canvas.width = frame.bitmap.width; canvas.height = frame.bitmap.height;
              context.drawImage(frame.bitmap, 0, 0); shown = true;
            } finally { frame.bitmap.close(); }
          } else frame.bitmap.close();
          if (shown && !stopped) {
            previewVisible = true; previewDecodeMs = frame.decodeMs; previewRequestMs = frame.requestMs;
            previewBackend = gpu ? 'WebCodecs worker + WebGPU' : 'WebCodecs worker + Canvas 2D';
          }
        },
      });
      void createGpuPreviewRenderer(canvas, fallback, controller.signal).then(renderer => {
        if (stopped) { renderer?.dispose(); return; }
        gpu = renderer;
        if (!gpu) context = canvas.getContext('2d');
        renderReady = !!gpu || !!context;
        if (!renderReady) fallback('Preview rendering unavailable.');
        else if (scrubbing) preview.request(time);
      }).catch(() => fallback('Preview rendering unavailable.'));
      // Keep the most recent completed preview while the next requested frame decodes.
      const request = (time: number) => { if (!stopped) preview.request(time); };
      const cancel = () => { previewVisible = false; preview.cancel(); };
      requestPreview = request; cancelPreview = cancel;
      return () => {
        stopped = true; controller.abort(); preview.dispose(); gpu?.dispose();
        if (requestPreview === request) requestPreview = undefined;
        if (cancelPreview === cancel) cancelPreview = undefined;
      };
    }
    let cleanup = connect(blob);
    return { update(next: Blob | undefined) { if (next !== blob) { cleanup(); blob = next; cleanup = connect(blob); } }, destroy() { cleanup(); } };
  }
  let pointerId: number | undefined;
  let scrubber: HTMLElement | undefined;
  const stamp = (n: number) => `${Math.floor(n / 60).toString().padStart(2, '0')}:${Math.floor(n % 60).toString().padStart(2, '0')}`;
  function releasePointer() {
    cancelPreview?.();
    const previous = pointerId;
    pointerId = undefined; scrubbing = false;
    if (previous !== undefined && scrubber?.hasPointerCapture(previous)) scrubber.releasePointerCapture(previous);
    scrubber = undefined;
  }
  function attachMedia(node: HTMLVideoElement, source: string) {
    let attached = createPlaybackSession(node);
    let observer = observeNativePlayback(node, next => metrics = next);
    monitor = observer;
    session = attached;
    return {
      update(nextSource: string) {
        if (nextSource === source) return;
        observer.dispose(); attached.dispose(); releasePointer();
        source = nextSource; mediaWidth = 0; mediaHeight = 0;
        ready = false; error = ''; time = 0; duration = 0; paused = true; muted = node.muted;
        attached = createPlaybackSession(node); session = attached;
        observer = observeNativePlayback(node, next => metrics = next); monitor = observer;
        ontime(0);
      },
      destroy() {
        observer.dispose(); attached.dispose(); releasePointer();
        if (session === attached) session = undefined;
        if (monitor === observer) monitor = undefined;
      },
    };
  }
  /** Seek a review note without restarting playback or changing its paused state. */
  export function seek(seconds: number) {
    if (!ready || !session || scrubbing || !Number.isFinite(seconds) || duration <= 0) return;
    const target = Math.max(0, Math.min(duration, seconds));
    monitor?.requestSeek(target);
    session.seek(target); time = video.currentTime; ontime(time);
  }
  async function toggle() {
    const active = session;
    try { if (video.paused) await video.play(); else video.pause(); }
    catch { if (active === session) error = 'Playback could not start. Try again or choose another file.'; }
  }
  function target(event: PointerEvent) {
    const bounds = event.currentTarget instanceof HTMLElement ? event.currentTarget.getBoundingClientRect() : { left: 0, width: 1 };
    return Math.max(0, Math.min(duration, (event.clientX - bounds.left) / bounds.width * duration));
  }
  function start(event: PointerEvent) {
    if (!ready || !duration || pointerId !== undefined || event.button !== 0 || !event.isPrimary) return;
    scrubber = event.currentTarget as HTMLElement;
    scrubber.setPointerCapture(event.pointerId); pointerId = event.pointerId;
    scrubbing = true; session?.beginScrub(); move(event);
  }
  function move(event: PointerEvent) {
    if (!scrubbing || event.pointerId !== pointerId) return;
    time = target(event); monitor?.requestSeek(time); session?.scrubTo(time); requestPreview?.(time); ontime(time);
  }
  async function finish(event: PointerEvent) {
    if (!scrubbing || event.pointerId !== pointerId) return;
    time = target(event);
    await settleScrub();
  }
  async function settleScrub() {
    const active = session;
    releasePointer();
    ontime(time);
    monitor?.requestSeek(time);
    try { await active?.endScrub(time); } catch { if (active === session) error = 'Tap Play to resume.'; }
  }
  function cancel(event: PointerEvent) {
    if (scrubbing && event.pointerId === pointerId) void settleScrub();
  }
  function keyboard(event: KeyboardEvent) {
    if (!ready || !duration || scrubbing) return;
    let next = time;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next -= event.shiftKey ? 5 : 1;
    else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next += event.shiftKey ? 5 : 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = duration;
    else return;
    event.preventDefault(); seek(next);
  }
</script>
<div class="player" bind:this={surface}>
  <div class="picture">
    <!-- The persistent media element survives layout changes. -->
    <!-- svelte-ignore a11y_media_has_caption -->
    <video bind:this={video} use:attachMedia={src} {src} playsinline preload="metadata" aria-label={name}
      onloadstart={() => { ready = false; error = ''; time = 0; duration = 0; }}
      onloadedmetadata={() => { duration = Number.isFinite(video.duration) ? video.duration : 0; mediaWidth = video.videoWidth; mediaHeight = video.videoHeight; }}
      onloadeddata={() => ready = true}
      ontimeupdate={() => { if (!scrubbing) { time = video.currentTime; ontime(time); } }}
      onplay={() => { paused = false; onViewed(); }} onpause={() => paused = true}
      onvolumechange={() => muted = video.muted}
      onerror={() => error = 'This file could not be played. Try a browser-supported MP4 or WebM.'}></video>
    {#key sourceBlob}<canvas class="preview-canvas" use:attachPreview={sourceBlob} aria-hidden="true" style:visibility={previewVisible ? 'visible' : 'hidden'}></canvas>{/key}
    {#if error}<div class="player-message" role="alert">{error}</div>{:else if !ready}<div class="player-message">Preparing playback…</div>{/if}
  </div>
  <div class="playback-controls">
    <div class="scrubber" role="slider" tabindex="0" aria-label="Video timeline" aria-valuemin="0" aria-valuemax={duration || 1} aria-valuenow={time} aria-valuetext={stamp(time)} aria-disabled={!ready}
      onpointerdown={start} onpointermove={move} onpointerup={finish} onpointercancel={cancel} onlostpointercapture={cancel} onkeydown={keyboard}>
      <div class="track"><div class="played" style:width={`${duration ? time / duration * 100 : 0}%`}></div><span class="playhead" style:left={`${duration ? time / duration * 100 : 0}%`}></span></div>
    </div>
    <div class="transport">
      <button class="icon-button play-button" aria-label={paused ? 'Play' : 'Pause'} onclick={toggle} disabled={!ready}>{#if paused}<Play size={18} fill="currentColor"/>{:else}<Pause size={18}/>{/if}</button>
      <button class="icon-button" aria-label="Restart clip" onclick={() => seek(0)} disabled={!ready}><RotateCcw size={16}/></button>
      <span class="timecode">{stamp(time)} <span>/ {stamp(duration)}</span></span>
      <span class="transport-spacer"></span>
      <button class="icon-button" aria-label={muted ? 'Unmute' : 'Mute'} onclick={() => video.muted = !video.muted}>{#if muted}<VolumeX size={18}/>{:else}<Volume2 size={18}/>{/if}</button>
      <button class="icon-button" aria-label="Fullscreen" onclick={() => surface.requestFullscreen?.().catch(() => { error = 'Fullscreen is unavailable in this browser.'; })}><Maximize size={17}/></button>
    </div>
  </div>
  <dl class="media-properties" aria-label="Media properties">
    {#if mediaWidth && mediaHeight}
      <div><dt>Resolution</dt><dd>{mediaWidth}×{mediaHeight}</dd></div>
      <div><dt>Aspect ratio</dt><dd>{(mediaWidth / mediaHeight).toFixed(2)}:1</dd></div>
    {/if}
    {#if duration}<div><dt>Duration</dt><dd>{stamp(duration)}</dd></div>{/if}
    {#if sourceInfo?.estimatedFps}<div><dt>Frame rate</dt><dd title="Estimated average from the source's first 120 packets">≈{Number(sourceInfo.estimatedFps.toFixed(2))} fps</dd></div>{/if}
    {#if sourceInfo?.codec}<div><dt>Codec</dt><dd title={sourceInfo.codec}>{codecLabel(sourceInfo.codec)}</dd></div>{/if}
  </dl>
</div>
