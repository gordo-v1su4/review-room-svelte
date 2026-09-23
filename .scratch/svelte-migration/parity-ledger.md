> Source inventory note (2026-09-22): legacy paths in this ledger refer to Git commit `301495d`. The Svelte app now lives at the root; historical `web/src/` references map to `src/`. Removing the old frontend does not complete the remaining parity or live acceptance gates.

# Review Room parity ledger

Status: inventory complete; implementation partial. The Svelte surface at the repository root is a device-local session workspace. Explorer, grouped filters, configurable card fields, selection and batch review, real-media playback, review notes, and the metadata inspector are being restored in tested slices. Still markup and viewed state are now locally verified in [still-review-evidence.md](still-review-evidence.md). See the evidence documents for verified behavior. It does not prove Convex auth, persistence, authorization, storage, uploads, public review, or production playback integration. Backend repair remains deferred.

## Access and routes

| Operation | Current source of truth | Required acceptance |
|---|---|---|
| Sign in, sign out, OAuth discovery, profile bootstrap | `/Users/robertspaniolo/Documents/ChatGPT/review-room-black/review-room-svelte/src/components/auth/SignInForm.tsx`; `/Users/robertspaniolo/Documents/ChatGPT/review-room-black/review-room-svelte/convex/auth.ts` | Unauthenticated users reach sign-in; enabled providers are shown; successful auth reaches dashboard; sign-out clears private state; missing app profile has a visible recovery/error path. |
| Auth/loading/denied gate | `/Users/robertspaniolo/Documents/ChatGPT/review-room-black/review-room-svelte/src/components/auth/AdminGate.tsx` | Loading, unauthenticated redirect, and unauthorized states are distinct on desktop and mobile. |
| Dashboard and project routes | `/Users/robertspaniolo/Documents/ChatGPT/review-room-black/review-room-svelte/src/app/dashboard/page.tsx`; `/Users/robertspaniolo/Documents/ChatGPT/review-room-black/review-room-svelte/src/app/dashboard/projects/new/page.tsx`; `/Users/robertspaniolo/Documents/ChatGPT/review-room-black/review-room-svelte/src/app/dashboard/projects/[projectId]/page.tsx` | Deep links, refresh, project switching, create, archive/unarchive and unavailable-project states preserve access rules. |
| Public review route | `/Users/robertspaniolo/Documents/ChatGPT/review-room-black/review-room-svelte/src/app/review/[token]/page.tsx`; `/Users/robertspaniolo/Documents/ChatGPT/review-room-black/review-room-svelte/convex/reviewPublic.ts` | Invalid, expired, and passcode failures reveal no project data; valid token is isolated to its project and permitted assets. |

Roles are enforced by `/Users/robertspaniolo/Documents/ChatGPT/review-room-black/review-room-svelte/convex/lib/access.ts`: global `appUsers.role` is `admin` or `client`; project access is owner/editor/viewer. Private projects require owner or matching access; shared projects use membership/rules; workspace projects grant viewer access. Owner-only mutations must remain owner-only, editor mutations must reject viewers, and public client mutations must remain token-scoped.

## Projects, workspace, and organization

| Operation | Current source | Required acceptance |
|---|---|---|
| List/get/create/update/archive/unarchive projects | `/Users/robertspaniolo/Documents/ChatGPT/review-room-black/review-room-svelte/convex/projects.ts`; `/Users/robertspaniolo/Documents/ChatGPT/review-room-black/review-room-svelte/src/components/project/ProjectWorkspace.tsx` | Title, client, description, banner, brand color, download default, visibility and archive state persist after reload; denied roles cannot mutate. |
| Members and email/domain rules | `convex/projects.ts` (`listMembers`, `addMember`, `removeMember`, `removeAccessRule`); `ProjectWorkspace.tsx` | Owner can add/remove members and rules; role changes affect access immediately; viewer cannot see owner controls. |
| Real folders | `/Users/robertspaniolo/Documents/ChatGPT/review-room-black/review-room-svelte/convex/folders.ts`; `src/components/project/FolderShelf.tsx`; `src/lib/projectFolders.ts` | Create, rename, cover/reset, remove, move assets, date-folder fallback; active folder deletion returns to project root; counts and deep links stay correct. |
| Smart/system collections | `/Users/robertspaniolo/Documents/ChatGPT/review-room-black/review-room-svelte/convex/collections.ts`; `src/components/layout/AppShell.tsx`; `src/lib/collectionFilters.ts` | Collections remain distinct from folders; create/rename/remove, source-folder and filter-rule edits persist; system collections are ensured without blocking the workspace. |
| Workspace preferences | `/Users/robertspaniolo/Documents/ChatGPT/review-room-black/review-room-svelte/convex/workspacePreferences.ts`; `src/components/project/FieldsVisibilityPopover.tsx`; `src/lib/cardFields.ts` | Card field visibility/order is saved and restored per project without resetting selected asset or drafts. |
| Layout and browsing controls | `src/components/project/ProjectFilters.tsx`; `src/components/video/VideoGrid.tsx`; `VideoListView.tsx`; `VideoTableView.tsx`; `src/lib/filters.ts`; `smartViews.ts`; `groupVideos.ts`; `gridLayout.ts`; `mediaSelection.ts` | Grid/list/table/review, search, sort, grouping, status/class/tag/rating/selected/comment filters, density, aspect, thumbnail fit, card info, select-all and shift/meta selection produce equivalent asset sets. Tables use only labelled intentional horizontal scrolling. |

