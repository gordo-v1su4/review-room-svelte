# Documentation overhaul verification — October 24, 2026

Completed V1S-362 and V1S-363–367. Live: https://review.v1su4.dev/docs.

## Release

- PR19: foundational navigation, guides, annotated production screenshots and owner-only operations; merged as 5304dc3e32155221c0314342cc762ec2d38c5c6a.
- PR20: user-requested visual-first revision; exact reviewed head e09e1c49b1006251bafe421f2a909d479392e130, merged as 62d90062268f9f5bdcb35e87e1e0f1b89f92fead. Greptile approved the exact head; independent Standards and Spec reviews have no remaining blockers.
- Production frontend image: review-room-svelte-app-app:62d90062268f9f5bdcb35e87e1e0f1b89f92fead. Docker health: healthy. Internal/public build identity: 1792825542736.
- The automatic Actions run 40072706646 failed during svelte-check with a Bun 1.3.14 SIGILL crash, before activation. Earlier run 40070694487 also encountered runtime/typecheck failures. These runs are not passing CI evidence.
- The unchanged Dockerfile successfully built the exact merged source after transient installation/build failures. Activated that image through the existing deploy-dockhand-image.mjs helper. It saved the prior Compose configuration and verified the pinned image was retained. Convex was not changed or deployed by this frontend-only release. The deployment-runner instability is not fixed by this documentation work.

## Checks

- Final full suite: 284 passed, zero failed, 1,559 assertions across 52 files. See evidence/final-tests.json.
- Svelte check: zero errors, eight existing warnings outside documentation. Production build passes locally and for the released Docker image.
- Svelte autofixer: no issues or suggestions in the final shared renderer; guide files checked. Diff whitespace check passes; graft graph refreshed.
- Real isolated HTTP tests cover anonymous, collaborator-only, forged, expired and valid owner sessions on operations HTML, SvelteKit data and canonical runbook. Authorized and denied responses are private/no-store; owner responses are non-indexable.
- Live public checks: four guide pages, both established diagrams, canonical Markdown/OpenAPI references and both screenshots return 200. Anonymous, collaborator-only and forged owner requests are denied on all three operations surfaces, with private/no-store and Vary: Cookie. SvelteKit data denial is a JSON redirect response. See evidence/live-routes-20261024.json.
- Live signed-in owner: Operations renders and expandable deployment details open; response is 200, private/no-store, Vary: Cookie, noindex/nofollow. See evidence/live-owner-20261024.json. In-app browser blocks direct Markdown navigation with ERR_BLOCKED_BY_CLIENT; successful owner runbook responses are verified by the HTTP suite, while live unauthorized runbook responses are verified separately.
- Built client output contains no private deployment host/path markers. Operations prose and canonical runbook remain server-only.

## Visual acceptance

- Six connected diagram types: workflow, folder/asset/take hierarchy, shared feedback versus version metadata, sharing permissions, upload handoffs and system responsibilities. Each has a separately composed phone layout and an accessible title/description.
- Actual rendered SVG exports pass the diagram skill geometry/accessibility checker for every diagram type. Standards review caught a worker-label border collision; Spec review caught a missing readiness return. Both were fixed and rechecked.
- Native Chrome desktop inspection: connected maps readable, routing clear and no observed collisions. Current controls are represented by production screenshots with numbered callouts.
- In-app browser 393×852: maps fit the 338px content region; page width 383px is within the 393px viewport. Sections opens and closes after guide selection. Expanding upload details reveals the full instructions. The live naming guide also fits without page overflow.
- Earlier native Chrome 844×390 landscape checks passed for the navigation foundation. Physical phone hardware testing is not claimed.
- Live overview screenshot: evidence/visual-overview-live-20261024.png. Phone screenshot: evidence/visual-naming-live-phone-20261024.png.

No media, schema, metadata writes, rating/sorting or publication behavior was changed. Existing unrelated checkout changes were preserved and excluded from the release.


## Cohesion preview, October 26 (V1S-368)

Local preview only at http://127.0.0.1:5178/docs. No production deployment or visual acceptance is claimed; V1S-368 and parent V1S-362 stay open.

