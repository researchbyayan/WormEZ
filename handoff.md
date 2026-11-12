# WormEZ engineering handoff

Updated 2026-10-03. This folder is the source of truth; no Git repository is present.

### October 3 automatic TAPIR gap recovery

The TAPIR trial on straight, curved, irregular, L4, and L6 is documented in
`tests/tapir-evaluation/README.md`. Its seed-sensitive L6 result motivated a
multi-point, bounded fallback. `Launch WormEZ.command` serves WormEZ locally
and starts `tapir-helper/server.py`; direct-file use keeps the original path.
After the existing retry, every bounded uncertain interval (up to 120 frames
including accepted endpoints) can receive TAPIR search hints. Hints never count
as observations; `runVerification` repeats
segmentation and both passes, and only matching anatomy can be promoted. The
remaining consistent hints are stored separately, shape a faint dashed review
path, and appear in model-hint export columns without contributing to metrics.
The checkpoint and Intel macOS runtime total about 1.1 GB. Unit and helper endpoint
tests pass. The localhost browser test analyzed the 60-frame occlusion fixture:
one fallback attempt, zero recovered frames, no page errors. The genuinely absent
frames remained uncertain. On the 446-frame irregular recording, the helper
checked three short gaps and supplied review positions for all 13 uncertain
frames; none passed original contour and motion checks, so all 13 remained
unverified. The same clip with the helper route disabled produced the identical
424 accepted frames and 13-frame gap set. The model positions are present in
CSV/Excel hint columns; the synthetic browser check confirmed the Excel headers.
The temporary contact sheet for frames 217–262 was visually inspected: model
markers lie on the bright animal, though this is not independent ground truth.
The video shows a small cyan review ring at a suggested point. No browser errors
occurred. The 24 tracking tests and TypeScript check pass.

LocoTrack-S was installed and tested separately in `/tmp/wormez-locotrack-trial`.
Its 33 MB checkpoint ran 48 irregular frames in 14.56 seconds but marked only
27 visible, versus TAPIR's 48/48 on the same opening window. Neither visibility
count is biological accuracy; LocoTrack remains out of the app. The earlier
discarded comparison's trial code, outputs, source, and checkpoint were removed.

### October 3 pathway and playback controls

Current HTML build: `1.2.8+20261003.auto-recovery-v3`. The visible View menu is
replaced with Fit frame, Auto-Zoom, and Pathway buttons. The zoom control now
shows absolute source-frame magnification (100–1600%) across modes; playback has
its own speed selector, which does not alter analysis fps. Head/center/tail edits
use the main video; the small detail image is preview only. The aiming cursor
uses blue/red/green for landmarks and purple for center anchors. The workflow
header presents an instruction and live stage without a pill border. Dots animate
only while loading, scanning, recording, analyzing, or saving a recording.

`displayCurve` uses a locally implemented shape-preserving cubic Hermite curve
only for drawing accepted samples; it never inserts measurements. Short unresolved
spans may show a dashed visual bridge. On a user-triggered re-analysis, a fully
unresolved interval between corrected manual anchors may show a purple straight
line. Its endpoint distance and duration are reported separately as manual in
CSV, Excel, and PDF summaries, while intermediate frames remain unverified.
This is an endpoint estimate, not reconstructed motion or a verified biological
path. If automatic reference discovery fails completely on that re-analysis,
at least two corrected anchors produce a manual-only result with all recording
frames retained and all non-anchor positions explicitly marked unverified.
A five-frame displacement check additionally flags automatically accepted
points exceeding two body lengths in a continuous five-frame window; manual
anchors and existing gaps are preserved.

Validation for this update: 23 tracking/logic tests pass; TypeScript check,
Vite build, and inline HTML script syntax pass. The browser visual regression
suite and full real-video reruns have not been run for this update, so these
changes should not yet be described as visually or biologically validated.

The October 2 `irregular.mp4` repair adds dark-body segmentation and paired
texture checks so setup selects the segmented larva rather than its smooth bright
reflection. A rejected physical jump no longer seeds later frames. Two-pass body
centers remain accepted when skeleton/head anatomy is unavailable; head values
stay blank there. Dark-body flow failures can use a tightly gated segmentation
match, still subject to independent pass agreement. See `tests/VALIDATION.md`
for native full-clip replay results and its browser-validation limitation.

`src/` contains the React/TypeScript application chrome, workflow reducer, guidance,
and diagnostics. Vite compiles it into the offline `dist-ui/` IIFE and stylesheet.
The existing analysis engine remains in `WormEZ.html` while it is migrated behind a
typed bridge. The reducer includes `reviewingBoundary`, `cameraPreview`, `recording`,
and `finalizingRecording` in addition to the file-analysis phases; clip/job IDs reject stale UI
transitions. `WORMEZ_BUILD` and the Electron preload build are visible in Diagnostics.

## Runtime and coordinates

`WormEZ.html` owns state, video decoding, UI, jobs, calibration, metrics, and exports.
`lib/tracking.js` owns segmentation, local search, optical flow, reconciliation,
anchors, gap-safe smoothing, and cancellation. `lib/anatomy.js` extracts centerlines,
checks geometry, infers initial endpoint identity, propagates orientation, and exports
landmark fields. `lib/scale.js` handles presets and unit conversions.
OpenCV.js 4.13.0 embeds WASM; MP4Box 2.4.1, ExcelJS, and jsPDF are local. MP4Box
indexes MP4/MOV samples and WebCodecs decodes source frames. No runtime API or
internet connection is used.

All tracking, calibration, and export coordinates remain in source pixels. The
path now uses the centerline arc-length midpoint, not silhouette centroid. Automatic
points without independently agreed center geometry become uncertain. Manual center
anchors retain the supplied location. Uncertain samples retain diagnostic positions
but contribute no movement, speed, or stationary duration across gaps.

## Automatic pipeline

