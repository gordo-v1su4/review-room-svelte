# Exact-version image references — October 6, 2026

Live acceptance against frontend `fd01415`, public build version `1791318869302`, dedicated Review Convex and private RustFS. This completes V1S-164's remaining image/reference and scoped-API gates; existing PR15 Save/conflict/discard evidence remains in `pr15-app-vm-release.md`.

## Live results

- Authenticated owner uploaded a synthetic JPEG into the existing `Sync QA 2026-10-06` project and attached exact image V1 as both grid and reference to the QA video V2.
- Replacing that image through the actual owner upload flow created image V2. The video metadata and its inspector preview stayed pinned to image V1. Independent original-byte SHA-256 comparison passed after replacement.
- Native Codex Browser Fields showed grid/reference `IMG_20261007_00039 · V1` while V2 was available. The preview decoded at 320×180 and its request selected the exact V1 ID. Asset codes use UTC upload dates; the verification session date is Eastern October 6.
- A second independently authenticated HTTP session read the same saved grid/reference and identical original bytes.
- Cross-project image save returned 400 and preserved prior metadata. A wrong asset/version media pair returned 404. Anonymous owner metadata access redirected 303 before exposing data.
- Five-minute process-local QA credentials exercised real scoped HTTP reads: authorized exact-version metadata 200; foreign project 403; upload-only scope 403; revoked credential 401; anonymous/invalid credential 401. Public response contained exact identities/metadata and no storage keys or delivery URLs. All temporary credentials were revoked in the finalizer; plaintext was never persisted or printed.
- Read-only import verification separately passed ten durable video metadata records and three exact grid mappings. Hashes of the canonical project's assets/versions and both raw import archives were unchanged.

## Recovery and limits

The QA video's original deliberately empty metadata was restored and independently checked. Two private synthetic image assets (each with V1/V2) remain in the explicitly named QA project for upcoming grant/lifecycle acceptance. No additional target project/publication was created, no canonical media was modified, and no permanent deletion was performed.

Early harness attempts omitted the required still-image duration `0` and used the wrong temporary credential prefix; these were harness errors, corrected before the successful run. One failed image-upload reservation remains subject to normal upload-session expiry/recovery; it did not create an asset. An attempted archival cleanup used an unsupported review status; metadata restore succeeded separately, and the private QA fixtures are deliberately retained. None of these attempts is counted as a passing application check.

Reproducible harness: `scripts/check-live-version-references.mjs`. Inject the dedicated admin and existing operator password using the canonical `agent-secrets run` wrapper. Default creates a private QA fixture, `--observe` uses a new authenticated session, and `--restore` restores captured metadata. A guard prevents another default run before restoration. Tokens/cookies/upload URLs stay process-local; captured restoration IDs and metadata are in an ignored-by-staging `.local` scratch file and must not be committed.

Secret-free machine results: `.scratch/release-readiness/v1s164-live-summary.json`. Native screenshot: `output/playwright/v1s164-pinned-image-live-20261006.png` (local evidence). This is desktop image-reference acceptance, not the full cross-browser client matrix or destination Refresh implementation.
