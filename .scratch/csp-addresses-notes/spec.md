# Addresses, a link back to Creative Studio Pro, and a notes read

Status: ready-for-human
Linear: none yet (branch `csp-addresses-notes`; add the ticket ID before this merges)

Creative Studio Pro (CSP) sends people into Review Room and reads their notes back. Three additions make that possible. All are additive: no existing request, response or stored row changes shape.

## A. Addresses for the owner workspace

What is open is written to the address bar, so a link or a reload lands on the same thing.

`/?project=<projectId>&folder=<folderId>&asset=<assetId or asset code>&version=<versionId or v003>&t=<seconds>`

- Every part is optional. An unknown, archived or foreign part is dropped and the deepest part that exists is opened.
- An asset code is looked up only inside the given project. An asset ID alone is enough to find its project.
- Without `folder`, a linked asset opens in the folder it lives in.
- `version` is absent while the asset follows its current version. `t` seeks a video once and is dropped when another asset is opened.
- The workspace writes the address with shallow routing (`replaceState`); the server load does not depend on the URL, so the snapshot is not refetched.
- Signed out: `/` with an address redirects to `/studio/sign-in?next=<path>`, and sign-in returns there. `next` must be a same-origin path (one leading `/`, no `//`, scheme, backslash or control character). Bare `/` still redirects to `/studio/sign-in`.
- Other params (`sharing=1`) are preserved.

Rules live in `src/lib/workspace-address.ts` and `src/lib/return-path.ts` (pure, unit tested).

## B. Link back from a locked folder

`projectFolders.externalUrl` (optional) is the folder's page in the owning app.

- Sent as `externalUrl` on folder create (with `ownerApp`) and on folder edit (alone, or with `title`/`parentFolderId`); `null` on edit clears it.
- Only the credential that owns the locked folder may set or clear it (`403` otherwise). `https:` only, no username or password, at most 500 characters (`400` otherwise).
- The catalog returns `externalUrl` (string or `null`) for every folder.
- The workspace shows "Open in Creative Studio Pro" beside the folder header and in the locked note of the folder dialog.

## C. Notes read

`GET /api/v1/assets/{assetId}/notes` (`media:read`) returns the asset's reviewer comments, oldest first. Notes belong to the asset, not to a version.

```json
{ "assetId": "…", "assetCode": "BLR_TR100_SHT_0010",
  "notes": [ { "id": "…", "body": "…", "timecodeSec": 12.5, "authorName": "…", "authorRole": "client", "createdAt": 1795400000000, "completedAt": null } ] }
```

Unknown asset or archived project: `404`. Wrong scope or a credential restricted to another project: `403`.

## Out of scope

- No version on a note. No write endpoint for notes.
- Collection, shortlist, archived and focused-review views are not part of the address.
- No deploy. A merge to `main` deploys the app and its Convex functions.
