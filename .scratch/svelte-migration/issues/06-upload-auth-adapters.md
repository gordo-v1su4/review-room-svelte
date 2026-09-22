# 06 — Port upload and auth integration adapters

Status: needs-triage
Type: task
Blocked by: 04

## Scope

Port server storage endpoints and browser upload queue with existing contracts; replace React-only authentication and Convex subscriptions with supported Svelte integration. Keep credentials server-only. Do not repair production credentials in this ticket.

## Acceptance

Local contract and failure scenarios pass; multipart, URL refresh, sign-in/reset and worker integration have explicit live verification tasks.

## References

[Migration spec](../spec.md)

## Comments

Local import preparation and queue implemented; [acceptance evidence](../import-queue-evidence.md). Concurrency is bounded, destinations are captured before preparation, and each file has failure/retry/cancel state. This does not implement network uploading or authentication. Multipart storage, URL refresh, authorization, persistence and live failure verification remain open.
