# First local Svelte slice — 2026-09-22

Scope: ticket 02, local device review only. No live backend claim.

## Browser evidence

Codex in-app browser, localhost:5173, macOS. Source: a generated 12-second 1280×720 30fps H.264/AAC test MP4 (10.8MB), plus reference image 04.jpg. The MP4 is an ignored QA fixture in `.cache/qa/`.

- Imported both files through the visible file picker; video controls loaded a 12-second duration and still media appeared as an image.
- Video poster actually decoded to a loaded 640×360 image. Reference image loaded at 1200×1200.
- With a draft and playback running, changed viewport widths 360 → 768 → 1024 → 1440 → 390, height 844. Observed current times 5.928954, 5.948009, 5.970122, 5.985617, 6.006934 seconds. All had paused=false, identical draft text, and no page horizontal overflow. These short observations prove continuity during this resize sequence, not a sustained performance benchmark.
- Keyboard Home then ArrowRight sought to 1.00s. Clicking the already selected video retained 1.00s and the draft.
- Pointer drag on the 390px timeline released at 6.00s, paused=true, muted=false, preserving pre-drag pause/mute preferences. Muting during the drag is separately covered at the session test seam; no high-speed browser measurement claimed.
- Publishing the draft produced one note at 6.00s and emptied the composer. Approve, shortlist and four-star rating changed the visible local state correctly.
- Phone filter sheet displayed at the bottom, focused its close button, dismissed on Escape, and restored focus to Filters.

## Standards review

Independent reviewer found zero documented-standard breaches. Judgement findings: route orchestration will need separation before live integration; filter strings should gain a narrow type; player resets should stay centralized as source switching expands. The shared navigation snippet and MediaPort were noted as possible smells, but are intentional reuse and the approved adapter seam, not blockers. CSS is currently cohesive for this slice but should move to component scopes as the application expands.

## Specification review

Independent spec reviewer found no implementation blocker within ticket 02. The stale draft-only ticket status is corrected with this evidence. Accelerated playback, preview fallback, full workflow statuses and live integration remain tracked in the parity ledger.

## Limits

No proof yet of sustained latency/dropped-frame targets, unsupported-codec recovery across browsers, short-landscape QA, reduced-motion browser behavior, live permissions, cloud persistence, remote uploads, public links, or full feature parity. Local data is in memory and intentionally disappears on reload.
