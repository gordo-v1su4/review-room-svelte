# Deploy — Vercel + homelab Convex + RustFS

Review Room uses **Next.js** (not Vite). Pindeck uses Vite; the URLs are the same, but the browser env names are different.

## Production deployment contract

Review Room has two independent production deployment surfaces:

| Surface | Production target | Automatic deployment |
|---------|-------------------|----------------------|
| Next.js frontend + API routes | Vercel / `https://unfold-flower-gen.app` | Vercel deploys pushes to `main` |
| Convex schema + functions | Self-hosted / `https://unfold.serving.cloud` | `.github/workflows/deploy-convex.yml` deploys relevant pushes to `main` |

A Vercel deployment never publishes `convex/`. A cross-layer correction is complete only after both deployments succeed and the affected production role completes the final user-visible workflow.

The Convex workflow runs when `convex/**`, `convex.json`, `package.json`, `bun.lock`, or the workflow itself changes. It also supports a manual `workflow_dispatch` run. GitHub repository secrets must contain:

- `CONVEX_SELF_HOSTED_URL` — must equal `https://unfold.serving.cloud`; the workflow refuses any other target.
- `CONVEX_SELF_HOSTED_ADMIN_KEY` — the Review Room self-hosted deployment admin key.

If the automatic workflow cannot run, deploy manually from a trusted checkout with the same variables in `.env.local`:

```bash
bun run deploy:convex
```

After a cross-layer fix:

1. Confirm the Vercel production deployment succeeded.
2. Confirm the GitHub `Deploy Convex` run succeeded for the same `main` commit.
3. Exercise the production workflow with the affected role and media/data type.
4. Confirm the final persisted result, not only the absence of an error toast.

## NEXT_PUBLIC_* for Review Room

| Pindeck (Vite) | Review Room (Next.js) | Used by |
|----------------|----------------------|---------|
| `VITE_CONVEX_URL` | `NEXT_PUBLIC_CONVEX_URL` | Browser Convex client |
| `VITE_CONVEX_SITE_URL` | `NEXT_PUBLIC_CONVEX_SITE_URL` | Docs / optional client |
| — | (server only) | Next API routes |

Use `NEXT_PUBLIC_*` in Review Room. If copying Pindeck env locally, run `scripts/use-homelab-env.ps1`; it reads Pindeck `VITE_*` values and writes Review Room `NEXT_PUBLIC_*` values. Do not keep duplicate `VITE_*` aliases in this repo.

### Homelab vs local Convex

For **self-hosted production** (pindeck pattern, Review Room deployment):

- Set `NEXT_PUBLIC_CONVEX_URL=https://unfold.serving.cloud`
- Set `NEXT_PUBLIC_CONVEX_SITE_URL=https://unfold-site.serving.cloud`
- Set `CONVEX_SELF_HOSTED_URL` + `CONVEX_SELF_HOSTED_ADMIN_KEY` for `bun run deploy:convex`
- **Remove** `CONVEX_DEPLOYMENT` if it points at anonymous local `127.0.0.1:3210` — that overrides homelab deploy

---

## Vercel environment variables

In the Vercel project → Settings → Environment Variables, set:

### Browser (Production + Preview)

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | `https://unfold.serving.cloud` |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | `https://unfold-site.serving.cloud` |
| `SITE_URL` | `https://your-app.vercel.app` (your Vercel URL after first deploy) |

Vercel must use `NEXT_PUBLIC_*` for browser-exposed Convex URLs.

### Server-only (never `NEXT_PUBLIC_`)

| Variable | Purpose |
|----------|---------|
| `S3_ENDPOINT` | RustFS S3 API |
| `S3_PUBLIC_BASE_URL` | Public object base |
| `S3_BUCKET` | e.g. `unfold-review-room` (your bucket) |
| `S3_ACCESS_KEY_ID` | RustFS key |
| `S3_SECRET_ACCESS_KEY` | RustFS secret |
| `S3_FORCE_PATH_STYLE` | `true` |
| `MEDIA_WORKER_SECRET` | Shared secret for worker + `/api/media/enqueue` |
| `MEDIA_WORKER_URL` | Homelab worker URL if not localhost; required for Vercel Production and Preview uploads to generate thumbnails/scrub sprites |

Or, if using the media gateway instead of direct S3 presign: `MEDIA_GATEWAY_*` and `USE_MEDIA_GATEWAY=1`.

**RustFS / S3 vars are not in Convex** — they stay on Vercel (Next presign routes) or your worker host.

---

## JWT_PRIVATE_KEY (Convex Auth)

Password sign-in is handled by **Convex Auth on the Convex backend**, not Next.js.

`JWT_PRIVATE_KEY` in your local `.env.local` is **not** read by Convex functions. It must live on the **Convex deployment** (homelab dashboard or CLI).

### Generate keys (once per deployment)

From the project root:

```bash
bunx @convex-dev/auth
```

Follow prompts, or generate manually per [Convex Auth manual setup](https://labs.convex.dev/auth/setup/manual):

```bash
bunx jose-cli  # or use the generateKeys.mjs script from the docs
```

You need **two** variables on the Convex deployment:

| Convex env var | Description |
|----------------|-------------|
| `JWT_PRIVATE_KEY` | PKCS#8 private key (`-----BEGIN PRIVATE KEY-----`) |
| `JWKS` | JSON Web Key Set (matching public key) |

### Set on self-hosted Convex

With homelab admin key (same as pindeck deploy):

```bash
# CONVEX_SELF_HOSTED_URL and CONVEX_SELF_HOSTED_ADMIN_KEY in .env.local
bunx convex env set JWT_PRIVATE_KEY -- "<paste PKCS8 key>"
bunx convex env set JWKS '<paste jwks json>'
bunx convex env set SITE_URL "https://your-app.vercel.app"
```

Also ensure `CONVEX_SITE_URL` on the backend matches your HTTP actions host (`https://unfold-site.serving.cloud`).

### Google / GitHub (same as pindeck)

On the **Convex deployment** env (not Vercel):

| Variable | Purpose |
|----------|---------|
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth secret |
| `AUTH_GITHUB_ID` | GitHub OAuth app ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth secret |

Review Room uses a separate homelab Convex deployment from pindeck. Reuse the same provider setup pattern, but set these on the Review Room deployment.

OAuth redirect URIs in Google/GitHub consoles must include Convex Auth callback URLs on your **Convex site** host (see [Convex Auth docs](https://labs.convex.dev/auth)). `SITE_URL` should be your Review Room origin (`http://localhost:3000` locally, Vercel URL in prod).

### After Vercel deploy

1. Deploy to Vercel → note the production URL.
2. Set `SITE_URL` on **Convex** to that URL (auth redirects).
3. Set `SITE_URL` on **Vercel** to the same value (optional, for any server-side links).

---

## Quick checklist

1. `.env.local`: homelab Convex URLs + RustFS `S3_*` or `MEDIA_GATEWAY_*`
2. GitHub secrets: `CONVEX_SELF_HOSTED_URL` + `CONVEX_SELF_HOSTED_ADMIN_KEY`
3. Push relevant changes to `main` and confirm the `Deploy Convex` workflow succeeds
4. Convex deployment env: `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`
5. Vercel env: `NEXT_PUBLIC_CONVEX_URL`, `S3_*`, `SITE_URL`
6. `bun run worker:media` on homelab (or set `MEDIA_WORKER_URL` on Vercel)
7. For cross-layer fixes, verify the affected production flow only after both Vercel and Convex finish
