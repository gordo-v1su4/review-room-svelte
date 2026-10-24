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
