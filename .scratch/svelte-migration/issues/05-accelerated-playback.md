# 05 — Validate and implement accelerated playback

Status: needs-triage
Type: task
Blocked by: 02

## Scope

Benchmark worker-based demux/decode and GPU presentation against native playback. Implement bounded resources, stale-seek cancellation, audio sync, disposal, device-loss recovery and native fallback behind a small playback interface.

## Acceptance

Record real-media first-frame/seek/drop measurements and active adapter in target browsers; resize preserves playback; unsupported codecs/devices remain usable.

## References

[Migration spec](../spec.md)

## Comments

Draft ticket; no implementation claimed.