Loading targets nine anchors: mandatory first/last visible boundaries plus seven
interior eighths, and leaves full analysis idle. Boundary search works inward when
the animal is absent; accepting an inward boundary records skipped edge frames as
unavailable. Start remains disabled until both visible boundaries have manual anchors.
Its proposals remain suggestions until the user presses **Use anchor** or adjusts
one. Proposal frames are rendered as timeline markers and reviewed sequentially in
an overlay contained by `canvasWrap`; accepted markers change state immediately.
Loading, quick-scan, and analysis curtains are also contained by the video stage.
`runVerification` begins only after **Start analysis**. Candidates combine Otsu-based bright and lower-contrast silhouettes,
a small opening kernel, and absolute minimum area/width compatible with tiny larvae.
Discovery compares appearance, size stability, displacement coherence, background drift, and alignment
with the body. Ambiguity asks for one center selection. Stationary identity cannot
always be distinguished from static clutter.

Automatic verification anchors are intentionally omitted from the video overlay.
The timeline uses two- or three-pixel proposal ticks, while results keep the red
trajectory dominant and show only a manual correction on its exact frame.
Correction mode saves the current view, switches to a 100% full-source frame, and
shows the bad proposal as a faint reference. The unified pointer controller permits
wheel/pinch zoom and drag panning in correction mode; it commits a point only after
pointer-up below the drag threshold. `correctAnchor` restores the saved view after the click.

`localCandidates` searches full-resolution crops around the current hypothesis;
its ROI is cloned before indexing RGBA bytes because OpenCV ROI views are strided.
Lost hypotheses retain their last location and use a wider local search for reacquisition. `flow` uses a local region and round-trip LK;
small targets are never reduced to the former whole-frame 640-pixel image.
`cameraMotion` checks background features outside the animal once per second and
flags the affected interval when a sufficiently supported camera shift occurs.

Forward/backward passes start together with independent readers when endpoint
discovery succeeds. Endpoint discovery uses motion-supported candidate chains, can skip missing scan observations, and searches earlier bounded windows when the final silhouette is unavailable. If the tentative endpoint conflicts with forward evidence, fresh full-frame detections are filtered for agreement and the backward pass starts from that detected silhouette. Forward coordinates are never substituted for a detection. Dense reverse optical flow and reconciliation still determine acceptance. Frames beyond an earlier endpoint remain uncertain. A lower threshold supports illumination changes while preserving appearance, motion, and agreement checks. Reconciliation requires both valid
passes and positional agreement within quarter body length. Geometry agreement
additionally checks midpoint/endpoints. One retry per bounded disputed interval
widens search; predictions never become accepted measurements. Anchors occur at
accepted boundaries, approximately one-second intervals, and supported turns.

After both passes, `infer` finds sustained body-aligned motion over .5/1/2-second
windows. `orient` propagates endpoint identity geometrically through contiguous
reliable observations. Manual head/tail seeds take precedence. Head status can be
motion inferred, manual, tracked, conflict, or unassigned; coordinate origin is
stored separately. A reversal does not automatically swap identity. Unidentified
head/tail does not invalidate an otherwise reliable center. Actual-leg tracking and
its point-flow API have been removed. Blue H, red C, green T are landmark identity
colors; shape denotes manual/uncertain status.

## Jobs, progress, and recovery

A `WormTracker.Job` owns pause/resume/cancel, current pass, and stage bounds. Every
seek is followed by a cancellation checkpoint; pause inspection restores the pending
frame before consuming pixels. Restore attempts are bounded so seek mismatches
produce an explicit error rather than an infinite wait. Processing yields between
frames for progress rendering and controls. Reset, Stop, replacement, and history
restore cancel the old job; finalization checks ownership before updating UI.

Each pass has its own `WormMP4.Reader`; buffers are bounded to 30 decoded frames.
Unsupported containers and any direct-decoder failure switch that pass to an
independent exact-seek `WormFrameReader`. ETA uses completed work and elapsed active
time, excluding pauses; retries extend the work estimate. The translucent curtain
can reveal the video without stopping work, and **Show progress** restores it.
Attention audio is generated locally with Web Audio and defaults on.

The masthead uses “Larval motion analysis” and a plain-language processing description. The landmark legend uses separate colored markers and neutral labels; unloaded detail/overview canvases are hidden.

The progress panel starts during loading/runtime initialization and reports truthful
per-stage frame counts. `reportError` retains grouped stage/frame/message entries
with counts, including decode, runtime, playback, analysis, and export errors.
Uncertain center intervals and head-orientation intervals have separate review
buttons. Head approval is now only part of an explicit correction, not an initial
gate. Review never invents accepted anchors for unresolved intervals.

## View and corrections

`updateView` provides full, follow, and whole-path fitting; manual zoom and Auto zoom
only change the display crop. `frameCanvas` remains a hidden source-resolution
analysis buffer; `displayCanvas` draws only the viewport, avoiding huge CSS-scaled
layers. The overlay uses a matching context transform. `screenToVideo` maps display
pixels back through the viewport, including letterboxing. Stage aspect ratio follows the recording. A full-scene overview
shows the viewport. Follow mode falls back when tracking is unavailable. The detail
canvas remains a separate source-coordinate endpoint editor.

Head/tail corrections store seeds; center edits use manual anchors. A correction
invalidates and reruns the interval between neighbouring anchors. Deleted automatic
anchors remain suppressed until reset/fps changes. Undo/redo holds 20 complete
snapshots including results, seeds, calibration, crop, and settings. Restoring an
unfinished run restarts checking. Loading another file clears history. View choices
and playback are not measurement edits.

## Scale, metrics, and exports

`mmPerPixel` is authoritative; body-length scale is derived. Petri sizes are nominal
and editable, requiring measured pixel endpoints. Units preserve physical scale.
Exports keep every sampled time and uncertainty reason. `tail_*` replaces `leg_*`;
head/center/tail provenance is explicit. CSV/Excel retain pixel and physical fields;
Excel/PDF report coverage and scale metadata. Center-path turns and head bend are
separate; smoothing cannot bridge gaps or move a manual anchor.

Per-frame displacement is limited to 0.5 body length and an explicit two-frame
check limits displacement to one body length. Unavailable gaps reset proximity.

## Camera and conversion

**Use Camera** requests video only. `MediaRecorder` emits one-second chunks through
the context-isolated preload bridge to a temporary local file. A dashed one-way path
is provisional and accepts manual anchors while capture continues. Stop finalizes
the file and sends it through boundary review and full two-pass verification.
Electron permission handlers allow only video media from the local WormEZ page.

