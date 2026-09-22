# Local folder covers

Verified 2026-09-22. Frontend/local-session evidence only. No backend request, upload, persistence or live authorization claim.

## Implemented

- Folder settings → Folder cover opens a focus-managed editor with current preview, Choose image, and Use automatic cover. The chooser changes only the cover, not the media collection.
- Automatic resolution preserves the original `FolderShelf.tsx:447–461` precedence: newest in-folder image, then newest available video poster. Other projects/folders and archived assets are excluded. Explicit custom image wins until reset.
- Reset clears custom cover and any legacy explicit asset pin, so automatic actually means automatic. Model changes remain admin-only and require editable project access, matching `convex/folders.ts:84–104`.
- Custom images are decoded before commit and downsampled to at most 512 pixels on either edge. Failed decoding preserves the existing cover. Source, replaced, reset, deleted, rejected and unmounted object URLs are released. Per-folder request tokens prevent a late decode from overwriting a newer choice or deleted folder.
- The local model holds ephemeral presentation URLs; the live backend still holds `coverImageKey`. No backend schema or contract changed.
- FolderArtwork retains its 240×213 viewBox and original outer/front paths, with a restrained inset cover window. Empty folders still omit the paper stack; an explicitly selected custom image is independent of item count.
- Fixed focus restoration in the shared folder-dialog path: a bound menu trigger replaces unreliable click-event capture.

## Evidence

- Public folder-state tests fail before implementation, then pass for custom cover set/reset permissions and automatic cover selection. The reset legacy-pin edge was reproduced with a failing test and fixed.
- Full suite: 66 pass, 0 fail, 304 assertions. Final check: 0 Svelte errors/warnings. Final build passes. Deployment adapter configuration remains open.
- Official Svelte autofixer reports no issues for FolderActions, FolderArtwork or parent route. Advisories are existing selection reconciliation/bindings and the deliberately non-rendering request-token Map.
- Read-only second-agent review checked URL disposal, stale completion, permission checks and unchanged artwork dimensions. Its legacy-pin reset finding was addressed.
- IAB real media: auto preview uses the imported 1200×900 image; custom reference JPG produces a 512×288 cover, leaving collection count at two. A deliberately invalid JPEG fixture shows an actionable error and preserves the prior custom cover URL. Reset returns to the automatic 1200×900 image.
- IAB 390×844 touch: dialog is 362px wide at x=14, all cover action buttons 44px high, document width/scrollWidth both 390. Temporary emulation restored.
- Final-build browser check: empty Finals folder says No cover image; Escape returns focus to the exact Folder settings for Finals button. Importing only the real Downloads video generates a poster and renders it on that folder's artwork. All artwork viewBoxes remain 0 0 240 213. Preview left open with real footage.

## Remaining work

Folder drag/drop shortcuts, custom collections, project administration, measured playback performance, broad accessibility/resize acceptance and live integration/release gates remain open. Do not infer live cover storage or authorization from local-session results.
