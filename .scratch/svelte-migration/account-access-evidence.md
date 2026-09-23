# Account frontend acceptance — 2026-09-22

## Scope and boundary

Standalone checkout: `/Users/robertspaniolo/Documents/Github/review-room-svelte`. The old nested app directory is absent; origin is the personal `gordo-v1su4/review-room-svelte` repository.

Historical comparison: `301495d:src/components/auth/SignInForm.tsx` and `AdminGate.tsx`. Restored frontend flows include password sign-in, optional-name signup, provider discovery, password recovery with eight-digit code and confirmation, denied-profile recovery, and confirmed sign-out. New files are `src/lib/account-access.ts`, `src/lib/components/AccountPanel.svelte`, `AccountDialog.svelte`, and `src/routes/sign-in/+page.svelte`. The workspace avatar now opens the account dialog without navigating away.

The production default remains an unavailable gateway with every provider disabled. Authenticated outcomes require the future adapter to confirm both a session and an authorized app profile. No live auth calls, credential changes, email delivery, OAuth redirects or backend repair were performed. Private route gates, real session lifecycle, clearing private workspace state on actual sign-out, role integration and authenticated dashboard navigation remain required live work. The public local workspace is not an authenticated dashboard.

## Verification

- Controller: 11 tests / 83 assertions at the approved auth/permissions failure seam. Guards cover disabled providers, invalid details, duplicate submission, missing profile, safe errors, failure retention, sign-out confirmation, cancellation/disposal and stale responses. Passwords never enter published state.
- Full suite: 156 tests / 849 assertions, all passing. `bun run check`: 0 errors, 0 warnings. `bun run build`: passed.
- Dev-only `/dev/account-access`: fake `.test` identities and fixed reset code; no external writes or secrets in fixture telemetry. Password sign-in failure/retry; signup; denied-profile/use-another-account; OAuth redirecting then separately confirmed profile; sign-out failure retains identity; successful sign-out restores sign-in; reset mismatch blocks submission; correct eight-digit reset completes; resend gives confirmation. Provider toggles hide disabled Google/GitHub/recovery actions. Load failure retries successfully.
- Browser QA caught Svelte interpolating the reset-code pattern; fixed it to a literal pattern expression and repeated successful validation.
- Keyboard: error feedback and successful identity heading receive focus. Closing workspace account dialog returns focus to Account.
- Mobile 390×844: no horizontal overflow, account inputs/buttons 44px high; workspace dialog is a 390px-wide bottom sheet, close target 44×44. Screenshot inspected.
- Real local Downloads clip `camera_rotating_around_rapper_in_music_video_a51538.mp4`: account dialog open/close retained the same media source, readyState 4, paused playhead at 1.00s, and unsent comment `Account dialog retains this unsent draft.`
- Fixture browser warnings/errors: none observed.

Production commit `f91b362562f950ad6b1b6e5c2c6303f7f4c8e033` was READY in personal Vercel deployment `dpl_EjBqkFjKhoYX9swU3MXB8vd7wdsY`; canonical alias resolved to it. Browser verified root Account dialog and `/sign-in` show the unavailable service state, and `/dev/account-access` returns 404. No warning/error was observed before the deliberate 404 navigation. These results prove the frontend seam only; live authentication and shipping gates remain open.
