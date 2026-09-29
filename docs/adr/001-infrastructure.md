# ADR 001 — Infrastructure (self-hosted homelab)

**Status:** Accepted  
**Date:** 2026-06-02  
**Reference implementation:** [pindeck](https://github.com/gordo-v1su4/pindeck)

## Context

Review Room stores metadata in its dedicated self-hosted Convex deployment and media in its private RustFS bucket. SvelteKit signs storage requests server-side so browsers never hold S3 credentials. The former React app and its Hostinger deployment are independent; this app does not read their data, credentials, or deployment state.

## Decision

| Layer | Choice |
|-------|--------|
| **Convex** | **Personal Review Room deployment:** `https://review-convex.v1su4.dev` (client), `https://review-convex-site.v1su4.dev` (HTTP/actions). Dedicated `review-room-svelte-convex` Compose project and volume on app-vm. Deploy with the matching `CONVEX_SELF_HOSTED_URL` and `CONVEX_SELF_HOSTED_ADMIN_KEY`. |
| **Auth** | `@convex-dev/auth` with Password + Google + GitHub (Pindeck pattern). Admin role on `appUsers`. |
| **Media uploads (browser)** | SvelteKit server upload sessions → private RustFS `review-room-svelte` bucket (`S3_*` env, path-style). Files over 50 MiB need multipart upload with parts below the proxied endpoint's request limit. The server verifies the stored object before finalizing the asset. |
| **Media processing** | Dedicated Review Room Trigger.dev project on VM100 runs bounded FFmpeg ingest stages and updates this app's Convex records. |
| **Media access** | SvelteKit issues time-limited presigned RustFS URLs from the private Review Room bucket. |
| **Frontend deploy** | Personal Vercel project `review-room-svelte` (or `bun dev` locally); env points only at the personal Convex instance and private bucket. |

## Review Room environment

| Variable | Purpose |
|----------|---------|
| `REVIEW_ROOM_CONVEX_URL` | Dedicated Convex client endpoint used by the Svelte server and Trigger workers |
| `REVIEW_ROOM_CONVEX_ADMIN_KEY` | App-side Convex credential; secret, server-side only |
| `PUBLIC_CONVEX_URL` | Browser Convex WebSocket client |
| `PUBLIC_CONVEX_SITE_URL` | Convex HTTP site (actions, auth callbacks) |
| `CONVEX_SELF_HOSTED_URL` | `convex deploy` target |
| `CONVEX_SELF_HOSTED_ADMIN_KEY` | Deploy admin key (secret, not committed) |
| `S3_ENDPOINT` | RustFS S3 API (e.g. `https://s3.v1su4.dev`) |
| `S3_BUCKET` | `review-room-svelte` |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Scoped Review Room storage credential; secret, server-side only |
| `REVIEW_ROOM_TRIGGER_SECRET_KEY` | Dispatch into the dedicated Review Room Trigger project; secret, server-side only |

## CORS / TLS

- Browser PUT to presigned URLs requires RustFS CORS allowing the Review Room origin.
- Multipart uploads also require `POST` and an exposed `ETag` response header in this bucket's CORS policy.
- Validate upload behavior against the dedicated Review Room deployment.

## Consequences

- `.env.local` is required for live dev; populate it from `.env.example` using only Review Room credentials. Do not copy Pindeck or the former React app's environment.
- Trigger workers must run on VM100 with FFmpeg and network access to the dedicated RustFS bucket and Convex deployment.

## Personal isolation, 2026-09-28

The new backend is on app-vm at `/opt/review-room-svelte-convex` with its own Docker volume, Tailscale-bound ports `13230` and `13231`, and public Caddy routes above. The private RustFS bucket is `review-room-svelte`; the scoped service account can read and write only its `assets/*` keys. Instance and storage secrets are separate BWS `REVIEW_ROOM_*` records. Provisioning source is in `infra/personal-backend/`.
