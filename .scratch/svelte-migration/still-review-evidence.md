# Still review and viewed-state evidence — 2026-09-22

Status: local-session slice verified; live persistence and role gates remain open.

## Implemented

`web/src/lib/components/StillViewer.svelte` restores draw, arrow, rectangle and ellipse markup, colors and width, undo, clear, explicit session save, original-file download and fullscreen. Coordinates are normalized against the rendered image content rather than its letterbox. Markup and saved baselines belong to each asset through `review-session.ts`; switching assets or responsive panes preserves them. The toolbar gates writes/downloads explicitly, defaults to denied, cancels interrupted pointer capture, and reports validation/save failures.

`annotations.ts` validates the original backend contract: at most 120 strokes, 1500 points each, finite normalized coordinates, supported tools, six-digit hex colors, widths 2–18, unique IDs. Invalid/oversized input is rejected, not silently discarded. Domain tests cover immutable ownership, independent drafts/saved state, undo/clear/revert, bounds, malformed data and revoked access.

Still load and actual main-video playback mark an asset viewed; thumbnail hover and merely opening a paused video do not. Viewed remains separate from status, rating and shortlist and appears in review metadata. Original `convex/reviewPublic.ts` clientMarkViewed/clientSaveAnnotations permit token-scoped public review as well as the authenticated project paths; the local transition model preserves this distinction. Live token/project enforcement is not proven by local tests.

## Browser evidence

Existing IAB localhost:5173 tab, real user-provided local JPEGs `d60ec16e3107b64679ac9bcb06060f58.jpg` (1200×900) and `799f4ebe6ae29c6a7eb3b69945fcd07f.jpg` (1200×1200), plus `camera_rotating_around_rapper_in_music_video_a51538.mp4` (1360×752). All remain device-local Blob URLs.

- Rectangle, arrow, ellipse and freehand drags render SVG geometry. Save shows “Saved in this session.”
- Saved rectangle plus unsaved arrow survive switching to the second image and back; second image has zero marks. Undoing the arrow restores the saved baseline and disables Save.
- Clear removes marks; replacement drawing works. Three saved marks survive desktop→390px→desktop and fullscreen entry/exit.
- Desktop image and drawing surface both approximately 935.6×701.7; at 390px both exactly 356×267. Normalized rectangle geometry remains unchanged, document scroll width equals 390px.
- Original-download link targets the selected local Blob with the source filename; no external transfer and no live signed-download claim.
- Image review metadata displays Viewed Yes after image load. Video displays Viewed No after opening paused, switches to Yes after Play, remains Yes after Pause.
- Browser console inspection returned no errors in the exercised flow. Temporary device-metrics override cleared; no change made to Frame.io.

## Checks and limitations

`bun run check`: zero errors/warnings. `bun test`: 53 passed, 215 assertions. `bun run build`: passed. Read-only review found no remaining concrete issue after verifying the original public annotation/viewed handlers.

Local saves are lost on reload by design and clearly labelled. This does not establish server persistence, live role revocation, signed download permissions, upload/derivative processing, or production deployment. Broader folder/project parity and named-device playback latency measurements remain open.
