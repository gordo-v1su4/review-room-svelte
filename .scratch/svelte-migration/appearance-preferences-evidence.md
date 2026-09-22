# Workspace field preferences — 2026-09-22

Restored original preference separation: card size, aspect, Fit/Fill and card-info visibility are shared display choices; field visibility/order are project-specific. The original Convex workspacePreferences contract keys fields by project and user. This local adapter keys by local project only, pending authenticated integration.

The previous single-workspace field choices migrate to Studio without being copied into each new project. Reads normalize unknown data. A session cache preserves choices when storage is denied or full, and callers receive independent arrays. Page project transitions load preferences synchronously; changing appearance does not replace the review session.

## Evidence

- Before implementation, a browser-created second project incorrectly inherited Studio's Rating/Status/Resolution fields and custom ordering.
- After implementation, Studio retained those three fields; a new project started with Status/Rating/Uploaded/Comments. Editing its fields to Status/Uploaded/Comments/Tags and changing order survived switching between both projects. Studio's fields remained unchanged.
- Fit changed in the second project appeared in Studio, proving display settings remain shared. Restored original Fill and Square/Small choices after QA.
- Reload preserved Studio's migrated field visibility/order. Project records and media themselves remain tab-local; no durable project persistence is claimed.
- Actual Downloads H.264 video retained its source and 0.041666-second playhead through Square → Portrait → Square changes; the unsent comment draft remained identical.
- At 390×844, the appearance popover fit x=12..292 with no page overflow (scroll width 390). Field reorder targets measured 44px; draft remained present. Device/touch overrides cleared.
- Independent public-interface review exercised migration across another project's first save/recreation, array isolation, malformed data and throwing storage. No material findings.
- Focused recognition/queue/appearance suites: 12 pass, 103 assertions. Direct svelte-check: zero errors/warnings.

## Remaining gates

Authenticated per-user server preferences and live authorization remain unverified. Already-open tabs do not synchronize preference changes. Full responsive, accessibility and release matrices remain open in the migration spec.
