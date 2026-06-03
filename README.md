![Review Room interface](docs/assets/review-room-preview.webp)

# Review Room

Client-facing video review workspace for uploading, scrubbing, shortlisting, commenting on, and approving clips.

## Quick Start

```bash
bun install
bun dev
bun run worker:media
```

Copy `.env.example` to `.env.local` before running locally. Convex, RustFS/S3, and deployment notes live in [`docs/`](docs/).

## Project Docs

- [`init-docs/00-Creative-Brief.md`](init-docs/00-Creative-Brief.md)
- [`init-docs/01-PRD.md`](init-docs/01-PRD.md)
- [`init-docs/02-Design-Spec.md`](init-docs/02-Design-Spec.md)
