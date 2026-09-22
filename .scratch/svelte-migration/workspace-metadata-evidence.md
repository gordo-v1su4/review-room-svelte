# Workspace and metadata evidence — 2026-09-22

Device-local Svelte workspace only. No backend persistence/auth/permission claims.

## Implemented

- Composable status/class/tag/rating/shortlist/comment facets and sort/group controls. Cancelled filter changes leave applied results/badge unchanged.
- Configurable card field visibility and order, show/hide information, migration of older appearance preferences. Aspect/fit/size retained.
- Independent checkbox, modifier/range and select-all-visible selection; batch review and tag add/remove confined to visible selected assets.
- Separate Notes and Fields tabs, mounted in place. Grouped/searchable metadata with empty/filled filtering; technical properties, normalized reusable tags, creative notes/prompt/model/release fields, and custom text/number/boolean/date fields.
- Custom-field creation drafts keyed by asset after review identified a possible cross-asset draft leak.

## Browser acceptance

In-app browser, localhost:5173. Real Downloads clips: camera_rotating_around_rapper_in_music_video_a51538.mp4 (1360×752, 8.67s) and hf_20260920_013441_ddaf9c5a-0f4f-4d19-9728-e1ad6b8a251f.mp4 (854×480, 18s).

- Selected both, narrowed search to camera, batch approved/shortlisted: only the visible camera clip changed. Clearing search left other clip awaiting review.
- Combined Approved + Shortlist returned one result. Cancelled filter edits preserved results and badge. Grouped-card previous/next followed displayed group order.
- Hiding card info removed it; field toggles/order showed status and original source resolution.
- Bulk-added Night, Teal, night to both: one Night and one Teal chip on each. Removed Teal from camera only: other clip retained it. Tag facet TEAL matched the remaining clip regardless of capitalization.
- Camera production note and custom numeric Shot number=12 persisted across asset switches; other clip did not inherit them. Creative+Filled showed those two fields and excluded empty fields.
- Started custom Director approval / Yes-No field draft on camera, switched away: no draft on other clip. Returned: name/type/open draft restored.
- Comment draft “Keep the darker grade.” survived Fields/Notes and asset switches.
- Resolution, duration, codec and ≈24fps appeared from real source metadata; FPS explicitly estimated.
- At 390×844 CSS viewport, document scroll width=390, Fields width=358 within viewport, no horizontal page overflow. Viewport override cleared.

## Validation and limits

Before hover-cache increment: typecheck zero errors/warnings, 43 tests and154 assertions pass, production build passes. Component autofixer clean except intentional page selection-reconciliation effect / imperative player binding suggestions.

Metadata and review edits remain unsaved device-local session state. Custom metadata has no live schema/adapters yet. Original real folders, persisted workspace preferences, public review, uploads/downloads, annotations, inbox and remaining parity gates stay open.

## Dense hover preview follow-up

96 quantized positions are filled lazily into a shared 24 MB pixel-budget LRU, with maximum 320px capture edge. One active hover decoder; inactive cards hold cached frames only. No eager full-clip generation at import.

Real-media browser checks after build: camera hover at about10% sought0.821s and captured a320px frame; moving to80% sought6.933s with a different visible frame. Leaving and re-entering the earlier position displayed the cached320px canvas with the thumbnail video source absent. Moving to the other clip released the first decoder; leaving all cards left zero loaded thumbnail videos. Portrait9:16+Fit produced a220×391 card, contain scaling, and a cached preview with no decoder loaded. Restored16:9+Fill afterward.

Four cache/coordination tests (17 assertions) cover eviction, ownership/release, replacement/oversize rejection, and active-decoder handoff. Final full suite47 tests/171 assertions, typecheck0errors0warnings, productionbuildpass. Read-only reviewer found no concrete cache lifecycle or latest-pointer defect. Numeric first-visit and warmed-cache latency benchmarks remain an open performance gate; no zero-latency claim.
