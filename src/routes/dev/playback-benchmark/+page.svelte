<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { createScrubPreview } from '$lib/playback/accelerated/preview';
  import { createGpuPreviewRenderer, type GpuPreviewRenderer } from '$lib/playback/accelerated/gpu-renderer';
  import type { PreviewInfo } from '$lib/playback/accelerated/protocol';

  type Sample = { adapter: string; target: number; timestamp: number; elapsedMs: number; decodeMs?: number };
  let media: HTMLVideoElement;
  let canvas = $state<HTMLCanvasElement>()!;
  let file = $state<File>(), source = $state(''), ready = $state(false), running = $state(false);
  let workerFirst = $state(false), generation = $state(0), status = $state('Choose a local video.');
  let samples = $state.raw<Sample[]>([]);
  let report = $state('');
  let controller: AbortController | undefined;
  const fractions = [.65, .35, .85, .5, .25, .75, .05, .55, .95];
  const abortError = () => new DOMException('Benchmark cancelled', 'AbortError');
  function dispose() { controller?.abort(); if (source) URL.revokeObjectURL(source); }
  onDestroy(dispose);
  function choose(event: Event) {
    const selected = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!selected) return;
    dispose(); file = selected; ready = false; source = URL.createObjectURL(selected); samples = []; report = '';
    status = 'Loading local media…';
  }
  function nativeSeek(time: number, signal: AbortSignal): Promise<Sample> {
    return new Promise((resolve, reject) => {
      const started = performance.now();
      const cleanup = () => { clearTimeout(timeout); media.removeEventListener('seeked', done); signal.removeEventListener('abort', abort); };
      const abort = () => { cleanup(); reject(abortError()); };
      const done = () => {
        if (media.seeking || media.readyState < 2 || Math.abs(media.currentTime - time) > .05) return;
        cleanup(); resolve({ adapter: 'Native seeked', target: time, timestamp: media.currentTime, elapsedMs: performance.now() - started });
      };
      const timeout = setTimeout(() => { cleanup(); reject(new Error('Native seek timed out.')); }, 10000);
      media.addEventListener('seeked', done); signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort(); else media.currentTime = time;
    });
  }
  function record(sample: Sample) { samples = [...samples, sample]; status = `Measured ${samples.length} seeks.`; }
  async function workerPass(targets: number[], signal: AbortSignal) {
    const started = performance.now();
    const gpuController = new AbortController();
    let gpu: GpuPreviewRenderer | null = null, context: CanvasRenderingContext2D | null = null;
    let frameJob: { target: number; started: number; resolve: (sample: Sample) => void; reject: (error: Error) => void } | undefined;
    let resolveReady!: (info: PreviewInfo) => void, rejectReady!: (error: Error) => void;
    const loaded = new Promise<PreviewInfo>((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
    const failed = (reason: string) => { const error = new Error(reason); rejectReady(error); frameJob?.reject(error); };
    const preview = createScrubPreview(file!, {
      onReady: resolveReady,
      onFallback: failed,
      onFrame(frame) {
        const job = frameJob;
        if (!job || signal.aborted) { frame.bitmap.close(); return; }
        let shown = false;
        if (gpu) shown = gpu.render(frame.bitmap);
        else {
          try {
            if (context) { canvas.width = frame.bitmap.width; canvas.height = frame.bitmap.height; context.drawImage(frame.bitmap, 0, 0); shown = true; }
          } finally { frame.bitmap.close(); }
        }
        if (!shown) job.reject(new Error('Preview frame could not be rendered.'));
        else job.resolve({ adapter: gpu ? 'WebCodecs + WebGPU submission' : 'WebCodecs + Canvas 2D draw', target: job.target, timestamp: frame.time, elapsedMs: performance.now() - job.started, decodeMs: frame.decodeMs });
        frameJob = undefined;
      },
    });
    const abort = () => { gpuController.abort(); preview.dispose(); rejectReady(abortError()); frameJob?.reject(abortError()); };
    signal.addEventListener('abort', abort, { once: true });
    try {
      // Attach rejection handlers before either asynchronous setup operation can fail.
      const [info, renderer] = await Promise.all([loaded, createGpuPreviewRenderer(canvas, failed, gpuController.signal)]);
      gpu = renderer;
      if (signal.aborted) throw abortError();
      if (!gpu) context = canvas.getContext('2d');
      if (!gpu && !context) throw new Error('No preview renderer available.');
      const setupMs = performance.now() - started;
      for (const target of targets) {
        if (signal.aborted) throw abortError();
        const sample = await new Promise<Sample>((resolve, reject) => {
          frameJob = { target, started: performance.now(), resolve, reject }; preview.request(target);
        });
        record(sample);
      }
      return { info, setupMs };
    } finally { signal.removeEventListener('abort', abort); gpuController.abort(); preview.dispose(); gpu?.dispose(); frameJob = undefined; }
  }
  async function run() {
    if (!file || !ready || running) return;
    controller = new AbortController(); const signal = controller.signal;
    running = true; samples = []; report = ''; generation++; await tick();
    const targets = Array.from({ length: 4 }, () => fractions).flat().map(fraction => fraction * media.duration);
    const order = workerFirst ? ['worker', 'native'] : ['native', 'worker'];
    const details: Record<string, unknown> = { file: file.name, bytes: file.size, duration: media.duration, width: media.videoWidth, height: media.videoHeight, userAgent: navigator.userAgent, order, seeksPerAdapter: targets.length };
    try {
      media.pause();
      for (const adapter of order) {
        if (adapter === 'worker') details.worker = await workerPass(targets, signal);
        else for (const target of targets) { if (signal.aborted) throw abortError(); record(await nativeSeek(target, signal)); }
      }
      const summarize = (rows: Sample[]) => {
        const values = rows.map(row => row.elapsedMs).sort((a, b) => a - b);
        return { count: values.length, medianMs: (values[(values.length - 1) >> 1] + values[values.length >> 1]) / 2, p95Ms: values[Math.ceil(values.length * .95) - 1], maxMs: values.at(-1) };
      };
      details.results = Object.fromEntries([...new Set(samples.map(row => row.adapter))].map(adapter => [adapter, summarize(samples.filter(row => row.adapter === adapter))]));
      status = 'Comparison complete. Worker released; native video paused.';
    } catch (error) { status = signal.aborted ? 'Cancelled. Resources released.' : error instanceof Error ? error.message : 'Benchmark failed.'; }
    finally { running = false; report = JSON.stringify({ ...details, status, samples }, null, 2); }
  }
</script>

<svelte:head><title>Playback comparison — development only</title></svelte:head>
<main>
  <h1>Isolated playback comparison</h1>
  <p>Local media only. Native seeking and the production worker renderer run separately at the same 36 positions. Timings end at seeked or draw/submission, not compositor presentation. Repeat in reverse order to expose warm-cache bias.</p>
  <label>Local video <input type="file" accept="video/*" disabled={running} onchange={choose}/></label>
  <label><input type="checkbox" bind:checked={workerFirst} disabled={running}/> Worker first</label>
  <div class="actions"><button class="btn preset-tonal-primary" disabled={!ready || running} onclick={run}>Run comparison</button><button class="btn preset-tonal-surface" disabled={!running} onclick={() => controller?.abort()}>Cancel</button></div>
  <p role="status">{status}</p>
  <div class="pictures">
    <!-- svelte-ignore a11y_media_has_caption -->
    <video bind:this={media} src={source || undefined} muted playsinline preload="auto" aria-label="Native benchmark video" onloadeddata={() => { ready = Number.isFinite(media.duration) && media.duration > 0; status = ready ? 'Ready to compare.' : 'Invalid media duration.'; }} onerror={() => { ready = false; status = 'This browser cannot play the selected file.'; }}></video>
    {#key generation}<canvas bind:this={canvas} aria-label="Worker benchmark preview"></canvas>{/key}
  </div>
  {#if report}<pre aria-label="Benchmark results">{report}</pre>{/if}
</main>

<style>
  main { max-width: 1100px; margin: 30px auto; padding: 20px; color: var(--ink); }
  h1 { font-size: 22px; } p { max-width: 850px; color: var(--muted); line-height: 1.5; }
  label { display: block; margin: 14px 0; } input { margin-right: 6px; }
  .actions { display: flex; gap: 8px; } button { min-height: 32px; padding: 0 12px; border-radius: 5px; }
  .pictures { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  video,canvas { width: 100%; aspect-ratio: 16/9; object-fit: contain; background: var(--canvas); }
  pre { max-height: 450px; overflow: auto; font-size: 11px; padding: 12px; background: var(--panel); }
  @media (max-width: 600px) { .pictures { grid-template-columns: 1fr; } }
</style>
