# Canonical Review domain and owner access — October 5, 2026

The standalone app is live at `https://review.v1su4.dev`, explicitly routed by VM100 Caddy to `127.0.0.1:18094`. Its dedicated backend remains `https://review-convex.v1su4.dev` and its private RustFS bucket remains `review-room-svelte`. Hostinger Unfold and its credentials are a separate application.

## Changes

- Replaced the frontend origin and Caddy hostname. Removed the old `review-room.v1su4.dev` app route without a redirect to the new name. Cloudflare TXT `retired=2026-10-05` at that exact hostname blocks the existing wildcard from supplying address records; wildcard DNS for other apps is unchanged.
- Replaced only the old frontend origin in the bucket's existing CORS rules. Two rules remain; unrelated origins and permissions were preserved. Before-policy copy: `.scratch/domain-owner-access/cors-before.json`.
- Created BWS `REVIEW_ROOM_AUTH_JWT_PRIVATE_KEY` and `REVIEW_ROOM_AUTH_JWKS`, configured the dedicated backend's `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`, and `AUTH_EMAIL_ALLOWLIST`, and read them back value-silently. Email authentication previously failed with `Missing environment variable JWT_PRIVATE_KEY`.
- Completed the owner setup for `gordo@v1su4.com` using the existing shared operator application password. Setup/recovery retains the separate `REVIEW_ROOM_OWNER_PASSWORD` record.
- Added Sign out to the live Account menu, calling the existing owner-cookie logout action.
- Audited all ten dedicated `REVIEW_ROOM_*` BWS records: one exact match per name; repository ownership documented in every note. Updated app, homelab and Obsidian credential maps. Existing `PROXMOX_HOME_HOSTINGER_UNFOLD_CONVEX_*` credentials were retained without mutation.

## Verification

- `bun run check` and `bun run build` completed; existing Svelte warnings remain. Svelte autofixer reported no issues or suggestions for the changed Account menu. `git diff --check` passed.
- Both frontend and dedicated backend containers are healthy. Frontend runtime origin is `https://review.v1su4.dev`, owner email is `gordo@v1su4.com`, and backend and bucket names match the dedicated deployment. Six frontend runtime secrets match their exact BWS sources without exposing values.
- Real browser: Email + Password sign-in opened the existing workspace; Account menu displayed Sign out; clicking it returned to `/studio/sign-in`. HTTP checks independently confirmed that normal login issues a session and logout removes workspace access.
- Public dedicated JWKS endpoint returns one verification key. An S3 PUT preflight from `https://review.v1su4.dev` returns 200 with that exact allowed origin. This checks domain CORS, not a new full media-processing run.
- DNS A query for the retired hostname supplies no address; the new hostname resolves. Direct HTTPS against the origin for the old hostname supplies no app response.

## Recovery

App VM holds `/home/gordo/review-room-pre-domain-owner.tgz`, image tag `review-room-svelte-app-app:pre-domain-owner`, and Caddy backup `/opt/caddy-edge/Caddyfile.pre-review-domain-20261005`. Do not restore the old hostname during routine app rollback: its retirement is an explicit owner decision. Authentication keys remain canonical in BWS.
