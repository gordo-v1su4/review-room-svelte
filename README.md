# Review Room

Client-facing video review portal. Planning docs in `init-docs/`; application in `src/` + `convex/`.

## Quick start

1. `bun install`
2. Copy `.env.example` → `.env.local` (or run `scripts/use-homelab-env.ps1` from pindeck homelab vars)
3. `bunx convex dev` in one terminal, `bun dev` in another
4. Open `/sign-in`, create admin account, create a project

For production homelab: set `NEXT_PUBLIC_CONVEX_URL` (or `VITE_CONVEX_URL`), `CONVEX_SELF_HOSTED_*`, and `S3_*` — see [docs/adr/001-infrastructure.md](docs/adr/001-infrastructure.md) and [docs/deploy-vercel-and-auth.md](docs/deploy-vercel-and-auth.md).

**Next.js vs Vite:** This app is Next.js (PRD). Pindeck’s `VITE_*` names work locally via env mirroring; Vercel uses `NEXT_PUBLIC_*` at build time.

## Docs

1. [`init-docs/00-Creative-Brief.md`](init-docs/00-Creative-Brief.md)
2. [`init-docs/01-PRD.md`](init-docs/01-PRD.md)
3. [`init-docs/02-Design-Spec.md`](init-docs/02-Design-Spec.md)

## For agents

See [`AGENTS.md`](AGENTS.md).