## Media review and decisions

| Operation | Current source | Required acceptance |
|---|---|---|
| Video playback | `/Users/robertspaniolo/Documents/ChatGPT/review-room-black/review-room-svelte/src/components/video/VideoPlayer.tsx`; `web/src/lib/playback/Player.svelte`; `web/src/lib/playback/session.ts` | Play/pause, mute, bounded seek, timecode/frame display, fullscreen, previous/next, loading/error states, and disposal work with real media. Player survives pane/breakpoint changes. |
| Scrubbing contract | `web/src/lib/playback/session.ts`; `web/src/lib/playback/session.test.ts` | During drag, follow continuously, pause and mute; seek exactly on release; restore prior mute and resume state; keyboard arrows/Home/End work; stale/cancelled seeks do not win. Current test proves only a fake media port. |
| Accelerated playback | `web/src/lib/playback/preview.worker.ts`, preview client and GPU renderer; implementation/evidence in `explorer-studio-evidence.md` | Benchmark native against a demux-aware accelerated adapter on named real media/devices; gate by codec/browser capability; dispose frames, bound queues, handle device loss and fall back to native. Record first frame, seek latency and dropped frames. |
| Asset keyboard navigation | `src/lib/mediaNavigation.ts`; `web/src/routes/+page.svelte` | Left/right follows visible order without wrapping or consuming text/control/overlay keys; drafts survive switching. Local grid/table browser evidence: [keyboard-navigation-evidence.md](keyboard-navigation-evidence.md). |
| Still assets | `src/components/video/ImageLightbox.tsx`; `ImageAnnotationLayer.tsx`; `src/lib/media.ts` | `IMG`, `CTX`, and `STB` never receive video controls; still lightbox supports viewed, rating, shortlist, download and permitted markup. |
| Selection/status/rating/viewed | `src/components/video/VideoCard.tsx`; `VideoStatusControl.tsx`; `VideoRatingControl.tsx`; `VideoReviewMode.tsx`; `convex/videos.ts`; `convex/reviewPublic.ts` | Preserve independent workflow status, shortlist, rating, viewed and immutable asset identity; admin/editor and token-scoped client actions have correct permission errors. |
| Annotations and metadata | `src/components/video/ImageAnnotationLayer.tsx`; `AssetFieldsPanel.tsx`; `VideoDetailsPanel.tsx`; `VideoInspectorPanel.tsx`; `convex/videos.ts` | Save/clear/undo annotations, metadata/status edits and feedback acknowledgement persist; drafts survive resize and sheet transitions. |

## Feedback, sharing, ingest

| Operation | Current source | Required acceptance |
|---|---|---|
| Comments | `src/components/comments/CommentList.tsx`; `CommentComposer.tsx`; `convex/comments.ts`; `convex/reviewPublic.ts` | Add time-linked notes, distinguish author role, seek from timecode, react with supported emojis, handle/reopen, and retain unsent draft during resize/mobile sheets. |
| Inbox and notifications | `src/app/dashboard/inbox/page.tsx`; `src/components/layout/NotificationBell.tsx`; `convex/inbox.ts` | Digest links return to exact project/folder/asset context; handled state updates count and survives reload. |
| Share links/public review | `convex/reviewLinks.ts`; `src/app/review/[token]/page.tsx`; `convex/reviewPublic.ts` | Owner creates/list links and passcodes; reviewer name persists; public viewed/rating/shortlist/annotation/status/approve/request-changes/comment operations persist and reflect in authenticated workspace. |
| Upload queue | `src/components/upload/UploadDropzone.tsx`; upload route page | Multi-file picker/drop, valid video/image filtering, asset class, date or explicit folder, progress, per-file errors, retry/cancel and no duplicate records. |
| Storage and processing | `src/app/api/storage/presign-upload/route.ts`; `multipart/route.ts`; `upload/route.ts`; `presign-download/route.ts`; `src/app/api/media/enqueue/route.ts`; `services/media-worker/index.ts` | Credentials stay server-only; signed upload/download URLs work; processing success/failure, thumbnail/sprite generation and retry are visible. Fixture mode cannot satisfy this gate. |

## Responsive acceptance and release gates

Exercise 360, 390, 768, 1024 and 1440 CSS-pixel widths, short landscape, minimum pane widths, and continuous resize. Wide mode may show navigation, media and inspector; compact mode uses a drawer and stacked review surface. Mobile keeps player above comments and primary actions; filters, metadata and secondary controls use sheets. Touch targets need no hover, safe-area padding, focus/Escape behavior and reduced-motion support. No page overflow, and no player remount solely from breakpoint changes. Preserve active asset, playhead, playback state, filters and comment drafts throughout.

Release is blocked until every row has implementation plus user-visible evidence; role and share-link persistence is verified against live backend; uploads/downloads and OAuth are verified; native and supported accelerated playback are measured on real media; keyboard/touch and resize browser checks pass; frontend and backend deployment surfaces are separately verified. React/Next remains the comparison baseline until these gates pass. Nothing in the current local Svelte fixture proves live integration.
