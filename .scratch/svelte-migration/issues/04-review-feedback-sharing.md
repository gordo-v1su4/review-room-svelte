# 04 — Port decisions, feedback and sharing

Status: ready-for-agent
Type: task
Blocked by: 03

## Scope

Implement ratings, shortlist, status, still-image markup, timecoded comments, Inbox, notifications and token-scoped review through public module interfaces. Preserve asset identity and permission semantics.

## Acceptance

Fixture role and token scenarios pass; live security/persistence gates remain explicitly open until backend reconnection.

## References

[Migration spec](../spec.md)

## Comments

Implementation in progress. Workspace controls and local review/metadata slices are recorded in [workspace-metadata-evidence.md](../workspace-metadata-evidence.md). This ticket remains open until its full parity and live acceptance scope passes.

Local inbox grouping, search, handling/reopening and exact review-context navigation are verified in [feedback-inbox-evidence.md](../feedback-inbox-evidence.md). Author/timestamp retention is restored. Live inbox/notifications, durable routes, public review and persistence remain open.

Shortlist sequence preview is restored with native video ended transitions, timed stills, looping, Stop and draft-preserving responsive playback. See [shortlist-preview-evidence.md](../shortlist-preview-evidence.md). Public-token integration remains open and is gated by the [access audit](../public-review-access-audit.md).

Mobile notes now stay beneath the player while secondary metadata opens in a resize-stable sheet. Real-video playback, comment-draft retention, field editing and focus return verified in [mobile-metadata-evidence.md](../mobile-metadata-evidence.md). Full acceptance matrix remains open.
