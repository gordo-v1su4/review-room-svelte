# Isolated playback comparison and renderer lifetime

2026-09-22. Development build, macOS Codex in-app Chromium 153. Local authorized Downloads file `camera_rotating_around_rapper_in_music_video_a51538.mp4`: 4,918,570 bytes, 1360×752, H.264 `avc1.640020`, estimated 24fps, 8.666667s. No uploaded media or backend access.

## Method

`/dev/playback-benchmark` uses the production `createScrubPreview` and `createGpuPreviewRenderer` modules. Native seeking runs independently on a paused video; worker seeking leaves native time unchanged. Each pass repeats [.65, .35, .85, .50, .25, .75, .05, .55, .95] × four, as fractions of duration, for 36 seeks per adapter. A second comparison reverses adapter order. Worker resources are disposed after each pass; native stays paused. The route rejects production requests with 404.

Native measurements end at `seeked` with readyState≥2 and matching currentTime. Worker measurements end after bitmap copy and GPU queue submission. Neither measures compositor presentation; these endpoints differ. Worker setup is measured separately. Media/cache/OS state are uncontrolled, and repeated positions warm caches. This is 144 completed requests on one short clip, not sustained resource or broad media acceptance.

## Results (milliseconds)

| Run order | Adapter | Count | Median | p95 | Maximum |
|---|---|---:|---:|---:|---:|
| Native → worker | Native seeked | 36 | 34.25 | 89.10 | 145.50 |
| Native → worker | WebCodecs + WebGPU submission | 36 | 40.10 | 75.30 | 78.60 |
| Worker → native | WebCodecs + WebGPU submission | 36 | 41.95 | 69.90 | 91.50 |
| Worker → native | Native seeked | 36 | 24.65 | 48.70 | 48.80 |

Worker initialization: 97.30ms first run; 67.40ms reverse run. Actual rendered frames and codec metadata confirmed the worker/GPU path, rather than inferring it from API availability. Browser console had no warnings/errors. A third run was cancelled after four worker frames; it returned to an enabled Run control and cancelled state without hanging.

Native had the lower median in both runs. These data do not establish a universal speed advantage for either path, particularly at tail latency. Retain native primary playback and treat acceleration as optional preview support. Do not advertise GPU acceleration as faster based on this sample.

## Renderer correction and tests

A failing test exposed an initialization race: cancelling while `requestDevice()` was pending, followed by its rejection, still called fallback with a stale error. The catch path now disposes and returns null silently for an aborted signal.

Eight tests at the browser/GPU interface verify bitmap consumption on success/failure/disposal, texture replacement, device loss cleanup and exactly-once fallback, late device acquisition/rejection after cancellation, cancellation during pipeline compilation, initialization device loss followed by pipeline rejection, and silent/idempotent disposal. These use injected driver events and narrow fake resources; they do not prove recovery from a real hardware GPU reset.

## Remaining gates

Real device loss, resource budgets over long sessions, long/4K/variable-frame-rate sources, cross-browser and physical mobile devices, network startup and live integration remain open. Previous native fallback and responsive real-media evidence remains in [playback-measurements.md](playback-measurements.md).
