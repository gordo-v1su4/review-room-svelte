# Design Spec — Video Review App

**Companion to:** `00-Creative-Brief.md` (north star, references, tone) and `01-PRD.md` (data model, logic).
**Audience:** senior product designer. Vision and tone live in the brief; this doc is screens, behavior, and the visual system.

---

## 1. Screens

### A. Admin dashboard — project list
Top nav, "Projects" title, "New project" CTA, and a grid of project cards. Each card: banner/thumbnail, title, client name, media count, count awaiting review, count with feedback, last updated, visibility status (Private, Shared, Workspace, or Shared with you). Each card reads as a client-facing collection, not a task-list row. Clean, premium, not dense.

### A1. Admin inbox — feedback digest
Sidebar Inbox shows a simple in-app digest of review notes grouped by project and day. Each digest item shows the project, date, asset code, reviewer, comment body, optional timecode, and whether the related asset still needs attention. It is not a chat app and does not create one noisy message per note; it summarizes feedback and links back to the project.

### B. Admin workspace — the most important screen
- **Project header / banner** — banner image, title, client name/description, "Access," "Share review link," "Upload." Makes the page feel like a portal. Owners use Access to choose Private, Shared, or Workspace visibility and to add exact email or domain rules; non-owners see view/edit affordances based on role.
- **Smart-view tab bar** (§4) directly under the header, with live counts.
- **Toolbar** — search, filter, sort, thumbnail-size toggle, optional "Selected only." Light, never cluttered. Do not put destructive or bulk status-reset actions in this toolbar.
- **Content** — the media grid (default), with project folders shown as first-class items above loose assets.
- **Folder navigation** — the existing app sidebar shows the project root plus one level of project folders.
- **Right-side viewer/details panel** (§5) — opens on card select.

### C. Client review page (`/review/[token]`)
A calmer, stripped subset of the workspace. Header with banner, title, a one-line instruction, optional client name / due note. A clean grid showing thumbnail, title, rating control, comment count, and a card status control (Needs review / In progress / Needs changes / Approved) — no admin metadata. Same viewer panel, simplified to: player, comments, and fields. Rating and shortlist live on the card (and in Fields); status lives on the card. The client never sees the workflow extras (Final, Omit) — only the review statuses.

## 2. Admin vs client

Same components, different surface. **Admin** adds: edit status/tags (status on the card, including admin extras), share link, download settings, folder create/rename/move/cover controls, delete/archive, advanced filters, internal metadata. Uploaded filenames/asset codes are read-only ingest metadata. **Client** sees: watch, rate, shortlist, comment, set card status (Needs review / In progress / Needs changes / Approved), upload media into the project (same destination-folder upload flow), table/grid/review views, download-if-allowed. Clients cannot permanently delete and do not see Omit. Client UI is quieter and uses human labels, never internal status strings.

## 3. Views — trimmed for MVP

Don't design four heavyweight layouts. The card and the right-side panel carry the product; views are arrangements of the same cards.

- **Grid (default, MVP)** — responsive cards, small/medium/large sizing, hover scrub affordance, clear selected state, good empty/loading states. Most-used view.
- **Review / focus (MVP)** — large player with prev/next, metadata, comments, actions; implemented as the *expanded state of the right-side panel*, not a separate screen. Optional filmstrip of nearby videos.
- **Image fullscreen markup (MVP)** — double-clicking a still image opens a fullscreen review surface with compact drawing controls. Keep it minimal: color swatches, brush size, undo, clear, save, rating, shortlist, and close. Saved strokes render over the image and appear on its grid thumbnail with a red pen indicator.
- **Focused review (MVP)** — double-clicking a media card gives the asset the main workspace, hiding the explorer and project navigation. Keep the same player mounted so playback and position survive expansion. Project → folder → asset breadcrumbs provide a return to the unchanged folder selection and filters. An explicit Expand review control supports keyboard and touch users. Notes & info toggles the feedback inspector; Return to folder or Escape restores browsing.
- **Grouped (optional, low cost)** — the smart views rendered as stacked sections (each a wrapping row of the *same* cards). Communicates "generated from metadata," not a board. Avoid column-and-drag as the primary metaphor; drag is the optional override from PRD §4.
- **Table (MVP / operational)** — compact ShotGrid/FTrack-style production view powered by TanStack Table. Shows thumbnail/latest visual, asset code/name, asset class, a status dropdown (same card statuses, including admin extras), shortlist bookmark, review attention state (read-only), rating, note count, and latest note. Changing status or the bookmark on a multi-selected row applies to every selected item. Feedback is not edited here. At project root, Table is the all-project action board; folder and smart-folder selections narrow it. Prefer fitting the working columns in the available width over a wide spreadsheet scroll.

