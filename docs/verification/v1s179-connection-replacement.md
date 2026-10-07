# V1S-179 explicit deleted-target replacement — October 7, 2026

Basic deployed acceptance passed on Review frontend `118ec9a`, Convex `382c7d4` and target `4c41cb4`. Final mixed queued/registered source hardening is deployed at `24c4142`; the parent native @Browser gate subsequently passed on the combined frontend release.

The owner chooses Replace removed target, Create new or Use existing by stable target ID, and explicitly authorizes replacement. The target backend accepts this operation only when the exact previously connected project has a durable deletion tombstone. A stable replacement nonce records the operation and history; replay returns the same target, changed/superseded intent denies, and ordinary connection retry cannot recreate the removed target.

Review retains the retired connection and mapping rows and links them to the replacement. Old claims/acknowledgments are fenced; old publication capabilities are revoked. Connecting publishes nothing. Selecting exact versions on the replacement grants fresh consent and rotates capabilities/generations; each historical version is explicitly reactivated before the ordered reservation. Unselected versions remain private. Saved delivery is scoped to the selected folder's current and retired connections, with previous target IDs labelled instead of unrelated project noise.

The same dialog includes V1S-178's separate exact-version Unsync preview and confirmation checkbox, pending/removal-confirmed status and backend-gated Sync again. Originals and feedback are retained.

## Focused verification

- Source regression: retired mapping retained, replay returns the same replacement, ordinary changed-target connection denies, late old acknowledgment cannot mark success, old connection cannot confirm publication, two exact versions receive generation2 with ordered reactivation intents, and frozen new confirmation replays safely.
- Combined focused source tests:14 tests,143 assertions, including existing outbox/Refresh and concurrent Unsync changes.
- Target external tests:21 pass, including Create/Connect replacement, deny while old target exists, deny generic recreation, exact replay, changed intent rejection and retained old/new IDs.
- Svelte check:zero errors, eight existing warnings. Svelte autofixer:no component issues; lifecycle/effect suggestions were reviewed against the existing cancellable observation lifecycle.

## Deployed acceptance and final gate

The dedicated Activity panel QA target was independently asserted to contain only two selected synthetic videos and their attached external grid before deletion. Explicit Create replacement lost-receipt replay retained the same new mapping, preserved the retired connection and published nothing automatically. Fresh exact consent delivered two videos at generation2 plus the referenced grid. Review originals and creative metadata stayed unchanged; the old target remains404. Old target delivery denied409, retired owner connection denied404 and the replacement catalog remained unchanged. Safe results: `.scratch/release-readiness/v1s179-live-summary.json`; private fixture state is excluded from commits.

Final hardening queries authoritative per-version target state before replacement. Never-registered versions receive fresh grants and an ordered idempotent singleton reservation; previously registered versions receive explicit reactivation. Interleaving those preparations in source-date order preserves numbering in mixed batches. Queued Unsync removes the cancelled version from the plan and fences the old reservation acknowledgment; remaining fresh reservations get a new stored nonce. Six focused replacement/Refresh/Unsync tests pass with57 assertions; TypeScript check passes.

The bounded live replacement replay check passed after source hardening deployment: authoritative status observed the already published generation2 versions, the exact replacement receipt replay retained the same connection and target identity, source jobs stayed Synced at generation2, and the target catalog remained unchanged. Parent native @Browser verified two Synced exact versions and the retained retired-connection history; V1S-179 is Done. No PR was opened during implementation.
