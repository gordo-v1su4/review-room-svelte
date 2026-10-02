# Personal Review Room deployment

This standalone SvelteKit app runs on App VM at `https://review-room.v1su4.dev`. The private owner workspace is `/`; reviewers use private `/review/[token]` links. Publication is optional and requires an explicit owner action.

## Dedicated services

| Setting | Required value |
| --- | --- |
| `REVIEW_ROOM_CONVEX_URL` | `https://review-convex.v1su4.dev` |
| `CONVEX_SELF_HOSTED_URL` (deploy only) | `https://review-convex.v1su4.dev` |
| `S3_ENDPOINT` | `https://s3.v1su4.dev` |
| `S3_BUCKET` | `review-room-svelte` |

The Convex deployment is the `review-room-svelte-convex` Compose project on app-vm with its own Docker volume. RustFS uses a private bucket and a service account scoped to this app. Deployment source and recovery notes are in `infra/personal-backend/`. Never substitute another application's Convex URL, admin key, bucket, or storage credentials.

Browser uploads require bucket CORS for the exact frontend origin `https://review-room.v1su4.dev`: PUT/GET/HEAD, `content-type`, exposed `ETag`, max age 3600. On October 2, 2026, this rule was added without removing existing rules. The preceding policy is backed up on RustFS VM114 at `/var/backups/review-room-svelte/cors-pre-v1s135-1790959928.json`. Do not replace unrelated origins or change bucket access policy when repairing CORS.

## Private App VM settings

The root-owned mode-600 `/opt/review-room-svelte-app/private.env` contains `REVIEW_ROOM_CONVEX_ADMIN_KEY`, `REVIEW_ROOM_OWNER_PASSWORD`, `REVIEW_ROOM_SESSION_SECRET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `REVIEW_ROOM_TRIGGER_SECRET_KEY`, supplied from Review Room's BWS records. Compose sets `REVIEW_ROOM_OWNER_EMAIL=gordo@v1su4.com` and the frontend origin. The owner cookie and all Convex admin and S3 access stay server-side. Do not expose these as `PUBLIC_` variables.

`src/lib/server/personal.ts` rejects any backend or bucket target outside the dedicated Review Room deployment. Missing settings fail with 503. The media worker also requires the dedicated Convex site URL (`https://review-convex-site.v1su4.dev`), bucket, and a nonempty worker secret.

## Deploy and verify

Use Bun for checks and build. Deploy a reviewed snapshot of the personal repository into `/home/gordo/review-room-svelte-deploy` on App VM and run `docker compose -f infra/app-vm/compose.yaml up -d --build`. Caddy routes `review-room.v1su4.dev` to loopback port 18094. Verify the container health, sign-in, authenticated workspace, private review, upload, publication, replacement, revocation, and showcase against the deployed routes before closing related Linear issues.

Owner sign-in uses Convex email/password. Owner setup requires the existing owner password and the exact configured owner email; App VM then invokes a private Convex mutation to grant that account an admin profile. Convex `AUTH_EMAIL_ALLOWLIST` must explicitly include that email. The old owner-password form remains under a collapsed recovery option during migration. GitHub and Google buttons must remain hidden until their OAuth apps, credentials, callback URLs, and end-to-end sign-in are verified. Public sign-up is not a path to admin access.
