# 05 — Validate and implement accelerated playback

Status: ready-for-agent
Type: task
Blocked by: 02

## Scope

Benchmark worker-based demux/decode and GPU presentation against native playback. Implement bounded resources, stale-seek cancellation, audio sync, disposal, device-loss recovery and native fallback behind a small playback interface.

## Acceptance

Record real-media first-frame/seek/drop measurements and active adapter in target browsers; resize preserves playback; unsupported codecs/devices remain usable.

## References

[Migration spec](../spec.md)

## Comments

Worker/WebCodecs and WebGPU scrub preview are implemented with native primary playback/fallback. Actual local H.264 rendering, concurrent seek measurements, VP9 WebM native fallback and state-preserving responsive playback are recorded in [playback-measurements.md](../playback-measurements.md). This ticket remains open for the broader browser/media/device matrix, isolated comparisons, device-loss and sustained resource acceptance; no universal acceleration benefit is claimed.

An isolated, reverse-order comparison now covers 144 real-media seeks: [isolated-playback-evidence.md](../isolated-playback-evidence.md). Native had a lower median on this short H.264 clip. Eight renderer lifecycle tests exposed and fixed a stale fallback after cancelled initialization. Real hardware loss, long sessions and the broader media/device matrix remain open.
