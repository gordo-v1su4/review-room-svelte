# Shared-review viewer — local acceptance, 2026-09-22

## Implemented

The authorized-ready branch of `/review/[token]` now uses the reusable Svelte shared viewer: media explorer/appearance, native player and frame controls, still markup, ratings, restricted workflow statuses, shortlist sequence, time-linked comments, and read-only desktop/mobile metadata. Shared reviewers have no folder/production tools, card selection controls, metadata editors, comment reactions, or handling controls.

The gateway-backed session applies writes only after confirmation. Per-asset drafts remain immediate; late comment/annotation responses preserve newer drafts. Duplicate writes are suppressed. A viewed event received during another asset write queues once, retains any prior save error, and aborts on disposal. Still save failures remain visibly unsaved and retryable. Drawing controls remain mounted during save; keyed image viewers keep a pending save from locking another image. Closing review returns keyboard focus to its card (or search if filtered out).

`ReviewAsset` describes presentable media without requiring downloaded File bytes; local imports retain `LocalAsset` with a real File. The player can accept supplied source FPS/codec metadata for URL-only playback. This metadata path is typechecked but has not yet received separate remote-source browser acceptance.

## Evidence

- `bun test`: 120 pass, 0 fail, 597 assertions across 23 files. Shared controller: 15 tests, 84 assertions, including delayed confirmation, newer drafts, denied actions, disposal, wrong-asset responses, failed annotation retry, and queued viewed writes.
- `bunx svelte-check --tsconfig ./tsconfig.json`: zero errors/warnings.
- `bun run build`: production build succeeds. Adapter-auto still requires the actual deployment target to be configured.
- IAB local development fixture `/dev/shared-review`, real Downloads H.264 file `camera_rotating_around_rapper_in_music_video_a51538.mp4` (1360×752, about 24 fps, 8.67 s) and the two supplied folder reference JPEGs.
- Held approval while video started: first release confirmed Approved and a second pending viewed write; second release showed Viewed = Yes in read-only Fields.
- Card status menu exposed Awaiting review, In progress, Needs changes and Approved. Choosing In progress updated card and inspector.
- Failed comment save retained `Keep this take`; retry submitted it while newer typing `A second unsent thought` remained. Confirmed note showed reviewer identity and seek button, without team-only reaction/handling controls.
- Failed markup save retained strokes and Unsaved markup; successful retry showed saved mark. After the toolbar fix, failed save retained focus on the enabled Save button.
- Held image A markup save, navigated to image B and drew successfully while A remained pending. Released writes and saved B; returning to A showed its own saved mark.
- At 390×844 CSS pixels with touch emulation, document width equaled viewport width (390), video remained unpaused with advancing time, and comment draft persisted. Metadata sheet was read-only; close returned focus to its 44px-high trigger. Mobile screenshot scaling in the tool was unreliable, so these findings use DOM geometry/state rather than a visual-fidelity claim.
- Shortlisted video and image, rated image four stars, ran sequence: video played, advanced to image, and ended automatically. Both independent drafts survived asset changes.
- Close review returned to explorer-only layout and focused the original media card.
- Download disabled: no download control. Download enabled: control dispatched the injected fixture callback. This is NOT proof of a real authorized download or presigned URL.
- Browser console: no warning/error entries during these scenarios.
- Production preview on temporary port 5192: `/dev/shared-review` and `/dev/review-access` returned HTTP 404. `/review/qa-unconfigured` rendered temporarily unavailable, without project data. Response included private/no-store, no-referrer and noindex/nofollow headers.

## Open release gates

The actual access and write gateways remain unconfigured and fail closed. No backend repair or deployment occurred. Resolve the public-review authorization audit, then implement and verify live identity, token/passcode authorization, persistence, download reauthorization and workspace synchronization.

The current viewer consumes an initial authorized payload. A future live adapter must reconcile refreshed data without recreating the controller and losing drafts/selection. Share administration, notifications, full original capability audit, remote media metadata/fallback acceptance and the supported browser/device performance matrix remain open. This local fixture evidence does not prove live integration.
