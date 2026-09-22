# Review Room Svelte migration

Status: direction and test seams approved after one interview round. Persistent shipping goal active; first local Svelte review slice implemented, full parity and live release gates remain open.

## Outcome

Replace the Next.js/React frontend with predominantly Svelte 5 and TypeScript, preserving all existing review functionality. Use SvelteKit for routing and server endpoints. Make playback and scrubbing responsive with a measured WebCodecs/WebGPU path and a reliable native media fallback. Backend connectivity repairs are explicitly deferred by the user.

This is a review portal, not a video editor. Existing project data, asset identities, roles, public share URLs, and review decisions must survive migration. No production cutover until parity is demonstrated.

## Visual direction

The five user references are copied into `references/01.jpg` through `05.jpg` in attachment order. They are visual references, not feature requests or instructions embedded in images.

- 01: clear navigation hierarchy, dark inset areas, spacious media organization; simplify the heavy 3D folder treatment.
- 02: a modest amount of folder depth; do not adopt its light canvas or large onboarding composition.
- 03: cohesive segmented controls and compact action groups; replace purple/neon effects with restrained teal gradients.
- 04: zinc/charcoal surfaces, hairline highlights, shallow inset controls, teal selection. Primary material reference.
- 05: calm mobile navigation and bottom sheets, accessible close controls, clear grouping.

Use near-black canvas, charcoal/zinc panels, a modest raised surface, off-white text, readable gray metadata, and a teal ramp shared by selected states, focus, controls, and restrained gradients. Avoid blue slate, excessive bloom, glass everywhere, heavy extrusion, and featureless flat black. Project branding remains distinct from semantic status colors. Update the owning creative brief and design spec when the migration design is accepted; the old mobile-last priority is superseded by the user's mobile-first requirement.

## Preservation checklist

This is the initial source-backed inventory, not a claim of complete behavioral verification. Ticket 01 expands it into an operation-by-operation parity ledger.

| Area | Existing reference | Required parity |
|---|---|---|
| Access | `src/components/auth`, `convex/auth.ts`, `convex/lib/access.ts` | Sign in/out, sign up, password reset, enabled OAuth providers, allowlist, admin/client/member restrictions |
| Projects | `src/app/dashboard`, `convex/projects.ts` | Browse/create/update/archive, branding, membership and access |
| Workspace | `ProjectWorkspace.tsx`, `src/lib/filters.ts`, `smartViews.ts` | Grid, grouped, table/list, review mode, filters/sort/search, field visibility/order, density, selection, preferences |
| Organization | `FolderShelf.tsx`, `convex/folders.ts`, `collections.ts` | Flat real folders and covers, date defaults, asset moves, distinct smart collections, role restrictions |
| Media | `src/components/video`, `src/lib/media.ts` | Video vs IMG/CTX/STB behavior, posters/sprites, play/pause, mute, seek, timecode/frame display, loop/order, previews, still markup |
| Decisions | `convex/videos.ts`, `reviewPublic.ts` | Rating, select, workflow status, viewed state, immutable asset codes; preserve status/facet separation |
| Feedback | `src/components/comments`, `convex/comments.ts`, `inbox.ts` | Time-linked notes, author distinction, reactions/handled state, attention flags, Inbox and notifications |
| Sharing | `src/app/review/[token]`, `convex/reviewLinks.ts` | Token-scoped review, share controls, downloads and access rules |
| Ingest | `UploadDropzone.tsx`, `src/app/api/storage`, `services/media-worker` | Multi-file uploads, folder destination, progress/errors, multipart, previews/derivatives, download URLs, worker handoff |
| Utility | `src/app/dashboard/design/colors`, `workspacePreferences.ts` | Design utilities and saved workspace settings assessed explicitly, not silently discarded |

## Proposed module design

Apply Matt Pocock's `codebase-design`: place complex behavior behind small interfaces; introduce adapters where behavior actually varies; test through the same interface callers use.

1. Review session module owns asset navigation and review actions, exposing role-aware operations. Existing Convex functions remain authoritative for authorization.
2. Workspace module owns layout, selection and view preferences; arrangement changes must not reset the selected asset, drafts or playback.
3. Media playback module owns loading, play/pause, seek, current-time subscription and disposal. Native and accelerated adapters share the same contract. UI components never manage codec queues or GPU resources.
4. Upload module owns queue state, progress, cancellation/retry semantics and storage handoff; server credentials remain server-only.
5. Data/auth adapters isolate React-specific subscriptions from the new UI. A deterministic development adapter enables progress while backend repair is deferred, and is explicitly marked as fixture mode.

Reuse sound pure TypeScript logic and generated Convex types where possible. Do not blindly port React hooks or layer Svelte wrappers around the old UI. Keep the existing app runnable as the comparison baseline until replacement gates pass.

## Playback decision to validate

WebCodecs decodes encoded chunks; it does not demux containers. WebGPU renders/processes frames; it is not a video decoder. The accelerated path must account for demuxing, codec configuration support, audio synchronization, bounded queues, cancellation of stale seeks, frame disposal and GPU device loss.

