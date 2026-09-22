# Svelte Review Room

The replacement frontend runs alongside the original Next.js app while parity is built.

From the repository root:

```sh
bun run dev:svelte       # http://127.0.0.1:5173
bun run check:svelte
bun run test:svelte
bun run build:svelte
```

From this directory, install the locked dependencies with `bun install --frozen-lockfile`.

The current workspace is an explicitly local session. Choose a video or image from your device to review it. Files are not uploaded, and reviews are held in memory until the page is closed or refreshed. Resizing the workspace preserves the media element and current review state. This slice does not yet provide authenticated projects, server persistence, public review links, or remote uploads.

The native media path supports browser-decodable video, drag seeking with temporary mute, keyboard seeking, and source cleanup. MP4 scrubbing additionally uses a bounded WebCodecs worker preview and optional WebGPU rendering with native fallback. The user-facing strip reports source properties rather than debug timings. This build does not claim performance superiority over native playback. Explorer thumbnails use lazy, muted native seeking on hover.

See [the migration specification](../.scratch/svelte-migration/spec.md), [shipping goal](../.scratch/svelte-migration/goal.md), and [parity ledger](../.scratch/svelte-migration/parity-ledger.md) for the release gates. Keep the original app available for comparison until those gates pass.

The project overview is folder-only. Enter a collection for the full explorer; select media to open the viewer, then optionally reveal Notes & info. Appearance supports square/landscape/portrait, Fit/Fill, and three card sizes. Appearance and pane proportions are local preferences; project data and reviews remain tab-local pending backend integration.
