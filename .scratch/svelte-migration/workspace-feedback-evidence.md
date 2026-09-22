# Workspace and feedback increment — 2026-09-22

Scope: local workspace and feedback only. Full parity and live integration are still open.

## Implemented

- Reference-shaped folder artwork: front width/height 184/129, rounded rectangular rear wall, longer flat lip and sloped fold, translucent smoked front. Empty collections omit paper layers. Selected card is charcoal with a faint teal gradient.
- `review room.` wordmark, concise text hierarchy, compact 32px desktop / 34px mobile buttons.
- Typed workspace queries, media collection filters, source-order preservation, immutable review state.
- Time-linked notes, handled/reopen, four reaction types, and retained draft timestamps through asset navigation.
- Optional native playback diagnostics at `?diagnostics`, explicitly measuring media events rather than compositor presentation.

## Browser evidence

Codex in-app browser on macOS at localhost:5173. Local 12-second H.264/AAC testsrc fixture, 1280×720/30fps. Imported through file picker.

- Filled Videos and Images collections displayed paper sheets; zero-item Shortlist displayed an empty folder. Selecting Videos changed the collection to one matching video and showed the subtle selected card.
- Draft captured at 2.00s, switched to an image and returned to the video at 0.00s: draft still displayed 2.00s. Publishing retained 2.00s. Clicking its timecode moved the native player to 2.00s.
- Thumbs-up toggled to one reaction; Mark handled changed note state and button to Reopen.
- Diagnostics for the reloaded test source reported first loaded-frame readiness 2.5ms, last seek completion 14.6ms, dropped/total frames 0/68. This is one local cached-source observation, not a benchmark or cross-device target.

## Review and verification

Independent standards/spec reviews found two bugs: empty visible-ID restrictions returned all assets, and publication recaptured the draft timecode. Both fixed. Empty-set regression was observed failing then passing. Browser timestamp sequence above verifies the second fix.

21 unit tests passed after the empty-set fix; typecheck and production build passed before the final purely visual SVG refinements. Final visual/typecheck verification is recorded in the task output. WebCodecs/WebGPU and live backend gates are not satisfied by this evidence.
