# ADR 001 — Infrastructure (self-hosted homelab)

**Status:** Accepted  
**Date:** 2026-06-02  
**Reference implementation:** [pindeck](https://github.com/gordo-v1su4/pindeck)

## Context

Review Room stores metadata in Convex and media in RustFS. Production Pindeck already runs on self-hosted Convex and a RustFS-backed media layer. The PRD allows direct S3 presign from Next.js; Pindeck uses a **media gateway** so browsers never hold S3 credentials.

## Decision

| Layer | Choice |
|-------|--------|
| **Convex** | **Personal Review Room deployment:** `https://review-convex.v1su4.dev` (client), `https://review-convex-site.v1su4.dev` (HTTP/actions). Dedicated `review-room-svelte-convex` Compose project and volume on app-vm. Deploy with the matching `CONVEX_SELF_HOSTED_URL` and `CONVEX_SELF_HOSTED_ADMIN_KEY`. |
| **Auth** | `@convex-dev/auth` with Password + Google + GitHub (Pindeck pattern). Admin role on `appUsers`. |
| **Media uploads (browser)** | SvelteKit server upload sessions → private RustFS `review-room-svelte` bucket (`S3_*` env, path-style). Files over 50 MiB need multipart upload with parts below the proxied endpoint's request limit. The server verifies the stored object before finalizing the asset. |
| **Media processing** | Homelab worker (`services/media-worker`) calls ffmpeg for thumbnail + sprite sheet; updates Convex `videos` keys. Can alternatively call `MEDIA_GATEWAY_URL` `/process-image` when `USE_MEDIA_GATEWAY=1`. |
| **Public object URLs** | Presigned GET from Next.js, or `S3_PUBLIC_BASE_URL` + key when objects are public-read. |
| **Frontend deploy** | Personal Vercel project `review-room-svelte` (or `bun dev` locally); env points only at the personal Convex instance and private bucket. |

## Homelab endpoint map (from Pindeck)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | Browser Convex WebSocket client |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Convex HTTP site (actions, auth callbacks) |
| `CONVEX_SELF_HOSTED_URL` | `convex deploy` target |
| `CONVEX_SELF_HOSTED_ADMIN_KEY` | Deploy admin key (secret, not committed) |
| `S3_ENDPOINT` | RustFS S3 API (e.g. `https://s3.v1su4.dev`) |
| `S3_PUBLIC_BASE_URL` | Public read base (e.g. `https://s3.v1su4.dev`) |
| `S3_BUCKET` | `review-room-svelte` |
| `S3_FORCE_PATH_STYLE` | `true` for RustFS |
| `MEDIA_GATEWAY_URL` | Optional: `https://media.v1su4.dev` |
| `MEDIA_GATEWAY_TOKEN` | Bearer for gateway writes |

## CORS / TLS

- Browser PUT to presigned URLs requires RustFS CORS allowing the app origin.
- Multipart uploads also require `POST` and an exposed `ETag` response header in the bucket CORS policy.
- Validate in Stage 3.8 before upload E2E.
- Local dev may use Tailscale/hostnames documented in Pindeck README.

## Consequences

- `.env.local` is required for live dev; values must use the personal Review Room instance and scoped bucket credentials.
- Worker must run on a host with ffmpeg and network access to RustFS + Convex.

## Personal isolation, 2026-09-28

The new backend is on app-vm at `/opt/review-room-svelte-convex` with its own Docker volume, Tailscale-bound ports `13230` and `13231`, and public Caddy routes above. The private RustFS bucket is `review-room-svelte`; the scoped service account can read and write only its `assets/*` keys. Instance and storage secrets are separate BWS `REVIEW_ROOM_*` records. Provisioning source is in `infra/personal-backend/`.
