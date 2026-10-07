# V1S-190 live header activity — October 7, 2026

Public frontend: `https://review.v1su4.dev`, image `abfdb86` at time of these observations. This is deployed acceptance of the existing activity panel; the replacement-job guard and requested FolderDown icon below are local changes awaiting serialized deployment.

## Observable acceptance

- Real browser upload of the existing synthetic `synthetic-v1.mp4` to `Sync reliability QA 2026-10-06` produced asset `VID_20261007_00045`. Activity opened automatically at Preparing preview with one active item, then showed Queued for processing and Checking media. The owner projection observed Finishing ingest → Ready to review. The browser showed Finished, zero active/queued, Ready to review and a dismiss action.
- The header's working class stopped immediately on completion; completion then retired and the automatically opened panel closed. The observed active surface was a steady 9% teal tint with no header animation. Focus stayed outside the activity panel, including while publishing tools were open. The pending color refinement is a separate frontend change.
- The queued ingest remained visible after navigation to the canonical Trailer Feed project. Only the dedicated synthetic QA project was modified.
- The synthetic asset was moved to the new `Activity panel QA 2026-10-07` folder and explicitly synced to a new target of the same title. Its exact version completed; the live browser panel auto-opened showing Synced to Trailer Feed, zero active/queued and working=false, then retired. The delivery completed between browser observations, so no claim is made that this sample captured its queued/sending frames.
- Escape and outside click dismissed the live panel. At 390×844 the panel occupied x=12..378, width366px. With coarse-touch and reduced-motion emulation, header and close buttons measured44×44px and panel animation was none. Temporary emulation/viewport overrides were reset. This is Chromium device emulation, not physical-phone Safari acceptance.
- Live HTTP checks: anonymous303, >100 observed IDs400, owner200 with `private, no-store`; the projection contained no storage keys, task payloads or capability URLs. An active ingest sample returned Running/Checking media.

## Changes and focused verification

`convex/workActivity.ts` now excludes an observed ingest job whose version no longer matches the asset's current version. The observable backend regression reproduced two rows after replacement before this guard, and returns only the replacement's queued job afterward. Seven focused tests passed with28 assertions. WorkActivity Svelte autofixer returned no issues or suggestions after changing the header icon to FolderDown.

`scripts/check-live-activity.mjs` includes bounded `--watch <exact synthetic asset code>` observation and `--activity-sync` against the explicitly asserted synthetic asset. Private fixture IDs and stage timestamps are in `.scratch/release-readiness/activity-observation.json.local`; they are not deployment credentials or committed capabilities. Existing prior cleanup state was not reused for publication.

## Remaining gate

Deploy/verify the replacement-job guard and final requested header icon/color refinement before marking V1S-190 Done. Failure retention/dismissal and reconnect behavior pass the focused local feed tests; this session did not induce a live worker failure or production observation outage. Source-sync reliability acceptance remains V1S-167. No PR was opened.
