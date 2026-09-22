# Local MP4 scrub preview

`createScrubPreview(blob, callbacks)` owns one module worker and provides `request(seconds)`, `cancel()` and `dispose()`. `onFrame` transfers ownership of an `ImageBitmap`; consumers must close it. `onReady` only means the MP4 track/config was accepted, not that a decoded frame has been shown. `onFallback` leaves native playback available.

The worker uses Mediabunny 1.59.0 `Input`/`BlobSource`/`MP4` for lazy demux and `VideoSampleSink` for actual WebCodecs decoding. `VideoDecoder.isConfigSupported` checks the actual track configuration. One decode and one latest pending intent are allowed. Continuous drag coalesces pending intent without aborting the active decode: each completed frame can be shown even if it trails the pointer, then the latest pending target starts. Explicit cancel/source disposal invalidates results and closes stale frames. Mediabunny's own sink applies queue backpressure (source `media-sink.ts`, thresholds 40 encoded packets with no decoded sample, 8 when decoded samples exist). Preview frames are scaled to a maximum 1280-pixel edge, preserving rotation/flip with `VideoSample.draw`.

Parsed input is reused across completed requests. Cancelling an active decode disposes its input (including decoder/read cancellation); a subsequent request reopens it. The preview is approximate sample-and-hold during dragging; the native release seek remains authoritative. Scheduling and cancellation are tested; improvement over native seek latency is not proven.

`createGpuPreviewRenderer(canvas, onFallback, signal)` optionally submits the decoded bitmap through an actual texture/sampler WebGPU render pass. It consumes/closes input bitmaps, destroys textures/device on disposal, and calls fallback on device loss or render failure. An unsupported GPU returns null, allowing a 2D canvas. Once a canvas acquired a GPU context it cannot become 2D; device loss therefore returns to native video. A new source gets a fresh preview canvas while the native media element survives responsive changes.

The Player keeps native video/audio playback, muted native scrubbing and precise native release seeking. Measurements remain internal; the review surface shows no playback diagnostics. The overlay exists only while dragging. Decode and request-to-delivery timings are separate; neither is display presentation latency or proof of hardware decoding. WebCodecs can choose software decode.

Validation: scheduling/disposal/fallback tests and TypeScript/build checks. Actual decoded/rendered pixel correctness, browser fallback, rotation, source-switch behavior and latency still require browser evidence on named media/devices.

Primary references:
- https://mediabunny.dev/guide/media-sinks
- https://mediabunny.dev/api/Input
- https://mediabunny.dev/guide/reading-media-files
- https://developer.mozilla.org/en-US/docs/Web/API/GPUQueue/copyExternalImageToTexture

`onReady` provides codec, dimensions, duration and optional `estimatedFps` from `track.computePacketStats(120)`. This is the source prefix average frame rate, not display FPS or a guaranteed constant/whole-file rate; present it as approximate. Metadata failures leave FPS unavailable.