Electron 1.2.0 bundles a network-disabled LGPL FFmpeg 9.0.2/ffprobe Intel build.
Common browser-native containers load directly; AVI, MKV, WMV, MTS/M2TS, TS,
MPG/MPEG, and 3GP are converted locally to MP4. Conversion tries H.264
VideoToolbox first, then falls back to FFmpeg's native MPEG-4 encoder when macOS
cannot create a VideoToolbox compression session. The original is retained. Build
provenance and licenses live under `electron/bin/`.

## Validation

`npm test` runs deterministic primitive tests; `npm run test:browser` runs Chromium
integration. `tests/real-clips.cjs` records sampling rate, discovery location, center
coverage, head coverage, and review intervals for supplied recordings. Optional
`WORMEZ_TEST_FPS` must be reported; lower-rate screening is not default-rate validation.
L4/L6 are the two 1280×720, roughly 121-second recordings in the parent folder.
Chromium needs execution outside the macOS sandbox. Read `tests/VALIDATION.md` for
actual completed checks; consistency coverage must not be described as accuracy.

`window.__wormez` exposes state, runtime, current job, verification, correction,
reset, metric recomputation, and export/chart builders for tests. `runtime()` resolves
`{cv}` rather than OpenCV's legacy self-returning thenable. Reference and temporary
Mats must be deleted on cancellation and failure as well as success.

## Electron packaging

`electron/` pins Electron 31.7.7 and electron-builder 25.1.8. Version 1.2.0 uses a
context-isolated preload bridge for native open/save dialogs and exposes its build ID.
`npm run build:mac`
creates the `.app`; `npm run dist:mac` creates the DMG. Packaged runtime files load
from `Contents/Resources/app`. The window uses context isolation, renderer
sandboxing, disabled Node integration, video-only camera permission scoped to the
local WormEZ page, and navigation blocking.
The current local build is unsigned. Docker Desktop 29.7.2 runs the Linux Chromium
suite from `mcr.microsoft.com/playwright:v1.63.0-noble`; `Dockerfile`, `compose.yaml`,
and `.dockerignore` define the reproducible environment.

## Guided pointer UI update (2026-09-29)

The live HTML now has one explicit pointer-mode dock at the lower video edge. It
reveals on pointer entry or keyboard focus and contains Navigate, Pan, Select anchor,
and Place anchor controls. Zoom remains a single canonical toolbar control with the
slider, minus/plus, Fit frame, and Auto-Zoom actions, avoiding duplicate zoom buttons.
Anchor markers are keyboard-accessible buttons; selecting one seeks to its exact
frame and opens the contextual inspector. Editing starts from the full source frame,
keeps the previous viewport until commit, and uses a pending point with circular
Save/Cancel controls (Enter/Escape are supported). The displayed pathway is built
from accepted contiguous samples and breaks at uncertainty, unavailable intervals,
or missing samples.

Font Awesome 5 Free is bundled locally through `@fortawesome/fontawesome-free`
and is used for the compact transport and inspector actions. The H/C/T key is kept
in the inspector as compact rounded-square labels without extra logo marks. The
review card and dock use low-opacity edge surfaces and become fully legible on
hover/focus so they do not cover the larva. The Docker suite currently passes all
16 tracking tests and 20 browser cases.

## Pathway regression investigation

Unavailable-frame boundary icons have been removed from the timeline (intervals
remain in the inspector and measurement exclusions). Anchor buttons occupy a
separate row above the rail; the moving playhead is a narrow vertical bar.
`reconcile(..., true)` now classifies failed anatomy agreement before the disputed
interval retry, so those failures receive the existing single retry. Accepted
coordinates retain the mean of independently verified anatomy centers, rather
than being replaced afterward with the forward-only center. Thresholds and gap
exclusions are unchanged. The user's specific before/after pathway screenshots
still require a recording filename to reproduce; do not claim a continuity fix
for that recording merely because primitive tests pass.

The real straight-video investigation then isolated a skeleton graph defect:
diagonal links beside existing orthogonal links formed shortcuts and made valid
staircase skeletons fail the unchanged 75% path/node branch test. The graph now
removes those redundant diagonals for endpoint discovery and traversal while
retaining isolated diagonal connections. Twelve captured failed contours form
`tests/centerline-regression.json`; the new regression checks each produces a
21-point centerline whose center lies inside the observed silhouette. Full-video
validation must be rerun after this change; earlier coverage is not current.

Final-frame inspection also found merged larva/scratch silhouettes in straight:
at threshold 220 the combined length was ~201 px against a ~110 px reference;
at 240 the actual larva was separated at ~106 px and met the same appearance
limits. Reference-based detection now includes a +20 brightness fallback (capped
at 245), deduplicated against base silhouettes, with unchanged shape/color gates.
Missing scan endpoints use existing temporal endpoint discovery; a lone unrelated
remote silhouette is no longer substituted by the old full-frame boundary search.
UI build identifier: `1.2.0+20260930.pathway-repair`.

### Final endpoint continuity guard and validation (September 30)

Full-video testing exposed an L4 endpoint at (908,553) despite the preceding
quick-scan candidate being near (648,104). Motion support alone can follow
a reflection. Endpoint discovery now also applies the quick scan's existing
spatial gate relative to the preceding proposal; it cannot silently substitute
a remote reflection. The last plausible proposal remains the review boundary
when endpoint identity is unsupported. This is detection failure, not proof
that the larva is biologically absent. Users must inspect boundary suggestions.

All 17 tracking tests and all 20 browser scenarios pass on the final source.
TypeScript and Vite build pass. Rebuilt native Electron smoke test passes with
renderer build 1.2.0+20260930.pathway-repair, no renderer errors.

The initial quick-scan loop also needs the continuity guard, not only endpoint
discovery: L6 could already propose a false final-frame rim point in that loop.
After a missed quick-scan window, candidate recovery now retains the existing
3-body-length local radius instead of continuing to expand with elapsed time.
Endpoint fallback uses the same rule. This permits nearby recovery while
preventing a large jump after lost identity. Explicit manual anchors can still
restart tracking beyond an unresolved gap.

Credit-limited checkpoint: user asked not to consume all credits. Stopped
redundant reruns. Final local-radius scan guard is packaged and launch-tested,
but final full irregular/L6 reruns remain incomplete. See tests/VALIDATION.md;
do not claim L6 endpoint repair is fully validated.

