# Review Room

![Review Room workspace with Neon Afterlife media, playback, and feedback](docs/images/review-room.webp)

A Svelte 5 and TypeScript media review workspace. This is the only frontend in the repository.

```sh
bun install --frozen-lockfile
bun dev                 # http://127.0.0.1:5173
bun run check
bun test
bun run build
```

The standalone frontend runs on App VM at `https://review.v1su4.dev`, backed by dedicated Convex, RustFS, and Trigger services. The owner signs in with Convex email/password after one-time setup using the current owner password. Public review routes remain token scoped.

The explorer supports appearance controls, metadata fields, hover scrubbing, collections and folders. Selecting media opens the adjustable review panes. Native playback has capability-gated WebCodecs previews and WebGPU rendering with fallback.

- `src/routes/`: SvelteKit routes
- `src/lib/`: domain logic, media adapters and Svelte components
- `convex/`, `services/media-worker/`: dedicated metadata and media-processing backends
- `.scratch/svelte-migration/`: specification, tickets and acceptance evidence

Deploy only to the dedicated App VM frontend and Review Room services. The sole Git remote is the personal `gordo-v1su4/review-room-svelte` repository. Never push or deploy to Buzero or the former React app. See [deployment guide](docs/deploy-app-vm-and-auth.md).

The original Next.js app and its configuration have been removed. Historical feature comparisons use Git commit `301495d`; no second app or duplicate lockfile is required. See the [remaining work](.scratch/svelte-migration/remaining-work.md) for release gates.
