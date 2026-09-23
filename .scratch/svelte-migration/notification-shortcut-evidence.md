# Notification shortcut acceptance — 2026-09-22

The header restores the original compact notification preview and opens the existing feedback inbox. It remains available with navigation collapsed. This is local session evidence; live notification delivery, authentication and durable handled state remain open shipping gates.

## Verified

- Real Downloads H.264 clip imported in an isolated localhost browser tab. A timecoded note at 00:00 changed the bell from zero to one; preview showed the project, one comment and one open note.
- View inbox transferred keyboard focus into the dialog. Mark handled removed the open-count badge and retained the comment digest. Escape returned focus to the notification trigger.
- Collapsing navigation retained the header shortcut.
- At 390×844 with coarse pointer, the popup stayed inside the viewport with no horizontal overflow. Actions measured 44, 56 and 44 pixels high. Dialog close restored focus on mobile too.
- Browser console had no errors. Temporary test tab and emulation cleaned up.
- Svelte check: zero errors/warnings. Bun suite: 125 tests, 621 assertions. Production build passed; final CSS touch-target correction rechecked before release.

## Remaining parity

Project visibility, direct membership and email/domain access rules still need the Svelte management surface. Account sign-in/out, OAuth, profile bootstrap and password reset remain unimplemented/integration-gated. The local YO avatar is not authentication. Do not mark the migration complete.

## Deployment configuration

Vercel project API initially reported no Git link. Connected the existing personal project to `gordo-v1su4/review-room-svelte`; API now confirms GitHub and production branch `main`. Local checkout has its own `.git`, and GitHub reports `isFork: false`.
