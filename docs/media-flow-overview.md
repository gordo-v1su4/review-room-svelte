# Media flow and metadata

Review Room keeps project media, take history, review decisions and controlled delivery together. The files and the catalog have separate responsibilities: RustFS holds the original media and derived previews; Convex holds their identities, relationships and review state.

## Explore the diagrams

- [Media flow — interactive overview](diagrams/media-flow.html): upload, video processing, review and explicit publishing. Optional step playback traces the handoffs; the full diagram remains available without animation.
- [Metadata relationships — ER view](diagrams/metadata-model.html): projects, folders, assets, versions, comments and publication grants.

Download/open the HTML files in a browser to use them. GitHub's file viewer displays their source rather than an interactive preview. Both use the Review Room dark palette and restrained teal accents, following the grouped workflow approach used in Pindeck.

## Follow one asset

1. A creator uploads through the workspace, or an authorized integration adds media through the scoped API. Upload sessions bind the incoming file to its project and optional folder or existing asset.
2. The upload path authorizes storage writes and verifies completion. Originals live in RustFS; finalization creates an asset/version or adds a new take to an existing asset.
3. For the Trigger video-processing path, jobs verify the original and use FFmpeg to prepare thumbnails and scrub sprites. Completion updates the exact version and its job state in Convex. Still-image uploads do not require these video jobs.
4. The workspace reads the catalog and requests authorized media delivery. People inspect images or videos, select takes, comment and make review decisions. Media bytes are not stored as catalog metadata.
5. Explicit selected-version publishing creates controlled access and a durable sync operation for Trailer Feed. It does not move the source files. Refresh and unsync remain separate actions.

Creative Studio Pro can use scoped automation to manage owned shot folders, add take versions and set the current pick. That is an implemented integration surface; this overview does not claim that every downstream application is connected.

## What the metadata describes

| Level | Responsibility |
| --- | --- |
| Project and folder | Organization, ownership and nested placement |
| Asset (`videos`) | Stable identity, asset code/class, current take, status, rating, shortlist and tags |
| Version (`assetVersions`) | Original/poster keys, dimensions, processing state and optional creative metadata |
| Creative metadata | Model, prompt, source information, notes, release details, custom fields and same-project reference-image versions |
| Comment | Asset-level feedback, optional timecode and handled state |
| Publication grant and sync state | Exact-version consent, permitted delivery, retries and destination lifecycle |

Choosing a take does not change the asset's identity. Creative metadata is embedded on its version; comments in the current schema refer to the asset rather than an exact version. A folder move does not change blob identity.

## Implementation references

The diagrams were checked against the local source on October 17, 2026. They describe the implemented model, not a new deployment or fresh runtime health certification.

- [Schema](../convex/schema.ts) and [version metadata](../convex/lib/versionMetadata.ts)
- [Upload finalization](../convex/lib/personalCommands.ts) and [video processing](../src/trigger/ingest.ts)
- [Destination sync](api/destination-sync.md) and [publication grants](api/destination-grants.md)
- [Deployment and configuration](deploy-app-vm-and-auth.md) for operator details

The diagrams intentionally omit credentials, endpoint inventories and most supporting tables. No application API or schema changes are required for this documentation.