## 2026-11-08: Explicit Recovery And Frame Delivery

- Build: `1.2.19+20261108.staged-analysis`. OpenCV verification and bounded retry finish before user-started Recover Gaps (TAPIR); Connect Remaining Gaps is a separate final action. No automatic model call or automatic straight fallback.
- Straight estimates connect trusted gap endpoints without crossing unavailable intervals or verified interiors. They preserve uncertainty and are excluded from verified totals, speed, and exported cumulative movement. Separate estimate distance remains available.
- Start clears pending anchor/correction state. Recovery uses cancellation checkpoints and isolated statistics to avoid stale clip writes.
- Performance: avoid hidden preview redraws and the extra worker RGBA copy. Existing detection/geometry/physics thresholds unchanged; no frame skipping. L4 frames 0–89, 192 pass steps: 8.043s baseline vs 4.801s optimized, identical coordinates/statuses and 100% coverage. Limited-window result only. See `tests/analysis-profile.json` and reproducible `tests/profile-analysis.cjs`.
- Validation: 39 unit tests; UI typecheck/build; 5 focused browser cases covering explicit staging, pending-edit cleanup, optional area change, pause/stop, clip replacement, and preserved measurements. Final 2-case staged suite rerun passed. Full-recording timing was not rerun for this change.

## 2026-11-08: Bounded Frame Pipeline

- Build `1.2.19+20261108.frame-pipeline`. Primary tracking rules unchanged. Internal moving regions cover segmentation, flow, dark-contour anatomy alternatives, hint/manual positions; lost hypotheses expand or use full source. Full-source camera checkpoints remain intact. Source coordinates are reconstructed before CV; no processing box is displayed.
- MP4 readers share only immutable decoded frames in a 32 MiB cache, keyed by clip/index and FPS/dimensions. Cache invalidates on reset/replacement/FPS change/fallback. Oversized frames disable the shared cache. Each independent reader prepares at most its next block/frame; buffers remain bounded and cancelable.
- Hidden step replies omit unused preview anatomy; complete per-frame geometry is returned at pass finish. Local edit reruns remain bounded between neighboring anchors; outside results stay intact.
- Electron fixed-script preload bootstrap fixes file-page worker startup without disabling web security. Native-selected/captured files expose local bytes for MP4 indexing (previous native path passed null and could force exact seeking). Active processing temporarily disables background throttling, restored for pause/idle. Desktop TAPIR gap recovery now accepts the native bridge instead of requiring the browser helper URL; remains explicit, bounded, and independently verified.
- Full L4 engine stress check: 3648 outputs, 11385 pass steps including endpoint recovery and 15 retries. Baseline 301.890s, optimized 169.478s (1.78x), all returned coordinates/statuses identical; accepted coverage 85.9923%, no runtime errors. Pixel transfer volume reduced 92.73%. Optimized sampled browser RSS ~1.63 GiB, excludes Python helper. See `tests/frame-pipeline-profile.json`. This developer engine test bypasses UI boundary approval to stress endpoint fallback; ordinary Start retains boundary gating. Consistency is not biological accuracy.
- Tests use ephemeral browser origins and an isolated Electron user-data directory. Native Load Video L4 short-run test confirms WebCodecs for both readers, all frames computed in workers, and full coverage for that interval. Reopen the dev app to load main/preload changes; no packaged distribution was built.

- Final validation for this pass: 41 unit tests, 14 targeted browser tests, UI typecheck/build, native fast-decoder/worker test, and explicit background-throttling restoration check passed. L4/L6 cropped decoding showed zero pixel difference at first/last and keyframe-boundary samples; second readers reused all five checked samples without decoding again. L6 first-90-frame coordinates, anatomy, and metrics matched by SHA-256. ETA work budgets now count the actual backward range and seed re-discovery correctly, with a stable combined parallel progress bar.

## 2026-11-08: Screensaver Facts Refresh

Replaced the 200 textbook-style entries with 100 conversational human-body facts and 100 nature facts, interleaved. Reference/editorial notes are in `src/biologyFacts.sources.md`. Typing, idle activation, accessibility, reduced motion, and click/Escape dismissal are unchanged. UI typecheck/build, fact integrity test, and both screensaver browser cases passed. Existing open windows need a reload to use the rebuilt text; no running analysis was reloaded.

## 2026-11-08: In-Video Issue Messages

Moved the canonical error surface from below the workspace into `canvasWrap`. It is a translucent, expandable corner card with one Font Awesome close button, newest messages first, and stage/frame context. Placement scores tracked position and other overlay cards; hover/focus pins it while reading. Messages stay until dismissed, and a new issue dismisses the biology screensaver. No analysis or detection rules changed. UI typecheck/build and four targeted browser tests passed, including compact/full-message rendering, dismiss/collapse, unreadable clips, and screensaver attention. Screenshots are in `test-results/video-issue-1440.png` and `video-issue-390.png`. Reload an open app when safe to load the new markup/assets; no live analysis was reloaded.

## November 9: adaptive section scheduling (1.2.20)

Added `lib/parallel.js` and the native `electron/resource-capacity.cjs` bridge. Approved anchors define up to 4–8 sections; RAM/CPU and video length bound actual directional concurrency. Multiple independent pass states share each OpenCV worker runtime. Each pass retains an independent decoder, with bounded shared decoded cache. Overlap rejects seam conflicts and propagates camera movement rejections; unavailable gaps remain excluded. Retries now use a bounded queue with their own readers. No model or tracking threshold changes.

Initial validation: 44 unit tests and two section browser scenarios pass, including exact clean-video output equivalence, pause, cancellation, and clip replacement. Long-video timing remains to be recorded separately; section count alone is not a speed claim. This Mac has four logical CPUs and 8 GB RAM, so eight simultaneous sections are inappropriate. Native resource estimates include conservative reclaimable cache; browser-only unknown memory stays at two directional passes.

Build identity and asset cache keys now distinguish 1.2.20. Screensaver retains 200 entries; nine generic entries replaced with sourced unusual observations. Do not reload an active user analysis to refresh these assets.

Screensaver idle timeout changed from 60 to 120 seconds, including Settings wording and the browser timing check (hidden after 61 seconds, visible after 121 seconds).

