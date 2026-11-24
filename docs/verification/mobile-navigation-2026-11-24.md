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

### User-requested browsing refinements

After the first walkthrough, the user requested uniform compact controls and
consistent folder colors/hover states. At 430px with touch emulation, Tools, Add,
media filters and folder links now measure 28px tall with 5px corners; their tap
areas extend vertically to 44px. Folder navigation and back were exercised again,
and the document has no horizontal overflow. Font declarations were retained.

The user separately requested a wider desktop sidebar and matching browsing
controls. At 1280px with mouse input, the sidebar measures 300px. Ordinary and
connected folder hover fills both compute to `rgba(27,32,34,.125)` with 5px corners;
the connected label remains blue (`rgb(143,185,242)`) while hovered. Folder links
are borderless and share Add media's compact height. These are explicit exceptions
to preserving the wider layout, recorded in Design Spec section 15.

Type checking still reports zero errors and eight existing warnings. The current
production build also passes. These refinements remain pending user UI approval.

The compact-control revision was additionally checked at a measured CSS viewport
of 320 × 640: document scroll width is 320px, with Tools, Add, filters and folder
links retaining 28px faces. The preview's 80% display scaling required compensating
device metrics; dimensions above come from the rendered document, not the device
preset label. The preview was restored to a measured 430px width afterward.

### Metadata dropdown follow-up

The user requested matching dark menus throughout Notes & info, all four asset
class labels, and image-model presets. All native AssetDetails selects now use the
shared select, with multiple selection for reference images. Source-family guards
remain: Video is visible but disabled for still images, and image classes are
disabled for video sources. Source files are not converted.

At a measured 430px phone viewport, the Model menu is vertically scrollable and
280px tall; long saved model labels wrap without internal horizontal overflow.
Verified Nano Banana Pro selection and Custom model input, then restored the
original blank model without saving. Verified all class labels and disabled item
attributes, multiple-selection semantics on Reference images, and Escape restoring
focus to its trigger. The fixture contains no reference-image options, so actual
multi-image selection and live persistence remain unverified.

`bun run check`: zero errors, eight existing warnings. `bun test`: 330 pass,
zero fail. Production build and diff whitespace checks pass. Focused Standards
review found no issues; both Spec findings were fixed and rechecked. UI approval
is pending; the native phone preview shows the new Model menu.

## Limits

This verifies rendered UI and navigation using local dev data, not playback of
real stored media, successful uploads/publication, persistence or production
authorization. Synthetic media endpoints display the expected unavailable-access
state. No deployment or physical iPhone verification has occurred.

PR #37's external Greptile review did not run: its service comment reported no
remaining organization review credits. This is not a review pass. See the review
record for the exact comment link; local code reviews and user UI acceptance are
tracked separately.
