# V1S-179 explicit deleted-target replacement — October 7, 2026

Implementation checkpoint; deployed acceptance is pending the combined release.

The owner chooses Replace removed target, Create new or Use existing by stable target ID, and explicitly authorizes replacement. The target backend accepts this operation only when the exact previously connected project has a durable deletion tombstone. A stable replacement nonce records the operation and history; replay returns the same target, changed/superseded intent denies, and ordinary connection retry cannot recreate the removed target.

Review retains the retired connection and mapping rows and links them to the replacement. Old claims/acknowledgments are fenced; old publication capabilities are revoked. Connecting publishes nothing. Selecting exact versions on the replacement grants fresh consent and rotates capabilities/generations; each historical version is explicitly reactivated before the ordered reservation. Unselected versions remain private. Saved delivery is scoped to the selected folder's current and retired connections, with previous target IDs labelled instead of unrelated project noise.

The same dialog includes V1S-178's separate exact-version Unsync preview and confirmation checkbox, pending/removal-confirmed status and backend-gated Sync again. Originals and feedback are retained.

## Focused verification

- Source regression: retired mapping retained, replay returns the same replacement, ordinary changed-target connection denies, late old acknowledgment cannot mark success, old connection cannot confirm publication, two exact versions receive generation2 with ordered reactivation intents, and frozen new confirmation replays safely.
- Combined focused source tests:14 tests,143 assertions, including existing outbox/Refresh and concurrent Unsync changes.
- Target external tests:21 pass, including Create/Connect replacement, deny while old target exists, deny generic recreation, exact replay, changed intent rejection and retained old/new IDs.
- Svelte check:zero errors, eight existing warnings. Svelte autofixer:no component issues; lifecycle/effect suggestions were reviewed against the existing cancellable observation lifecycle.

## Deployed gate

Deploy target backend, source Convex and frontend together, then delete only the dedicated disposable activity QA target. Explicitly replace it, verify sources/history remain, publish chosen exact versions once, reject old receipt/payload generations and reopen in the native Browser. Do not mark Done from this checkpoint. No PR is opened.