Final scheduling decision: production sections require at least four CV worker threads. The two-thread L6 pilot returned identical centers and acceptance statuses (72.56% coverage in both runs), but took 266.2 seconds versus 222.4 seconds for conventional passes under overlapping validation load. This is not an isolated speed benchmark. Full anatomy/metrics hashes differ, so only center/status equivalence is established. Keep conventional passes on this four-logical-CPU Mac and retain bounded concurrent retries. Larger-machine sectioning needs on-device performance validation. See `tests/chunk-profile.json`.

Error-placement follow-up: essential positioning now lives directly in HTML, and reporting repairs a misplaced issue container. Exception text is no longer repeated in the lower status badge. Dish-detection errors use the video issue card. Messages use sentence case; screensaver dismissal uses lowercase “or”. Original technical error data remains in diagnostics.

Tracking-review interval buttons now show frame ranges instead of dumping detailed rejection reasons into the white panel. Selecting an interval shows its reason on the video; head/tail review likewise shows an in-video instruction. These review notices do not log console errors or change verification. Base error-card positioning respects light/dark theme tokens. Screensaver instruction: “Click anywhere or press Esc to return.”

## Custom reference-area selection

`Custom Shape` now opens a dedicated single-frame editor with Rectangle (rectangular marquee), Ellipse (elliptical marquee), Lasso and Magic wand; Replace/Add/Subtract/Intersect; live color tolerance and contiguous toggle; local Undo/Redo and explicit Save/Cancel. Green fill is 46/255 alpha, about 18%. PhotoCraft selection source and MIT license were inspected/downloaded as references, without installing the full Rust app. Measurement uses source-resolution binary pixels, including subtracted holes, with mm/px = sqrt(known area × unit² / selected pixels). The packed mask remains in the clip's scale configuration and is only displayed on its original frame. Temporary undo masks are capped by a 24 MiB budget; the editor is off by default and does no per-frame tracking.

Petri rendering remains a green stroke only; changed suggested rims to a solid stroke and corrected white-rim instruction text. Existing full-rim and tilt calibration gates remain authoritative. Real L6 testing did not produce a complete acceptable fit at sampled frames; do not claim that detector calibration works on cropped L6. Use the supplied complete dish validation photograph for a clearly labeled detector demonstration.

Final validation for reference areas (1.2.21): 46 unit tests, UI typecheck/build, and three focused browser cases passed. Actual Electron detector request on the supplied complete validation photograph returned a green rim with no errors: 1.119 seconds initially, 0.822 seconds on the final warm run. Screenshots: `tests/petri-evaluation/live-detector.png`, `live-workspace.png`, `custom-area-tools.png`, `custom-area-mask.png`. These are real model output and real manual selection UI; the source photo was repeated into a one-second WebM only so the normal video-loading UI could display it. No moving-larva accuracy is established by this demonstration. Temporary AVI/MP4 conversion intermediates were removed. L6 remains rejected for incomplete rims at tested frames. Added an explicit Circle constraint within Ellipse; measured masks stay binary regardless of visual opacity. Choosing a reference hides unrelated worm-seeding guidance.

## Repeated new-feature checks on five real recordings

Scope: L4, L6, straight, curved, irregular; two rounds at the first and middle frames, at desktop and compact widths. Per-clip checks cover actual Petri model response, manual-rim tool mechanics, rectangle/ellipse/circle/lasso/wand, four boolean selection modes, live tolerance/contiguous fill, local and global Undo/Redo, calibration/units, Save/Cancel, frame-specific green masks, in-video issues, screensaver preview/dismissal, and clip isolation. Timed screensaver/reduced-motion checks run separately with a controlled clock. This is feature validation, not a new biological-accuracy evaluation or full tracking benchmark.

Initial run exposed keyboard propagation: Cmd+Z in the editor also invoked global Undo, reverting Custom Shape to Petri and causing Save to discard the mask. Fixed by isolating dialog keyboard events. A separate regression demonstrated the idle screensaver could activate during area editing; fixed by excluding open native dialogs from idle activation. Both regressions passed twice after the fixes. Keep the initial report as failure evidence; an intentional test-window shutdown may produce terminal Target-closed messages in that initial report.

Reports and screenshots: `tests/new-features-validation/`. `source-hashes.json` records the tested source snapshot. Manual-rim checks use explicitly artificial circle inputs to verify interaction/math, never as evidence of an actual dish or a scientifically valid scale on a worm close-up.

## Live screenshot follow-up and fluid inspectors

New-feature validation completed a desktop round on all five originals and reran the five compact cases after fixes: 130/130 retained checks pass (65 desktop + 65 corrected compact). Raw earlier failures remain in separate reports; `tests/new-features-validation/summary.json` explains which snapshots are combined. Actual automatic dish detection rejected all ten sampled original-video frames; this is not positive detection success. The earlier complete validation-photo demonstration is a separate positive control.

Further screenshot-driven repairs: the editor owns keyboard events; automatic screensaver waits while dialogs are open; unit inputs hide floating-point display noise without rounding measurements; compact manual-rim mode and off-screen issue messages bring the video into view; zoom input no longer independently quantizes Auto-Zoom; both progress surfaces share one percentage and motion-model waiting is indeterminate; final point counters reflect the recording, not the last retry; completed scan status no longer looks stuck on endpoint discovery.

Public labels now say “motion model”, retaining TAPIR API identifiers and stored origins for compatibility/diagnostics. `src/FluidPanels.tsx` observes inspector content heights and packs compact cards without empty grid rows; no duplicate controls or state. Anchor lists expand to show their content. Layout checks passed at 390/940/1024/1199/1440 px. Screenshots are in the validation folder. No tracker thresholds or acceptance rules changed.

The user's psd-tools link was reviewed: it handles PSD/PSB layer/file access and is not needed for these selection or UI repairs; it was not installed.

## Automatic Area Change (1.2.23)

Removed Optional/collapse controls. The section appears automatically with results and calculates trusted outline areas in short, cancellable batches. It shows approximate current area, mean/range, signed change from the segment start, and labelled earlier/recent gains. Pixels remain the fallback until reference calibration establishes a physical scale. All area numbers and chart values now use the same selected squared unit (fixes the previous mm² readout versus px² chart mismatch). The chart resizes at display resolution; small physical changes are not rounded to zero by a fixed three-decimal format.

