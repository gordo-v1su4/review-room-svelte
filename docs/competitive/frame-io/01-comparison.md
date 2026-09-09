# Frame.io vs Review Room — Gap Analysis

**Date:** 2026-09-08  
**Our references:** `init-docs/00-Creative-Brief.md`, `01-PRD.md`, `02-Design-Spec.md`

Legend: ✅ exists · 🟡 partial · ❌ missing · ➖ intentional skip

---

## Layout & workspace

| Area | Frame.io | Review Room today | Gap |
|------|----------|-------------------|-----|
| Persistent center viewer | ✅ Always-visible player between grid and panel | 🟡 Right `VideoDetailsPanel` only; no center column | **Major** — user called out scaling issues |
| Resizable panels | ✅ Drag handles | ❌ Fixed 420px panel | **Major** |
| Panel toggles | ✅ Viewer / Info / AI | 🟡 Close panel only | Medium |
| Mobile panel | Bottom sheet | ✅ Bottom sheet on small screens | OK |
| Breadcrumbs | ✅ | 🟡 Folder path in sidebar, not breadcrumb bar | Low |

**Our code:** `ProjectWorkspace.tsx`, `VideoDetailsPanel.tsx`, `videoPreviewSizing.ts`

**Problem:** `VIDEO_PREVIEW_VIEWPORT_CLASS` uses `h-[75dvh] w-[75vw]` for expanded/lightbox modes. On ultrawide or tall displays the player grows past useful review size. Frame.io caps the player to the **center column**, not the viewport.

---

## Folders & collections

| Area | Frame.io | Review Room | Gap |
|------|----------|-------------|-----|
| Date folders | ✅ Nested tree | ✅ One-level folders in sidebar | OK (we intentionally avoid deep nesting) |
| Subfolders | ✅ e.g. context_smashing under 240512 | ❌ Flat one-level only | Low — product choice |
| Smart type folders | ✅ Collections (Videos, Images, …) | ✅ Asset-class smart folders (VID/IMG/CTX/STB) | OK |
| User collections | ✅ Create, rename, private toggle | ❌ Only system smart views | **Major** — user wants this |
| Collections UI | ✅ Table with search | 🟡 Smart-view tabs only | Medium |

**Our code:** `AppShell.tsx` (sidebar), `FolderShelf.tsx`, `ProjectViewSwitcher.tsx`, `smartViews.ts`

---

## Fields & metadata

| Area | Frame.io | Review Room | Gap |
|------|----------|-------------|-----|
| Fields tab | ✅ Searchable, grouped, filter empty/filled | 🟡 Status/tags/rating in panel body | **Major** — user wants condensed fields |
| Quick specs | ✅ Codec, resolution, bitrate row | 🟡 Duration/dimensions if present | Medium |
| Card-visible fields | ✅ "Fields: 1 Visible" control | 🟡 `showCardInfo` toggle only | Medium |
| Custom fields | ✅ Extensible | ❌ | Phase 2 |

**Our code:** `VideoDetailsPanel.tsx`, `VideoCard.tsx`, `ProjectFilters.tsx`

---

## Preview & playback

| Area | Frame.io | Review Room | Gap |
|------|----------|-------------|-----|
| Hover scrub on cards | ✅ (implied) | ✅ Sprite scrub on cards | OK |
| Video quick preview | ✅ Center column | ✅ `VideoLightbox` 75% viewport | 🟡 Sizing too aggressive |
| Image preview | ✅ Center column + zoom | ✅ `ImageLightbox` fullscreen | 🟡 Separate surface |
| Timecode display | ✅ HH:MM:SS:FF | ✅ Editorial timecode in player | OK |
| Loop / speed | ✅ | 🟡 Partial in player | Low |

**Our code:** `VideoPlayer.tsx`, `VideoLightbox.tsx`, `ImageLightbox.tsx`, `VideoCard.tsx`

---

## Drawing & annotations

