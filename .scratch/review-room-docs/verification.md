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

### Responsive follow-up

The owner explicitly required mobile-friendly responsive behavior. Narrow diagrams now use 320px authored compositions with larger phone-only title/detail text; 320px screens get tighter page gutters and smaller headings. Verified every public docs route at 320x740: document width 310px, no clipped guide-node labels. Rechecked folder/system maps at 393x852 (383px document width) and 844x390 landscape (834px document width), with no clipped node labels. Sections opens and closes after selecting Agents & API. Detailed reference canvases and tables scroll inside their wrappers. Screenshot: evidence/media-style-agents-320-20261026.png. Default viewport restored.
Final responsive sweep: all six public docs pages checked at all three widths (320, 393, 844), 18 route/viewport checks total; no page overflow and no clipped guide labels. Machine-readable evidence: evidence/media-style-responsive-20261026.json. Final type check and production build pass after phone refinements.

## Clean icons, cards and sharing controls, October 26

- All six guide maps now use Lucide vectors with a common 22px size and 1.5px stroke. Folder is empty and media uses Clapperboard. Ordinary cards are 72px tall; take cards retain balanced 16px insets, 60x24 badges and 11px centered text with a separate checkmark. Narrow layouts and connector endpoints were adjusted to the new bounds. Sharing cards and hierarchy asset card have less unused width.
- Three places to look uses semantic Lucide callouts and a new focused 1500x1100 image of owner review controls, displayed at no more than its 750px logical width. Private sharing uses a new 960x1300 image displayed at no more than 480px. Captured October 26 at device scale 2. Checkbox caption explains the separate link and asset permissions.
- Fixed Stage1Controls checkbox appearance and label alignment. The generic full-width text-input rule previously stretched checkbox layout, producing floating gray squares. Checkboxes now have dark unchecked fill/teal border, teal checked fill and a crisp CSS checkmark; touch labels remain 44px. Form actions, names, values and permission behavior are unchanged.
- Screenshot provenance: actual authenticated production markup was captured with a temporary browser stylesheet preview of the exact source checkbox fix. No deployment or permission save occurred. Draft checks were restored unchecked, temporary stylesheet and device emulation removed, Notes & info restored closed and the agent-created production tab closed. Screenshot documents the pending corrected controls, not a deployed fix.
- Verification: 285 tests pass, zero failures, 1574 assertions. Svelte check has zero errors and eight existing warnings. Production build passes. Autofixer has no issues in DocsDiagram and the review guide; Stage1Controls reports existing unrelated resolve/unkeyed-loop advisories.
- Native in-app browser checked the wide sharing/review composition and 320px organization view. All four public guide pages checked at 320x740, 393x852 and 844x390: 12 route/viewport checks, no page overflow and no clipped guide labels. Phone checkbox screenshot and caption fit their container. Default viewport restored. Evidence: icons-responsive-20261026.json, icons-sharing-desktop-20261026.png, icons-sharing-phone-20261026.png; logs icons-check-final.log, icons-tests.log, icons-build.log.

Local preview only. Visual acceptance and deployment remain outstanding; V1S-368 and V1S-362 remain open. Unrelated checkout changes remain excluded.

## Interactive review screenshot follow-up, October 26

- Replaced the cramped review crop with a new 2128x1240 capture of the expanded review UI. Full VID_20261005_00023 title is visible and V1 is explicitly selected. Separate double-resolution captures show the actual open version dropdown, rating/shortlist controls, approval controls, and Notes/Fields panel.
- New ReviewControlsFigure owns screenshot, markers, previews and captions. One content definition supplies matching preview and caption text. Desktop markers sit in free space beside the version menu, stars and Notes header. Previews show a larger Lucide icon and actual enlarged control captures. Screenshot, markers and preview surfaces are borderless with black/charcoal depth; keyboard-only focus indication is retained.
- Mouse rollover opens the preview; moving into its content keeps it visible and moving out dismisses it. Keyboard focus opens it, Tab moves to the next marker and Escape dismisses it. Click/tap pins or closes a preview; outside click closes it. All three controls are reachable and named with expanded/control relationships.
- Phone and narrow landscape use a separate icon row below the screenshot. All three previews checked at 320x740, 393x852, 844x390 and 1440x1000: 12 checks, every preview within page bounds and no horizontal overflow. Evidence: previews-responsive-20261026.json and previews-desktop-20261026.png. Default viewport restored.
- Production screenshot browsing only: expanded review, selected existing V1, opened version menu. No Make current, rating, approval, note or permission writes. Latest version, closed Notes, folder layout and default device metrics restored before the agent-created tab was closed.
- Owner feedback during desktop review: "Much nicer." This accepts the direction of this screenshot treatment; broader release verification remains outstanding.
- Final automated validation: Svelte check zero errors and eight existing warnings; autofixer clean for the new component and review page; production build passes. Existing docs HTTP/access/cache regression suite passes all 4 tests with 109 assertions. No new test framework or dependencies introduced. Logs: previews-check.log, previews-build.log, previews-tests.log.

October 27: owner approved the faint outline as the page convention and requested all organization-page outlines at 25% opacity. Page-local outline tokens now cover diagram cards, take badges, diagram/visual/table containers, captions, separators and naming-key lines. Browser computed styles verify SVG stroke-opacity 0.25 and CSS border alpha 0.25; text, icon and connector opacity remain 1. Desktop and phone diagrams inherit the same token. Evidence: organization-outlines-25-20261027.png. Svelte autofixer clean; type check zero errors with the eight existing warnings. Local preview, no deployment.

October 27 default outline follow-up: moved the organization-only outline tokens to the shared docs shell and set standalone guide-renderer fallbacks to 0.25. Added the reference-diagram card/zone/divider/legend strokes and reference container to the same default; visible navigation/control borders and note separators use the shared color token. Removed the page-specific organization wrapper. Native-browser computed styles checked all six public docs pages: all card/badge/reference outlines return stroke-opacity 0.25 and all diagram/visual/table/reference containers return alpha 0.25. Icons, labels and connecting arrows retain their established opacity. Borderless interactive screenshot surfaces stay borderless. Autofixer clean for edited Svelte files. Evidence: default-outlines-25-20261027.json and default-outlines-25-20261027.png. No deployment.