Source signatures cache measurements across scrubbing, scale/unit edits and display changes. Outline/status/identity changes restart calculation; Reset/replacement cancel stale batches. Only scalar graph data and the active-frame overlay are retained. Gaps remain gaps; movement metrics, raw outlines, acceptance rules and export schema are unchanged. No new models/dependencies.

Validation: UI typecheck/build and 47 unit tests passed. Automatic-area browser regression passed before and after responsive rendering changes: section appears without opening anything; readout/chart/mean use cm² for a test calibration; scrubbing and unit changes do not restart measurement; changing a frame to uncertain restarts measurement and splits the graph; Reset removes stale data. Desktop and 390 px screenshots are in `tests/area-results-validation/` and are synthetic fixture checks, not biological validation of a recording. Existing live recordings were not reloaded, preserving any current unsaved calibration.

## 2026-11-09: 1.2.24 boundary display and rim confirmation
- Confirm Rim accepts geometry independently of a known measurement. It ends rim marking, clears draft dots and retains only the green ellipse. A positive measurement and acceptable dish geometry are still required for physical calibration.
- Source-coordinate contour display uses uniform arc resampling, two bounded local smoothing passes and a restricted ±0.5 px normal-direction image-gradient search. Cached per contour, independent of zoom. White color and feather retained. Raw outlines, H/C/T, area measurements, metrics and exports remain authoritative and unchanged: display refinement has not been validated as a better biological mask.
- PDF pathway uses the same One Euro filtered segments as the video/results chart. No gap bridging; measurements unchanged.
- 48 unit checks, UI typecheck/build and 5 focused browser cases passed (rim, compact rim, zoom readout and boundary zoom). Screenshots in tests/area-results-validation/border-{1,2,4}x.png use synthetic clean_worm, not biological accuracy evidence.
- Isolated Moondream 0.5B int4 pilot in experiments/moondream. No inference integration into tracking. Official pinned 422 MiB moonfile downloaded. ONNX Runtime 1.23.2 loads but fails encoding with MatMulNBits shape mismatch; checking 1.19.2 separately. Dependencies are isolated from the existing helper.
- Moondream final: CPU works with ORT 1.19.2. Dish and actual irregular frame100 trials complete. Peak ~1.9–2.0 GiB. Actual worm box visually surrounds the animal, but caption hallucinates a snake/table; point unsupported. Actual frame encode37.47s, query24.84s, detect7.45s. Not integrated. Outputs, source frame, illustrative box image and pinned checksum under experiments/moondream.
- Additional automatic-area browser case passed after boundary changes; manually confirming five rim points at zero measurement also checked to clear draft/handles. Total six unique focused browser cases, with compact rim repeated after extending assertions.

## 1.2.25 local AI chat
AI below Results now opens an actual local image chat, not the model info card. Electron uses an isolated on-demand Python process and the tested 0.5B int4 weights. Runtime installed permanently in experiments/moondream/.venv, ORT1.19.2. Current clean source frame captured after pausing playback; no overlays sent. Last four messages provide follow-up context, with prompt history bounded. Stop/close terminates inference, 180-second timeout; stale answers ignored on clip change. Model exits after each reply to release RAM. No API, tracking changes, or measured result edits. Browser-only page explains that Electron is needed. Chat requires a loaded clip and no active analysis. Answers can be wrong. Browser check for sends/history/reopen/Stop passed. Native real-inference check: tests/ai-chat-electron.cjs; raw result at experiments/moondream/chat-smoke.json.

## 1.2.26: remove Moondream and repair track presentation/geometry
- User requested deletion. Removed AI chat/sidebar, preload IPC, Python bridge module, test stubs, downloaded model, source-frame copies, and both isolated AI environments (project and /tmp). Removed current README/dependency references; older entries above remain historical only. No other tracking model or helper was removed.
- Replaced causal display filtering with bounded symmetric local linear fits using up to five frames either side. Endpoints and manual anchors remain exact; windows stop at gaps/manual anchors; sustained turns are retained. Max display movement 0.08 internal body lengths. Measured path remains separate. Video/results/PDF use the shared display segments. Path cache invalidates on recompute so edits cannot leave stale lines.
- Small-body skeleton grid uses half-pixel spacing below a 48px source extent, reducing centerline quantization. Larger bodies retain previous grid. No segmentation thresholds, motion rules or two-pass acceptance gates changed. This affects newly computed anatomy/centers; saved results need re-analysis to gain it.
- Edge-aligned display outline regularized within a quarter source pixel after alignment, preventing independent edge offsets from adding staircase artifacts. Raw masks/area measurements remain unchanged pending reviewed-mask validation.
- Synthetic 40 rotated small-ellipse contours: mean center error 0.6694px before vs0.4471px after; all40 geometry results. This is synthetic numerical accuracy, not biological validation.
- Same60 actual L4 frames accepted before/after (100%); 7.35s vs8.40s diagnostic runs under differing concurrent test load, not an isolated speed comparison. Baseline and after reports retained.
- Saved-track smoothing checks across all five complete saved traces: second-difference roughness reduced, all endpoints/manual anchors exact. tests/track-repair-report.json. This replays existing traces, not new full-video tracking or accuracy evidence.
- 50 unit checks and five focused browser scenarios passed. Fresh short real-video checks/snapshots in tests/repair-after-*.json and tests/repair-*.png. These auto-accept scan suggestions for engine diagnostics, not reviewed ground truth.
- Specialist proposal: compact U-Net/MobileNetV2 larva segmentation, reviewed masks first; no training/inference installed. docs/larva-specialist.md has dataset/split/validation/runtime targets.
- All five short fresh windows completed without runtime errors: L4 60 frames; L6/straight/curved/irregular40 frames each. Coverage and timings in tests/repair-window-summary.json. This does not replace full-recording biological validation. Restarted dev app without AI and reopened the user's L4 recording to restore saved results.

