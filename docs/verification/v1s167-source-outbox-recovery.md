# V1S-167 source outbox recovery — October 7, 2026

Synthetic scope only: `Sync reliability QA 2026-10-06` / `Activity panel QA 2026-10-07`. Public owner API at `https://review.v1su4.dev`; independent Trailer Feed catalog at `https://media.v1su4.dev/trailer-feed`. No canonical asset, database patch or test-only production backdoor is involved.

## Completed live checks

`scripts/check-live-source-outbox.mjs` discards a client receipt for the existing frozen exact confirmation, starts an independent owner session, then issues six concurrent exact replays. Every response returns the same durable source batch. Completed-batch retry is a no-op. The exact version still has one Synced source job and one external target artifact, with unchanged identity, version number and whole target catalog hash. A changed frozen confirmation revision and a new confirmation for an already selected exact version both return409.

Safe results: `.scratch/release-readiness/v1s167-replay-summary.json`. Synthetic capability/fixture state is private and excluded from evidence commits.

The new `source-outbox-recovery-20261007.mp4` upload (`VID_20261007_00048`) became Ready in the same folder without publishing automatically. The earlier successful `VID_20261007_00045` remains Synced.

## Completed real outage recovery

`scripts/check-live-outbox-recovery.mjs` prepares the isolated fixture and has explicit `--enqueue-offline`, `--failed`, and `--retry` modes. It does not stop or modify services. A parent operator must serialize the short target outage and restoration. The harness verifies persisted Failed state, reload through separate invocations, successful recovery, unchanged attempts and target identity for the earlier success, and two unique exact target versions.

The parent stopped the real target container for the serialized window. Owner confirmation succeeded durably while the target was offline; the deployed scheduler persisted Failed with `Destination delivery failed (502); retry this operation`. The earlier successful job retained its Synced state, attempt count and artifact identity. After the parent restored target release `a094f03` with its unchanged persistent volume, a separate authenticated harness invocation retried the failed batch. It reached Synced; the target independently contained exactly two external versions numbered1 and2. No retry was sent for the earlier success. Safe results: `.scratch/release-readiness/v1s167-recovery-summary.json`.

This is deliberately separate-batch live recovery. The same-batch8-success/2-failure behavior is covered by the existing local regression; nine focused outbox tests pass with102 assertions. The actual target process restart and persistent-volume restoration happened between the failed observation and successful retry.

The lost registration receipt and actual restart/replay target contract remain credited to V1S-166's existing deployed acceptance. Client receipt loss here does not claim to reproduce a lost server-to-server acknowledgment after target registration. Source Refresh, Unsync, deleted-target connection replacement and source deletion remain their separate tickets.
