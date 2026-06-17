# Design Spec — Video Review App

**Companion to:** `00-Creative-Brief.md` (north star, references, tone) and `01-PRD.md` (data model, logic).
**Audience:** senior product designer. Vision and tone live in the brief; this doc is screens, behavior, and the visual system.

---

## 1. Screens

### A. Admin dashboard — project list
Top nav, "Projects" title, "New project" CTA, and a grid of project cards. Each card: banner/thumbnail, title, client name, media count, count awaiting review, count with feedback, last updated, visibility status (Private, Shared, Workspace, or Shared with you). Each card reads as a client-facing collection, not a task-list row. Clean, premium, not dense.

### B. Admin workspace — the most important screen
- **Project header / banner** — banner image, title, client name/description, "Access," "Share review link," "Upload." Makes the page feel like a portal. Owners use Access to choose Private, Shared, or Workspace visibility and to add exact email or domain rules; non-owners see view/edit affordances based on role.
- **Smart-view tab bar** (§4) directly under the header, with live counts.
- **Toolbar** — search, filter, sort, thumbnail-size toggle, optional "Selected only." Light, never cluttered.
- **Content** — the media grid (default), with project folders shown as first-class items above loose assets.
- **Folder navigation** — the existing app sidebar shows the project root plus one level of project folders.
- **Right-side viewer/details panel** (§5) — opens on card select.

### C. Client review page (`/review/[token]`)
A calmer, stripped subset of the workspace. Header with banner, title, a one-line instruction, optional client name / due note. A clean grid showing thumbnail, title, rating control, comment count, and selected/approved state — no admin metadata. Same viewer panel, simplified to: player, comment box, rating, shortlist, **Approve / Request Changes**, download if enabled. The client never sees the workflow machinery — only clear actions.

## 2. Admin vs client

Same components, different surface. **Admin** adds: upload, edit status/tags/title, share link, download settings, delete/archive, advanced filters, internal metadata. **Client** sees only: watch, rate, shortlist, comment, Approve / Request Changes, download-if-allowed. Client UI is quieter and uses human labels, never internal status strings.

## 3. Views — trimmed for MVP

Don't design four heavyweight layouts. The card and the right-side panel carry the product; views are arrangements of the same cards.

- **Grid (default, MVP)** — responsive cards, small/medium/large sizing, hover scrub affordance, clear selected state, good empty/loading states. Most-used view.
- **Review / focus (MVP)** — large player with prev/next, metadata, comments, actions; implemented as the *expanded state of the right-side panel*, not a separate screen. Optional filmstrip of nearby videos.
- **Grouped (optional, low cost)** — the smart views rendered as stacked sections (each a wrapping row of the *same* cards). Communicates "generated from metadata," not a board. Avoid column-and-drag as the primary metaphor; drag is the optional override from PRD §4.
- **List (Phase 2)** — compact production view; may use TanStack Table internally but must read as a media list (thumbnail, tasteful spacing, pills, row hover), never a raw spreadsheet. Deferred.

## 4. Smart-view tabs

A horizontal tab bar under the header, each with a count badge, filtering the grid. These are saved views, not project-management columns.

```
All 42 │ Awaiting Review 18 │ In Review 6 │ Has Feedback 7 │ Selected 5 │ Highly Rated 9 │ Needs Changes 2 │ Approved 3 │ Final 1
```
Tab definitions and which ones accept drops are in PRD §4–5.

## 5. Right-side viewer / details panel

The second-most-important component after the card. Collapsible, integrated into the dark workspace — **not** a white modal.
- **Contents:** large player; title; status; tags; rating; shortlist toggle; **Approve / Request Changes**; comments; download (if enabled); admin-only controls when admin.
- **States:** closed (grid full width) · open (grid left, panel right) · expanded (player dominant) · optional fullscreen playback.
- Smooth, fast open/close. Prefer this panel and drawers/popovers over blocking modals everywhere.

## 6. Video card — the core object

**Priority hierarchy:** thumbnail → title → status/review state → rating/select/approved → tags/comments → secondary metadata. Small cards show less; large cards show more. Never overcrowd.

**Shows:** thumbnail or scrub frame; optional duration/type label; title; small status pill; tags; rating; comment count; selected/approved/needs-changes indicator; optional download icon.

**Hover scrub:** when a scrub sprite or preview cache exists, horizontal pointer movement over the thumbnail should seek the visible frame immediately. It should feel like FreeCut's media grid: no popover, no heavy player chrome, just quick visual inspection. Still images do not show a scrub cursor. If the preview is still processing, keep the thumbnail/processing state stable.

**States to design:** default · hover · selected · viewed · commented · approved · needs-changes · uploading · processing-thumbnail · error/missing.

**Scrim treatment (important):** thumbnails vary wildly in brightness and hue, so a grid of them can read as chaotic against neutral chrome. Apply a consistent subtle bottom gradient scrim behind on-thumbnail text/pills and keep pill styling uniform, so the grid stays calm no matter what's in the frames.

## 7. Review actions — a deliberate hierarchy

Four signals exist, but they are **not** peers. Show the hierarchy in the UI so the client always knows which action "counts":
- **Rating (0–5)** — a quiet preference signal. Minimal: clean stars, dots, or a small segmented control. Not playful hearts.
- **Shortlist / Select** — a quiet "this is a pick" toggle.
- **Approve / Request Changes** — *the* decision. This binary pair is the one prominent control in the client panel.

A heart/favorite may exist as an internal admin marker, but client-facing language stays professional.

## 8. Comments

Simple and fast: a box, an "Add comment" button, and an optional "use current time" toggle for video that pins the comment to the playhead and seeks back on click. Still images hide the time toggle. List below with author + time when applicable. Comment count appears on the card; an asset with comments visually reads as "feedback received." No threading in MVP.

