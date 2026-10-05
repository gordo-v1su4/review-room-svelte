# Review → Trailer Feed work map

The [specification](spec.md) owns product decisions. Linear project: https://linear.app/v1su4/project/review-trailer-feed-selected-version-sync-e0514e685b1b.

## Notes

Work in the verified personal repositories. Complete each coherent chunk through a PR into main, wait for OpenCodeReview and applicable checks, resolve findings, and merge before starting the next chunk. The current review workflow automatically runs on PR opening; dispatch it manually after changing a reviewed head. Verify the review covers the current commit. Deploy and verify each changed runtime separately.

## Decisions so far

- [01 — V1S-162](issues/01-v1s-162.md): library foundation deployed; originals and import metadata preserved. Migration wrap-up remains open.
- [02 — V1S-163](issues/02-v1s-163.md): basic agent API and portable skill verified live.
- V1S-164 through V1S-169 implement the selected-version integration in the specification's work order. Their numbered tickets describe acceptance criteria and test seams.
- [09 — V1S-170](issues/09-v1s-170.md): playback investigation is active. Native readiness checks passed, and a visible frame was captured for the reported clip, but the intermittent failure has not been reproduced or fixed.

## Fog

Trailer Feed reset is authorized and backed up, but remains pending playback verification. Do not mark the reset or playback fix complete based on successful upload hashes or one successful browser playback.

Browser playback tests must use a visible pane, announce the test, and remain muted. Finish tests paused so audio cannot continue unexpectedly.
