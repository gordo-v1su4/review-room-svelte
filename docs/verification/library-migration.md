# Canonical library migration — October 5, 2026

Application foundation: branch `codex/nested-library-folders`, application commit `d61afeb7599535a4031b65ccf492fffe1897cdb8`, PR #13. Frontend and dedicated Convex were deployed independently before PR review. General destination synchronization remains planned; the intermittent playback issue V1S-170 is not declared fixed.

## Library and agent API

Nested folders persist parent IDs, reject cycles/cross-project parents, and retain storage identity through rename/move. Authenticated live mutation checks covered those boundaries and persisted media movement. Uploads use the current folder or project root. Videos and images are separate views.

Scoped agent smoke checks covered catalog discovery, project creation, nested folder creation and idempotent replay, folder rename, SHA256 image reservation, signed upload and completion replay, job status, and invalid credentials returning 401. Temporary verification content was cleaned afterward. The public guide and OpenAPI contract returned 200. The portable skill passed its validator and was merged into canonical proxmox-home through PR #5.

Existing verification: `bun run check` had zero errors and eight existing warnings; `bun test` passed 166 tests with 888 assertions. These checks do not establish every production media behavior by themselves.

## Imported originals

Review project `Trailer Feed` contains the real folders `Neon Afterlife` and `The Last Prescription`. The former contains seven videos and two image grids; the latter three videos and one grid. The ten original videos total 103,520,762 bytes. All thirteen video/image originals matched their source SHA256 hashes. Complete source JSON and asset/version mappings are retained in two private Convex `sourceImports` records; missing prompts/models were not invented.

Visible, muted browser checks on October 5 captured and inspected frames for all ten imported videos. Twelve samples included repeated clip changes, with readyState 4, nonzero video dimensions, advancing time and no native error/alert. Screenshots show real decoded frames, including the originally reported clip. This sampled success did not reproduce the original intermittent failure and is not a measured cold-start latency guarantee. The browser was left paused/muted.

## Authorized cleanup and independent storage verification

Seven explicitly identified archived Review test projects and their twelve assets were purged. Review retained only the canonical Trailer Feed project, its two folders and thirteen assets after cleanup.

Immediately before the owner-authorized Trailer Feed reset, the live five-project catalog matched every backed-up JSON document. All 43 local recovery media objects passed size/SHA256 validation. Recovery SQLite and media archive files remain mode 600 on app-vm under `/var/backups/trailer-feed-review-migration-20261005/`; recovery media totals 205,369,289 bytes. Private manifests, binaries and credentials are excluded from Git.

Each of the five projects was removed through the existing authenticated, owner-confirmed deletion API. The public catalog subsequently returned zero projects; SQLite returned zero documents, zero uploads and six total tombstones (including a prior deletion). After a Review reload, all ten imported videos played and all three images decoded. The thirteen assets remained present, proving their availability independent of the removed source catalog.

All 43 old source objects returned 404 on requests with fresh cache keys. One unchanged old URL still served a cached 200 response. A targeted Cloudflare cache purge using the existing BWS DNS token was rejected with HTTP 401/code 10000; origin deletion is verified, edge-cache removal remains pending. Cloudflare documents the separate [Cache Purge permission and URL purge API](https://developers.cloudflare.com/api/resources/cache/methods/purge/). No token permission was expanded and no unrelated cache was purged.

Private evidence: `.scratch/trailer-feed-import/switch-playback.json`, `post-reset-playback.json`, `reset-results.json`, `source-object-reset-check.json`, and corresponding browser screenshots. Do not commit recovery files or signed storage URLs.

## PR 13 review corrections in progress

The successful OpenCodeReview run 37391341382 reviewed head 567c3ba and reported 27 findings. Follow-up fixes keep raw folder names separate from path labels, expose folder reparenting, retain rejected folder dialogs, batch media moves, and remove retired overview/date-folder state. Uploads reject cross-family replacement both at reservation and completion, derive filename fallbacks from MIME, and recheck folder existence. Shared folder disposal blocks active destination uploads. Import parsing validates persisted shapes defensively and retains target_model when provided.

Archived purge now returns queued status and runs dependency batches in separate scheduled mutations. Each continuation validates the captured owner and archived purge lock; restore paths reject projects once purge starts. Cleanup waits for upload session expiry and queued/running media jobs. Publication references are removed through paginated showcase scans; project preferences and credentials use project indexes. A queued/running processing job must finish before purge advances. These changes require deployment and runtime verification; existing tests are not proof of the new scheduled purge flow.

The conditional raw-import typing finding was checked: bun run check reports zero errors with the existing eight warnings, so no ambient declaration was added. The suggested fixed-length Convex ID regex was not adopted: IDs remain opaque; validator failures use a clean public error message. New regression test seams remain pending owner confirmation; no unconfirmed test suite was added.
