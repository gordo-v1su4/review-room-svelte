# Explorer and studio review increment — 2026-09-22

This is device-local frontend evidence, not authentication, remote authorization, upload, or persistence evidence. Goal remains active.

## Accepted behavior

Project overview displays folder artwork only. Enter a collection or add media to open the full explorer without selecting an asset. Selecting a clip reveals the viewer. Notes & info toggles the third pane without discarding the draft or remounting playback. The left navigation retracts left and mobile uses the navigation drawer. New local project folders contain Videos, Images, and Shortlist collections derived from project-scoped media/review state.

Appearance offers square, 16:9, 9:16, Fit/Fill and three card sizes. Preferences persist locally. Explorer thumbnails use lazy muted native seeking on mouse hover, bounded to one in-flight seek with latest pending intent; leaving releases the source. Thin teal vertical line follows the pointer. Main playback playhead is a 3×19px rectangle. User requires all original capabilities; these controls are a subset of parity, not completion.

## Validation

- `bun run check:svelte`: 0 errors, 0 warnings after final accessibility cleanup.
- `bun run test:svelte`: 27 pass, 106 assertions, no failures.
- `bun run build:svelte`: production build passed. Final reactive-binding/accessibility cleanup subsequently typechecked.
- In-app Chromium browser at http://127.0.0.1:5173/?diagnostics. Debug timings intentionally no longer render in the product.
- Real Downloads source `camera_rotating_around_rapper_in_music_video_a51538.mp4`: ffprobe 1360×752 H.264, 8.666667s, 4,918,570 bytes. Second real source `hf_20260920_013441_ddaf9c5a-0f4f-4d19-9728-e1ad6b8a251f.mp4` also imported with generated poster.
- Initial import displayed two explorer cards, no viewer or feedback pane. Clicking first card opened viewer; Notes & info added inspector.
- Hovering first real card: native preview readyState4, muted=true, currentTime6.416655, visible; second inactive preview had no src and readyState0.
- Appearance square+Fit+Large produced 338×338px thumbnails and object-fit contain. Portrait+Fill produced 338×601px and object-fit cover. Returned to landscape/medium.
- Three-pane divider dragged approximately70px: explorer23%, viewer47%, inspector30%; full drag succeeded after ignoring height-only ResizeObserver events. Keyboard arrows changed pane share. Navigation collapse kept video playing.
- Playing real clip then changing viewport to390×844 retained paused=false, time0.357s and draft `Keep the camera movement through this beat.`. Page scrollWidth=clientWidth390. At1024×768 scrollWidth=clientWidth1024 and draft retained. Restored default desktop viewport. Mobile drawer opened and Escape closed it.
- Metadata strip displayed1360×752,1.81:1,00:08,approximately24fps,H.264. Frame rate is an estimated source average from first120 packets, not browser presentation FPS.
- Continuous rapid scrub pointer moves yielded visible1280×708 decoded preview canvas, changing video pixels, muted native video at4.492s. Release hid overlay and restored prior unmuted state at4.492s. Worker now reuses parsed input and coalesces pending seeks without repeatedly cancelling each pointer event.
- Earlier first-frame/seek observations before replacing debug UI: loadeddata17.8ms, held preview decode66.5ms/request72ms, native seek65.6ms, subsequent release3.1ms,0/339 browser-reported dropped/total frames. Single observations only: no speed superiority or display-latency claim.
- Native fallback: local VP9 WebM QA fixture1280×720 played readyState4, paused=false,time0.310s with preview canvas hidden; no fabricated codec/fps metadata.
- Table rating4/statusapproved synchronized viewer controls and sidebar Approved1. Minimum-rating4 filter retained only rated asset.
- Created local `Music video` project through +: all three empty collections appeared; importing a clip updated its video count1 while Studio project remained0.

## Review findings fixed

- Continuous preview starvation from cancellation on every pointer event: replaced with one active and latest pending request, accepted completed approximate frames during dragging; release/source cancellation remains strict.
- Pane drag prematurely ended on host height changes: observe width changes only for clamping/release.
- Project breadcrumb retained collection filters: overview now resets facets and closes viewer intentionally while preserving review data.
- Decorative unloaded thumbnail video exposed “Unable to play media” through accessibility: now hidden from accessibility; parent card supplies asset name.

## References and remaining work

Frame.io is the explicit product baseline. Consulted official [Panel Overview](https://help.frame.io/en/articles/9101032-panel-overview), [Project Layout Overview](https://help.frame.io/en/articles/9101037-project-layout-overview), and [Player page features](https://help.frame.io/en/articles/9105311-player-page-features). Pinterest search explored contemporary black media-player treatments; no third-party visual assets copied.

Next frontend gaps from source audit: composable status/class/shortlist filters and grouped rendering; Show Card Info and field visibility/order; checked multi-selection/range/batch actions; remaining sorts; VID/IMG/CTX/STB classification and full inspector; image inspection/markup. Full backlog remains in parity-ledger.md, including live auth, projects, real folder management, sharing, uploads/downloads, annotations, and saved remote state. Do not retire original app or call this shippable yet.
