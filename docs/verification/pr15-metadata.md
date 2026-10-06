# PR 15 metadata repair verification — October 6, 2026

Hermes's uncommitted fixes were recovered from RackNerd's `/root/.hermes/cache/scratch/review-room-svelte-fix`, based on PR head `d75382e`. The original server working copy was preserved.

Exact asset/version import fallbacks now supply prompt, model, source label and source date during initial hydration, selection and refresh. Saved metadata, including deliberately empty values, takes precedence. Legacy imports resolve only when both the asset version and unversioned mapping are unambiguous. Selecting or refreshing a version preserves the known ingest filename.

Owner HTTP saves require an explicit expected revision. A conflict retains the draft and offers an explicit discard/reload action in desktop and sheet inspectors. Only a successful version read discards the draft; edits remain disabled while that read is pending.

Validation: 182 Bun tests, 944 assertions, zero failures; Svelte check zero errors and eight existing warnings; Convex TypeScript check and production build pass. `node scripts/check-version-metadata.mjs` exercises the real workspace with fixture data and mocked HTTP responses. It verifies exact-version selection and refresh, subsequent save payloads, deliberate empty fields, retained conflict drafts, delayed reload disabling edits, and saving with the updated revision. Screenshot: ignored `output/playwright/pr15-metadata-verification.png`.

These are local regression checks, not live persistence, authorization or deployment evidence. Dedicated Convex/frontend deployment, production import backfill and two-session acceptance remain separate release work for V1S-164.
