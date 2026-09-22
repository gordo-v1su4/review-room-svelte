# Real-media playback measurements

2026-09-22. Local macOS Codex in-app browser, Vite development server, local File/Blob URLs. This is one machine and small media sample, not a network/live-production or cross-browser benchmark.

Developer-only DOM telemetry now exposes the existing native observer and actual preview backend/frame timestamp. No latency/debug UI was reintroduced. The attribute is omitted outside development.

## H.264 MP4

Real Downloads `camera_rotating_around_rapper_in_music_video_a51538.mp4`, 1360×752, 24 estimated FPS, 8.666667s. Main/audio playback remained native. Actual scrub frames were rendered through WebCodecs worker + WebGPU (not inferred from API availability).

First loaded-frame event: 2.2ms in the recorded warm local run. This is loadstart→loadeddata, not compositor presentation, import time or network startup. An earlier independent first scrub observed 48.4ms native seek / 61ms worker request.

Nine alternating positions during one continuous scrub:

| Fraction | Native seeked ms | Worker request ms | Worker decode ms | Preview timestamp s |
|---|---:|---:|---:|---:|
| .65 | 76.0 | 76.1 | 75.6 | 5.625 |
| .35 | 41.8 | 40.9 | 40.6 | 3.000 |
| .85 | 7.1 | 6.0 | 4.9 | 7.333 |
| .50 | 57.0 | 54.3 | 54.2 | 4.333 |
| .25 | 30.1 | 30.1 | 30.0 | 2.167 |
| .75 | 79.4 | 79.5 | 79.2 | 6.500 |
| .05 | 11.0 | 10.3 | 10.2 | .417 |
| .55 | 61.8 | 60.7 | 60.5 | 4.750 |
| .95 | 18.3 | 18.5 | 18.2 | 8.208 |

Median native seek event 41.8ms; worker request-to-frame 40.9ms. These are concurrent paths, not an isolated native-only A/B, and GPU queue submission is not measured display presentation. No meaningful speed advantage is established. Keep native as the primary playback path; do not claim WebGPU reduces latency from these numbers.

Release settled at 8.233333s with preview hidden and native seek completion 2.9ms. Restart then uninterrupted playback reached the actual 8.666667s end with zero reported dropped frames; total decoded-frame count increased by 208 from the pre-restart snapshot. Seek frames are included in the browser's lifetime total, so that total is not presented as playback FPS.

## Native fallback

Created a temporary 3s, 640px VP9 WebM derivative of the same authorized real source with ffmpeg; original unchanged. The MP4-only preview adapter correctly reported unsupported input and kept native playback. Native reached 3s/end, 72 frames and zero drops. This verifies unsupported-container recovery, not device loss or every unsupported codec. Derivative is outside Git under `/tmp/review-room-playback.u0euIb/fallback.webm`.

## Resize during playback

At widths 1440, 1024, 768, 390, 360 and short landscape 844×390, the same source kept playing. Sampled time advanced .438→.534→.635→.736→.786→.914 seconds without pausing; document width matched the viewport at every sample. No reload/remount inference relies on screenshots alone. Active draft preservation is separately recorded in folder-drag evidence.

## Remaining gates

Cross-browser/real mobile hardware, representative long/4K/variable-frame-rate media, network startup, isolated backend comparisons, sustained rapid-input and memory budgets, device-loss recovery and live release acceptance remain open. No shippable or universal low-latency claim follows from this sample.
