# Phone navigation verification — 2026-11-24

Scope and accepted decisions: `init-docs/02-Design-Spec.md` section 15.
Review findings and fixes: `.scratch/mobile-navigation/review.md`.

## Automated checks

- `bun run check`: zero errors, eight existing warnings.
- `bun test`: 330 passed, zero failed, 1,811 assertions across 59 files.
- `bun run build`: passed with adapter-node output.
- `git diff --check`: passed.
- Svelte autofixer run on changed Svelte files; no new issues in the new table
  markup. Existing diagnostics about initial snapshot state, old href usage and
  an existing unkeyed showcase loop were retained in scope.
- `graft build`: refreshed the local ignored graph.

## Visible browser checks

Used the native in-app browser, local `/dev/series-folders`, with the requested
phone-size viewport and touch emulation. Its synthetic projects, folders, takes
and one sample reviewer note do not write production data.

| Viewport | Observed result |
|---|---|
| 320 × 640, touch | Header, vertical folders and filter group fit; document scroll width equals client width. Drawer Edit opens inset Project settings. |
| 430 × 768, touch | No sideways workspace scrolling; inset Tools and publishing, Section chooser, expandable table rows, dedicated review and Notes sections work. |
| 430 × 768, touch | Menu and Back to folder stay available; review title begins below sticky navigation. Unsaved note draft survives section changes. |
| 430 × 768, touch | Notifications → Inbox → sample note opens Notes, dismisses Tools, focuses Notes and resets vertical scroll; inspector heading top is 128px. |
| 430 × 768, touch | A fresh `sharing=1` address opens publishing. Upload section chooser switches the visible content correctly. |
| 641 × 900 | Existing intermediate toolbar/project controls and horizontal folder strip remain; no phone header or phone table rows mount. |
| 1280 × 900, mouse | Existing sidebar, topbar, project controls, library strip and table remain. Review close restores focus to the selected table asset. |

The independently approved drawer changes include shared footer simplification on
desktop. The subsequent workspace/panel refresh is limited to widths up to 640px.

## Limits

This verifies rendered UI and navigation using local dev data, not playback of
real stored media, successful uploads/publication, persistence or production
authorization. Synthetic media endpoints display the expected unavailable-access
state. No deployment or physical iPhone verification has occurred.