## 4. Smart-view tabs

A horizontal tab bar under the header, each with a count badge, filtering the grid. These are saved views, not project-management columns.

```
All 42 │ Awaiting Review 18 │ In Review 6 │ Has Feedback 7 │ Selected 5 │ Highly Rated 9 │ Needs Changes 2 │ Approved 3 │ Final 1
```
Tab definitions and which ones accept drops are in PRD §4–5.

## 5. Right-side viewer / details panel

The second-most-important component after the card. Collapsible, integrated into the dark workspace — **not** a white modal.
- **Contents:** Comments and Fields only. The player lives in the center viewer. Comments is the thread and composer. Fields holds metadata, rating, and shortlist. Status, stars, and bookmark stay on the card (and rating/shortlist also appear in Fields). Do not put Approve / Request Changes, Mark for delete, or Delete video in this panel. Omit is a status (red). Permanent delete is **Actions → Delete selected** after multi-select, distinct from Clear media (wipe all). Do not duplicate the uploaded asset name in a form field.
- **Selected asset deletion:** the selected-assets bar exposes Actions → Delete selected to the owner, including when one clip is checked. The confirmation lists the captured clip names, explains permanent removal and publication impact, and offers Cancel and Delete permanently. Keep it open with an error when deletion fails, disable repeated submission while pending, and remove only successfully deleted assets while retaining the current project and collection.
- **Selection toolbar:** keep one row at every explorer width. Hide text labels below 620px of pane width, retaining named icons and desktop tooltips. Selection count remains announced to assistive technology; checked cards carry the visible state. Show Select all once, not both above and below selected actions. Shortlist is one bookmark toggle: remove when every checked asset is shortlisted, otherwise add the whole selection. Status and rating share a bounded, scrollable Review menu with neutral highlights; tags use a compact 32px field. Phone layouts keep 44px toolbar targets. Selection and shortlist accents use teal. Card selection uses a compact square teal checkbox with a check mark; the shortlist overlay matches the 16px Shortlist toolbar icon. Table checkboxes use teal as well.
- **Review navigation:** playback mode (Once / Loop / Order) sits alongside Previous / Next below the player, outside the video's native transport and title. Narrow players move frame stepping and restart into a More playback controls menu to keep transport on one row. Desktop pane dividers have 4px visible grips and 14px pointer targets. Hovering anywhere along a boundary moves the grip to the pointer height; dragging locks its height until release. Both dividers retain keyboard resizing, and focused review can resize viewer / feedback independently without changing the browsing layout.
- **States:** closed (grid full width) · open (grid left, panel right) · expanded (player dominant) · optional fullscreen playback.
- **Expanded sizing:** expanding the panel uses the same centered 75%-of-viewport footprint as the video quick preview. The complete player, timeline, and playback controls must fit inside the visible panel before metadata scrolling begins; preserve the media aspect ratio with letterboxing when necessary instead of making the user scroll to see the top or bottom of the frame.
- Smooth, fast open/close. Prefer this panel and drawers/popovers over blocking modals everywhere.

## 6. Video card — the core object

**Priority hierarchy:** thumbnail → title → status/review state → rating/select/approved → tags/comments → secondary metadata. Small cards show less; large cards show more. Never overcrowd.

**Shows:** thumbnail or scrub frame; optional duration/type label; title; a Status footer with the current review state as a colored badge (Needs review / In progress / Needs changes / Approved); tags; rating; comment count; selected indicator; optional download icon. Clicking Status on the card changes the decision in place. Approved is a status, not a second control.

