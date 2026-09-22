# Public review access contract — 2026-09-22

Read-only audit of the inherited Next/Convex implementation. No remote requests, backend changes or deployment performed. These findings block public-review cutover; backend repair remains deferred by the user.

## Required server repairs and acceptance

- **Passcode authorization:** `convex/reviewPublic.ts:28–37` checks token existence/expiry only. `convex/reviewLinks.ts:66–75` returns a boolean, issues no session proof, and returns `ok:true` for unknown tokens. Direct reads, mutations and download authorization must deny missing/wrong proof, invalid/expired/revoked links and proof issued for a different link.
- **Bootstrap exposure:** `reviewPublic.ts:43–46` returns the whole link including `passcodeHash`; hashes use unsalted SHA-256 (`reviewLinks.ts:22–27`). Return a minimal public bootstrap; never return hashes or protected asset data before authorization.
- **Archive consistency:** only project bootstrap rejects archived projects (`reviewPublic.ts:45`). Asset listing and public mutations merely validate token/project association. Archive a project or asset during an open review: reads, writes and downloads must reject immediately under the approved restoration policy.
- **Download authorization:** `src/app/api/storage/presign-download/route.ts:4–17` signs an arbitrary caller-supplied storage key without auth, token, project membership, `canDownload` or archive checks. Accept authorized asset identifiers and resolve keys server-side; deny unrelated users/projects, disabled downloads and invalid/protected/expired links.
- **Reviewer identity isolation:** `reviewPublic.ts:64–80,103–119,314–319` stores one name per shared token, so one recipient can overwrite the name used by another's next comment. Two recipients must have independent identities; identity operations must also obey token, passcode and archive constraints.
- **Share creation roles:** `reviewLinks.ts:49` uses `getProjectForAdmin`, whose access policy (`convex/lib/access.ts:54–99`) admits members/access rules/workspace viewers. Link listing is owner-only. Reconcile create/list/manage with the approved role matrix and verify owner/editor/reviewer/workspace viewer/unrelated user separately.

A frontend passcode form or server gateway alone does not repair bypassable direct Convex endpoints. Fixture tests cannot prove these live gates. The existing random 24-byte tokens, asset/project association checks and limited public status set must be preserved, but do not close the findings above.

## Independent frontend progress

The original public route includes shortlist sequencing (videos advance on ended; stills display 2.5 seconds; optional loop). This behavior is being restored in reusable Svelte playback code while live public route integration remains open.
