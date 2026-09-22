import { BlobSource, Input, MP4, VideoSampleSink } from 'mediabunny';
import { createLatestPreviewQueue } from './latest';
import type { PreviewRequest, PreviewResponse } from './protocol';

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<PreviewRequest>) => void) | null;
  postMessage(message: PreviewResponse, transfer?: Transferable[]): void;
};
let source: Blob | undefined;
let failed = false;
let cached: Awaited<ReturnType<typeof open>> | undefined;
const abortError = () => new DOMException('Seek superseded', 'AbortError');
function fallback(error: unknown) {
  if (failed) return;
  failed = true; queue.dispose(); cached?.close(); cached = undefined;
  scope.postMessage({ type: 'fallback', reason: error instanceof Error ? error.message : 'Preview decoding failed.' });
}
async function open() {
  if (!source) throw abortError();
  const input = new Input({ source: new BlobSource(source), formats: [MP4] });
  try {
    if (typeof VideoDecoder === 'undefined' || typeof OffscreenCanvas === 'undefined') throw new Error('Worker WebCodecs preview is unavailable.');
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error('No MP4 video track.');
    const config = await track.getDecoderConfig();
    if (!config || !(await VideoDecoder.isConfigSupported(config)).supported) throw new Error('This codec is unsupported by WebCodecs.');
    return { input, track, config, close() { input.dispose(); } };
  } catch (error) { input.dispose(); throw error; }
}
const queue = createLatestPreviewQueue({
  async decode(time: number, signal: AbortSignal) {
    const started = performance.now();
    const media = cached ?? await open();
    if (signal.aborted) { media.close(); if (cached === media) cached = undefined; throw abortError(); }
    cached = media;
    const cancel = () => { media.close(); if (cached === media) cached = undefined; };
    signal.addEventListener('abort', cancel, { once: true });
    try {
      // Mediabunny bounds encoded/decoded queues and closes its decoder on iterator completion.
      const sink = new VideoSampleSink(media.track);
      const first = await media.track.getFirstTimestamp();
      const sample = await sink.getSample(Math.max(first, time));
      if (!sample) throw new Error('No preview frame at this timestamp.');
      try {
        if (signal.aborted) throw abortError();
        const scale = Math.min(1, 1280 / Math.max(sample.displayWidth, sample.displayHeight));
        const canvas = new OffscreenCanvas(Math.max(1, Math.round(sample.displayWidth * scale)), Math.max(1, Math.round(sample.displayHeight * scale)));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Preview canvas unavailable.');
        sample.draw(context, 0, 0, canvas.width, canvas.height);
        const bitmap = canvas.transferToImageBitmap();
        canvas.width = 0; canvas.height = 0;
        return { bitmap, time: sample.timestamp, decodeMs: performance.now() - started, close() { bitmap.close(); } };
      } finally { sample.close(); }
    } finally { signal.removeEventListener('abort', cancel); }
  },
  deliver(id, frame) {
    scope.postMessage({ type: 'frame', id, bitmap: frame.bitmap, time: frame.time, decodeMs: frame.decodeMs }, [frame.bitmap]);
  },
  fail: fallback,
});

scope.onmessage = ({ data }) => {
  if (failed) return;
  if (data.type === 'init') {
    source = data.source;
    void (async () => {
      const media = await open();
      cached = media;
      try {
        const stats = await media.track.computePacketStats(120).catch(() => undefined);
        const estimatedFps = stats && Number.isFinite(stats.averagePacketRate) && stats.averagePacketRate > 0 ? stats.averagePacketRate : undefined;
        scope.postMessage({ type: 'ready', info: { codec: media.config.codec, estimatedFps, duration: await media.track.computeDuration(), width: await media.track.getDisplayWidth(), height: await media.track.getDisplayHeight() } });
      } catch (error) { media.close(); cached = undefined; throw error; }
    })().catch(fallback);
  } else if (data.type === 'seek') queue.request(data.id, data.time);
  else queue.cancel();
};
