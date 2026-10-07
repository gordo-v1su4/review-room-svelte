# Playback handoff and divider checks — October 7, 2026

V1S-170's scoped investigation and current desktop playback acceptance are complete. V1S-180 is deployed and accepted. V1S-181 measurements below cover production with the full canonical 13-asset gallery. No divider patch was justified by the measured result.

## Playback handoff

Native Codex Browser, Windows desktop, unthrottled production connection, 1280×720: selecting VID_20261005_00024 produced loadstart at 75.6 ms and loadeddata at 343.9 ms after the instrumented click. The original player had no poster and its opaque Preparing playback panel covered that interval. This was a warm observation, not a cold first-visible-frame measurement.

Player now receives the selected poster, uses active-only `preload="auto"`, displays that poster during load, and reduces the loading label to a small corner status. Explicit Play can queue against the native source; Pause and source changes cancel it. Destruction pauses and releases src. Processing and errors retain their existing blocking messages. No adjacent originals or hover-video requests were introduced.

Local native-browser check used `/dev/processing-workspace` with synthetic processing responses and the existing 320×180, four-second fixture clip/poster. CDP held the active original response after queued→ready. Before release: readyState 0, selected poster decoded at width 320 and visible, loading status height 23 px, Play enabled. Explicit muted Play queued; releasing the response produced readyState 4, 320×180 video, time 0.071572 and paused false. Poster removed. Close review removed every video element. This verifies the actual Workspace/Player seam, not production persistence or a universal latency budget.

Seven focused existing playback-session/pane tests passed. Svelte autofixer found no Player issues. The first aggregate check overlapped generated Convex API changes and reported eight destinationRefresh typing errors plus eight existing warnings; the parent owns the final aggregate check. No new permanent test suite was added.

## Divider production measurements

Two-pane direct pointer input changed explorer 51→60. Three-pane native `tab.drag` changed explorer 38→31; viewer changed 37→44 and feedback stayed fixed. Eight native drag moves and nine direct pointer moves reached their following animation frame in 0.5–6.8 ms. Keyboard ArrowRight changed 31→32. These samples do not establish a universal responsiveness bound.

360, 390, 768, 1024 and 1440 px width checks retained VID_20261005_00024, paused/muted playback, and an unsent comment draft. Document widths were 350, 380, 758, 1014 and 1430 px respectively: no page-level horizontal overflow. Dividers were hidden in the responsive stack and present at 1440. At 768×360 landscape, document width was 758 and video width 494; draft retained. Temporary viewport overrides were cleared and the unsent test draft was removed afterward.

The second divider's native drag changed viewer 44→38 while the explorer stayed 32. Eight sampled move-to-frame times were 0.4–1.1 ms. Six consecutive back-and-forth native drags took 1160 ms and retained the same selected asset, paused/muted state, playhead exactly 2 seconds, and unsent draft. The prior tool/native input discrepancy did not reproduce in either divider mode.

Evidence: `docs/verification/evidence/divider-20261007.json` and private screenshot `output/playwright/native-divider-20261007.jpg`. The browser ended paused and muted. No canonical originals, folders, review status, rating or comments were changed. Pane preference changes are routine reversible test input. This investigation found no current divider failure to patch on this desktop/browser; intermittent behavior on other devices remains outside these measurements.

## Deployed frontend acceptance

Frontend 478d746 was deployed by the parent. A native browser held a real original request without substituting its response: exactly one active video, readyState 0, correct selected poster decoded at 854 px and visible, small 23 px loading status. Queued muted Play→Pause cancelled; Close left zero video elements and the captured media paused/muted with its src released. Interception and cache overrides were cleared. Screenshot `output/playwright/native-poster-handoff-20261007.jpg` was visually inspected.

All ten canonical clips passed selected-source equality, native requestVideoFrameCallback, following animation-frame CSS visibility and center hit testing. Visible-frame samples ranged 315–453 ms, browser cache disabled per tab, network unthrottled and server/storage caches uncontrolled. Screenshots and the full-proportion contact sheet `output/playwright/native-all-ten-visible-20261007.jpg` show all ten real frames and were visually inspected. This is bounded evidence for the checking desktop/device, not a universal latency guarantee.

Correction to the initial probe interpretation: the predeploy probe called `video.play()` directly through CDP immediately after selection, bypassing the old UI's `disabled={!ready}` Play button. Its two NotSupportedError results occurred at readyState 0. It did not exercise an enabled Play-button path, did not establish selected-source identity, and therefore does **not** reproduce a user-reachable product failure or prove a codec bug. The raw samples remain in the report for traceability, explicitly excluded from the product regression verdict. No unsupported-format root cause or fix is claimed from that probe.

One naive postdeploy frame callback also preceded visible media state, so final acceptance additionally required selected-source identity and a visible paint instead of counting readiness or a callback alone. The final ten-clip frame matrix passes, including the originally reported VID_20261005_00029 and the two probe-rejected clips. Eight normal next/previous button actions across video and still assets retained correct selected posters, had no alert, left every prior/current video paused, and used at most one video element (zero for stills). Newly mounted video elements after stills can reset mute; no video played during that navigation check. Live UI queued Play→Pause and close cancellation pass separately with media explicitly muted.

The actual Workspace queued→running→ready/source-generation observation is credited at its local fixture seam. Dedicated live upload/processing recovery is independently credited in `evidence/upload-recovery-live-20261007.json` (large H.264 original ready and stable completion replay), while native real video frames and access revocation are credited in `v1s186-187-private-review.md`. Neither fixture checks nor IAB viewport overrides are claims of physical phone/Edge acceptance. Across the bounded current native session, visible frames, reported clip/formats, repeated switching, occlusion, paused navigation and source-release checks passed. Browser-cache-disabled samples do not control the server/storage caches or establish a universal first-frame budget.

V1S-170 is closed as the scoped investigation and current desktop acceptance, with no valid reproduction of the older intermittent user failure and no speculative decoder repair. Its historical cause is undetermined; closing the investigation does not claim that every device or future session is proven free of that historical symptom.

Safe reports: `docs/verification/evidence/playback-frames-20261007.json`, `playback-handoff-20261007.json` and `playback-rapid-20261007.json`. V1S-170, V1S-180 and V1S-181 are Done with their scoped evidence.