| Area | Frame.io | Review Room | Gap |
|------|----------|-------------|-----|
| Draw from comment bar | ✅ "Draw an annotation" in composer | ❌ Drawing only in image lightbox | **Major** |
| Draw on image in viewer | ✅ In-flow with zoom | 🟡 Fullscreen `ImageAnnotationLayer` | **Major** — user prefers Frame.io flow |
| Anchored comments | ✅ Toggle in viewer | ❌ | Phase 2 |
| Markup on thumbnails | ✅ | ✅ Red pen indicator | OK |

**Our code:** `ImageAnnotationLayer.tsx`, `ImageLightbox.tsx`, `CommentComposer.tsx`

Frame.io keeps drawing **adjacent to commenting** with the asset still visible at working zoom. Our lightbox separates markup into a different mental mode with toolbar crammed in the header.

---

## Comments & feedback

| Area | Frame.io | Review Room | Gap |
|------|----------|-------------|-----|
| Timecode-pinned comments | ✅ Chip in composer | ✅ Checkbox "Pin to current time" | OK — could be more compact |
| Comment sorting/filter | ✅ | 🟡 List only | Low |
| Reactions | ✅ Emoji | ✅ Admin emoji reactions | OK |
| Feedback inbox | ❌ (notifications instead) | ✅ `/dashboard/inbox` digest | We're ahead on digest |
| Notifications bell | ✅ Popover, All/Unread | 🟡 Inbox page only, no bell | **Medium** — user wants more solid notifications |

**Our code:** `inbox/page.tsx`, `CommentList.tsx`, `CommentComposer.tsx`, `AppShell.tsx`

---

## Permissions & sharing

| Area | Frame.io | Review Room | Gap |
|------|----------|-------------|-----|
| Manage Access | ✅ Dedicated button | ✅ Access popover in workspace | OK — user wants **more condensed** |
| Visibility modes | ✅ Project + collection private | ✅ Private / Shared / Workspace | OK |
| Member list | ✅ | ✅ `listMembers` in workspace | 🟡 UI verbose |
| Share links | ✅ Sidebar section | ✅ Create review link | OK |

**Our code:** `ProjectWorkspace.tsx` (Access popover ~lines 1241+)

---

## Visual polish

| Area | Frame.io | Review Room | Gap |
|------|----------|-------------|-----|
| Dark zinc surfaces | ✅ | ✅ | OK |
| Brand accent | Purple CTAs | Teal (`teal-500` logo, accents) | Keep teal |
| Gradient accents | ✅ Drive promo, avatar | ❌ Flat panels | **Medium** — user wants subtle teal gradient breaks |
| Card selection | Blue border | Teal/ring | OK |
| Thumbnail scrims | ✅ | ✅ Per design spec | OK |

**Our code:** `AppShell.tsx`, `globals.css`, `projectAccent.ts`

---

## What we already do well (don't over-correct)

1. **Smart views as metadata queries** — cleaner than Frame.io's status-on-card approach for review workflow.
2. **Feedback Inbox digest** — Frame.io leans on notifications; our grouped-by-project/day digest is more editorial.
3. **Table view** — operational ShotGrid-style view; Frame.io collections table is different purpose.
4. **Client vs admin surfaces** — already spec'd; Frame.io is one surface with permissions.
5. **No AI prompt bar** — correctly out of scope.

---

## Verbosity / simplification targets

Places our UI is **more verbose or repetitive** than Frame.io:

1. **Details panel** — player + status + uploader + feedback banner + rating + shortlist + approve + comments stacked vertically in one scroll column. Frame.io splits **viewer / comments / fields** across columns.
2. **Access popover** — full visibility explainer + member list + add forms in one sheet; Frame.io's Manage Access is likely tighter (worth a dedicated pass).
3. **Image markup** — separate fullscreen with many header controls; Frame.io integrates draw into comment composer.
4. **Toolbar** — smart tabs + filters + layout + appearance spread across two rows; Frame.io consolidates into one asset-browser toolbar.
5. **Expanded preview sizing** — 75% viewport is a blunt instrument; Frame.io never lets media escape its column.