## 1.2.27: referenced screensaver and specialist dataset preparation
- Active rotation now uses 50 original, more detailed, individually referenced summaries, including human biology, with source links at the end after typing finishes. FactRetriever used for discovery and selected safe animal facts; most entries use primary papers/museum/university sources. Excluded oversimplified strength claims and removed weaker taste/foot/neck trivia. Earlier 200 entries retained in src/biologyFacts.archive.ts but not displayed/bundled.
- Typed characters every32/.75=42.667ms (75% previous rate); completed text hold11s (+1s). Reduced motion shows complete text for15s (+1s). Idle remains2minutes. Sources keyboard-focusable, targetblank/noopener, do not trigger dismiss; other click/Esc dismiss remains. Source URLs not fetched unless clicked.
- 50 unit checks, UI typecheck/build, all3 screensaver browser checks passed before final editorial-only pruning from58to50; rerun validates final set. Preview in tests/screensaver-reviewed-preview.png.
- Prepared150 unreviewed source-pixel crops,30 per supplied video, recording-separated train90/validation30/test30. training/larva-mask/manifest.json retains source transforms. review.html uses existing mask tools and explicit human approval; file mode uses frames-folder picker to avoid tainted-canvas restrictions. Verified editor opens offline without creating labels. Screenshot tests/larva-mask-review-preview.png.
- train.py validates reviewed bitmasks, IDs/dimensions/area/recording splits and refuses absent labels. Compact U-Net/MobileNetV2 CPU pilot setup, no weight downloads, no model trained or integrated. User must review masks before meaningful training. README gives exact procedure; no automatic contours promoted to ground truth.

## 1.2.28 reliability pass in progress
- Empty workspace hides transport, pointer and calibration controls until media is loaded. Verified in the actual native dev window after reload.
- Settings traps focus, restores it on close, isolates Undo, and yields Escape to the screensaver or nested area dialog.
- Calibration/settings/landmark seeds now persist with saved results. Writes capture their clip identity, serialize, and debounce recomputations to avoid stale writes or repeated status messages.
- When scan suggestions finish without a boundary anchor, review opens the missing exact endpoint in full-frame placement mode. Manually saving it advances to the next missing boundary or Ready. Seek-in-progress cannot accept a proposal or create a pending point; scrubbing clears a point from another frame.
- Current verification: 50 unit tests passed; 10 focused browser tests passed (screensaver, Settings, persistence, missing boundary, desktop/compact shell). A separate real-click endpoint confirmation regression also passed. Native empty workspace visually checked. Full five-recording workflow/export checks still running, report at tests/thorough-validation/full-recordings.json; do not treat this interim entry as a completed validation claim.
- L4's final source frame was visually inspected: larva near (594,86). Automated detection missed it, so the full-workflow test explicitly supplies that reviewed endpoint. Other automatic suggestions in this harness are workflow fixtures, not biological ground truth.
- Visual audit found an additional real defect: L6's sparse final-frame scan proposed glass at (365,53), while the larva is near (463,90). Final-boundary proposals now always require independent temporal endpoint discovery and must match the literal final frame; an earlier detection cannot silently replace it. Failed confirmation leaves an explicit missing endpoint for manual review. A fresh real-L6 scan rejects the reflection; tests/endpoint-reflection.browser.spec.cjs covers correction through the video. Full L6 revalidation remains required.
- User-reported scrolling defect reproduced: the video consumed all wheel events for zoom. Ordinary wheel now reaches page scrolling; pinch and Ctrl/Command/Option wheel retain cursor-centered zoom. A new 1024px browser regression checks both directions and unchanged magnification during page scroll.
- Display border now searches up to 1.5 source pixels for stronger local edge evidence, penalizes distant edges, and does not expand on flat pixels. Reduced the halo and made its blur radius screen-space instead of inversely shrinking with zoom. Original measurement contours/areas remain unchanged. Added an analytic soft-edge regression and screen-space feather-radius checks. All51 unit checks passed; final scroll/zoom-coordinate/outline browser subset passed3/3, plus the added radius assertion passed separately.
- Native smoke succeeded with renderer/preload build agreement (1.2.28), no console errors, Settings and the four-stage sidebar. The user's existing editing window has not been reloaded automatically, to avoid losing setup edits.

## 1.2.28 validation completed (2026-11-10)
This entry supersedes the earlier in-progress status. Five complete recordings and their exports passed, with final coverage L4 86.0%, corrected L6 91.5%, straight 100%, curved 100%, irregular 97.1%. Coverage is consistency, not biological ground truth. Source fingerprints and full scope are in tests/thorough-validation/VALIDATION.md and final-five-recordings.json.
51 unit checks passed; the full browser suite passed59, followed by the real-endpoint/workspace5, scroll/zoom-coordinate/border3 and screen-space feather-radius checks. Native smoke confirmed current renderer/preload agreement, Settings and no console errors. The five-clip area matrix has13 passing checks per clip (65 total); L4's isolated repeat used the actual local model in a browser, others native Electron.
The native irregular case was not frozen: discovery progressed through446 frames and the complete area-tool case passed13/13 in489seconds. Earlier180second limits expired before completion. This slow preflight remains a documented performance limitation; no thresholds or frame-skipping rules were changed to hide it. All failure artifacts are retained.
The current editing window was not forcibly reloaded. Updated wheel scrolling and feathering apply on its next reload; save/finish setup edits first.

## Red pathway display repair (2026-11-10)
- Root cause: video overlay painted every raw accepted point in red after drawing its smoothed stroke. At magnification those raw dots reintroduced the apparent zigzags. Removed only that dense dot layer; current-frame manual-anchor and H/C/T markers remain.
- Broadened Gaussian weighting within the existing symmetric ±5-frame display fit (sigma3 instead of2). Kept the same 0.08 internal-body-length displacement cap, turn guards, exact manual anchors/endpoints and gap boundaries. No measured coordinates, metrics, segmentation, or exports changed. Existing L4 trace replay shows24.9% lower second-difference roughness compared with the previous display weights; this is a rendering diagnostic, not biological validation.
- Cache-busted the local display-filter script. The new browser regression failed before the repair with29 raw dots, then passed with0, two separate gap-safe strokes and identical measured track/metrics. Zoom-coordinate regression and all3 filter unit checks passed; five saved-trace replays preserve anchors/endpoints. Before/after L4 screenshots are tests/thorough-validation/path-before.png and path-after.png.

