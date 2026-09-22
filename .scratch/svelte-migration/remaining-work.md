# Remaining work — 2026-09-22

This is a navigation list, not a replacement for the migration specification or acceptance ledger. The goal remains active; local fixture evidence does not prove live integration.

- [ ] Complete frontend parity: public-review/share screens; full original-vs-Svelte capability audit, including notification and account/project access flows.
- [ ] Complete UI polish: compact controls, alignment, responsive pane/drawer behavior, metadata/card/folder consistency; verify desktop and mobile with real media.
- [ ] Complete playback acceptance: hover scrubbing, frame stepping, sequential playback, native/WebCodecs/WebGPU fallbacks; measure latency and drops across the supported browser matrix.
- [ ] Complete accessibility acceptance: keyboard-only review, dialogs/focus return, contrast, reduced motion and touch targets.
- [ ] Resume backend work when authorized: live sign-in, role enforcement, durable persistence, uploads/downloads and notifications. Resolve the concrete [public-review authorization findings](public-review-access-audit.md) before exposing shared review.
- [ ] Release: full live end-to-end flows, deployment configuration and verified deployment; retire Next.js only after parity and live acceptance pass. Never push to Buzero.

Completed this slice: [shortlist sequence playback](shortlist-preview-evidence.md).

Source tickets: [03](issues/03-workspace-parity.md), [04](issues/04-review-feedback-sharing.md), [07](issues/07-integration-cutover.md). Ticket filenames and spec remain authoritative where this index is less detailed.