- Established media-flow.html and metadata-model.html now render as SvelteKit pages inside the shared docs layout. Complete repository-owned SVGs and notes are retained. Motion CSS, scripts, playback controls and stale playback instructions were removed from the canonical source documents; no external fonts were added.
- A new workflow composition establishes the metadata-inspired style. During browser review, the owner requested compact spacing and a 28px Sections button (header approximately 43px), then explicitly requested the same treatment for the sharing map and longer upload-strip arrows. These two overview maps now share one scoped stylesheet. The sharing heading explains audience choice in plain language.
- HTTP regression was observed failing before route migration and passing after: both .html routes expose the same desktop/mobile navigation and active link, contain the static diagrams, and unknown diagrams return 404. Owner access/cache checks remain passing.
- Full suite: 285 passed, zero failed, 1,574 assertions across 52 files. Svelte check: zero errors and eight pre-existing warnings outside docs. Production build passes. Svelte autofixer reports no issues in the new workflow/sharing maps or modified overview/layout. The reference page's raw-HTML warnings are intentional for two hardcoded repository documents only; it has no user-controlled HTML source. The scroll-region tabindex exception is intentional for keyboard panning.
- In-app browser: desktop, 393x852 phone and 844x390 landscape checked. Both legacy diagrams remain reachable through Sections; selecting them closes the menu. Phone document width 383px fits 393px viewport. Keyboard ArrowRight pans the metadata canvas (scrollLeft 40). Both visible overview maps have all node text within card bounds. Reference canvases intentionally retain detail width and scroll internally.
- Local evidence: evidence/cohesion-desktop-20261026.png, evidence/cohesion-phone-20261026.png, evidence/cohesion-sharing-desktop-20261026.png, evidence/cohesion-sharing-phone-20261026.png. Tests/build logs are local evidence/cohesion-tests.log and cohesion-build.log. Physical-phone testing is not claimed.

Application/media behavior, canonical API references and private owner content remain unchanged. Unrelated package, generated Convex and global CSS changes are excluded from this slice.


## Media Flow scale revision, October 26

User feedback supersedes the first-slice design: the guide maps were too large, decorative play overlays were confusing and misaligned, and useful instructions should be visible rather than collapsed.

- All six guide diagram kinds now use one compact renderer. The separate workflow/sharing renderers and their broad SVG stylesheet were removed. Cards use Media Flow's neutral surfaces, 12px titles, 9px mono details, fine borders and arrows; canvases are bounded at 960px rather than growing to fill wide pages. Phone compositions remain separate. No decorative play-button overlays or large outline folder containers remain.
- Folder symbols reuse the existing application FolderArtwork component. Titles, icons, detail text and take badges have distinct aligned positions. API handoffs have two grouped lanes; system-map connectors retain access, job, readiness and derivative relationships without crossing nodes. Existing Media Flow/metadata SVGs were not changed.
- Converted docs disclosures to ordinary visible sections, including owner-loaded operations prose. The naming hierarchy precedes its longer derivation table. Reduced guide headings and code-key scale; table code identities do not break mid-code.
- Visually inspected Eraser's Automated Data Analytics example in the native browser for grouping and connector discipline. Reference: https://www.eraser.io/examples/automated-data-analytics. No dependency or subscription added.
- Full tests: 285 passed, zero failed, 1,574 assertions. Svelte check: zero errors, eight existing warnings outside docs. Autofixer: no issues in renderer and all changed guide pages. Production build passes.
- In-app checks: API upload/system diagrams, naming/folder hierarchy, separate 393x852 phone compositions and 1920x1080 wide layout. Phone page width is 383px inside 393px viewport. Wide canvas is capped at 960px with 12px title styles. API/system node labels fit within cards. Instructions are visible, with zero details elements in the guide. Original compact 28px Sections control is retained. Default viewport restored after inspection.
- Evidence: evidence/media-style-agents-phone-20261026.png, media-style-hierarchy-phone-20261026.png, media-style-agents-desktop-20261026.png and media-style-hierarchy-desktop-20261026.png. Logs: media-style-tests.log, media-style-check.log, media-style-build.log.

Local preview only. Visual review and production deployment/verification remain outstanding; V1S-368 and V1S-362 remain open. Unrelated checkout changes remain excluded.
