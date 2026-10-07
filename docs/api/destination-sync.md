# Selected-version destination synchronization

The owner-only `/api/owner-sync` interface connects a Review project or real folder to Trailer Feed, confirms exact selected versions and retries saved failures. Uploading never publishes. Connections retain verified IDs through renames; a name collision requires an explicit create/connect choice. Whole source-date-ordered batches reserve target Vn before individual delivery.

Confirmation freezes exact metadata, revision and image versions under an immutable nonce. A lost response can replay that nonce without duplicate selection or grants. Convex persists batch/item state and schedules leased recovery; retry sends failed items without replacing successes. Authorization is checked before reservation, delivery and acknowledgment, including selected reference-image readiness. Owner reload reconciles target removal. A status outage leaves saved statuses intact and visibly warns that they may be stale.

Explicit `sync-again` confirms one verified suppressed source version, rotates its grant and saves a new durable operation. A separate immutable target reactivation ID precedes batch reservation. Retrying a lost reactivation response does not rotate consent again. Old resolver URLs, deliveries and removals cannot act on newer consent. Same-target reactivation preserves Vn; newer source uploads remain unselected.

## Source deletion

Normal owner deletion and archived-project purge invoke destination removal in the same transaction as source deletion. Published root grants are revoked immediately and their sync items become `source_deleted`. The independent `destinationRemovals` ledger stores scalar source identity/generation, survives deletion of project/version rows, and retries server-only removal with capped backoff and fenced leases. A verified exact terminal acknowledgment completes it; network or configuration errors retain it for retry. UI distinguishes immediate source deletion from pending or confirmed target removal.

Deleting a linked image contracts the surviving root grant's reference allowlist and removes the exact image from source metadata and saved publication payloads. It preserves the video and increments its metadata revision so stale edits cannot restore the deleted reference. The image gets its own durable terminal removal event. Trailer Feed removes only matching external attachments and drops their grid/reference links while preserving populated target edits. Its tombstones also prevent delayed initial delivery from recreating deleted images.

No destination removal calls source storage. Canonical Review originals are handled only by Review's existing scoped deletion worker. The partner contract lives in Trailer Feed's `docs/review-external-versions.md`.

Explicit Unsync revokes access immediately and queues durable suppression; Sync again requires fresh exact-version consent after confirmation. Refresh freezes a metadata/image revision and fills empty destination fields while preserving target edits. Replace removed target retains retired connection history, creates or connects the explicitly chosen replacement, and publishes nothing until fresh selected-version consent. Deployed browser acceptance, runtime service configuration and current-head review remain separate release gates.
