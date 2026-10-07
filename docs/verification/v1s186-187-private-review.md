# Private client persistence and access acceptance — October 7, 2026

Frontend and dedicated Convex candidate `478d746`, frontend version `1791347221398`, passed the positive persistence, download and cold access matrix. An additional warmed-bootstrap expiry probe then found a failure: the already-loaded private page remained HTTP 200 after expiry while media correctly denied 404. The affected expiry rows are reopened in Linear. An uncached action adapter repair is prepared for coordinated Convex/frontend deployment and live verification. This is candidate evidence, not merged-main release evidence. The expired unprotected reviewer-cookie recovery patch also needs the next frontend deployment.

The dedicated project `Private client acceptance QA 2026-10-07` contains only synthetic video/image uploads. Canonical projects and media were not mutated. All eleven temporary review links used by the two harness runs and native browser check were revoked. Upload/processing finished through the existing scoped owner upload seam.

`scripts/check-live-private-review.mjs` injects the existing operator password and dedicated Convex admin key through `agent-secrets run`. Its persisted state contains only fixture IDs in an ignored `.local` file. Link tokens, reviewer proof cookies, passcodes and upload URLs remain process-local. The repeatable matrix verifies:

- Separate Alpha/Beta reviewer sessions retain independent names and exact attributed comments after independent reloads.
- Viewed, 4/5 rating, shortlist, needs-changes status, 0.5-second notes and normalized image markup persist to owner/reviewer reads. Repeated completion of one comment request inserts one note; changed retry payloads are rejected by a focused regression test.
- Owner attention flags, handled/reopened comment state and both reviewer page reloads retain feedback.
- Enabled exact-current-version image download returns attachment headers and the source SHA-256. Link-level and asset-level download denial both return 404.
- Missing/wrong passcode, unrelated-link proof, invalid token and cross-project assets fail through HTTP media/mutation and direct anonymous Convex queries/mutations. Public comment responses contain no private retry/session hashes or storage keys.
- Revoked and archived links deny new reads/writes. Expired links deny media after warming it, including range/conditional attempts. Warmed private bootstrap expiry failed in the additional probe described above. Owner sign-out deletes the session cookie; anonymous workspace and owner-review writes redirect away from private state.

Native Codex **@Browser** independently verified rendered video frames, reviewer name save, comment save/reload, video→still→video draft retention, a real 0.5-second seek, owner Inbox count/attribution and Open-note navigation. Stills expose image markup tools without video-only controls. Native revocation then reload displayed `404 Review unavailable`.

Responsive IAB checks at 390×844 and 844×390 found no horizontal overflow and preserved the active video ID and exact typed draft. The browser viewport override was reset. The screenshots cover desktop, phone-size and short-landscape layouts; these are IAB viewport checks, **not actual iPhone Safari or Android Chrome/device acceptance**. The latter rows remain unchecked in Linear. Native keyboard/touch execution on actual phones and independent Edge coverage are not claimed.

Evidence: [live summary](evidence/private-review-live-20261007.json), [desktop](evidence/private-review-desktop-20261007.png), [phone-size](evidence/private-review-phone-20261007.png), [short landscape](evidence/private-review-landscape-20261007.png). Focused validation: two Convex regression tests / eight assertions; Svelte check 0 errors and eight existing warnings; Convex type checking passed.

Private review URLs are independent bearer capabilities: owner sign-out does not revoke a separately permitted review link. Revocation stops new server requests; it cannot erase bytes or rendered frames that a browser already received. No public Trailer Feed grant/publication was created by these checks.
