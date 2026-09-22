# Shared-review access gate — 2026-09-22

## Scope

Implemented the Svelte access gate and `/review/[token]` route. This is frontend infrastructure, not live authorization or a finished public viewer. The real route deliberately uses `offlinePublicReviewGateway` and grants no access while backend repair is deferred. The ready viewer, public writes, share creation/management, downloads and live identity/authorization integration remain open.

The gateway interface supports loading, passcode challenge, reviewer identity, confirmed ready data, expired/missing links and temporary unavailability. The controller aborts superseded requests, ignores late responses even if an adapter ignores abort, suppresses duplicate submits and avoids exposing exception contents or credentials in emitted state. Authorization belongs to the future server adapter. A ready result must come from an authorized server session; a client boolean is not authorization.

## Evidence

- `bun test ./web/src/lib/public-review-access.test.ts ./web/src/lib/review-session.test.ts`: 25 pass, 95 assertions. Ten new access tests cover confirmed transitions, duplicate submission, failure/retry, blank name, safe error copy, changed token, disposal, stale bootstrap and offline denial. Existing review permission tests remain green.
- `bunx svelte-check --tsconfig ./tsconfig.json`: 0 errors, 0 warnings.
- Isolated in-app browser tab 18 at `/dev/review-access`: incorrect passcode produces alert and invalid input; focus returns to passcode. Correct fixture passcode followed by Enter opens name and focuses it. Blank name disables submission. Entering Avery Lee confirms fixture access and focuses Shared review.
- Mobile 390×844/touch: name input and primary button 44px high; document scroll width equals viewport width (390). Expired and missing states give distinct guidance. Transport failure shows safe generic retry copy without internal exception text. Retry remains unavailable for the deliberately failing fixture. Browser reported no runtime errors.
- Real `/review/local-qa-token` renders temporarily unavailable with Retry, no passcode/name/media controls. Desktop screenshot inspected: restrained charcoal/teal, text-only Review room branding, compact 30px button, no decorative card.
- HTTP headers verified: `cache-control: private, no-store`, `referrer-policy: no-referrer`, `x-robots-tag: noindex, nofollow`. The page shell responds 200; this is not a backend availability claim.
- Independent code review caught Retry losing focus after its loading transition. Added controller-checked focus restoration after the render tick; browser Enter on Retry now focuses the resulting unavailable heading.
- Development fixture route is guarded by `$app/environment` dev and returns 404 outside dev. Production-build verification of that guard remains part of release acceptance.
- Viewport/touch overrides cleared and temporary QA tab closed. Existing user tabs retained.

## Follow-up contract

Before connecting this route, resolve the [public authorization audit](public-review-access-audit.md), validate passcode proof on every public read/write/download, scope reviewer identity per recipient/session, and handle expiration/revocation. Supply only sanitized authorized project data; never return passcode hashes or unvalidated storage URLs.

Build the actual shared viewer from Player/StillViewer/MediaCards and review-session, preserving per-asset drafts. Hide project/admin controls and public-unsupported comment completion/reactions. Downloads require both link and asset permission. Preserve link appearance, shortlist sequence preview, keyboard navigation and mobile notes/sheets. This gate evidence does not satisfy those remaining requirements.
