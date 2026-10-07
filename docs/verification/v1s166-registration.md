# External registration replay and concurrency — October 6, 2026

Real HTTP acceptance against the deployed Trailer Feed API `366e6df` and Review frontend `fd01415`/dedicated Convex. The new explicitly synthetic `Sync reliability QA 2026-10-06` source/target pair is separate from canonical projects and the old owner-removed QA target; the latter was not recreated.

`scripts/check-live-external-registration.mjs` creates two real, silent synthetic video uploads plus one JPEG, waits for actual worker readiness, explicitly grants exact versions, and exercises the scoped partner registration interface. The first worker completed normally in about 42 seconds; the corrected harness waits up to two minutes and reuses named source fixtures when resumed rather than uploading duplicates.

## Live results

- Input batch order was reversed; reservations remained oldest-first V1/V2. Invalid older-item metadata returned 400 without consuming its slot. V2 delivered first and retained V2; the later V1 delivery retained V1.
- The client deliberately discarded V2's successful registration receipt, then replayed the exact request. It returned 200 and the same artifact. This is controlled lost-receipt acceptance, not an induced production socket timeout or service outage.
- Eight concurrent V1 deliveries returned one artifact identity. Final catalog contains exactly two external video entries plus one linked grid, with no duplicate attachments.
- Equivalent reordered batch replay returned 200; changed selection under the same batch nonce returned 409.
- Both registered videos served exact known first-1024-byte ranges through Review with 206. Target entries contain external ownership/provenance and controlled resolver URLs, not copied blob keys/local paths or the partner secret. Numeric creative field value `0` survived initial registration.
- The target owner edited V1's prompt/model through the actual details API. Replaying initial registration preserved those edits and the linked grid identity.
- Native Codex Browser decoded 320×180 muted V1 with advancing time (sample 0.244 s, readyState 4, no media error) and decoded its exact linked grid at 320×180. V1/V2 appeared together with stable numbering.

Target's existing backend suite passes 41 tests, including restart, suppression and metadata refresh contracts. Review's nine source outbox regression tests pass separately (102 assertions); those are not a substitute for V1S-167's remaining live retry/partial-delivery checks.

## Evidence and limits

Secret-free results: `.scratch/release-readiness/v1s166-live-summary.json`. Private resume state contains grant capabilities and is excluded from staging. Source originals are synthetic; canonical media and unrelated dirty Trailer Feed checkout files were not edited. No application code changed or production deployment occurred in this acceptance.

Temporary QA capabilities/catalog cleanup is performed after visible browser proof. Full area PR review, source outage/restart recovery, Unsync, connection replacement and source-deletion propagation remain separate gates. Synthetic acceptance establishes registration behavior; prior real Neon/Last Prescription publication remains credited rather than repeated.
