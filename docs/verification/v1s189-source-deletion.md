# V1S-189 — source/image deletion through outages

Review24c4142/Convex24c4142, TrailerFeed API4c41cb4. Dedicated disposable LifecycleQA only. After Unsync/republication acceptance, stopped target API for each deletion window and always restored it. Deleting the linked image immediately denied its capability, retained playable video/rootURL/Vn and persisted independent delivery. After restart, leased retry confirmed image removal and target retained exactly the video. Deleting the video in a second outage immediately denied root access; after restart retry confirmed terminal source deletion and target catalog empty. Canonical thirteen-asset digest unchanged throughout.

Source removal ledger uses scalar IDs and survives source/version disappearance. Source and linked-image deletion are distinct from Unsync. Existing focused source deletion tests cover repeated outage retries and grant contraction, and target tests cover terminal fences and attached-image removal. Independent scheduled RustFS cleanup and canonical-object retention are verified separately in V1S-175's archive purge acceptance.

Evidence: scripts/check-live-sync-lifecycle.mjs, private-free lifecycle-delete-image/deletion-complete/delete-video summaries. Historical setup artifacts remain only in private state; no source originals were copied to Trailer Feed.
