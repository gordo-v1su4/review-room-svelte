# Personal Review Room deployment

This SvelteKit app runs at `https://review-room-svelte.vercel.app`. The private owner workspace is `/`; reviewers use private `/review/[token]` links. Publication is optional and requires an explicit owner action.

## Dedicated services

| Setting | Required value |
| --- | --- |
| `REVIEW_ROOM_CONVEX_URL` | `https://review-convex.v1su4.dev` |
| `CONVEX_SELF_HOSTED_URL` (deploy only) | `https://review-convex.v1su4.dev` |
| `S3_ENDPOINT` | `https://s3.v1su4.dev` |
| `S3_BUCKET` | `review-room-svelte` |

The Convex deployment is the `review-room-svelte-convex` Compose project on app-vm with its own Docker volume. RustFS uses a private bucket and a service account scoped to this app. Deployment source and recovery notes are in `infra/personal-backend/`. Never substitute another application's Convex URL, admin key, bucket, or storage credentials.

## Private Vercel settings

Set `REVIEW_ROOM_CONVEX_ADMIN_KEY`, `REVIEW_ROOM_OWNER_PASSWORD`, `REVIEW_ROOM_SESSION_SECRET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` as private environment variables. Set the four endpoint values above, plus `S3_REGION=us-east-1`. The owner cookie and all Convex admin and S3 access stay server-side. Do not expose these as `PUBLIC_` or `NEXT_PUBLIC_` variables.

`src/lib/server/personal.ts` rejects any backend or bucket target outside the dedicated Review Room deployment. Missing settings fail with 503. The media worker also requires the dedicated Convex site URL (`https://review-convex-site.v1su4.dev`), bucket, and a nonempty worker secret.

## Deploy and verify

Use Bun for checks and the Vercel CLI. Deploy only a reviewed snapshot of the personal repository, preserving any unrelated local changes. Verify the production alias is Ready, then use the in-app browser to verify owner sign-in and the original workspace UI. Test private review, upload, explicit publication, replacement, revocation, and showcase against the deployed routes before closing the related Linear issues.

The old account and password reset guide does not apply to Stage 1. Stage 1 uses a private owner password and scoped reviewer links. Public sign-up and external OAuth are not configured.