**Hover scrub:** when a scrub sprite or preview cache exists, horizontal pointer movement over the thumbnail should seek the visible frame immediately. It should feel like FreeCut's media grid: no popover, no heavy player chrome, just quick visual inspection. Still images do not show a scrub cursor. If the preview is still processing, keep the thumbnail/processing state stable.

**Image markup:** still-image cards render saved drawing strokes over the thumbnail and show a small red pen indicator when markup exists. The pen opens the fullscreen markup view; the original image remains unchanged.

**Video review:** single-click opens the side viewer. Double-click opens focused review; the folder breadcrumb returns to browsing without clearing its selection or filters.

**States to design:** default · hover · selected · viewed · commented · approved · needs-changes · uploading · processing-thumbnail · error/missing.

**Scrim treatment (important):** thumbnails vary wildly in brightness and hue, so a grid of them can read as chaotic against neutral chrome. Apply a consistent subtle bottom gradient scrim behind on-thumbnail text/pills and keep pill styling uniform, so the grid stays calm no matter what's in the frames.

## 7. Review actions — a deliberate hierarchy

Four signals exist, but they are **not** peers. Show the hierarchy in the UI so the client always knows which action "counts":
- **Rating (0–5)** — a quiet preference signal. Minimal: clean stars, dots, or a small segmented control. Not playful hearts.
- **Shortlist / Select** — a quiet "this is a pick" toggle.
- **Status on the card** — *the* decision. Needs review, In progress, Needs changes, and Approved share one dropdown on the card. Admin extras (Not started, Final, Omit) sit under More. Omit is red and replaces mark-for-delete. The inspector is comments and fields.

A heart/favorite may exist as an internal admin marker, but client-facing language stays professional.

## 8. Comments

Simple and fast: a box, an "Add comment" button, and an optional "use current time" toggle for video that pins the comment to the playhead and seeks back on click. Still images hide the time toggle. List below with author initials, name, production/reviewer color, and time when applicable. Comment count appears on the card; an asset with comments visually reads as "feedback received." New comments also mark the asset as needing attention until an admin reviews it. Admins can react with a tiny fixed emoji set (thumbs up, thumbs down, fire, heart) or mark comments handled instead of replying when acknowledgement is enough. In table view, favor open notes from the other side and collapse extra history behind "N more notes" rather than turning the row into a full transcript. No threading in MVP.

## 9. Upload

Sleek, no per-asset form. Drag-drop area, multi-file video and image uploads, bounded parallel uploads, per-file progress; states for success / failed / processing-thumbnail / ready. The upload page shows the destination folder before files are chosen: opening upload from inside a real folder preselects that folder, while the default remains today's flat date folder. Admins can change the destination before dropping or choosing files through a restrained dark destination menu whose selected and hover states use the teal accent, not the browser/OS default blue. Assets appear in the grid quickly after upload, and admin-side local previews may appear before remote derivatives finish when the browser still has the dropped files.

## 10. Scenes / Analyze (Phase 2)

A FreeCut-inspired Scenes view can sit beside Media when Phase C lands. It is a review/search surface: caption rows with small thumbnails, source filename, timecode, search, and click-to-seek. It should resemble the attached FreeCut references in spirit — dense, useful, calm — but remove editor controls, track controls, and timeline authority. Captions are aids for finding moments, not decisions.

## 11. Filtering & sorting

Available but visually light — file-type toggles in the main toolbar, a filter popover, active-filter chips, and "clear all," plus the smart-view tabs as the fast path. Dropdown menus use the shared dark popover treatment with subtle teal selected and hover states, never the browser/OS default blue. **Filters:** media type (video/image first, extensible later), status, review state/facets, tags, rating, selected, has-comments, uploaded/updated date. **Sorts:** newest, oldest, status, rating high→low, title, recently reviewed, most comments.

## 11a. Folders

