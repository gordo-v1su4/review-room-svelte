# PRD — Video Review App

**Companion to:** `00-Creative-Brief.md` (vision, references, tone) and `02-Design-Spec.md` (UI/UX).
**Audience:** engineering / coding agent (Codex, Claude Code).

---

## 1. Users & roles

```ts
type UserRole = "admin" | "client";
```

- **Admin / creator** — creates projects, uploads videos, edits titles/status/tags, sets the banner, toggles downloads, shares review links, reads feedback.
- **Client / reviewer** — opens a share link (optional passcode, no account required), watches/scrubs, rates, shortlists, comments, and approves or requests changes. Downloads only if enabled.

## 2. Scope

**MVP**
- Project create / list / workspace.
- Direct-to-storage upload (presigned), batch + per-file progress, auto thumbnail.
- Video grid with the card system; right-side viewer/details panel.
- Status + tags + 0–5 rating + shortlist (select) + comments (with optional timecode).
- Metadata-driven smart views (§4) exposed as tabs.
- Client review page via share link (+ optional passcode).
- Per-video download via signed URL when enabled.
- Filters/sort over status, facets, tags, dates.

**Not in MVP**
- Threaded comments, drawing annotations, frame-accurate comment sync.
- Transcoding, proxy generation, batch download.
- Teams/orgs, enterprise permissions, email notifications.
- The full freecut WebCodecs engine (see §8, Phase B).

**Phase 2**
- Port the freecut scrub engine · in-browser contact sheets · saved custom views · version stacks / comparison · approval history · feedback export (CSV/JSON/PDF) · expiring links · per-project branding themes · activity log.

## 3. Stack

Next.js (App Router) · React · TypeScript · Tailwind · shadcn/ui · TanStack Query if needed for client orchestration · **Convex** for all metadata/state/reactivity · S3-compatible storage (local **RustFS** now, abstracted for later swap). TanStack Table only inside the deferred List view, never as the primary UI. Deploy: Vercel + prod Convex (`*.convex.cloud`); any background image/ffmpeg work runs as a separate always-on worker, not on Vercel.

## 4. Organizing model — metadata-driven, drag optional

**This is the core product decision.** Videos are never *required* to be dragged between columns. They surface into smart views automatically as their `status` and facets change. A board-like grouped display is fine visually, but movement is a side effect of metadata, not a manual chore.

Drag exists only as an **optional shortcut**: dropping a card into a smart-view section simply *sets the field that section maps to* (drop into "Approved" → `status = approved`; drop into "Selected" → `isSelect = true`). Sections that map to a computed facet with no settable field (e.g. "Highly Rated") don't accept drops.

## 5. Data model

The single most important modeling rule: **`status` is one workflow field; everything else that drives a view is a separate facet.** Don't collapse "selected", "highly rated", or "has feedback" into status — they're computed/independent and would corrupt the workflow field.

### Workflow status (exactly one at a time)
```ts
type VideoStatus =
  | "awaiting_review"   // default on upload
  | "needs_changes"     // reviewer decision: changes requested
  | "approved"          // reviewer decision: approved
  | "final"             // admin lock / download-ready
  | "archived";         // hidden from default views
```

### Facets (independent; drive smart views + filters)
- `viewed: boolean` — set true on first play/open.
- `commentCount: number` — `> 0` ⇒ "Has Feedback".
- `rating: 0–5` — `≥ 4` ⇒ "Highly Rated".
- `isSelect: boolean` — shortlist.

### Smart views = a query over status + facets
| View (tab) | Rule | Droppable? |
|---|---|---|
| All | — | — |
| Awaiting Review | `status = awaiting_review` AND `viewed = false` | — |
| In Review | `status = awaiting_review` AND `viewed = true` | — |
| Has Feedback | `commentCount > 0` | — |
| Selected | `isSelect = true` | ✓ (sets `isSelect`) |
| Highly Rated | `rating ≥ 4` | — |
| Needs Changes | `status = needs_changes` | ✓ (sets `status`) |
| Approved | `status = approved` | ✓ (sets `status`) |
| Final | `status = final` | ✓ (sets `status`) |