Start with a real-media benchmark of native playback against a worker-based decode path. Gate accelerated playback per browser, codec and device capability; recover to native playback if initialization/runtime fails. Never claim acceleration merely because an API exists or a toggle is shown. Report active adapter, first-frame time, seek latency and dropped frames in developer diagnostics.

Primary references: https://www.w3.org/TR/webcodecs/ and https://github.com/w3c/webcodecs/tree/main/samples/video-decode-display . Recheck browser/device capability at runtime.

## Responsive acceptance

- Exercise 360, 390, 768, 1024 and 1440 CSS-pixel widths, short landscape, and continuous resizing across transitions; also test each layout's minimum viable container width.
- Wide workspace: navigation, media area and optional inspector. Compact workspace: navigation drawer and stacked review surface/sheet. Adapt to available pane width, not just device labels.
- No page-level horizontal overflow; wide tables may have a labelled intentional scroll region.
- Preserve selected asset, playhead, playback state, filter state and unsent comment during resize/reconfiguration. Avoid remounting the player solely because a breakpoint changed.
- Touch controls require no hover; use generous targets, safe-area padding, visible controls, sensible focus and Escape behavior. Honor reduced motion.
- Limit layout motion to useful short transitions; no animated width/height churn throughout video playback.
- Verify loading, empty, error and denied states on desktop and mobile, not only populated happy paths.

## Approved test seams

The user approved these test seams in the single grill-with-docs round. Public interfaces: review-session actions and observable state; playback commands and events; upload queue commands and state; user-visible routing/responsive flows. Use one failing behavior test, one minimal implementation, then the next slice. Keep tests independent of component internals. Standards/spec review follows implementation.

Fixture-based frontend evidence can demonstrate UI behavior and contracts, but cannot prove production authorization, persistence, OAuth, signed URLs or remote uploads. Those remain final integration gates after backend repair.

## Completion gates

All parity ledger rows have evidence; keyboard/touch and continuous resize checks pass; supported real-media playback and fallback are measured; production role and share-link flows persist correctly; deployed frontend and backend are separately verified if either is changed. Retire React/Next only after these gates. No paid generation or production data mutations are part of setup.

## Accepted interview decisions

The user accepted all five recommendations in one round; no additional interview round is required for these decisions.

1. Preserve capabilities, permissions and data semantics while freely consolidating menus, moving controls and replacing awkward workflows.
2. During scrubbing, the main video follows the pointer/finger continuously with audio muted. When decoding cannot keep up, show preview frames and seek precisely on release. Restore the pre-scrub mute preference afterward.
3. Mobile review keeps the player visible above comments and primary review actions. Filters, metadata and secondary controls use sheets.
4. Motion is quiet by default, with restrained character at key transitions. Playback, scrubbing and input feedback never wait for an animation.
5. Test review actions and permissions; playback, seeking and fallback; uploads and failure handling; resize without loss of playback or drafts; actual desktop/mobile browser flows. Tests observe public interfaces and user-visible behavior.

Performance targets must be grounded in recorded baseline measurements and named media/device conditions. The architecture must not claim that WebGPU itself guarantees lower latency.

## Live design refinements accepted 2026-09-22

- Identity is only `review room.`; remove the rr monogram and stacked brand/workspace taglines.
- Use one main line, with at most one smaller supporting line where needed.
- Default primary/secondary controls are visually compact (32px desktop, 34px mobile); preserve usable touch hit areas.
- Folder artwork follows reference 01 proportions: tall rounded charcoal front, layered sheets, translucent smoked front with softly visible contents. Empty collections show no paper sheets.
- Whites are subdued with a slight teal tint; selected folder containers are almost charcoal with only a faint dark teal gradient and hairline highlight.
- Avoid stock marketing headings and oversized promotional empty states. Motion stays brief and restrained.

- Frame.io is the explicit product baseline: project/folder browsing, retractable navigation tree, and separate adjustable explorer/viewer/feedback panes.
- Opening a collection hides the large folder shelf. Project creation includes Videos, Images, and Shortlist collections; in this local slice they derive from each project's media and shortlist metadata.
- Playback and seek indicators must always be thin tall rectangles, never circular knobs.
- Use actual Downloads media for playback and layout acceptance. Pinterest contemporary-treatment research follows the main interaction work; latency remains the priority.

- Project overview shows folders only. Folder entry/import opens the full explorer; select a clip to reveal viewer, with notes/info optional. Never auto-select media on import.
- Restore Appearance controls (square, 16:9, 9:16, Fit/Fill, density) and cursor-driven card previews with a thin teal vertical playhead. Preserve the full original appearance/grouping/field preferences in the parity ledger.
- Product UI shows studio source metadata (resolution, ratio, frame rate where measured, codec, duration), not developer latency telemetry. Surfaces use deeper black, restrained edge highlights, and aligned pane header baselines.
- All original capabilities remain mandatory; reorganization and simplification do not authorize dropping any existing operation.