Folders are lightweight one-level project organization, not a replacement for smart views. Uploads default into a flat `YYYYMMDD` date folder unless the admin opens upload from inside a real folder or chooses a folder in the upload destination control. Do not create nested Videos/Images/Contact Sheets folders inside a date folder; use `VID`, `IMG`, `CTX`, and `STB` asset-class filters instead. The sidebar can show master collections such as Videos, Images, Contact Sheets, and Storyboards as automatic metadata views. These smart folders must look distinct from real folders, auto-count their contents, and not accept drag/drop, rename, delete, or manual placement. Later client bundles/playlists can use the same pattern for saved groupings without moving files. The project root shows folder tiles above loose assets; opening a folder scopes the grid and smart-view counts to that folder. Admins can create and rename root-level date/manual folders, upload/reset a folder cover image from the folder edit control, and drag media cards onto folder tiles or the existing app sidebar folder entries to move assets. Folder covers fall back to the newest image asset inside the folder when no custom cover is set. The sidebar root entry accepts drops to move assets back out of a folder. Clients see folder names/covers but do not get folder edit or drag/drop management controls. Client review links can remain grid-first unless folder navigation is explicitly enabled later.

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
- **Brand accent** (`project.brandColor`) — carries through the banner, upload CTA, selected project/folder navigation, active workspace controls, and a restrained tint in the smoked folder artwork. Selected sidebar destinations share one borderless, dark gradient. Controls have a faint brighter top edge and quieter sides/bottom; never a uniform saturated outline. Papers and uploaded covers retain their own colors. Never recolor review status or approval actions.
- **Semantic palette** (fixed, restrained, brand-independent): `success` (approved), `warning` (needs changes), `info`/`selected`, `danger` (error), plus neutral pills for in-progress states. Status pills always draw from here.

The media thumbnails provide essentially all the saturated color on screen; chrome stays neutral. Define tokens: `background, surface, surfaceElevated, border, borderSubtle, textPrimary, textSecondary, textMuted, brandAccent, success, warning, info, danger, selected, approved`.

### Card / grid style
Dark cards on dark canvas, soft borders, subtle hover, thumbnail-first, minimal metadata, small status pills, off-white type, muted gray secondary. Polished media tiles, not database rows.

## 13. Component inventory (align names with dev)

`ProjectHeader` · `ProjectBanner` · `ProjectViewSwitcher` (smart-view tabs) · `ProjectFilters` · `VideoGrid` · `VideoCard` · `VideoHoverScrubPreview` · `VideoGroupedView` · `VideoTableView` · `VideoDetailsPanel` · `VideoPlayer` · `ReviewMediaEngine` (Phase B adapter) · `SceneAnalysisPanel` (Phase C) · `VideoRatingControl` · `VideoStatusPill` · `VideoTagList` · `VideoActionsMenu` · `UploadDropzone` · `MediaIngestQueue` · `CommentList` · `CommentComposer` · `TimecodeCommentButton` · `AppShell`.

## 14. Interaction states & motion

States to specify across components: hover · selected · focus · disabled · uploading · error · reviewed · approved. Motion is smooth and quiet — panel open/close, card hover, tab switches. Optimistic UI where safe. Skeleton thumbnails on load. Persistent playback controls. Minimal blocking modals.

The review toolbar groups a bookmark Shortlist control beside the rating stars. Both fill with teal when selected. Request changes, Approve, and asset navigation sit together on the right, wrapping as a group on narrow screens. Icon controls retain 44px touch targets on coarse-pointer devices.

## 15. Responsive intent

Use the same routes and functionality on desktop, tablet, and phone; no separate mobile site. Preserve the calm desktop visual system while changing the arrangement to fit the available space.

Workspace menus share a dark 80% opaque blurred surface, a subtle outer border, and small corner radii. Options use flat fills without individual outlines, consistent row heights and gaps, and white text over muted brand teal for selected non-status options. Status choices use the same semantic colors as media status badges. Appearance switches use the Upload CTA's brand teal; the layout switcher is a single segmented surface without outlined segments. Review-link readiness uses a distinct green indicator.