### Convex schema (sketch)
```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const status = v.union(
  v.literal("awaiting_review"), v.literal("needs_changes"),
  v.literal("approved"), v.literal("final"), v.literal("archived"),
);

export default defineSchema({
  projects: defineTable({
    title: v.string(),
    slug: v.string(),
    clientName: v.optional(v.string()),
    description: v.optional(v.string()),       // client-facing intro / instructions
    bannerKey: v.optional(v.string()),
    brandColor: v.optional(v.string()),        // BRAND ONLY — never the status palette
    downloadEnabledByDefault: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(), updatedAt: v.number(),
    archived: v.optional(v.boolean()),
  }).index("by_creator", ["createdBy"]).index("by_slug", ["slug"]),

  videos: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    originalFilename: v.string(),
    storageKey: v.string(),                    // object key only — no blobs in Convex
    thumbnailKey: v.optional(v.string()),
    spriteKey: v.optional(v.string()),         // scrub sprite sheet (Phase A)
    mimeType: v.string(),
    sizeBytes: v.optional(v.number()),
    durationSec: v.optional(v.number()),
    width: v.optional(v.number()), height: v.optional(v.number()), fps: v.optional(v.number()),
    // workflow
    status,
    // facets
    viewed: v.boolean(),
    rating: v.number(),                        // 0–5, 0 = unrated
    isSelect: v.boolean(),
    commentCount: v.number(),
    // misc
    tags: v.array(v.string()),
    downloadEnabled: v.boolean(),
    order: v.number(),                         // manual sort within a view
    uploadedBy: v.id("users"),
    uploadedAt: v.number(), updatedAt: v.number(),
    approvedAt: v.optional(v.number()),
  })
    .index("by_project", ["projectId"])
    .index("by_project_status", ["projectId", "status"])
    .index("by_project_uploadedAt", ["projectId", "uploadedAt"]),

  comments: defineTable({
    videoId: v.id("videos"),
    projectId: v.id("projects"),
    authorName: v.string(),
    authorRole: v.union(v.literal("admin"), v.literal("client")),
    body: v.string(),
    timecodeSec: v.optional(v.number()),       // optional pinned playhead
    createdAt: v.number(),
  }).index("by_video", ["videoId"]).index("by_project", ["projectId"]),

  reviewLinks: defineTable({
    projectId: v.id("projects"),
    token: v.string(),                         // unguessable
    passcodeHash: v.optional(v.string()),
    canDownload: v.boolean(),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_token", ["token"]).index("by_project", ["projectId"]),

  users: defineTable({ name: v.string(), role: v.union(v.literal("admin"), v.literal("client")) }),
});
```
Function surface is the obvious CRUD over these tables (`projects.*`, `videos.*`, `comments.*`, `reviewLinks.*`) plus the transitions in §6 — no need to enumerate each.

## 6. Interaction logic (auto-transitions)

Keep status changes tied to *decisions*; let facets carry everything else. On reviewer action:

- **First play / open** → `viewed = true`. No status change.
- **Comment added** → insert comment, `commentCount++`. No forced status change (surfaces in "Has Feedback").
- **Rating set** → store `rating` (surfaces in "Highly Rated" at ≥4).
- **Shortlist toggled** → `isSelect = !isSelect`.
- **Approve** → `status = approved`, `approvedAt = now`.
- **Request Changes** → `status = needs_changes`.
- **Admin override** → may set any `status`, or drag a card into a droppable section (§4) to set the mapped field.

Defaults on upload: `status: "awaiting_review"`, `viewed: false`, `rating: 0`, `isSelect: false`, `commentCount: 0`, `downloadEnabled: project.downloadEnabledByDefault`.

## 7. Storage

S3-compatible behind a thin abstraction so RustFS today swaps to R2/S3/MinIO later. Presigned URLs for up/download; **secret keys stay server-side** (Next.js route handler), never in client or Convex calls. Convex stores only keys + metadata. Path-style addressing for RustFS.

```
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=true
```
Helpers: `createPresignedUploadUrl`, `createPresignedDownloadUrl`, `getSignedUrl`, `deleteObject`.

## 8. Playback — two phases

- **Phase A (MVP):** HTML5 `<video>` streamed from a signed URL for full playback, plus an ffmpeg-generated **sprite sheet** for instant scrub-on-hover and scrubber previews — no decode cost at scrub time. Fast enough to feel good.
- **Phase B:** port the freecut WebCodecs scrub engine (decoder prewarming, adaptive preview quality, frame-accurate seek, OPFS cache) behind the same player component interface so it's an isolated swap. Do not vendor the whole editor.

## 9. Access & sharing

Admin auth for the dashboard; clients reach a project through `reviewLinks.token` (optionally passcode-gated, optionally expiring). Capture the reviewer's display name when they first act. No enterprise permission system in MVP.

## 10. Routes

```
/                                      → redirect to /dashboard
/dashboard                             → admin project list
/dashboard/projects/new                → create project
/dashboard/projects/[projectId]        → admin workspace
/review/[token]                        → client review page
/api/storage/presign-upload            → presigned PUT
/api/storage/presign-download          → presigned GET
```

## 11. Build order (for the agent)

1. **Inspect reference repos** (`freecut`, `pindeck`, `project-stack-structure`) for folder structure, conventions, and reusable playback/upload utilities. Don't over-integrate.
2. **Scaffold** — Next.js + TS + Tailwind + shadcn + Convex; app shell; env loading.
3. **Convex data model** (§5) + CRUD + the transitions in §6.
4. **Storage** — abstraction + presign routes; test against local RustFS.
5. **Admin workspace** — project header/banner, upload dropzone, video grid + card, filters, right-side panel shell.
6. **Player + details panel** — playback, status/tags/rating/select controls, download.
7. **Comments** — composer + list + optional timecode capture.
8. **Client review page** — `/review/[token]`, simplified panel, Approve / Request Changes.
9. **Smart views** — tab bar with counts (§5 table); optional grouped (stacked) display reusing the card; optional drag-to-set on droppable sections.
10. **Polish** — responsive, loading/empty/error states, upload progress, panel transitions.

Build A→B per phase; each step should run before the next.

## 12. Acceptance criteria

MVP is done when:
1. Admin creates a project and uploads videos to RustFS via presigned URLs; metadata lands in Convex.
2. Uploaded videos appear as polished cards in a grid; thumbnail + scrub preview work.
3. Selecting a card opens the right-side viewer; playback and scrubbing feel instant (Phase A).
4. Client (link only, no account) can rate, shortlist, comment (with optional timecode), and Approve / Request Changes.
5. `status` and facets update per §6; smart-view tabs reflect the changes live across sessions.
6. Filtering/sorting over status, facets, tags, and dates works and matches the grid.
7. Download works when enabled (signed URL).
8. The interface reads as a presentable client portal — not a spreadsheet or a drag-required Kanban board.
