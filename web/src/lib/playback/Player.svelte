<script lang="ts">
  import { Pause, Play, Volume2, VolumeX, Maximize, RotateCcw } from 'lucide-svelte';
  import { createPlaybackSession } from './session';
  let { src, name, ontime = (_: number) => {} }: { src: string; name: string; ontime?: (time: number) => void } = $props();
  let video: HTMLVideoElement;
  let surface: HTMLDivElement;
  let paused = $state(true), muted = $state(false), time = $state(0), duration = $state(0);
  let error = $state(''), scrubbing = $state(false), ready = $state(false);
  let session: ReturnType<typeof createPlaybackSession> | undefined;
  let pointerId: number | undefined;
  let scrubber: HTMLElement | undefined;
  const stamp = (n: number) => `${Math.floor(n / 60).toString().padStart(2, '0')}:${Math.floor(n % 60).toString().padStart(2, '0')}`;
  function releasePointer() {
    const previous = pointerId;
    pointerId = undefined; scrubbing = false;
    if (previous !== undefined && scrubber?.hasPointerCapture(previous)) scrubber.releasePointerCapture(previous);
    scrubber = undefined;
  }
  function attachMedia(node: HTMLVideoElement, source: string) {
    let attached = createPlaybackSession(node);
    session = attached;
    return {
      update(nextSource: string) {
        if (nextSource === source) return;
        attached.dispose(); releasePointer();
        source = nextSource;
        ready = false; error = ''; time = 0; duration = 0; paused = true; muted = node.muted;
        attached = createPlaybackSession(node); session = attached;
        ontime(0);
      },
      destroy() {
        attached.dispose(); releasePointer();
        if (session === attached) session = undefined;
      },
    };
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
    time = target(event); session?.scrubTo(time); ontime(time);
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
    event.preventDefault(); session?.seek(next); time = video.currentTime; ontime(time);
  }
</script>
<div class="player" bind:this={surface}>
  <div class="picture">
    <!-- The persistent media element survives layout changes. -->
    <!-- svelte-ignore a11y_media_has_caption -->
    <video bind:this={video} use:attachMedia={src} {src} playsinline preload="metadata" aria-label={name}
      onloadstart={() => { ready = false; error = ''; time = 0; duration = 0; }}
      onloadedmetadata={() => { duration = Number.isFinite(video.duration) ? video.duration : 0; }}
      onloadeddata={() => ready = true}
      ontimeupdate={() => { if (!scrubbing) { time = video.currentTime; ontime(time); } }}
      onplay={() => paused = false} onpause={() => paused = true}
      onvolumechange={() => muted = video.muted}
      onerror={() => error = 'This file could not be played. Try a browser-supported MP4 or WebM.'}></video>
    {#if error}<div class="player-message" role="alert">{error}</div>{:else if !ready}<div class="player-message">Preparing playback…</div>{/if}
  </div>
  <div class="playback-controls">
    <div class="scrubber" role="slider" tabindex="0" aria-label="Video timeline" aria-valuemin="0" aria-valuemax={duration || 1} aria-valuenow={time} aria-valuetext={stamp(time)} aria-disabled={!ready}
      onpointerdown={start} onpointermove={move} onpointerup={finish} onpointercancel={cancel} onlostpointercapture={cancel} onkeydown={keyboard}>
      <div class="track"><div class="played" style:width={`${duration ? time / duration * 100 : 0}%`}></div><span class="playhead" style:left={`${duration ? time / duration * 100 : 0}%`}></span></div>
    </div>
    <div class="transport">
      <button class="icon-button play-button" aria-label={paused ? 'Play' : 'Pause'} onclick={toggle} disabled={!ready}>{#if paused}<Play size={18} fill="currentColor"/>{:else}<Pause size={18}/>{/if}</button>
      <button class="icon-button" aria-label="Restart clip" onclick={() => session?.seek(0)}><RotateCcw size={16}/></button>
      <span class="timecode">{stamp(time)} <span>/ {stamp(duration)}</span></span>
      <span class="transport-spacer"></span>
      <button class="icon-button" aria-label={muted ? 'Unmute' : 'Mute'} onclick={() => video.muted = !video.muted}>{#if muted}<VolumeX size={18}/>{:else}<Volume2 size={18}/>{/if}</button>
      <button class="icon-button" aria-label="Fullscreen" onclick={() => surface.requestFullscreen?.().catch(() => { error = 'Fullscreen is unavailable in this browser.'; })}><Maximize size={17}/></button>
    </div>
  </div>
</div>
