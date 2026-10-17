# Review Room agent API

Contract of record: [OpenAPI JSON](https://review.v1su4.dev/review-room-openapi.json), source `static/review-room-openapi.json`. The API is ordinary HTTPS/JSON so any agent or HTTP client can use it. MCP is optional and is not needed for the basic operations.

Use BWS `REVIEW_ROOM_AGENT_API_KEY` as `Authorization: Bearer …`; inject it into the process rather than displaying it. It grants `projects:create`, `folders:write`, `media:upload`, `media:read` for this standalone Review catalog. It does not grant deletion (beyond locked folders the credential created itself), publication, portfolio sync, or access to Hostinger Unfold. The older `REVIEW_ROOM_API_CATALOG_KEY` remains a separate limited catalog credential.

1. `GET /api/v1/catalog` resolves opaque project/folder IDs. Optional `projectId` narrows the response. A restricted credential sees only its allowed project.
2. `POST /api/v1/projects/{projectId}/folders` with `{"title":"Trailers","parentFolderId":"optional-parent-id"}` creates a folder. Omit parent for a project-root folder. Same-named siblings conflict; the same name under different parents is allowed.
3. `PATCH /api/v1/projects/{projectId}/folders/{folderId}` with `{"title":"Final cuts"}` renames it; `{"parentFolderId":"other-folder-id"}` moves it (`null` moves it to the project root); both may be sent together. Folder/asset IDs and file URLs stay stable.
4. For media, compute SHA-256 and inspect dimensions/duration first. `POST /api/v1/uploads` takes projectId, optional folderId, name, exact MIME type, size and sha256. Maximum original size: 90 MiB.
5. PUT the original bytes to `url` with the declared MIME, then a real JPEG preview to `posterUrl` with `image/jpeg` (maximum 5 MiB). Treat signed URLs as credentials and keep them out of logs. These storage requests do not use the Review bearer header.
6. `POST /api/v1/uploads/{sessionId}/complete` takes posterSizeBytes, durationSec, width and height. Image duration is zero. Reuse that session when retrying completion; do not begin another upload after an uncertain completion.
7. For video, poll `GET /api/v1/jobs/{jobId}` until ready or failed. A successful complete response is not proof that video derivatives are ready.
8. `GET /api/v1/versions/{versionId}/metadata` reads a pinned version's model, prompt, source label/date, production notes and exact grid/reference image-version IDs with `media:read`. Missing creative data remains empty. The response includes a metadata revision and contains no storage keys or signed URLs. Metadata editing is currently an authenticated owner workspace operation: use Fields → Save version metadata. A stale save returns a conflict and retains the draft; reload the workspace to observe edits from another session.

Project/folder creation, folder edit/delete and begin-upload require an `Idempotency-Key` (8–128 letters/digits/dot/underscore/colon/hyphen). Persist it with the exact request. Retry the same operation with the same key/body; a changed body needs a different key. On timeout after begin, replay it with the same key. Uploading alone never publishes to Trailer Feed.

## Production codes

Begin-upload accepts `assetCode` to name a new asset by its shot or deliverable code instead of the generated `VID_YYYYMMDD_nnnnn`:

- Shot `BLR_EP101_PAR_0020`: show · episode (`EP101` = season 1, episode 01) · scene · shot (steps of 10).
- Deliverable `BLR_EP101_EPC` or `BLR_S1_TRL01`: kinds `EPC` episode cut, `TSR` teaser, `TRL` trailer, with an optional two-digit index; `S1` is season level.
- Codes are case-insensitive, stored upper-case and unique within the project (`409` if taken). Never send the take suffix `_v003`; Review Room numbers versions and shows them as `v003`.

## Locked folders (Creative Studio Pro)

A folder created with `{"title":"EP101 — The Late Shift","ownerApp":"creative-studio-pro"}` is **locked** and owned by the credential that created it. The catalog reports `locked`, `ownerApp` and `ownedByCaller` for every folder.

- Only the owning credential may rename, move or delete a locked folder, or create subfolders inside it. Anyone else — Review Room users in the workspace and every other credential — gets `403` with a message naming the folder and its owner app. Moving an ordinary folder that contains someone else's locked folder is refused the same way.
- `DELETE /api/v1/projects/{projectId}/folders/{folderId}?assets=move_to_root|archive_assets` (with `Idempotency-Key`) deletes a locked folder the caller owns. Automation never deletes ordinary folders (`403`). Remove subfolders first (`409`).
- Adding media inside a locked folder is allowed for everyone who can upload to the project.
- Locked folders cannot be connected to Trailer Feed. Copy deliverables into an ordinary folder first and connect that folder.
- Ownership is tied to the credential ID, so revoking the owning credential leaves its folders locked. Keep the Creative Studio Pro credential long-lived.

Portable skill source: `proxmox-home/shared/skills/review-room-api/SKILL.md`. Workstation installation: `~/.codex/skills/review-room-api/SKILL.md`. Example BWS injection: `agent-secrets run --secret=REVIEW_ROOM_AGENT_API_KEY -- <your API client>`; the injected variable has that exact name.
