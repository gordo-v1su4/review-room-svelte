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
