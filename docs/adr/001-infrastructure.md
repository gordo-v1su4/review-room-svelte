# ADR 001 — Infrastructure (self-hosted homelab)

**Status:** Accepted  
**Date:** 2026-06-02  
**Reference implementation:** [pindeck](https://github.com/gordo-v1su4/pindeck)

## Context

Review Room stores metadata in Convex and media in RustFS. Production Pindeck already runs on self-hosted Convex and a RustFS-backed media layer. The PRD allows direct S3 presign from Next.js; Pindeck uses a **media gateway** so browsers never hold S3 credentials.

## Decision

| Layer | Choice |
|-------|--------|
| **Convex** | **Review Room deployment:** `https://unfold.serving.cloud` (client), `https://unfold-site.serving.cloud` (HTTP/actions). **Pindeck** uses `convex.serving.cloud` / `convex-site.serving.cloud` on the same VPS — separate instances, do not mix env vars. Deploy with `CONVEX_SELF_HOSTED_URL` + `CONVEX_SELF_HOSTED_ADMIN_KEY`. Do **not** set `CONVEX_DEPLOYMENT` from pindeck or local anonymous dev unless intentional. |
| **Auth** | `@convex-dev/auth` with Password + Google + GitHub (Pindeck pattern). Admin role on `appUsers`. |
| **Media uploads (browser)** | Next.js presign routes → RustFS S3 API (`S3_*` env, path-style). Fallback documented in `.env.example` for `MEDIA_GATEWAY_*` if presign is blocked by CORS. |
| **Media processing** | Homelab worker (`services/media-worker`) calls ffmpeg for thumbnail + sprite sheet; updates Convex `videos` keys. Can alternatively call `MEDIA_GATEWAY_URL` `/process-image` when `USE_MEDIA_GATEWAY=1`. |
| **Public object URLs** | Presigned GET from Next.js, or `S3_PUBLIC_BASE_URL` + key when objects are public-read. |
| **Frontend deploy** | Vercel (or `bun dev` locally); env points at homelab Convex + storage. |

## Homelab endpoint map (from Pindeck)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | Browser Convex WebSocket client |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Convex HTTP site (actions, auth callbacks) |
| `CONVEX_SELF_HOSTED_URL` | `convex deploy` target |
| `CONVEX_SELF_HOSTED_ADMIN_KEY` | Deploy admin key (secret, not committed) |
| `S3_ENDPOINT` | RustFS S3 API (e.g. `https://s3.v1su4.dev`) |
| `S3_PUBLIC_BASE_URL` | Public read base (e.g. `https://s3.v1su4.dev`) |
| `S3_BUCKET` | Bucket (e.g. `review-room`) |
| `S3_FORCE_PATH_STYLE` | `true` for RustFS |
| `MEDIA_GATEWAY_URL` | Optional: `https://media.v1su4.dev` |
| `MEDIA_GATEWAY_TOKEN` | Bearer for gateway writes |

## CORS / TLS

- Browser PUT to presigned URLs requires RustFS CORS allowing the app origin.
- Validate in Stage 3.8 before upload E2E.
- Local dev may use Tailscale/hostnames documented in Pindeck README.

## Consequences

- `.env.local` is required for dev; values mirror Pindeck homelab, not Convex Cloud templates.
- Worker must run on a host with ffmpeg and network access to RustFS + Convex.
