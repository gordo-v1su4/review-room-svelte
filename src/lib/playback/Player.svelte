<script lang="ts">
  import { dev } from '$app/environment';
  import { Pause, Play, Volume2, VolumeX, Maximize, RotateCcw, StepBack, StepForward, Ellipsis } from 'lucide-svelte';
  import { DropdownMenu } from 'bits-ui';
  import { frameReadout, frameStepTarget, validFrameRate } from './time-display';
  import { createPlaybackSession } from './session';
  import { observeNativePlayback, type PlaybackMetrics } from './diagnostics';
  import type { PreviewInfo } from './accelerated/protocol';
  import { createScrubPreview } from './accelerated/preview';
  import { createGpuPreviewRenderer, type GpuPreviewRenderer } from './accelerated/gpu-renderer';
  let { src, name, loop = false, sourceBlob, mediaInfo, onready = (_: string) => {}, onended = (_: string) => {}, onfailure = (_: string) => {}, onViewed = () => {}, onmetadata = (_: PreviewInfo) => {}, ontime = (_: number) => {} }: { src: string; name: string; loop?: boolean; sourceBlob?: Blob; mediaInfo?: PreviewInfo; onready?: (source: string) => void; onended?: (source: string) => void; onfailure?: (source: string) => void; diagnostics?: boolean; onViewed?: () => void; onmetadata?: (info: PreviewInfo) => void; ontime?: (time: number) => void } = $props();
  let video: HTMLVideoElement;
  let surface: HTMLDivElement;
  let paused = $state(true), muted = $state(false), time = $state(0), duration = $state(0);
  let mediaWidth = $state(0), mediaHeight = $state(0), sourceInfo = $state<PreviewInfo>();
  const codecLabel = (codec: string) => codec.startsWith('avc') ? 'H.264' : /^(hvc|hev)/.test(codec) ? 'HEVC' : codec.startsWith('av01') ? 'AV1' : codec.startsWith('vp09') ? 'VP9' : codec;
  let showFrames = $state(false);
  const effectiveInfo = $derived(sourceInfo ?? mediaInfo);
  const fps = $derived(effectiveInfo?.estimatedFps);
  const hasFrameRate = $derived(validFrameRate(fps));
  const frameHint = $derived(hasFrameRate ? 'Step using the estimated source frame rate' : 'Frame stepping unavailable: source frame rate not detected');
  let error = $state(''), scrubbing = $state(false), ready = $state(false);
  let session: ReturnType<typeof createPlaybackSession> | undefined;
  let transportRequest = 0;
  let monitor: ReturnType<typeof observeNativePlayback> | undefined;
  let metrics = $state<PlaybackMetrics>();
  let previewVisible = $state(false), previewBackend = $state('Native only'), previewCodec = $state('Not checked');
  let previewDecodeMs = $state<number | null>(null), previewRequestMs = $state<number | null>(null);
  let previewTime = $state<number | null>(null);
  let requestPreview: ((time: number) => void) | undefined;
  let cancelPreview: (() => void) | undefined;
  function attachPreview(canvas: HTMLCanvasElement, blob: Blob | undefined) {
    function connect(source: Blob | undefined) {
      sourceInfo = undefined;
      previewVisible = false; previewBackend = 'Native only'; previewCodec = 'Not checked';
      previewDecodeMs = null; previewRequestMs = null; previewTime = null;
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
            previewVisible = true; previewDecodeMs = frame.decodeMs; previewRequestMs = frame.requestMs; previewTime = frame.time;
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
        transportRequest += 1;
        observer.dispose(); attached.dispose(); releasePointer();
        source = nextSource; mediaWidth = 0; mediaHeight = 0;
        ready = false; error = ''; time = 0; duration = 0; paused = true; muted = node.muted;
        attached = createPlaybackSession(node); session = attached;
        observer = observeNativePlayback(node, next => metrics = next); monitor = observer;
        ontime(0);
      },
      destroy() {
        transportRequest += 1;
        observer.dispose(); attached.dispose(); releasePointer();
        if (session === attached) session = undefined;
        if (monitor === observer) monitor = undefined;
      },
    };
  }
  /** Seek a review note without restarting playback or changing its paused state. */
  export function seek(seconds: number) {
    if (!ready || !session || scrubbing || !Number.isFinite(seconds) || duration <= 0) return false;
    const target = Math.max(0, Math.min(duration, seconds));
    monitor?.requestSeek(target);
    session.seek(target); time = video.currentTime; ontime(time);
    return true;
  }
  function matchesSource(expectedSource: string) {
    if (!video || src !== expectedSource) return false;
    try {
      const expectedUrl = new URL(expectedSource, video.ownerDocument.baseURI).href;
      return video.src === expectedUrl && video.currentSrc === expectedUrl;
    } catch { return false; }
  }
  /** Sequence playback starts only after the requested source has become ready. */
  export async function playFromStart(expectedSource: string): Promise<boolean> {
    const active = session;
    if (!active || !ready || video.readyState < 2 || duration <= 0 || !matchesSource(expectedSource)) return false;
    const request = ++transportRequest;
    if (scrubbing) { releasePointer(); active.cancelScrub(); }
    else cancelPreview?.();
    error = '';
    try {
      monitor?.requestSeek(0);
      active.seek(0); time = video.currentTime; ontime(time);
      await video.play();
      return request === transportRequest && active === session && matchesSource(expectedSource) && !video.paused;
    } catch {
      if (request === transportRequest && active === session && matchesSource(expectedSource)) {
        error = 'Playback could not start automatically. Tap Play to continue.';
      }
      return false;
    }
  }
  /** Stop sequence playback without losing position or leaving a scrub muted. */
  export function pause() {
    transportRequest += 1;
    if (scrubbing) { releasePointer(); session?.cancelScrub(); }
    else cancelPreview?.();
    video?.pause();
    paused = true;
  }
  function ended() {
    if (!scrubbing && ready && session && video.ended && matchesSource(src)) onended(video.currentSrc);
  }
  function stepFrame(direction: -1 | 1) {
    if (!ready || !session) return;
    const target = frameStepTarget(scrubbing ? time : video.currentTime, duration, fps, direction);
    if (target === null) return;
    // Cancel an active scrub without resuming or replacing the attachment-owned session.
    if (scrubbing) {
      releasePointer();
      session.cancelScrub();
    } else cancelPreview?.();
    video.pause();
    paused = true;
    monitor?.requestSeek(target);
    session.seek(target); time = video.currentTime; ontime(time);
  }
  async function toggle() {
    const active = session;
    const request = ++transportRequest;
    try { if (video.paused) await video.play(); else video.pause(); }
    catch { if (active === session && request === transportRequest) error = 'Playback could not start. Try again or choose another file.'; }
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
    const request = transportRequest;
    releasePointer();
    ontime(time);
    monitor?.requestSeek(time);
    try { await active?.endScrub(time); } catch { if (active === session && request === transportRequest) error = 'Tap Play to resume.'; }
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
<div class="player" bind:this={surface} data-playback={dev ? JSON.stringify({ native: metrics, preview: { backend: previewBackend, codec: previewCodec, decodeMs: previewDecodeMs, requestMs: previewRequestMs, time: previewTime, visible: previewVisible }, scrubbing }) : undefined}>
  <div class="picture">
    <!-- The persistent media element survives layout changes. -->
    <!-- svelte-ignore a11y_media_has_caption -->
    <video bind:this={video} use:attachMedia={src} {src} {loop} playsinline preload="metadata" aria-label={name}
      onloadstart={() => { ready = false; error = ''; time = 0; duration = 0; }}
      onloadedmetadata={() => { duration = Number.isFinite(video.duration) ? video.duration : 0; mediaWidth = video.videoWidth; mediaHeight = video.videoHeight; }}
      onloadeddata={() => { ready = true; onready(video.currentSrc); }}
      ontimeupdate={() => { if (!scrubbing) { time = video.currentTime; ontime(time); } }}
      onplay={() => { paused = false; error = ''; onViewed(); }} onpause={() => paused = true} onended={ended}
      onvolumechange={() => muted = video.muted}
      onerror={() => { error = 'This file could not be played. Try a browser-supported MP4 or WebM.'; onfailure(src); }}></video>
    {#key sourceBlob}<canvas class="preview-canvas" use:attachPreview={sourceBlob} aria-hidden="true" style:visibility={previewVisible ? 'visible' : 'hidden'}></canvas>{/key}
    {#if error}<div class="player-message" role="alert">{error}</div>{:else if !ready}<div class="player-message" role="status">Preparing playback…</div>{/if}
  </div>
  <div class="playback-controls">
    <div class="scrubber" role="slider" tabindex={ready ? 0 : -1} aria-label="Video timeline" aria-valuemin="0" aria-valuemax={duration || 1} aria-valuenow={time} aria-valuetext={stamp(time)} aria-disabled={!ready}
      onpointerdown={start} onpointermove={move} onpointerup={finish} onpointercancel={cancel} onlostpointercapture={cancel} onkeydown={keyboard}>
      <div class="track"><div class="played" style:width={`${duration ? time / duration * 100 : 0}%`}></div><span class="playhead" style:left={`${duration ? time / duration * 100 : 0}%`}></span></div>
    </div>
    <div class="transport">
      <button class="icon-button secondary-transport" aria-label="Previous frame" title={frameHint} disabled={!ready || !hasFrameRate} onclick={() => stepFrame(-1)}><StepBack size={15}/></button>
      <button class="icon-button play-button" aria-label={paused ? 'Play' : 'Pause'} onclick={toggle} disabled={!ready}>{#if paused}<Play size={18} fill="currentColor"/>{:else}<Pause size={18}/>{/if}</button>
      <button class="icon-button secondary-transport" aria-label="Next frame" title={frameHint} disabled={!ready || !hasFrameRate} onclick={() => stepFrame(1)}><StepForward size={15}/></button>
      <button class="icon-button secondary-transport" aria-label="Restart clip" onclick={() => seek(0)} disabled={!ready}><RotateCcw size={16}/></button>
      <button class="timecode" aria-label={showFrames && hasFrameRate ? 'Show elapsed time and duration' : 'Show frame numbers and estimated FPS'} aria-pressed={showFrames && hasFrameRate} title={hasFrameRate ? 'Toggle time / frames (estimated average FPS)' : 'Frame rate not detected'} disabled={!hasFrameRate} onclick={() => showFrames = !showFrames}>{#if showFrames && hasFrameRate}{frameReadout(time, duration, fps)}{:else}{stamp(time)} <span>/ {stamp(duration)}</span>{/if}</button>
      <span class="transport-spacer"></span>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger class="icon-button compact-transport" aria-label="More playback controls" title="More playback controls"><Ellipsis size={16}/></DropdownMenu.Trigger>
        <DropdownMenu.Portal><DropdownMenu.Content class="selection-menu" side="top" align="end" sideOffset={6} collisionPadding={12}>
          <DropdownMenu.Item disabled={!ready} onSelect={() => seek(0)}><RotateCcw size={15}/>Restart clip</DropdownMenu.Item>
          <DropdownMenu.Item disabled={!ready || !hasFrameRate} onSelect={() => stepFrame(-1)}><StepBack size={15}/>Previous frame</DropdownMenu.Item>
          <DropdownMenu.Item disabled={!ready || !hasFrameRate} onSelect={() => stepFrame(1)}><StepForward size={15}/>Next frame</DropdownMenu.Item>
        </DropdownMenu.Content></DropdownMenu.Portal>
      </DropdownMenu.Root>

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
    {#if effectiveInfo?.estimatedFps}<div><dt>Frame rate</dt><dd title={sourceInfo ? "Estimated average from the source’s first 120 packets" : "Frame rate supplied with this media"}>≈{Number(effectiveInfo.estimatedFps.toFixed(2))} fps</dd></div>{/if}
    {#if effectiveInfo?.codec}<div><dt>Codec</dt><dd title={effectiveInfo.codec}>{codecLabel(effectiveInfo.codec)}</dd></div>{/if}
  </dl>
</div>

<style>
  .player { container-name:player; container-type:inline-size; }
  .transport { flex-wrap:nowrap; gap:3px; }
  .transport :global(.compact-transport) { display:none; }
  .transport .icon-button { flex: 0 0 28px; min-width: 28px; width: 28px; min-height: 28px; height: 28px; padding: 0; border-radius: 4px; }
  .transport .play-button { flex-basis: 36px; width: 36px; min-width: 36px; background: var(--raised); color: var(--ink); }
  .transport .icon-button:disabled { opacity: .35; cursor: default; }
  .transport .timecode { flex:0 1 auto; min-width:0; max-width:174px; min-height:28px; margin:0; padding:0 4px; overflow:hidden; text-overflow:ellipsis; text-align:left; white-space:nowrap; border-radius:4px; color:var(--ink); background:transparent; font-size:10px; }
  .transport .timecode:hover:not(:disabled) { background: var(--raised); }
  .transport .timecode:disabled { opacity: 1; cursor: default; }
  .transport button:focus-visible { outline: 1px solid var(--accent); outline-offset: 2px; }
  @container player (max-width:480px) {
    .transport .secondary-transport { display:none; }
    .transport :global(.compact-transport) { display:inline-flex; align-items:center; justify-content:center; flex:0 0 28px; width:28px; height:28px; padding:0; }
  }
  @media (pointer: coarse) {
    .transport .icon-button { flex-basis: 44px; min-width: 44px; width: 44px; min-height: 44px; height: 44px; }
    .transport .play-button { flex-basis: 48px; width: 48px; }
    .transport .timecode { min-height: 44px; }
    .transport :global(.compact-transport) { flex-basis:44px; min-width:44px; width:44px; min-height:44px; height:44px; }
  }
</style>
