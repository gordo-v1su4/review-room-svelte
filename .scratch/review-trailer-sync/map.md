# Review → Trailer Feed work map

The [specification](spec.md) owns product decisions. Linear project: https://linear.app/v1su4/project/review-trailer-feed-selected-version-sync-e0514e685b1b.

## Notes

Work in the verified personal repositories. Complete each coherent chunk through a PR into main, wait for OpenCodeReview and applicable checks, resolve findings, and merge before starting the next chunk. The current review workflow automatically runs on PR opening; dispatch it manually after changing a reviewed head. Verify the review covers the current commit. Deploy and verify each changed runtime separately.

## Decisions so far

- [01 — V1S-162](issues/01-v1s-162.md): PR #13 merged by the owner; main snapshot 8bb5154 deployed to frontend and dedicated Convex. Nested folder CRUD and compact aligned layout verified live; originals and import metadata preserved. Authorized source reset is complete. Scheduled-purge runtime verification and edge-cache cleanup remain open.
- [02 — V1S-163](issues/02-v1s-163.md): basic agent API and portable skill verified live.
- V1S-164 through V1S-169 implement the selected-version integration in the specification's work order. Their numbered tickets describe acceptance criteria and test seams.
- [09 — V1S-170](issues/09-v1s-170.md): playback investigation is active. Native readiness checks passed, and a visible frame was captured for the reported clip, but the intermittent failure has not been reproduced or fixed.

## Fog

Trailer Feed reset is complete and backed up. Source objects are gone at origin; stale Cloudflare cache remains pending because the existing DNS token's purge request was denied. The playback fix remains unproven despite visible-frame checks for every imported video. Evidence: ../../docs/verification/library-migration.md.

Browser playback tests must use a visible pane, announce the test, and remain muted. Finish tests paused so audio cannot continue unexpectedly.
