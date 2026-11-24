# Live refresh of the open owner workspace

Status: ready-for-human
Linear: none (branch `live-current-version`; add the ticket ID before this merges)

Creative Studio Pro (CSP) sets an asset's current version (the pick), its review status and a take's exclusion through the automation API, and uploads new takes. An open owner workspace used to show none of that until it was reloaded. It now follows those changes while it is open.

## What the owner sees

- Within about ten seconds, and at once when the window is shown or focused again, the open workspace shows what changed elsewhere in the open project: the current version (its picture, poster and version label, and the "Current" mark in every version picker), review status, rating, shortlist, a take's exclusion, new takes, new assets and removed assets.
- Nothing that is open is lost: project, folder, asset, the take being viewed, scroll, drafts, an upload in progress. There is no reload.
- An asset that shows its current version moves to the new pick. A take chosen on purpose that is not the pick stays on screen; only the "Current" mark moves. A take with unsaved details is never swapped away, and details changed elsewhere do not replace an unsaved draft.
- Nothing is read while the tab is hidden. One read at a time. A failed read says nothing and is tried again on the next interval.

## Making a take current

Choosing a take in the version picker only changes what is displayed. The pick changes with one action beside the picker: **Make current** (it reads "Current" when the viewed take already is the pick). That was already on `main` and is unchanged. It calls `personal.setCurrentVersion`, which stamps the asset's `updatedAt`, so `GET /api/v1/projects/{projectId}/changes` reports the new `currentVersionId` to CSP.

## The read

`GET /api/owner-changes?projectId=<id>&since=<cursor>&known=<count>` (owner session). Answer:

```json
{ "cursor": "1795400000000",
  "assets": [ { "id": "…", "projectId": "…", "folderId": "…", "name": "…", "assetCode": "…", "status": "approved",
                "rating": 0, "shortlisted": false, "viewed": true, "tags": [], "processing": { "assetId": "…", "versionId": "…", "versionNumber": 2, "ready": true } } ],
  "versions": [ { "id": "…", "assetId": "…", "version": 2, "excluded": false, "processingState": "ready" } ],
  "removedAssetIds": [] }
```

- It uses the same change detection as the automation feed (`changedSince` in `convex/lib/seriesAssets.ts`): assets whose `updatedAt` or `versionsUpdatedAt` is after the cursor, each with only its changed takes. A quiet read returns about 70 bytes.
- Rows up to two seconds before the cursor repeat, so everything is applied as an upsert.
- `known` is how many of the project's assets the workspace holds. Only when the project holds a different number does the answer list every asset id (`assetIds`), which is how a plain delete is noticed.
- Only the open project is read. Each project keeps its own cursor, starting from the newest change in the loaded snapshot. Opening another project reads it at once.
- No storage keys, credentials or review-link tokens are in the answer.

## Rules (pure, unit tested in `src/lib/live-refresh.ts`)

- `receivePick`: what one asset does when the server reports its pick (follow, keep the chosen take, ignore a stale report, drop a local "Make current" mark).
- `planLiveRefresh`: merges one project's changes into what is held (takes, added, updated and removed assets, details to replace).
- `observeChanges`: when a read is asked for (interval, wake, hidden, one at a time, failures).
- `liveReader`: one read. A read that started before a change made in this workspace was saved is not used and is asked again a second later, so a local change is never undone by an older answer.

## Not covered

- New, renamed or moved folders, and comments, are not in the read; they still need a reload. An asset added elsewhere into a folder this workspace does not know yet is counted in its project but not listed until reload.
- Only the open project is followed; other projects catch up when opened.
- A held asset's name, code, tags and folder are not updated by the read.
