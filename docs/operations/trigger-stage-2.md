# Review Room Trigger deployment

Review Room has a separate Trigger.dev project, `proj_gtqdmodtodgdpjlpbpkr`, in the V1su4 organization at `https://trigger.v1su4.dev`. Its task queue is bounded to two concurrent runs. Payloads contain an asset ID and an optional smoke-test failure flag; media bytes stay outside Trigger.

The production application key is BWS `hermes_keys` / `REVIEW_ROOM_TRIGGER_SECRET_KEY` (expires 2026-12-28). Trigger labels it Full access within this Review Room project. Retrieve it with `agent-secrets run --secret=REVIEW_ROOM_TRIGGER_SECRET_KEY -- <command>`; do not copy its value into Git, the Hermes notebook, or command output.

## Deploy

Deploy from VM100 Linux using the Review Room checkout and `bun run trigger:deploy`. The mode-600 `$HOME/.config/review-room/trigger-deploy.env` supplies an operator `TRIGGER_ACCESS_TOKEN`; the Trigger stack's mode-600 `.env` supplies local registry credentials. Both are private files and are never committed. The health task defaults to the personal Convex endpoint; set `REVIEW_ROOM_CONVEX_URL` in this project's environment if that endpoint changes. The deployment script builds locally and pushes only this project's image to VM100's loopback registry.

Before deploy, confirm `https://trigger.v1su4.dev/healthcheck` and `https://review-convex.v1su4.dev/version` return success, check VM100 disk and memory, and verify other Trigger projects have healthy runs. Use `bun run trigger:deploy -- --dry-run` to test the build path. After deploy, inject the BWS key process locally as `TRIGGER_SECRET_KEY`, set `TRIGGER_API_URL=https://trigger.v1su4.dev`, and run `bun run trigger:smoke <asset-id>` followed by `bun run trigger:smoke <asset-id> --fail`. Verify success and failure in this project's run history and verify the other projects remain healthy.

On 2026-09-29, VM100 deployment `20260929.1` completed. Production run `run_cmumb1dbm00013iooasoplhfa` completed after checking the personal Convex endpoint. Run `run_cmumb44se00053ioootu1cd5a` failed with the expected injected error. These prove key authentication and task execution; they do not exercise upload or ingest.

## Rollback and recovery

Keep the prior Review Room deployment image and select its version in the Trigger dashboard if a new task deployment fails. Do not roll back the shared Trigger control plane as an application rollback. The shared platform backup and integrity procedure lives in `proxmox-home/docs/triggerdev-vm100-runbook.md`; check the current VM100 backup before platform changes. Trigger task state is separate from Convex metadata and RustFS originals, so the Review Room backend and media backup remain required.
