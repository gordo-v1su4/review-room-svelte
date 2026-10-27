# Review Room application documentation

Status: implementation in progress for V1S-362 and V1S-363–367. The owner authorized completing all five documentation slices on October 24, 2026.

## Purpose and ownership

Build useful application documentation at https://review.v1su4.dev/docs for Robert, his agents, and collaborators joining projects. Frame.io is a familiar reference for media review, while Review Room also documents its own backend and workflow integrations. Do not promise feature parity.

This repository owns the documentation decisions and content. Linear's Review Room Svelte project tracks delivery. This is distinct from a portfolio case study. Existing completed diagram work (V1S-299) remains completed.

## Agreed experience

- A clear section sidebar and readable mobile navigation.
- Everyday workflow first: organize shows and shots, upload takes, review, choose versions, and share.
- Separate usage guides, agent/API reference, conceptual architecture, and operations material.
- Operational setup, networking, deployment, and recovery material requires owner access. Collaborators can orient themselves without receiving private infrastructure details.
- Reuse the app's existing visual system: restrained teal, neutral dark surfaces, consistent controls and typography. Avoid a text wall without turning reference pages into decorative layouts.
- Major guides begin with a useful visual. Use selective annotated screenshots to show actual click targets, hierarchy diagrams for organization, ordered flows for prerequisites, and architecture diagrams for system responsibilities.
- Preserve and integrate the existing media-flow and metadata-model diagrams after checking their statements against current behavior.

## Naming guide: show the derivation

Explain the original full name, the derived or chosen code, who controls it, and when it becomes stable. Distinguish production identifiers, displayed titles, original uploaded filenames, take numbers, and storage keys.

Illustrative example, checked against current formatter behavior:

| Source | Segment | Meaning |
| --- | --- | --- |
| Blood Rush | BLR | Suggested show abbreviation |
| Season 1, episode 1 | EP101 | Episode identifier |
| Parking Lot | PRL | Suggested scene abbreviation |
| Shot number 20 | 0020 | Padded shot number |
| Third stored take | v003 | Version assigned by the application |

The asset code is `BLR_EP101_PRL_0020`; the composed take identifier is `BLR_EP101_PRL_0020_v003`. A source filename such as `parking-take.mp4` is preserved separately. These names are illustrative, not claims about existing production assets. `PAR` must not be described as the automatic abbreviation for Parking Lot.

Show the full example as a hierarchy and a labeled filename/code key. Explain that Creative Studio Pro generates its series/episode/scene folder structure; ordinary Review Room projects need not follow it. Assets and versions are not additional physical folders. A filename ending in `v007` does not force the next stored take to be version 7. Keep production code and provenance separate from generated blob paths.

## Delivery slices

1. Documentation navigation plus one complete everyday-workflow guide using existing styling and a useful overview visual.
2. Naming and organization guide with source-to-code examples, hierarchy, original filename, and version behavior.
3. Review, current-version selection, and sharing guide with selective annotated screenshots.
4. Agent/API reference integrated with the guide navigation, reusing canonical API documentation and checking stale statements.
5. Owner-only operations section, including access enforcement and clear system/storage/network responsibilities.

Slices 2–5 depend on the navigation foundation. Linear tracks these as V1S-363 (navigation/workflow), V1S-364 (naming), V1S-365 (review/sharing), V1S-366 (API/architecture), and V1S-367 (owner operations). The local acceptance records live in `issues/`.

## Implementation design

- Reuse the existing app tokens: canvas #101213, panel #181a1c, raised #222527, ink #e8eceb, muted #969c9e and teal #7dd9c8. Reuse the existing font stack and compact control treatment.
- Desktop: a 238px section sidebar with a bounded, left-aligned reading column. Phone: a sticky Documentation header with an in-flow Sections disclosure. Selecting a destination closes the disclosure. Keep a skip link and current-page indication.
- Use distinct explanatory visuals: ordered workflow, source-to-code key/tree, and actual browser screenshots with callouts. Do not introduce animation or a diagram dependency for static guide content.
- Keep usage/reference content in Svelte documentation routes, styling scoped by `.docs-shell`. Keep private content in the operations server loader and the canonical runbook endpoint; no private operational prose in client bundles or public static files.
- Apply the existing `requireOwner` authorization to the operations page loader and runbook endpoint. A docs-only response hook marks operations HTML, data, downloads and failures private/no-store. It does not change authorization for workspace, review or API routes.
- Preserve the canonical `/agent-api`, `/review-room-openapi.json`, `/docs/media-flow.html` and `/docs/metadata-model.html` locations.
- No changes to media, schema, review actions, metadata writes, rating order or destination behavior are included.

## Visual revision requested October 24

