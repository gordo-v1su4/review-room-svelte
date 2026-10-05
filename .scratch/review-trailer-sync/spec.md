# Review → Trailer Feed: canonical library and selected-version synchronization

Status: decisions agreed; library/API foundation deployed; sync integration remains planned.
Linear project: https://linear.app/v1su4/project/review-trailer-feed-selected-version-sync-e0514e685b1b
Repositories: gordo-v1su4/review-room-svelte and gordo-v1su4/trailer-feed.

## Canonical library

Review owns originals and source metadata in dedicated Convex/private RustFS. Nested real folders persist parentFolderId. Folder names/parents do not determine blob identity. New keys separate videos/images under assets/<projectId>; uploaded dates are metadata, not automatic folder destinations. Per-folder Videos and Images are views. Dailies/date folders are deliberate user choices. Basic HTTPS agent API and OpenAPI are independent of portfolio synchronization.

## Explicit selection and destination identity

Bulk upload publishes nothing. User selects exact immutable source versions, chooses a destination, and confirms the ordered batch. Trailer Feed is the first destination; UI destination model/badges must support more later. Connected Review folder identifies the target project by persistent IDs. First connection uses its title and confirms creating a target project if absent. Target name collisions need explicit connection/creation resolution, not silent merging. Renaming a folder or target never rematches names.

Trailer Feed assigns project-local V1/V2/V3 in selected-version creation order, oldest first. Review's global asset code and per-asset version ID remain source identity. A later upload does not publish automatically; explicit selection appends a new target version and does not replace existing entries. Idempotency and source tuple uniqueness survive retries/timeouts/concurrency.

## Metadata and references

Review stores prompt, model and associated image/grid references per version. Initial sync fills available target fields and leaves absent data empty. Trailer Feed edits remain local to Trailer Feed. Later source edits do not overwrite them. Explicit Refresh metadata fills empty target fields only. Selected version references/grids accompany the handoff; unrelated folder media remains private/unselected. Media is referenced from Review, never copied again into the target bucket.

Sync itself is publication consent; there is no second approval/publish step and no requirement to mark source final. Readiness of selected media and attachments is required. Existing approved-publication slugs are mutable and have their own rules; they are not the immutable sync identity. Service bearer keys remain server-side. Public Trailer Feed JSON cannot expose credentials or durable presigned URLs. Controlled resolver supports ranges, CORS, images and the player's cors=1 query.

## One-way lifetime rules

Source deletion immediately revokes playback grants and durably removes target entries. Unsync removes target entries but keeps Review media/feedback. Target version/project deletion never deletes or edits Review media. Target records durable suppression for source mappings; reconciliation, later uploads, metadata edits and generic resync cannot resurrect them. Only deliberate Sync again for the exact source version can reactivate. Source-deleted and target-suppressed states are distinct. Target legacy owned-blob deletion cannot apply to external Review references.

## Partial failures and visibility

Successful entries remain available if others fail. Persist per-version status and retry only failures. Destination badges: Syncing, Synced, Disconnected, Failed. Durable outbox and target idempotency agree on completion rather than showing local-only success. Provide reason/retry without losing selection or creating duplicates.

## Migration and current implementation limits

Neon Afterlife: seven video versions plus two grids. The Last Prescription: three videos plus one grid. All 13 originals copied into the Trailer Feed Review project and named source folders; bytes checked by SHA-256 and all processing ready. Original source labels/version numbering and complete JSON documents are preserved by private sourceImports records and mappings; global Review codes remain canonical. Imported prompt/model hydration works. General per-version editable metadata is still a future issue.

The owner explicitly authorized resetting all Trailer Feed projects and removing Review archived tests. Review archived tests were purged. Trailer Feed catalog reset remains pending the reported playback verification. Recovery backup: VM100 /var/backups/trailer-feed-review-migration-20261005/catalog.sqlite, plus local complete catalog and 43 binary media objects under .scratch/trailer-feed-import/trailer-feed-backup (205,369,289 bytes). Keep recovery files private and out of git.

## Work order

1. V1S-162 library/migration foundation and V1S-163 basic API.
2. V1S-164 durable editable version metadata/references.
3. V1S-165 explicit destination grants/resolver.
4. V1S-166 Trailer Feed external registration and ownership.
5. V1S-167 Review destination UI/outbox; V1S-168 target suppression can proceed after registration.
6. V1S-169 source-delete delivery and empty-field refresh.
7. V1S-170 tracks the user's intermittent blank/error playback report; first-frame visibility and cold-start latency require more than readyState/time checks.

Test seams are specified in each ticket and should be agreed before adding a new suite. Use tracer bullets through public mutation/transport/workspace interfaces, meaningful retry/deletion cases, and live browser evidence. Deploy frontend/Convex and Trailer Feed API/frontend separately when touched. Preserve Hostinger Unfold and Project Stack Structure as unrelated applications.
