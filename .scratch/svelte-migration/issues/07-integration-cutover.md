# 07 — Reconnect and verify before retiring Next.js

Status: needs-triage
Type: task
Blocked by: 05, 06

## Scope

Resume backend repairs only when requested. Verify live roles, token scope, persistence, upload/download and playback. Complete cross-browser/mobile accessibility and performance evidence. Remove the old runtime only after parity.

## Acceptance

All ledger rows have evidence; remaining backend failures resolved; explicit deployment/cutover decision recorded; no Buzero push.

## References

[Migration spec](../spec.md)

## Comments

Draft ticket; no implementation claimed.

Read-only public-review audit identified concrete authorization blockers in the inherited backend. See [public-review-access-audit.md](../public-review-access-audit.md) for source evidence and required direct-endpoint acceptance scenarios. Backend repairs remain deferred; do not connect a supposedly protected replacement UI to the unchecked contract.
