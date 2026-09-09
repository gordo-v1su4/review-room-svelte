# Frame.io (next.frame.io) — UX Audit

**Date:** 2026-09-08  
**Project browsed:** Comfy → 240512 → context_smashing  
**Screenshots:** `screenshots/`

This audit documents what Frame.io does well in layout, interaction, and visual design. It is reference material for Review Room — not a spec to copy wholesale.

---

## 1. Overall layout architecture

Frame.io uses a **five-zone workspace** that stays visible while you browse:

| Zone | Role |
|------|------|
| Global nav (48px) | Home, search, notifications, uploads, help, account |
| Project sidebar (~240px) | Folder tree, collections, share links, promos |
| Asset browser (flex) | Grid/list of assets + toolbar |
| **Center viewer (flex, always on)** | Large preview/player — resizes with window |
| Right inspector (~320px) | Comments / Fields tabs |

Key behaviors:

- **Persistent center viewer** — selecting an asset updates the player immediately; the grid does not become the only surface.
- **Resizable columns** — drag handles between browser, viewer, and inspector; **brand-accent bar** while dragging (Review Room uses teal `--brand-accent`, not Frame.io purple).
- **Panel toggles** — top bar can hide Asset Viewer or Asset Info independently (AI panel skipped in Review Room).
- **Toolbar condensing** — Appearance / Fields / Filter / Group / Sort / Search collapse to icon-only as the asset column narrows (`ResizeObserver` on container width).
- **Collections** — system presets (Videos, Images, Needs Review, Approved) + user collections via `+` → Source Folder required before grid populates.
- **Breadcrumbs** — `All Projects / Comfy / 240512 / context_smashing` above the workspace.

See `screenshots/01-workspace-overview.png`.

---

## 2. Folder hierarchy

- **Two-level nesting under Assets:** date folders (`240512`, `240514`, …) with subfolders (`context_smashing`).
- Expand/collapse chevrons on each node; current folder highlighted.
- Separate sections below Assets:
  - **Collections** (user-defined smart groupings)
  - C2C Connections
  - Recently Deleted
- **Share Links** block at bottom of sidebar with create/sort controls.
- Inline rename on folder names (edit-text affordance).
- Promo card: "Mount this project directly on your desktop" + **Get Frame.io Drive** CTA with subtle gradient button.

---

## 3. Collections

Dedicated Collections view (`/collections`) — not just filters on the grid.

| Column | Purpose |
|--------|---------|
| Name | Emoji + label (Videos, Images, Needs Review, Audio, Approved) |
| Created by | Avatar + name |
| Private | Toggle per collection |
| Created on | Date |

- Search: "Search for collections"
- **New Collection** button in sidebar
- Collections behave like saved smart views with optional privacy — similar in spirit to our smart views + asset-class folders, but **user-creatable and permissioned**.

See `screenshots/04-collections.png`.

---

## 4. Asset browser & appearance

Toolbar above grid:

- **Appearance** popover (grid/list, S/M/L, 16:9 / 1:1 / 9:16, thumbnail fit, titles 1 line)
- **Fields: N Visible** — controls which metadata columns show on cards
- **Sorted by: Custom**
- Search, Create, Manage Access, Open on Desktop, Share (purple primary)

Card anatomy:

- Checkbox (multi-select)
- Thumbnail with duration badge (videos)
- Filename, uploader, date, Status field on card
- Blue border on selected asset
- Group header: "4 Assets" with collapse control

See `screenshots/03-appearance-menu.png`.

---

## 5. Center viewer (video & image)

### Video

- Large letterboxed player between grid and inspector
- Center play overlay; transport bar at bottom
- Controls: play/pause, loop, speed (1x), volume, **timecode HH:MM:SS:FF**, time format toggle, anchored comments, viewer settings, fullscreen
- Quality indicator (SD)
- Player **scales with available column width** — never dominates the whole viewport

### Image

- Full image preview in same center column (not a separate modal)
- Zoom in/out with percentage readout (e.g. 127%)
- Image map toggle, anchored comments, fullscreen
- Selection toolbar: Copy to, Copy URL, Download

**Contrast with Review Room:** our details panel is a fixed ~420px right drawer; expanded mode uses `75dvh × 75vw` which can feel oversized on large monitors.

---

## 6. Right inspector — Comments tab

- Tabs: **Comments** | **Fields**
- Comment list filters: sort (timecode default), filter, search
- Empty state: icon + "No comments — yet" + Get Started CTA
- **Sticky comment composer** at bottom:
  - Live timecode chip (removable)
  - Attachment, emoji, **Draw an annotation**, visibility (Public), submit
- Drawing is **inline in the review flow**, not a separate fullscreen mode

---

## 7. Right inspector — Fields tab

Dense, production-oriented metadata panel:

- Asset header: filename, created date
- **Quick specs row:** Video Codec, Resolution, Bit Rate (or Format/Resolution for images)
- **Seen By** avatars
- **Status** dropdown
- **Rating** (1–5 stars inline)
- **Field groups:** All Fields (40), Essentials (11), File Attributes (29), Custom Fields (0)
- **Filter fields:** None / Only Empty / Only Filled
- Search within fields
- Scrollable list of ~40 technical metadata rows (3D counts, audio bit depth, color space, duration, etc.)

This is the pattern to emulate for **condensed, filterable metadata** — not necessarily all 40 fields on day one.

See `screenshots/02-fields-panel.png`.

---

## 8. Permissions & access

- **Manage Access** button in project toolbar (alongside Share)
- Collections have per-collection **Private** toggles
- Project shows member count in sidebar header ("0 Members")
- Share link management in dedicated sidebar section

---

## 9. Notifications

- Bell in global nav opens a **popover panel** (not a separate page)
- Tabs: **All** | **Unread**
- Actions: Notifications Settings, Mark all as read
- Empty state: "No Updates Yet" with bell illustration
- Collapse control to dismiss

See `screenshots/05-notifications.png`.

---

## 10. Visual system & motion

| Element | Frame.io | Notes for us |
|---------|----------|--------------|
| Background | Near-black `#0f0f12` range | We use zinc-950 — compatible |
| Surfaces | Layered dark grays | Similar to our zinc ramp |
| Primary CTA | Saturated purple | We use teal — keep brand, borrow *weight* not hue |
| Selection | Blue border on cards | We use teal ring — fine |
| Gradients | Teal→purple on Drive promo, profile avatar | **Light accent gradients** on promos/cards to break up flat panels |
| Typography | Clean sans, 11–14px metadata | Our density is close |
| Motion | Panel open/close feels fast; resize is live | Prefer CSS transitions on width, not layout thrash |

---

## 11. Features we should not chase (MVP)

- AI prompt bar ("What do you need done?")
- Frame.io Drive desktop mount
- C2C Connections
- 40-field technical metadata (transcode pipeline data)
- Generate Transcripts / caption upload (Phase 2+)
- Adobe cookie/consent chrome

---

## 12. Screenshot index

| File | Contents |
|------|----------|
| `01-workspace-overview.png` | Full 5-column workspace with video selected |
| `02-fields-panel.png` | Fields tab with metadata list |
| `03-appearance-menu.png` | Appearance popover over grid |
| `04-collections.png` | Collections table + image preview |
| `05-notifications.png` | Notifications popover |
