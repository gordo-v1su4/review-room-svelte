# Review Room

![Review Room workspace with Neon Afterlife media, playback, and feedback](docs/images/review-room.webp)

A media review workspace for creators and clients. Organize videos and still images, review exact versions, collect feedback, and move projects from first review to approval.

## Features

- **Media libraries** — projects, nested folders, collections, search, filters, and grid, list, or table views.
- **Video and image review** — hover scrubbing, adjustable playback panes, still-image previews, and drawing markup on images.
- **Version context** — select a media version and keep its prompts, model information, notes, and image references together.
- **Feedback and approvals** — timecoded comments, star ratings, shortlists, requests for changes, approvals, and a feedback inbox.
- **Private sharing** — scoped review links, access and download controls, and separate creator and reviewer permissions.
- **Batch uploads** — progress, cancellation, retry, and background thumbnail and scrub-preview generation.
- **Optional publishing** — send selected versions to Trailer Feed with delivery status, metadata refresh, and removal controls.

## How it works

1. Create a project and organize its media.
2. Upload videos and images, then open an asset and select its version.
3. Share a review link for clients to watch, comment, rate, and approve.
4. Follow feedback in the inbox and upload revisions.
5. Publish selected versions to Trailer Feed when ready.

## Run locally

Install **Git**, **Bun 1.3.14**, and **Node.js 22**. Use a current browser that supports your media formats.

```sh
git clone https://github.com/gordo-v1su4/review-room-svelte.git
cd review-room-svelte
bun install --frozen-lockfile
bun dev
```

Open **http://127.0.0.1:5173**.

Without backend environment settings, the app opens a local preview workspace. Explore the interface and open local media; server persistence, uploads, authentication, and shared review links require the connected services.

### Connect a persistent workspace

The connected workspace uses Convex for accounts and project data, S3-compatible storage for media, and FFmpeg workers coordinated by Trigger.dev for thumbnails and scrub previews.

See [the deployment and configuration guide](docs/deploy-app-vm-and-auth.md) for this repository's maintained self-hosted setup. [`.env.example`](.env.example) lists the configuration fields; keep real credentials in private environment settings.

## Development commands

| Command | Purpose |
| --- | --- |
| `bun dev` | Start the local development server |
| `bun run check` | Check Svelte and TypeScript |
| `bun test` | Run the test suite |
| `bun run build` | Create the production build |
| `bun run preview` | Preview a production build locally |

## Built with

Svelte 5, SvelteKit, TypeScript, and Bun, with Convex, RustFS, and Trigger.dev supporting the connected workspace.

## Learn more

- [Product overview and review workflow](init-docs/01-PRD.md)
- [Deployment and configuration](docs/deploy-app-vm-and-auth.md)
- [Trailer Feed integration](docs/api/destination-sync.md)
