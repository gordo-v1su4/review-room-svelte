# Upload recovery acceptance — October 7, 2026

Candidate frontend/Convex `24c4142`, frontend version `1791348729404`, passes the completed V1S-188 matrix. This records a deployed candidate, not a merged-main release. All mutations used the dedicated `Upload recovery QA 2026-10-07` project and synthetic files. Canonical media and publications were not changed.

The large test original is a **61,208,608-byte valid H.264 Constrained Baseline / yuv420p MP4**, 1280×720, 2.5 seconds. FFmpeg generated actual high-entropy frames; there is no filler or appended junk. Native Codex @Browser decoded it at 1280×720 with `readyState=4`, and the real Trigger worker completed its ingest.

The supported transport is **direct PUT**, with a 90 MiB original limit; no multipart flow is implemented or claimed. Owner authorization produces separate original/preview PUT capabilities, lasting 900 seconds within a one-hour metadata upload session. `scripts/check-live-upload-recovery.mjs` uses the approved owner HTTP and dedicated Convex seams; inject the existing operator password/admin key through `agent-secrets run`. Fixture state contains only IDs in an ignored `.local` file; capability URLs remain process-local.

The live server matrix verified large video at project root, a still image in a nested folder, actual aborted transfer followed by denied completion (409), retry using the same session, stable repeated completion identity, one asset/version/job, and no automatic Trailer Feed connection/publication. Removing the captured destination while upload was pending was denied; moving that real folder retained its stable ID and the completed upload's destination.

`--expiry-only` first proved a valid storage PUT, waited the actual 900-second authorization lifetime, then observed **403 from the unchanged expired URL**. Renewing reused the same session and captured scope, and the renewed upload completed successfully. This is actual expired authorization evidence, not a modified/invalid signature simulation.

Native @Browser checked the queued UI against the deployed candidate:

- A three-file batch contained an injected one-file begin-upload 503. The other image/video completed, the failure stayed actionable, and Retry uploaded only the failed file. Server observation found one copy of each successful/retried original.
- A real large-file transfer was cancelled at **6%** under temporary tab-only network throttling. Cancelled state appeared; Retry completed one asset without duplicates. Successful batch entries remained usable.
- The original selected video and exact typed comment draft survived both flows, with no page reload. A newly uploaded 61 MB video reached worker Ready in that same open workspace, retained its new note draft, and decoded 1280×720 frames.
- The actual New version file picker delegated to the same queue. The publishing dialog closed; the original canonical asset remained selected and retained `Draft survives exact replacement`. V2 became Ready with decoded 320×180/2-second frames, while V1 remained listed. Independent server observation found exactly two versions and two corresponding jobs on the original asset.
- The picker required a published approved asset, so this check explicitly issued one temporary publication for the synthetic fixture. Upload did **not** replace its pinned V1. The publication was revoked afterward; no destination was registered and no canonical publication was touched.

The queue reuses the existing import attempt fences and allows at most two active preparations/transfers. Failed attempts retain their upload session; renewal and completion replay resolve uncertain completion instead of reserving another asset. Cancel is disabled once verification begins. A late cancellation that discovers an already-complete session consumes the authoritative existing receipt. Pending cancellation marks the session terminal and deletes its staging objects. An already-issued storage URL cannot be cryptographically revoked, but a cancelled metadata session cannot finalize or publish an asset.

Temporary Fetch interception and network throttling were cleared. No browser changes remain. Regression evidence: full Bun suite **219 passing tests / 1,194 assertions**; targeted existing queue fences plus upload cancellation states pass; Svelte check 0 errors/eight existing warnings, Convex type check passed. Later changes were limited to replacement delegation and documentation; relevant queue/private tests and Svelte checks passed again.

Evidence: [server matrix](evidence/upload-recovery-live-20261007.json), [actual expiry/renewal](evidence/upload-expiry-live-20261007.json), [native/replacement observation](evidence/upload-native-recovery-20261007.json), [partial batch retry](evidence/upload-batch-recovery-20261007.png), [cancel/retry](evidence/upload-cancel-retry-20261007.png), [worker in open review](evidence/upload-worker-open-review-20261007.png), [replacement in open review](evidence/upload-replacement-open-review-20261007.png).

Recreate the large fixture with installed FFmpeg:

```powershell
ffmpeg -f lavfi -i "nullsrc=s=1280x720:r=30,geq=lum='random(1)*255':cb='random(2)*255':cr='random(3)*255'" -t 2.5 -c:v libx264 -preset ultrafast -crf 18 -profile:v high -pix_fmt yuv420p -movflags +faststart -y .scratch/release-readiness/large-upload-qa.mp4
```