## Anchor-section speed pass (2026-11-10, working source)
- Implemented above committed 6be25de; the separately launched baseline instance and Git commit remain unchanged. This is part of the uncommitted five-stage workflow work, not a new packaged release.
- Default analysis now queues independent forward sections at approved manual anchors and reverse-checks only failed/suspicious windows and section ends. Endpoint mismatch expands the check to its own full section. Single-pass points are explicitly `tracked`, not `verified`; manual anchors remain authoritative, and unresolved joins/gaps remain gaps. Original full two-pass mode is retained behind WORMEZ_FULL_VERIFICATION for comparisons.
- Four-logical-CPU resource policy can use three independent CV workers instead of restricting sections to machines with four CV workers. Active fast passes do not exceed CV-worker slots; memory pressure can lower concurrency. One bundled OpenCV asset is loaded independently in each worker. No source frames are deliberately skipped.
- Retained direct decoding, bounded pixel caches, decode/compute overlap and throttled rendering. Disposed decoder canvases release backing storage. Rejected candidates skip skeleton extraction; identical contours reuse cloned anatomy without sharing mutable measurement objects.
- Existing neighbor-anchor interval correction path is retained. TAPIR recovery remains an explicit separate action on unresolved gaps; straight connections require the next explicit action and are excluded from measured totals.
- CSV statuses distinguish tracked/verified/manual/uncertain. Excel has a separate Tracking evidence sheet, PDF discloses targeted checking, batch ZIP includes tracking-evidence.csv. verified_distance excludes single-pass links; total_distance still reports accepted measured tracking, excluding straight estimates.
- Bounded L4 benchmark: frames 0–300, five stored-trace seed anchors, full two-pass 23.547s/614 pass steps; targeted four-section fit 12.590s/354 steps (1.87x wall-time ratio). Targeted result has 274 tracked, 20 verified, 5 approved manual and 2 uncertain frames. This is a bounded performance comparison, not biological validation or a full-recording guarantee. Details: tests/fast-sections-benchmark.json.
- Unit suite: 55 passed, including fast-window bounds, endpoint mismatch, gap-safe section joins and non-shared cached anatomy. Focused browser validation is being completed separately; the wider five-stage workflow remains under integration and is not declared fully validated.
- Focused speed validation completed: 8 browser checks passed (full-frame/ROI equivalence, exact-seek pixels, camera-motion rejection, L4/L6 direct-decoder pixel equality/shared cache, independent fast workers, pause/cancel, bounded anchor refits and export evidence). Unit suite remains 55/55. UI type check/build passed. Full five-recording validation of the broader new workflow is still pending; these focused checks do not replace it.

## Playback and calibration-control checkpoint (2026-11-10)
- Added 8x, 16x and 32x playback. Rates unsupported by the browser use a clock-driven preview seek fallback; this affects viewing only, not FPS, source samples or analysis. Playback pauses normally at the end and rates can be changed while playing.
- Scale & Timing fields now share compact 28px desktop heights, aligned value columns, quiet borders, rounded corners and focus/hover feedback; touch controls retain 36px height. Suppressed the older inset glass shadows in this form. Motion preferences remain respected.
- Verification: UI type check/build pass, 55 unit tests pass, and a new browser test passes all three rates without changing analysis FPS or starting tracking. The calibration-panel screenshot was visually inspected. The earlier 8 focused speed/decoder browser checks also passed.
- This commit checkpoints all current changes, including the broader guided-workspace/batch/measurement implementation. That broader workflow still requires its complete five-recording and batch validation before it is considered release-ready. No packaged Electron rebuild or baseline replacement is included.

## Workflow cleanup and anchor advancement (2026-11-10)
- Restored Start analysis / Re-analyze labels. The visible rail is now Videos → Setup → Analyze → Results; internal saved-fit records remain so scale/advanced-measurement edits reuse tracking.
- Correct now advances to the next unapproved suggestion rather than searching only for another boundary. Review seeking also updates the selected timeline marker. Clicking a hollow suggestion reopens its review card even after review was previously closed. Busy tracking cannot silently advance an uncommitted approval.
- Removed separate Calculate measurements, Choose measurements and Continue buttons. Measurements are generated automatically when tracking finishes; advanced body-analysis checkboxes update the saved result directly. Start analysis is reachable from setup once required anchors are approved.
- Removed the discovery checkbox and hid the multiworm panel pending model-assisted counting. Retained internal identity/session code for future integration; ordinary loading/analysis does not invoke discovery. Folder batching remains available.
- Validation: 55 unit tests pass; UI type check/build pass; 5 focused browser tests pass covering sequential review/marker selection, automatic results, hidden multiworm UI, advanced cached recalculation, playback speeds, parallel processing, pause/cancel, local refits and export evidence. Full broader workflow/batch/real-video release validation remains outstanding as previously documented.

## State ownership audit (2026-11-10)
- [STATE-MACHINES.md](STATE-MACHINES.md) inventories 39 app-owned lifecycles across the renderer, native shell and local helper. It records their owners, transitions and migration boundaries. DESIGN.md links the state ownership rule for future UI changes.
- Added the versioned `window.__wormez.machine` contract: immutable snapshots of independent regions, action capabilities/reasons, stale-context guards, shared commands, subscriptions and a bounded local trace. React subscribes instead of running its own polling loop; one compatibility tick remains for direct legacy mutations.
- Fixed ownership races in delayed native conversion, media opening/indexing and camera acquisition/finalization. Failed media exits loading. Start, pause, resume, Stop and Reset use named actions. Anchor cancel restores its review and viewport; history restores matching fit provenance without decoding again.
- Folder attach/select/run/export use exclusive phases and bind snapshots to the successfully loaded item. Ready reviews autosave; failed items retain their errors, incomplete fits stay incomplete and nested duplicate names export separately. Stop cannot cancel an unrelated idle job.
- Stale fit settings block exports and are preserved as stale through snapshot restore. Global tracking changes cause a full re-analysis; ordinary anchor edits remain interval-local. No tracking thresholds, measurement equations, layout, dependencies or native package changed.
- Verified: UI type check/build, 66 unit tests, and 16 focused browser tests (state command ownership, stale media/camera responses, edit cancel, undo, stale settings, media error recovery, folder isolation/export, camera chunk ordering, playback, anchor workflow and parallel fitting). Full five-recording and native device/package validation remain separate release checks. No commit or relaunch was requested for this audit.
