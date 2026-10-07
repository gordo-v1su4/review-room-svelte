# Destination image grant transport — October 6, 2026

Live acceptance against deployed frontend `fd01415`, build version `1791318869302`. `scripts/check-live-destination-grants.mjs` exercises the actual owner HTTP grant interface and destination resolver, using only the synthetic QA image V1/V2 prepared by V1S-164. No target project was registered, and canonical publications were unchanged.

The selected root image V2 and explicitly allowed historical image V1 both returned their independently known original bytes. HTTP/CORS results:

| Request | Result |
| --- | --- |
| Exact root / selected reference | 200 / 200 |
| Bytes 0–31 / HEAD | 206 with exact bytes and full-length metadata / 200 without body |
| Authorized matching ETag | 304 |
| Invalid range | 416 |
| Unconsented browser origin / unselected same-project version | 404 / 404 |
| Allowed range/conditional preflight / unapproved authorization header | 204 / 400 |
| Warmed expired grant conditional / expired HEAD | 404 / 404 |
| Warmed revoked grant conditional / revoked reference range | 404 / 404 |

The short expiry was exercised while a prior positive lookup and byte cache were warm; delivery did not return a stale 304. Grant descriptors contained no storage/service keys. Capability slugs and URLs were kept process-local and excluded from results. Both synthetic image grants were revoked in the finalizer, including the expired one. Secret-free results are `.scratch/release-readiness/v1s165-live-summary.json`.

Existing real-project video/range/CORS and exact-version upload/reactivation acceptance remains credited in the October 6 checkpoint. This document fills the image/expiry/revocation transport gap. Actual source-deletion propagation, linked-reference contraction and outage/restart delivery are owned by V1S-189; they have not been represented as passing here. Review of the entire remaining sync area is still required before its combined PRs/merge.
