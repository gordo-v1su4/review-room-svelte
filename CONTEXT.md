# Review Room domain

A client media review portal. Product rules live in `init-docs/01-PRD.md`; visual rules in `init-docs/02-Design-Spec.md`; the proposed migration in `.scratch/svelte-migration/spec.md`.

- **Asset**: a reviewable video, image, contact/context sheet or storyboard. Existing persistence calls the table `videos`; this does not imply every asset is playable video.
- **Workflow status**: one production/review decision field. Rating, shortlist, viewed state and feedback are independent facets.
- **Select**: the shortlist facet, distinct from UI selection of the active asset.
- **Real folder**: one-level project organization. Smart collections and smart views are metadata queries, not nested folders.
- **Review session**: active asset, playback/inspection and review interactions in a project or token-scoped client view.
- **Inspector**: asset fields/comments alongside the media. Responsive rearrangement must retain the review session.
- **Playback adapter**: native or accelerated implementation of the shared playback interface. Capability detection alone does not prove accelerated playback ran.
- **Fixture mode**: deterministic local data used for frontend work while backend repairs are deferred. It does not demonstrate live integration.

Ownership: `gordo-v1su4/review-room-svelte`. Never push to Buzero. Backend remains Convex plus RustFS; replacing the frontend does not imply replacing persistence.
