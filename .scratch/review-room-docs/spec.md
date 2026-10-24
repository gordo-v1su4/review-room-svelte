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

## Verification and boundaries

The owner approved real HTTP access/cache checks and browser navigation/content checks as the test seams. Verify anonymous, collaborator-only, forged, expired and valid owner sessions on operations HTML, SvelteKit data and canonical runbook routes. Check the production client output for private operational text. Verify content against current code and inspect the docs in the native browser at desktop and phone/landscape sizes. Documentation does not alter media, metadata, production behavior or the portfolio. Do not close implementation tickets until the deployed documentation is verified.