## 9. Upload

Sleek, no per-asset form. Drag-drop area, multi-file video and image uploads, bounded parallel uploads, per-file progress; states for success / failed / processing-thumbnail / ready. Assets appear in the grid quickly after upload, and admin-side local previews may appear before remote derivatives finish when the browser still has the dropped files.

## 10. Scenes / Analyze (Phase 2)

A FreeCut-inspired Scenes view can sit beside Media when Phase C lands. It is a review/search surface: caption rows with small thumbnails, source filename, timecode, search, and click-to-seek. It should resemble the attached FreeCut references in spirit — dense, useful, calm — but remove editor controls, track controls, and timeline authority. Captions are aids for finding moments, not decisions.

## 11. Filtering & sorting

Available but visually light — file-type toggles in the main toolbar, a filter popover, active-filter chips, and "clear all," plus the smart-view tabs as the fast path. **Filters:** media type (video/image first, extensible later), status, review state/facets, tags, rating, selected, has-comments, uploaded/updated date. **Sorts:** newest, oldest, status, rating high→low, title, recently reviewed, most comments.

## 11a. Folders

Folders are lightweight one-level project organization, not a replacement for smart views. The project root shows folder tiles above loose assets; opening a folder scopes the grid and smart-view counts to that folder. Admins can create root-level folders and drag media cards onto folder tiles or the existing app sidebar folder entries to move assets. The sidebar root entry accepts drops to move assets back out of a folder. Client review links can remain grid-first unless folder navigation is explicitly enabled later.

## 12. Visual direction & token system

**Dark mode first; make it excellent.** Light mode is optional and deferred; if built later it stays neutral white/gray, never bright SaaS.

**Mood:** dark · minimal · editorial · premium · calm · cinematic · media-forward. **Not:** bright SaaS · colorful dashboard · playful social app · admin panel · spreadsheet.

### Neutral ramp — zinc or neutral, never slate
Build the black-and-white field from Tailwind **zinc** (preferred) or **neutral**. Avoid slate (it skews blue). Use layered dark surfaces for depth — not flat pure-black.

| Token | Suggested (zinc) | Role |
|---|---|---|
| `background` | `zinc-950` / near-black | app canvas |
| `surface` | `zinc-900` | main surfaces |
| `surfaceElevated` | `zinc-900`→`zinc-800` | cards, panel |
| `border` | `zinc-800` | default borders |
| `borderSubtle` | `zinc-800/60` | hairlines |
| `textPrimary` | `zinc-50` | primary text |
| `textSecondary` | `zinc-300` | secondary |
| `textMuted` | `zinc-400` | metadata |
| `hover` | `zinc-800` | hover surface |

### Color discipline — brand ≠ semantic
Two separate, non-overlapping color sources (this avoids the clash where a per-project accent fights the status pills):
- **Brand accent** (`project.brandColor`) — used *only* for branding: banner treatment and the primary CTA. Never for status.
- **Semantic palette** (fixed, restrained, brand-independent): `success` (approved), `warning` (needs changes), `info`/`selected`, `danger` (error), plus neutral pills for in-progress states. Status pills always draw from here.

The media thumbnails provide essentially all the saturated color on screen; chrome stays neutral. Define tokens: `background, surface, surfaceElevated, border, borderSubtle, textPrimary, textSecondary, textMuted, brandAccent, success, warning, info, danger, selected, approved`.

### Card / grid style
Dark cards on dark canvas, soft borders, subtle hover, thumbnail-first, minimal metadata, small status pills, off-white type, muted gray secondary. Polished media tiles, not database rows.

## 13. Component inventory (align names with dev)

`ProjectHeader` · `ProjectBanner` · `ProjectViewSwitcher` (smart-view tabs) · `ProjectFilters` · `VideoGrid` · `VideoCard` · `VideoHoverScrubPreview` · `VideoGroupedView` · `VideoDetailsPanel` · `VideoPlayer` · `ReviewMediaEngine` (Phase B adapter) · `SceneAnalysisPanel` (Phase C) · `VideoRatingControl` · `VideoStatusPill` · `VideoTagList` · `VideoActionsMenu` · `UploadDropzone` · `MediaIngestQueue` · `CommentList` · `CommentComposer` · `TimecodeCommentButton` · `AppShell`. (`VideoList` deferred with the List view.)

## 14. Interaction states & motion

States to specify across components: hover · selected · focus · disabled · uploading · error · reviewed · approved. Motion is smooth and quiet — panel open/close, card hover, tab switches. Optimistic UI where safe. Skeleton thumbnails on load. Persistent playback controls. Minimal blocking modals.

## 15. Responsive intent

Desktop-first, degrade gracefully — don't make mobile impossible. **Tablet:** fewer grid columns; panel becomes an overlay drawer. **Mobile:** cards stack, viewer goes fullscreen, filters collapse to a menu, comments sit below the video.

> Measurements (card widths, panel width, paddings, header height, grid density) are the designer's to set — pick what serves the density and calm the brief calls for. No fixed pixel values are prescribed here.

## 16. Empty / loading / error states

Design these as first-class, not afterthoughts. *No media:* "Upload your first media to start a review." → Upload. *No filter results:* "No media match these filters." → Clear filters. *No comments (admin):* "No feedback yet." *(client):* "Leave a note when you're ready." *Uploading:* "Uploading 3 files..." with progress.

## 17. Design priorities (if time is short)

1. Admin workspace → 2. Client review page → 3. Video card system → 4. Right-side viewer panel → 5. Rating/comment/approval interactions → 6. Filters + smart-view tabs → 7. Upload states → 8. Grouped (stacked) view → 9. List view (Phase 2) → 10. Mobile refinements.

The **video card** and the **right-side viewer** are the two components everything else hangs on.
