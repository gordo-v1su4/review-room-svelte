# V1S-168 — target suppression acceptance

Verified October 7, 2026 against the public Review and Trailer Feed domains. Target remains deployed `366e6df`; source frontend/Convex activity changes are separate. No PR opened.

Only the new synthetic `Activity sync QA 2026-10-07` target was used. Its two source clips live in the private Review QA project/folder; neither canonical target project was removed.

- Owner removal of target V1 persisted source Disconnected and eligibility for explicit Sync again. Generic batch retry retained only V2. A valid delayed generation-1 registration returned **409**, without resurrection.
- Fresh exact-version consent restored the same artifact and target V1 at generation 2. A generation-1 replay still returned **409**. Its old warmed conditional media URL returned **404**.
- Guarded owner deletion of the new synthetic project disconnected all three historical/current source jobs. Generic retries and a delayed registration (**409**) could not recreate the project (**404**).
- Both Review originals/versions remain. Hashes of canonical source assets, versions and folders are unchanged. Externally owned Review storage was never deleted by Trailer Feed.
- The target's existing 41 backend tests pass, including suppression/generation contracts. Earlier native individual-remove and explicit Sync again acceptance is retained in Linear.

Harness: `scripts/check-live-suppression.mjs`, using process-only BWS-injected owner/admin/partner credentials. Private resume state is excluded from commits. A first malformed replay omitted the source timestamp and was rejected at validation; that is not credited as suppression proof. The corrected, valid replay produced the 409 results above.

Scope separation: replacing the now-deleted connection belongs to V1S-179; source-driven Unsync to V1S-178; source/image deletion to V1S-189. Area review/merge/main release remains V1S-183–185. Target suppression is verified, not a claim that the whole sync area is finished.
