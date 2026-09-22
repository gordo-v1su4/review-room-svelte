# Asset keyboard navigation — 2026-09-22

## Restored behavior

The inherited workspace and public-review routes used left/right arrows to step through the currently visible media order. The Svelte workspace had previous/next buttons but no keyboard handler. It now reuses the existing `stepInList` contract: no wrap; no selection starts at the first item moving right or the last moving left. Explicit navigation stops shortlist sequencing through the normal selection path and preserves per-asset drafts.

The handler ignores consumed/composing/modified events, editable fields, sliders, pane separators, tabs, menu/list/tree controls, annotation applications and dialogs. Portaled overlays and sidebar navigation own their keys. Previous/next buttons expose shortcut hints; the active media title has a polite live announcement.

## Browser evidence

Isolated IAB tab16 used real Downloads H.264 MP4 and folder-reference JPG. Before the change, pressing ArrowRight on the opened image card left the image selected. After the change:

- Grid: image → ArrowRight → video; ArrowLeft returns to image; back to video preserves `Draft remains with this clip.` and its 1.00s pin.
- Timeline ArrowRight seeks native video to1s without changing asset.
- Explorer/viewer separator ArrowLeft changes its percentage from33 to32 without navigating media.
- Comment editor End then ArrowLeft moves caret29→28 and preserves text/asset.
- Appearance overlay ArrowLeft leaves asset unchanged; Escape closes it and returns focus to Appearance.
- Table: ArrowLeft selects preceding image. Shift+ArrowRight leaves it unchanged. ArrowLeft at first item does not wrap. Close review then ArrowRight starts the first visible asset.
- `bunx svelte-check --tsconfig ./tsconfig.json`: 0 errors, 0 warnings. `git diff --check` passes.

This completes these keyboard scenarios only, not the full accessibility/browser matrix or live authorization gates. No build/sync, backend changes or deployment performed.