The first deployed pass was too text-heavy. Replace the text-first reading experience with connected diagrams for workflow, project/folder/asset/take hierarchy, asset-level feedback versus version metadata, sharing permissions, API handoffs and system responsibilities. Use actual folder, media and store shapes; keep diagrams under nine nodes, retain accessible titles/descriptions and provide vertical phone layouts rather than shrinking desktop labels. Shorten introductions and place detailed rules in native expandable sections. Keep the existing control screenshots as supporting evidence, not the primary explanation. This remains documentation-only.

## Verification and boundaries

The owner approved real HTTP access/cache checks and browser navigation/content checks as the test seams. Verify anonymous, collaborator-only, forged, expired and valid owner sessions on operations HTML, SvelteKit data and canonical runbook routes. Check the production client output for private operational text. Verify content against current code and inspect the docs in the native browser at desktop and phone/landscape sizes. Documentation does not alter media, metadata, production behavior or the portfolio. Do not close implementation tickets until the deployed documentation is verified.


## Cohesion first slice, October 26

V1S-368 remains open for visual review. The approved first slice keeps every docs page in the shared navigation, including the established .html reference URLs, and removes legacy diagram motion and playback controls. Preserve the metadata diagram's SVG geometry and entity treatments. One new everyday workflow diagram sets the direction: layered charcoal, header bands, fine borders, subtle offset shadows, dotted canvas, restrained teal, serif headings and routed connectors. Use Eraser's architecture examples for grouping discipline without a new dependency. Other diagrams keep their current treatment until review.

The owner requested compact spacing like the app: smaller navigation rows and less vertical padding above/below content and inside diagram cards. Phone navigation links retain 44px touch targets; the owner explicitly requested a shorter 28px Sections button and a compact 43px header. The workflow has a separate vertical phone composition; detailed reference diagrams keep a keyboard-scrollable canvas. Fonts use existing/local stacks with serif fallbacks; no external font dependency is added. Application, API and private operations behavior remain unchanged.


During local review, the owner extended this slice to the overview's sharing diagram and upload strip: replace the ambiguous sharing heading with plain audience wording, align the sharing options with the workflow's surfaces and typography, remove misaligned decorative icons, reduce empty canvas space, and use long connecting arrows in the upload sequence. Other guide diagrams remain deferred. Shared diagram CSS keeps both overview maps consistent.


## October 26 feedback revision: Media Flow is the scale reference

Robert rejected the remaining oversized guide diagrams and decorative media-play overlays, including the organization folder diagram and Agents/API maps. Match Media Flow's compact typography, card density, fine connectors and generous routing lanes across all guide diagrams. Use the app's existing FolderArtwork for folder symbols rather than large outlined folder containers. Keep diagram names, metadata and version relationships intact. Bound canvases at their authored width so wide screens do not inflate their text/icons. Use a separate compact phone arrangement. The existing Media Flow and metadata SVGs remain the reference and retain their content/geometry.

Documentation instructions are ordinary visible sections, replacing the earlier expandable-detail decision. Keep the organization visual ahead of its full derivation table. Preserve the compact Sections navigation control. Eraser's Automated Data Analytics example was inspected visually for grouping/connector discipline; no dependency or subscription is added.

Mobile acceptance explicitly reaffirmed: guide diagrams must fit narrow phones with readable typography, separate vertical layouts, usable navigation and no page-level horizontal overflow. Detailed reference canvases and tables may scroll within their own containers.

## October 26 refinement: clean icons and balanced spacing

Robert requested a clean empty folder icon and one sharp vector library across the guide maps, replacing the paper-filled FolderArtwork choice above. Use Lucide consistently for folders, media and other symbols. Take badges use slightly larger centered labels and a separate status slot. Reduce excess right and bottom card space while keeping comfortable text size and connector lanes. Replace plain numbered screenshot dots with matching semantic vector markers. UI screenshots must be captured at double resolution and displayed within their logical capture width.

The owner explicitly extended the visual scope to Publish & share download checkboxes: dark unchecked surfaces with teal outlines, teal checked fill and a crisp checkmark. Keep the label beside each checkbox and retain a 44px touch label. No permission or form behavior changes are authorized by this appearance change.

## Interactive review screenshot, October 26

The owner requested a wider capture with the full asset title and a specific version selected, markers beside controls instead of overlapping them, and rollover previews containing the same explanation as the captions plus an enlarged icon and actual control detail. Preserve black surface depth; do not outline the screenshot, annotation markers or preview cards with borders. Keep keyboard focus indication. On narrow layouts, move annotation controls into a touch-friendly row. The owner reviewed the new desktop treatment and responded "Much nicer."

October 27 outline convention: retain outlines at 25% opacity across the organization page, including gray and teal card strokes, take badges, containers and separators. Text, icons, connectors and fills remain crisp. This page-specific choice supersedes the earlier full-strength diagram outline treatment here.
