# Implementation Plan — Frame.io-Inspired Improvements

**Date:** 2026-09-08 (updated second pass)  
**Status:** Implemented on `UI-Advanced` branch — see acceptance checklist below.

**Goal:** Reach a similar *feel* to Frame.io (persistent preview, condensed metadata, collections, inline drawing, subtle gradients, solid notifications) while keeping Review Room's metadata-driven smart views, teal brand, and existing Convex model.

**Principle:** Evolve layout and surfaces — don't rewrite backend or duplicate Frame.io's 40-field pipeline metadata.

### Implemented (2026-09-08)

| Phase | Deliverable | Location |
|-------|-------------|----------|
| 0 | Semantic color tokens + master sheet | `src/app/globals.css`, `docs/design/color-palette.md`, `/dashboard/design/colors` |
| 1 | Three-panel shell, Viewer/Info toggles, resize accent handles | `ReviewWorkspaceShell.tsx`, `WorkspaceResizeHandle.tsx` |
| 1 | Center viewer extracted from inspector | `CenterAssetViewer.tsx`, `VideoInspectorPanel.tsx` |
| 1 | Column-aware preview sizing | `videoPreviewSizing.ts` |
| 2 | Condensing toolbar (Fields / Filter / Group / Sort / Search) | `AssetBrowserToolbar.tsx`, `ProjectFilters.tsx` |
| 2 | Fields visibility popover + inspector Fields tab | `FieldsVisibilityPopover.tsx`, `AssetFieldsPanel.tsx` |
| 3 | Collections table + sidebar + Source Folder flow | `convex/collections.ts`, `AppShell.tsx` collections section |
| 4 | Inline draw from comment composer (images) | `CommentComposer.tsx`, `ImageAnnotationLayer.tsx` |
| 6 | Notification bell popover | `NotificationBell.tsx` |
| 6 | Condensed access trigger (avatar stack) | `ProjectAccessPopover` in `ProjectWorkspace.tsx` |

### Acceptance checklist

- [x] Toggle Viewer/Info off → grid fills workspace
- [x] Drag seam → brand-accent bar while dragging
- [x] Narrow asset column → toolbar condenses to icons
- [x] Fields popover → card metadata updates
- [x] `+` New Collection → Source Folder required → grid populates
- [x] Center viewer bounded on large monitors
- [x] Draw annotation from comment bar (images; video shows playhead hint)

---

## Phase 1 — Workspace layout & preview sizing (highest impact)

**Problem:** Player scales to 75% viewport; no always-visible preview column. User can't see context while browsing.

### 1A. Three-column review layout (desktop)

Introduce a `ReviewWorkspaceLayout` used when an asset is selected on `lg+`:

```
[ App sidebar ] [ Asset grid ] [ Center viewer ] [ Inspector ]
                      ↑              ↑                  ↑
                   flex 1        flex ~1.2          w-80–96
```

- Grid shrinks but stays visible (like Frame.io).
- Center viewer shows `VideoPlayer` or still image with `object-contain` inside `max-h-[calc(100dvh-theme)]`.
- Inspector = slim tabbed panel: **Review** (comments + actions) | **Fields** (metadata).

**Files:** new `ReviewWorkspaceLayout.tsx`; refactor `ProjectWorkspace.tsx`, `VideoDetailsPanel.tsx` (split player out of panel).

### 1B. Fix preview sizing

Replace blunt `75dvh/75vw` with column-aware caps:

```ts
// videoPreviewSizing.ts — proposed
export const CENTER_VIEWER_CLASS =
  "max-h-[min(72dvh,calc(100dvh-8rem))] w-full max-w-full";
export const EXPANDED_PREVIEW_CLASS =
  "max-h-[min(80dvh,calc(100dvh-4rem))] max-w-[min(90vw,1400px)]";
```

- `fitAvailable` in `VideoPlayer` should use **parent box**, not viewport percent.
- Lightbox modes keep fullscreen but letterbox inside max bounds.

### 1C. Resizable splits (optional in 1B)

- Add `react-resizable-panels` or CSS `resize` on column gutters.
- Persist widths in `localStorage` per project.

**Acceptance:** On 27" display, selecting a video shows grid + player + inspector without player filling entire screen.

---

## Phase 2 — Fields inspector (condensed metadata)

**Problem:** Status, tags, uploader, specs scattered in scroll. User wants Frame.io-style filterable fields.

### 2A. Fields tab component

New `AssetFieldsPanel.tsx`:

| Section | Fields (MVP) |
|---------|----------------|
| Essentials | Status, rating, shortlist, asset code, class, duration, resolution |
| Review | Viewed, comment count, needs attention, approved state |
| File | Original filename, mime, uploaded at, uploader |
| Tags | Tag chips (editable admin) |

Controls (from Frame.io):

- Group dropdown: All / Essentials / File / Review
- Filter: All / Empty / Filled
- Search input filtering field labels

### 2B. Move admin controls out of main scroll

- `VideoDetailsPanel` becomes inspector tabs only.
- Approve / Request Changes stay in **Review** tab header (prominent).
- Rating + shortlist as compact row in Fields > Essentials.

**Files:** new `AssetFieldsPanel.tsx`; trim `VideoDetailsPanel.tsx`.

**Acceptance:** Admin can find status + specs without scrolling past player and comment list.

---

## Phase 3 — Collections

**Problem:** Smart views are tabs; Frame.io collections are a navigable, permissioned list.

### 3A. Map collections to existing model (minimal schema)

Option A — **no new tables:** Treat collections as saved smart-view presets + optional `assetClass` filter, stored in `projects` or new `collections` table:

```ts
collections: defineTable({
  projectId: v.id("projects"),
  title: v.string(),
  emoji: v.optional(v.string()),
  query: v.object({ smartView: v.optional(...), assetClass: v.optional(...), tags: v.optional(...) }),
  isPrivate: v.boolean(),
  createdBy: v.id("users"),
  createdAt: v.number(),
})
```

Option B — **reuse smart folders:** Extend asset-class sidebar entries with user-created entries (Phase 2 in PRD).

### 3B. Collections UI

- Sidebar section "Collections" below folders (like Frame.io).
- Table view: Name, Created by, Private toggle, Created on.
- Clicking opens grid filtered to collection query.
- **New Collection** → name + pick smart view rules (status, class, tags).

**Acceptance:** Admin can create "Needs Review" collection visible in sidebar without new tab clutter.

---

## Phase 4 — Inline drawing & comment flow

**Problem:** Image markup lives in fullscreen lightbox; Frame.io draws from comment bar with asset visible.

### 4A. Unified review surface for stills

- In center viewer, enable draw mode toggle (pen icon) — same as Frame.io comment composer.
- Toolbar overlay: color swatches, brush size, undo, clear, save — **floating bottom of viewer**, not lightbox header.
- Keep `ImageAnnotationLayer` logic; change **placement** only.

### 4B. Comment composer upgrade

Extend `CommentComposer.tsx`:

- Timecode chip (video) instead of checkbox — matches Frame.io.
- Icon row: attach, emoji, **draw**, submit.
- Drawing opens annotation mode on center viewer; saved strokes attach to asset (existing mutation).

### 4C. Deprecate or simplify `ImageLightbox`

- Double-click image → center viewer + draw mode, not separate modal.
- Keep lightbox only for true fullscreen on small screens.

**Acceptance:** Reviewer draws on image without leaving comment context; zoom controls optional in viewer chrome.

---

## Phase 5 — Notifications & inbox

**Problem:** Inbox page exists but no bell; user wants notifications "more solid."

### 5A. Notification bell in `AppShell`

- Bell icon with unread count (query `api.inbox.unreadCount` or derive from digests).
- Popover: All | Unread tabs, Mark all read, link to full Inbox.
- Each item: project, asset code, comment snippet, time — click navigates to asset.

### 5B. Harden inbox backend

- `feedbackNeedsAttention` + new comments → notification rows (optional `notifications` table) OR compute from comments query with `readAt` per user.
- Prefer lightweight: mark digest items read in user prefs; don't over-engineer push.

**Files:** `AppShell.tsx`, new `NotificationPopover.tsx`, `convex/inbox.ts` extensions.

**Acceptance:** Bell shows unread feedback; popover matches Frame.io interaction model; Inbox page remains full digest.

---

## Phase 6 — Visual polish (gradients & density)

### 6A. Subtle teal gradients (on-brand)

Add CSS tokens — **not** purple Frame.io clones:

```css
--accent-gradient: linear-gradient(135deg, rgb(20 184 166 / 0.15), rgb(14 116 144 / 0.08));
--accent-gradient-strong: linear-gradient(135deg, #14b8a6, #0e7490);
```

Use sparingly on:

- Sidebar promo / tips card (like Frame.io Drive card)
- Empty states (inbox, no comments)
- Optional: selected project card edge highlight

### 6B. Condense Access / permissions UI

Refactor access popover in `ProjectWorkspace.tsx`:

- Segmented visibility control (Private | Shared | Workspace) — one row.
- Member list: compact rows, inline role badge, remove on hover.
- Add member: single input row (email or domain), no repeated helper text.

### 6C. Toolbar consolidation

Merge appearance controls into one **Appearance** popover (already partially done in `ProjectFilters.tsx`) — match Frame.io's single dropdown pattern.

---

## Suggested build order

| Order | Phase | Effort | User impact |
|-------|-------|--------|-------------|
| 1 | 1A–1B Preview layout + sizing | Large | Fixes #1 pain (scaling) |
| 2 | 4A–4B Inline drawing | Medium | Drawing UX |
| 3 | 2A Fields tab | Medium | Condensed metadata |
| 4 | 5A Notifications bell | Small–Medium | Solid notifications |
| 5 | 3 Collections | Medium | Collections |
| 6 | 6A–6C Visual + Access polish | Small | Gradients + less verbose |

---

## Out of scope (explicit)

- Frame.io AI panel / prompt bar
- 40-field technical metadata / transcoding probes
- Anchored spatial comments on video frames
- Nested subfolders beyond one level
- Replacing smart views with collections (collections complement tabs)

---

## Doc ownership

When implementing, update:

- `02-Design-Spec.md` — §5 panel layout, §6 card, new Collections + Fields sections
- `01-PRD.md` — collections data model if new table
- This folder — mark phases complete with date

---

## Quick reference — key files to touch

| Feature | Primary files |
|---------|---------------|
| Layout | `ProjectWorkspace.tsx`, new layout component |
| Sizing | `videoPreviewSizing.ts`, `VideoPlayer.tsx` |
| Fields | new `AssetFieldsPanel.tsx`, `VideoDetailsPanel.tsx` |
| Collections | `convex/schema.ts`, `AppShell.tsx`, new `CollectionsView.tsx` |
| Drawing | `CommentComposer.tsx`, `ImageAnnotationLayer.tsx`, center viewer |
| Notifications | `AppShell.tsx`, `convex/inbox.ts`, new popover component |
| Gradients | `globals.css`, `AppShell.tsx` promo slots |
