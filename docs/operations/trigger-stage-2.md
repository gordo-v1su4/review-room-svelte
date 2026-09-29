# Review Room Trigger deployment

Review Room has a separate Trigger.dev project, `proj_gtqdmodtodgdpjlpbpkr`, in the V1su4 organization at `https://trigger.v1su4.dev`. Its health and ingest queues are bounded to two concurrent runs; FFmpeg derivatives are capped at one. Payloads contain job/asset IDs and stage metadata; media bytes stay in RustFS.

The production application key is BWS `hermes_keys` / `REVIEW_ROOM_TRIGGER_SECRET_KEY` (expires 2026-12-28). Trigger labels it Full access within this Review Room project. Retrieve it with `agent-secrets run --secret=REVIEW_ROOM_TRIGGER_SECRET_KEY -- <command>`; do not copy its value into Git, the Hermes notebook, or command output. It is installed in the App VM frontend's root-owned private environment.

The Review Room production Trigger environment has seven redacted variables. Its three credential values come from existing BWS records: `REVIEW_ROOM_CONVEX_SELF_HOSTED_ADMIN_KEY` becomes `REVIEW_ROOM_CONVEX_ADMIN_KEY`, `REVIEW_ROOM_S3_ACCESS_KEY` becomes `S3_ACCESS_KEY_ID`, and `REVIEW_ROOM_S3_SECRET_KEY` becomes `S3_SECRET_ACCESS_KEY`. `REVIEW_ROOM_CONVEX_URL`, `S3_ENDPOINT`, `S3_BUCKET`, and `S3_REGION` select the personal services. The Svelte server uses `REVIEW_ROOM_TRIGGER_SECRET_KEY` to dispatch; when absent, uploads retain Stage 1 behavior.

## Media ingest

The canonical upload session seals the original and poster before creating one Convex `mediaJobs` record for the version. The Svelte server dispatches `review-room-ingest` with only the job ID and attempt. Trigger runs verify/inspect, derivative generation, and finalization as bounded child tasks. A deterministic version path in RustFS holds the thumbnail and sprite; Convex records their keys before the job becomes ready. The job's run ID, stage, status, and safe retry action appear in Review Room. An unavailable Trigger service leaves the sealed asset and queued job intact.

The authenticated HTTP contract lives at `/api/v1`: create or edit projects and
folders, `POST /uploads` with `projectId`, `name`, `type`, integer `size`, and
the original file's hexadecimal `sha256` for an idempotent presigned session.
PUT the original
and JPEG poster to the returned RustFS URLs, `POST /uploads/{sessionId}/complete`
with poster bytes, duration and dimensions, then `GET /jobs/{jobId}`. The server
streams the staged original and compares its SHA-256 digest before sealing it;
checksum mismatch leaves the upload session retryable and creates no asset.
Bearer
credentials are issued once with `POST /api/v1/credentials` from an owner
session and revoked with `DELETE /api/v1/credentials/{credentialId}`. Write
requests require an `Idempotency-Key` of 8–128 letters, digits, `.`, `_`, `:`
or `-`. The catalog-only credential is BWS `hermes_keys` /
`REVIEW_ROOM_API_CATALOG_KEY` (expires 2026-12-28); it has project/folder
actions and no media upload scope. Issue project-scoped upload credentials only
when connecting a specific client. Never send the catalog key to a browser.

Deploy Convex schema/functions before the updated Svelte app. The `processWithTrigger` finalize argument is optional so the prior frontend remains usable during rollout. Deploy Trigger tasks before adding the project key to the Svelte runtime. After all three surfaces are live, upload a small test video, confirm one asset/version/job, inspect each child run and the generated RustFS objects, then exercise failure and retry. Stage 1 publication still requires an explicit owner action and a ready version.

## Deploy

Deploy from VM100 Linux using the Review Room checkout and `bun run trigger:deploy`. The mode-600 `$HOME/.config/review-room/trigger-deploy.env` supplies an operator `TRIGGER_ACCESS_TOKEN`; the Trigger stack's mode-600 `.env` supplies local registry credentials. Both are private files and are never committed. The health task defaults to the personal Convex endpoint; set `REVIEW_ROOM_CONVEX_URL` in this project's environment if that endpoint changes. The deployment script builds locally and pushes only this project's image to VM100's loopback registry.

Before deploy, confirm `https://trigger.v1su4.dev/healthcheck` and `https://review-convex.v1su4.dev/version` return success, check VM100 disk and memory, and verify other Trigger projects have healthy runs. Use `bun run trigger:deploy -- --dry-run` to test the build path. After deploy, inject the BWS key process locally as `TRIGGER_SECRET_KEY`, set `TRIGGER_API_URL=https://trigger.v1su4.dev`, and run `bun run trigger:smoke <asset-id>` followed by `bun run trigger:smoke <asset-id> --fail`. Verify success and failure in this project's run history and verify the other projects remain healthy.

On 2026-09-29, VM100 deployment `20260929.2` completed with five tasks. API
upload run `run_cmumckvk800143ioor57lczha` completed verify, derivatives and
finalize. An injected failure in `run_cmumcndb4001y3iooyvxxyxfy` appeared as
Needs attention in Review Room; the UI Retry control advanced the same job to
attempt 2, and `run_cmumco92f002c3ioofpnup0ke` completed. The HTTP smoke
also confirmed stable project/folder/session/asset IDs on replay, scope denial,
key revocation, and a private asset visible in its API-created folder.

## Rollback and recovery

Keep the prior Review Room deployment image and select its version in the Trigger dashboard if a new task deployment fails. Do not roll back the shared Trigger control plane as an application rollback. The shared platform backup and integrity procedure lives in `proxmox-home/docs/triggerdev-vm100-runbook.md`; check the current VM100 backup before platform changes. Trigger task state is separate from Convex metadata and RustFS originals, so the Review Room backend and media backup remain required.