The mobile project gradient continues behind the menu button, without a separate brand label or bottom header divider. The navigation drawer slides in from the left with an 80% opaque blurred background and an RR-only logo at its top left. Desktop collapse controls sit at the right of the Review Room wordmark, using a restrained sidebar icon with no idle background or border and a subtle hover highlight. Collapsing removes the sidebar width and leaves a slim 28×82px Menu tab on the workspace’s left edge to reopen it, with a faint outline, a short blue accent line, and an upward-reading label. The notification bell sits at the far right beside Account; the live account popover reports the authenticated workspace-owner state. Icon controls carry descriptive hover titles; account actions have bottom breathing room on both layouts. Sign-in forms stay narrow on desktop and phone, with compact fields and a single primary action; touch targets expand on phones. Only configured, working sign-in methods appear. The white RR logo uses varied grayscale glitch slices on hover.

On phones, Review mode tucks secondary tools behind a toggle and sizes the player and primary controls to the remaining viewport. Comments and nearby media follow below. Card ratings occupy their own row to avoid overlapping thumbnail actions.

- **Navigation:** below 1024px, a labelled menu opens a focus-managed drawer with Projects, Inbox, notifications, project folders, collections, and account actions. Folder management and new-project controls retain their existing role restrictions. Selecting a destination closes the drawer.
- **Workspace switcher:** the sidebar identity uses a borderless, single-line name with a downward chevron immediately after it, matching the quiet Codex navigation reference. The wordmark, workspace name, and sidebar section headings share the same left text edge. The menu uses the same smoked panel treatment as Import options and the same restrained teal selection fill as the existing selects. It lists V1su4 as selected and shows Buzero as a disabled “Coming soon” option until its projects and access are connected. The same control appears in the mobile drawer.
- **Project header and toolbar:** the project title keeps its own space; actions move to a separate row on phones. Below 640px, Grid / Group / Table / Review form a full-width switcher, with appearance, fields, filters, search, and sort on a second row. Controls wrap instead of clipping. Popovers scroll within the available viewport height.
- **Media browsing:** grid tracks respond to the available pane width, including when a desktop inspector is open. Small screens use larger rating targets and expose thumbnail actions without hover. Table columns retain readable widths inside a labelled horizontal scroll region rather than squeezing into unreadable columns.
- **Review:** desktop retains resizable panes. Below 1024px, Review mode uses a stacked player, review controls, comments/fields, and nearby-media strip. Selecting a card opens a fullscreen phone dialog or tablet side drawer, with comments below a viewport-bounded player. The dialog supports Escape, focus containment, and an explicit close button; desktop panel visibility preferences never suppress mobile review access.
- **Previews:** video previews fill the phone/tablet viewport with aspect-preserving media and visible playback controls; desktop retains the centered viewport-bounded preview. Image markup controls wrap below the title on smaller screens, and the image fits the space remaining below them.
- **Short landscape screens:** the workspace can scroll past its header, keeping a usable media area instead of collapsing the content height. Safe-area padding protects the bottom of mobile drawers. Reduced-motion settings suppress nonessential transitions; touch-device text inputs use a readable size without focus zoom.

> Measurements (card widths, panel width, paddings, header height, grid density) are the designer's to set — pick what serves the density and calm the brief calls for. No fixed pixel values are prescribed here.

## 16. Empty / loading / error states

Design these as first-class, not afterthoughts. *No media:* "Upload your first media to start a review." → Upload. *No filter results:* "No media match these filters." → Clear filters. *No comments (admin):* "No feedback yet." *(client):* "Leave a note when you're ready." *Uploading:* "Uploading 3 files..." with progress.

In the signed-in workspace, processing badges and media metadata update automatically while the page stays open. A current attempt becoming ready refreshes its thumbnail and retries its unavailable playback source. Processing updates preserve the current project/folder, selected asset, comment draft and usable playback position. Transient observation failures retain usable media and recover; retry/refresh processing controls do not reload the page.

## 17. Design priorities (if time is short)

1. Admin workspace → 2. Client review page → 3. Video card system → 4. Right-side viewer panel → 5. Rating/comment/approval interactions → 6. Filters + smart-view tabs → 7. Upload states → 8. Table view → 9. Grouped (stacked) view → 10. Mobile refinements.

The **video card** and the **right-side viewer** are the two components everything else hangs on.
