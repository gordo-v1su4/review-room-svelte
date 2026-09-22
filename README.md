# Review Room

A Svelte 5 and TypeScript media review workspace. This is the only frontend in the repository.

```sh
bun install --frozen-lockfile
bun dev                 # http://127.0.0.1:5173
bun run check
bun test
bun run build
```

The workspace currently runs as a local, tab-scoped session. Imported files stay on the device; projects and reviews are not durable across refreshes. Live sign-in, persistence and shared-review integration remain deferred. Public review routes fail closed until configured.

The explorer supports appearance controls, metadata fields, hover scrubbing, collections and folders. Selecting media opens the adjustable review panes. Native playback has capability-gated WebCodecs previews and WebGPU rendering with fallback.

- `src/routes/`: SvelteKit routes
- `src/lib/`: domain logic, media adapters and Svelte components
- `convex/`, `services/media-worker/`: retained backend sources for later integration
- `.scratch/svelte-migration/`: specification, tickets and acceptance evidence

Deploy only to personal Vercel scope `gordo-v1su4s-projects`, project `review-room-svelte`. The sole Git remote is the personal `gordo-v1su4/review-room-svelte` repository. Never push or deploy to Buzero.

The original Next.js app and its configuration have been removed. Historical feature comparisons use Git commit `301495d`; no second app or duplicate lockfile is required. See the [remaining work](.scratch/svelte-migration/remaining-work.md) for release gates.
