# Personal Review Room deployment

This standalone SvelteKit app runs on App VM at `https://review.v1su4.dev`. The private owner workspace is `/`; reviewers use private `/review/[token]` links. Publication is optional and requires an explicit owner action.

## Dedicated services

| Setting | Required value |
| --- | --- |
| `REVIEW_ROOM_CONVEX_URL` | `https://review-convex.v1su4.dev` |
| `CONVEX_SELF_HOSTED_URL` (deploy only) | `https://review-convex.v1su4.dev` |
| `S3_ENDPOINT` | `https://s3.v1su4.dev` |
| `S3_BUCKET` | `review-room-svelte` |

The Convex deployment is the `review-room-svelte-convex` Compose project on app-vm with its own Docker volume. RustFS uses a private bucket and a service account scoped to this app. Deployment source and recovery notes are in `infra/personal-backend/`. Never substitute another application's Convex URL, admin key, bucket, or storage credentials.

Browser uploads require bucket CORS for the exact frontend origin `https://review.v1su4.dev`: PUT/GET/HEAD, `content-type`, exposed `ETag`, max age 3600. The original frontend origin was added on October 2, 2026 and replaced with this hostname on October 5, preserving unrelated rules. The preceding policy is backed up on RustFS VM114 at `/var/backups/review-room-svelte/cors-pre-v1s135-1790959928.json`. Do not replace unrelated origins or change bucket access policy when repairing CORS.

## Private App VM settings

The root-owned mode-600 `/opt/review-room-svelte-app/private.env` contains `REVIEW_ROOM_CONVEX_ADMIN_KEY`, `REVIEW_ROOM_OWNER_PASSWORD`, `REVIEW_ROOM_SESSION_SECRET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `REVIEW_ROOM_TRIGGER_SECRET_KEY`, supplied from Review Room's BWS records. Compose sets `REVIEW_ROOM_OWNER_EMAIL=gordo@v1su4.com` and the frontend origin. The owner cookie and all Convex admin and S3 access stay server-side. Do not expose these as `PUBLIC_` variables.

`src/lib/server/personal.ts` rejects any backend or bucket target outside the dedicated Review Room deployment. Missing settings fail with 503. The media worker also requires the dedicated Convex site URL (`https://review-convex-site.v1su4.dev`), bucket, and a nonempty worker secret.

## Deploy and verify

Use Bun for checks and build. Deploy a reviewed snapshot of the personal repository into `/home/gordo/review-room-svelte-deploy` on App VM and run `docker compose -f infra/app-vm/compose.yaml up -d --build`. Caddy routes `review.v1su4.dev` to loopback port 18094. Verify the container health, sign-in, authenticated workspace, private review, upload, publication, replacement, revocation, and showcase against the deployed routes before closing related Linear issues.

Owner sign-in uses Convex email/password. Owner setup requires the existing owner password and the exact configured owner email; App VM then invokes a private Convex mutation to grant that account an admin profile. Convex `AUTH_EMAIL_ALLOWLIST` must explicitly include that email. The old owner-password form remains under a collapsed recovery option during migration. GitHub and Google buttons must remain hidden until their OAuth apps, credentials, callback URLs, and end-to-end sign-in are verified. Public sign-up is not a path to admin access.

## Canonical hostname and authentication configuration — October 5, 2026

`review.v1su4.dev` is the sole frontend hostname, explicitly routed by Caddy. The former `review-room.v1su4.dev` app route is removed without redirecting to the new hostname. Existing review paths and tokens remain valid on the new hostname; previously shared URLs using the retired hostname stop working by explicit owner request. Cloudflare's wildcard DNS remains intact for other apps. A TXT-only retirement record at `review-room.v1su4.dev` suppresses wildcard A/AAAA/CNAME synthesis for that name; it supplies no web destination.

The dedicated Convex backend requires `JWT_PRIVATE_KEY` and `JWKS` to issue and verify authentication tokens. Their dedicated BWS records are `REVIEW_ROOM_AUTH_JWT_PRIVATE_KEY` and `REVIEW_ROOM_AUTH_JWKS`; do not reuse the former React application's keys. Store the private key in the single-line PKCS8 format expected by Convex Auth. Configure `SITE_URL=https://review.v1su4.dev` and `AUTH_EMAIL_ALLOWLIST=gordo@v1su4.com` on the dedicated backend.

The owner's normal email/password account uses `gordo@v1su4.com` and the existing BWS `PROXMOX_HOME_SHARED_OPERATOR_APP_PASSWORD`. `REVIEW_ROOM_OWNER_PASSWORD` is the separate setup/recovery credential, not the normal login password. The Account menu exposes Sign out through the existing POST `/studio?/logout` action, which deletes the server owner cookie.

### Dedicated BWS inventory

All `REVIEW_ROOM_*` records belong exclusively to `gordo-v1su4/review-room-svelte` on VM100, not Hostinger Unfold or Project Stack Structure. BWS notes identify the repository, frontend/backend URLs, private bucket, and owning runbook. Each record has one exact match in `hermes_keys`.

| BWS record | Consumer |
| --- | --- |
| `REVIEW_ROOM_CONVEX_INSTANCE_SECRET` | Dedicated Convex backend instance bootstrap |
| `REVIEW_ROOM_CONVEX_SELF_HOSTED_ADMIN_KEY` | Convex deployment and frontend `REVIEW_ROOM_CONVEX_ADMIN_KEY` |
| `REVIEW_ROOM_AUTH_JWT_PRIVATE_KEY` | Convex `JWT_PRIVATE_KEY` |
| `REVIEW_ROOM_AUTH_JWKS` | Convex `JWKS` |
| `REVIEW_ROOM_OWNER_PASSWORD` | Frontend owner setup/recovery |
| `REVIEW_ROOM_SESSION_SECRET` | Frontend owner-cookie signing |
| `REVIEW_ROOM_S3_ACCESS_KEY` / `REVIEW_ROOM_S3_SECRET_KEY` | Dedicated private bucket service account; frontend/worker S3 credentials |
| `REVIEW_ROOM_TRIGGER_SECRET_KEY` | Dedicated Review Room Trigger project |
| `REVIEW_ROOM_API_CATALOG_KEY` | Dedicated catalog API integration |

Hostinger Unfold's records retain the `PROXMOX_HOME_HOSTINGER_UNFOLD_CONVEX_*` prefix and are unchanged. No duplicate Review Room records were found; retained setup, storage, worker, and API credentials have distinct consumers.
