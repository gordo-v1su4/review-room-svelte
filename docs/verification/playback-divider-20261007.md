# Playback handoff and divider checks — October 7, 2026

V1S-180 implementation is ready for frontend deployment; V1S-170 remains an intermittent production investigation. V1S-181 measurements below cover production with the full canonical 13-asset gallery. No divider patch was justified by the measured result.

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

The predeploy immediate-Play probe rejected two clips with NotSupportedError; all ten completed that same probe after deployment. One naive postdeploy callback preceded visible media state, so final acceptance additionally required selected-source identity and a visible paint, instead of counting readiness or callback alone. These observations do not isolate the cause of the older intermittent user report; V1S-170 remains an investigation, with current-head native frame and close checks credited. Local queued→ready observation is credited separately from actual production processing acceptance.

Safe reports: `docs/verification/evidence/playback-frames-20261007.json` and `playback-handoff-20261007.json`. V1S-180 and V1S-181 are Done with their scoped deployed evidence.
