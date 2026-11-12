# WormEZ — larval movement tracker

Double-click **Launch WormEZ.command** for the complete local analysis workflow.
The app analyzes one or more
bright or dark larvae locally with bundled OpenCV.js. It uses no external AI API, uploads,
telemetry, or runtime internet connection. The optional `electron/` wrapper remains
available. Node and Playwright are development tools, not app requirements.

The launcher and the Electron app start a local TAPIR helper (when its runtime is installed) and a sizeable Python runtime. Opening
**WormEZ.html** directly in a browser, with `lib/` and `dist-ui/` alongside it,
runs only the original tracker because the browser cannot start that helper.
After OpenCV finishes, **Recover Gaps** explicitly starts TAPIR only on bounded unresolved intervals. Its
suggestions guide a new search; WormEZ still requires its existing contour,
motion, forward/backward, and anatomy checks before accepting a frame. See
`tapir-helper/README.md` for limits and provenance. LocoTrack-S was also
compared locally but is not part of the app.

The on-screen verified trajectory uses a display-only symmetric local fit over
up to five neighboring frames on each side to reduce jitter without causal lag.
It preserves gap boundaries, manual anchors, endpoints and clear turns;
measurements and exports still use the existing track. A 125-frame H/C/T review
set, NanoTrack pilot, and isolated SLEAP CPU probe are in
`tests/model-evaluation/README.md`. No additional model was enabled or
bundled: SLEAP produced no accepted test detections in the unreviewed probe,
and the proposed H/C/T points still need independent review before a valid
accuracy comparison.

## Workflow

The development Electron window uses a compact left rail for **Videos → Setup → Analyze → Results**. The rail shows the current stage; actions stay
beside the video. **Settings** at the bottom of the rail contains System/Light/Dark
appearance, a glass-surface switch, and the existing attention-sound preference.
These preferences are saved locally. The glass material applies to workspace
controls and panels, not to source video pixels or measurements.

Multiworm controls and manual worm discovery are hidden pending model-assisted worm counting. Single-worm analysis and video-folder batching remain available; batching refers to separate recordings, not multiple animals in one container.

1. Enter the recording's frame rate (default 30 fps), then **Load Video**. A quick
   scan proposes editable anchors. Purple placeholders (system anchors) appear on the frame timeline.
   An in-video review card opens each sampled frame in order; confirm the anchor,
   adjust it by clicking the larva, mark the frame unavailable, or use Back/Next.
   Approved proposals fill in purple; anchors you place or correct are green. Unaccepted proposals never count as verified
   movement or constrain the full tracker. Analysis remains disabled until anchors
   on the first and last visible larva frames are approved. Absent leading or
   trailing frames are marked unavailable instead of bridged.
   **Fix anchor** temporarily opens the complete source frame and shows the rejected
   proposal as a faint reference, allowing a larva elsewhere in the dish to be
   selected. The prior Follow/zoom view returns after the corrected click.
2. Press **Start analysis** when ready. Approved anchor intervals run in parallel with targeted reverse checks. Movement measurements and results appear automatically when tracking completes; there is no separate Calculate measurements action. A translucent
   progress screen stays within the video area and shows estimated time remaining;
   **View video** keeps analysis
   running while revealing the video. **Pause tracking** preserves active sections;
   **Stop** cancels. **Reset** clears setup/results and rewinds. An optional sound
   requests attention after Start when corrections are needed.
3. Use **Fit frame**, **Auto-Zoom** (follow the larva), or **Pathway** (fit the
   measured route). The zoom slider shows absolute magnification from 100–1600%
   in every mode. A small overview locates the zoom within the full frame.
   Zoom changes presentation, never measurement coordinates.
4. **Blue H = head, red C = body center, green T = tail.** The pathway, distance,
   speed, and turns use the centerline's arc-length midpoint. Filled dots are
   automatic estimates, squares mark manual corrections, and hollow question marks
   indicate unidentified endpoints. Missing center geometry is an unresolved gap.
5. Review buttons group uncertain center intervals and unidentified head/tail
   intervals separately. Errors remain in the issues panel until dismissed. If
   identity is ambiguous, click the larva's center and press **Start analysis**.
6. Use **Edit head**, **Edit center**, or **Edit tail**, then click in the main
   video. The smaller image is a preview. The aiming cursor follows the landmark
   colour: blue head, red center, green tail; anchor placement is green. A head
   proposal can be approved or swapped. Edits repeat both checks
   between neighbouring anchors. Add, move, or delete anchors as needed.
7. Export **Points CSV**, **Excel**, or **PDF**. Every sampled time, including
   stationary periods, is retained. Unverified frames stay labelled. After OpenCV finishes, click **Recover Gaps** to try the local motion model. If it cannot resolve an interval, click **Connect Remaining Gaps** to show straight-line endpoint estimates separately;
   intermediate frames are still unverified.

### Automatic area estimates and changes

**Area change** appears automatically in Results, with approximate current and mean
larval area, the observed range, and earlier/recent gains. The chart and readout use
the same selected squared physical unit once a known reference is calibrated;
otherwise they use pixels squared. A selected region without a known measurement
does not establish a physical scale.

Verified outlines are aligned to their body center and direction before their
footprints are compared. Teal **1** is earlier gained area still visible; amber **2**
is newly occupied area since the preceding reliable frame. Regions disappear when
the body no longer occupies them. Each continuous segment gets a fresh baseline;
uncertain or missing outlines leave gaps. Calculation runs in short batches after
results are ready, retains scalar samples, and is reused while scrubbing or changing
units. Raw contours, movement metrics, and existing exports are unchanged. This is
an approximate two-dimensional projected area, not body volume.

Video **Play/Pause**, the visible playback-speed selector, frame stepping, and
scrubbing are separate from analysis. Playback speed never changes the analysis fps.
They are available while analysis is idle or paused. **Undo/Redo** retains 20 edits
per clip, including corrections, calibration, settings, and Reset; replacing the
clip clears history. Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z work outside editable inputs.

Dense automatic verification anchors stay off the video so the red trajectory
remains readable. Setup proposals use purple outline ticks; approved proposals are filled purple and
anchors you placed or corrected are green. Motion-model (TAPIR) estimates are dark orange. Only a manual correction is shown on its own video frame.

The zoom slider gives one absolute magnification value in every view. **Auto-Zoom**
restores automatic follow framing; **Fit frame** resets to the full source frame;
**Pathway** fits the known route.
Ordinary wheel or trackpad scrolling moves the page. Pinch, or hold Ctrl, Command, or Option while scrolling, to zoom around the pointer. Dragging
pans a zoomed frame even during correction. A point is committed only on pointer-up
without a drag. **Fit frame**, minus/plus, and double-click reset framing. Empty charts
and metric panels remain hidden until tracking produces results.

Choose **Use Camera** to record video locally without a microphone. The live dashed
path is provisional; capture continues while a completed frame is re-anchored. On
Stop, WormEZ finalizes the recording, asks for the last visible anchor, and replaces
the provisional path with full forward/backward verification. Electron writes
one-second recording chunks to disk instead of accumulating the recording in memory.

## Scale

Choose **Petri Dish** to detect the rim locally with the supplied segmentation model.
Review its smooth white outline, enter a known diameter or area in mm, cm, µm,
or inches, and confirm the rim. No nominal diameter is assumed. Manual diameter
marking remains available. **Custom Shape** drawing is reserved for a later update.

Physical calibration requires a complete, nearly circular dish in the animal's
plane. Cropped or tilted dishes cannot establish an automatic scale. Measurements
remain in pixels until calibrated; BL is no longer an output unit. Body-size
estimates remain internal to motion and anatomy checks. Reset clears calibration;
Undo restores it. The local launcher/Electron helper provides inference; direct
file-only HTML cannot start the Python model.

See [dish model details](tapir-helper/models/README.md) and
[validation](tests/petri-evaluation/README.md).

## Analysis and verification

Discovery examines several frames across the opening four seconds (clamped for
short clips). Bright and dark silhouettes are compared using shape, internal
texture, colour, sustained displacement, and direction coherence. A textured dark
body moving beside a smooth bright reflection is selected as the animal.
Small targets retain source-resolution pixels. Once selected, full-resolution local
regions reduce work and prevent whole-frame downsampling from erasing the animal.

Each direction segments independently and checks Lucas–Kanade optical flow with a
round-trip feature check. When flow fails on a dark body, a close, high-contrast
body match can continue the pass; both passes must still agree within a quarter
body length. Body-center verification is independent of outline/head verification:
an unclear skeleton leaves head measurements blank without discarding an agreed
center. Bounded disputed intervals receive one wider
search retry in each direction; remaining uncertainty is presented for review.
Camera movement is checked against background features, excluding the animal.
Detected camera shifts are flagged rather than counted as animal movement.
Accepted movement is limited to 0.5 body length per frame and one body length across
two consecutive frames. A five-frame accepted window is also checked against a
two-body-length displacement limit. Violations remain explicit uncertain samples.

Head identity is initially **motion inferred**, not biologically confirmed. It uses
sustained body-aligned movement, then follows endpoint continuity rather than
switching ends whenever movement reverses. Stationary or ambiguous orientation
stays unidentified. Manual endpoint corrections take precedence. Head bending is
separate from center-path turns. Tail replaces the former experimental leg feature.

Outlines describe the segmented body. Folds, blur,
occlusion, reflections, or a very small animal can prevent reliable anatomy.
Magnification cannot recover detail absent from the recording. Independent-pass
agreement is evidence of consistency, not a ground-truth accuracy measurement.

## Exports

CSV/Excel include verification, origin, reason, centerline geometry, head/center/tail
coordinates, landmark provenance, speeds, and head bend. Physical values accompany
pixel values after calibration. Excel/PDF summaries contain center/outline and
head/tail coverage, scale provenance, and accepted/unverified time. Excel charts are
embedded images. Body-relative landmark speeds subtract translation, not rotation.
Unresolved samples retain diagnostic coordinates with explicit uncertainty; blank
landmark/speed fields mean unavailable. Path efficiency is unavailable across gaps.
The displayed red route uses shape-preserving cubic curves only between consecutive
accepted points. **Connect Remaining Gaps** becomes available after a recovery attempt. It draws grey dashed straight-line estimates between trusted endpoints (approved anchors or verified points beside a gap) only where no accepted interior points exist and no unavailable interval is crossed. Estimated distance is reported separately and excluded from verified distance, average speed, and cumulative movement. Missing frames remain unverified. The curve display follows
the no-overshoot approach described by [SciPy's PCHIP documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.interpolate.PchipInterpolator.html);
WormEZ implements its own local display interpolation and does not load SciPy.

The path reference changed from silhouette centroid to centerline midpoint. The
former `leg_*` export columns have been replaced with `tail_*` columns. Frame rate
is entered manually; variable-rate recordings need a known timing basis for
quantitative analysis. The Electron app accepts MP4, MOV, M4V, WebM, AVI, MKV, WMV,
MTS/M2TS, TS, MPG/MPEG, and 3GP. Unsupported browser containers are converted
locally with bundled network-disabled LGPL FFmpeg 9.0.2 while the original is kept.
Conversion tries H.264 VideoToolbox first and falls back to FFmpeg's native MPEG-4
MP4 encoder when macOS refuses the hardware/software H.264 session.
MP4/MOV clips use a local MP4Box/WebCodecs decoder when supported, with bounded
source-frame caches and concurrent passes. Other formats use independent exact
video seeks. No samples are deliberately skipped. The displayed outline is softly
rounded; measurements retain the original geometry. Estimates update from actual
progress and can increase when additional verification is needed. Long or complex
recordings can still take several minutes.

## Development

```sh
npm ci
npx playwright install chromium
npm run build:ui
npm test
npm run test:browser
npm run test:electron
npm run docker:build
npm run docker:test
npm run test:decoder -- '../03-05-2026 da Gal4 x w1118 L4.MP4'
npm run benchmark:decoder -- '../03-05-2026 da Gal4 x w1118 L4.MP4'
node tests/real-clips.cjs '../straight final.mp4' '../curved final.mp4' '../irregular.mp4'
```

`WORMEZ_TEST_FPS=5` explicitly changes the diagnostic sampling rate; reports record
it. Default diagnostics use 30 fps. The browser suite opens the HTML directly,
blocks external requests in the offline test, and checks controls, zoom, endpoint
edits, cancellation, exports, and gap-safe metrics. Deterministic pixel fixtures
exercise small targets and optical flow. See `tests/VALIDATION.md` for measured
results and limitations, `handoff.md` for architecture, and `lib/DEPENDENCIES.md`
for pinned runtime licenses and provenance.

## Desktop app

The macOS application is in `dist-electron/mac/WormEZ.app`; its installer is
`dist-electron/WormEZ-1.2.0.dmg`. It uses the same offline runtime. The Electron
window uses context isolation, renderer sandboxing, disabled Node integration,
video-only camera permission scoped to its local window, blocked external navigation,
and a narrow preload bridge for open/save, chunked recording, and conversion. This local build is
unsigned, so macOS may require Control-clicking the app and choosing **Open**.

### September 30 pathway repair

Build `1.2.0+20260930.pathway-repair` separates the timeline playhead from anchor
buttons and removes orange unavailable-boundary markers. Tracking now retries
centerline failures and avoids false skeleton breaks caused by diagonal
shortcuts. Unresolved tracking still appears as a gap; a continuous line is
shown only across accepted consecutive samples. See `tests/VALIDATION.md` for
recording-specific results and remaining reflection/occlusion limitations.
The rebuilt `.app` contains this repair; an older DMG may not.

### Staged-analysis performance check (2026-11-08)

A 90-frame L4 interval (including its bounded retry, 192 pass steps) took 8.043 seconds with the former hidden preview repaint and duplicate worker buffer copy, versus 4.801 seconds with both removed. Coordinates/statuses were identical, coverage was 100%, and both used WebCodecs with no fallback. This is a short-window comparison, not a full-clip runtime guarantee. See `tests/analysis-profile.json`; reproduce using `node tests/profile-analysis.cjs VIDEO`, with `WORMEZ_PROFILE_BASELINE=1` for the former handoff. The profile separates aggregate reader wait from tracking/worker time; concurrent pass times overlap. No frames or verification checks were removed.

### Bounded Frame Pipeline

Analysis reads a moving region covering the existing local search and flow windows, with full-source frames at camera-motion checkpoints. The region grows when lock is lost and includes distant manual/hint positions. Coordinates, thresholds, and sampling remain unchanged. No processing box appears in the video. Independent passes may reuse immutable decoded frames from a 32 MiB cache; a clip/FPS/dimension change or decoder fallback invalidates it. Each reader prepares at most its next frame/decode block while tracking computes the current one. Local anchor edits still rerun only their bounded interval; TAPIR still requires its own Recover Gaps action.

The Electron preload can supply the fixed bundled tracking scripts to a local Blob worker, so file-page security restrictions do not silently force analysis onto the renderer thread. It accepts no file path and does not disable web security. Browser file pages retain the equivalent local processing fallback.

For a full-recording profile, run `WORMEZ_PROFILE_FRAMES=0 node tests/profile-analysis.cjs VIDEO`. Set `WORMEZ_NO_ACCEL=1` for full-frame delivery without the new shared cache/prefetch. The test runner serves assets on loopback, records pass/component timing and sampled browser-process RSS, and never calls TAPIR. RSS sums process resident sets and can count shared pages more than once; it is not a measurement of the separate Python helper.

Native Load Video now supplies the selected local file's bytes to MP4 indexing rather than unconditionally falling back to exact seeking. Electron file pages keep web security enabled. Active processing also temporarily disables background throttling; paused/idle windows regain the normal behavior. Worker messages omit unused preview anatomy while retaining complete original anatomy in final results.

The full L4 engine stress benchmark in `tests/frame-pipeline-profile.json` processed all 3,648 output frames, including endpoint re-discovery and 15 bounded retries (11,385 pass steps). It took 301.890s without the new pipeline and 169.478s with it (1.78×). All coordinates/statuses matched; accepted coverage remained 85.9923%. Pixel-buffer volume fell 92.73%. Sampled browser RSS peaked around 1.63 GiB optimized; this excludes the optional Python helper. The stress harness deliberately calls the engine before final-boundary approval to exercise recovery; normal UI Start still requires approval. This is a performance/equivalence check, not biological accuracy validation.

### Fast anchor-bounded fitting

The default fitting path now runs independent forward sections between approved anchors, with up to four sections (eight on larger systems) queued across resource-bounded OpenCV workers. Four-logical-CPU machines can use up to three CV runtimes when available memory permits. Each worker loads the same bundled OpenCV file into independent memory; there is no duplicate framework installation. Suggested anchors are never silently approved to create more sections. With only start/end approved, there is one section.

Reverse checks target failed detections, physical-limit violations, and the last five frames of each section. A missed approved endpoint triggers a reverse check of its entire section. Overlapping section disagreement remains uncertain. Unavailable intervals are not bridged. Every source frame is visited by its forward section; only extra reverse work is reduced. This is a speed/verification tradeoff, not an accuracy-equivalent replacement for independent full two-pass verification.

Single-pass output has `status=tracked`, distinct from `verified` two-pass points and approved `manual` positions. Existing CSV status fields retain these distinctions; Excel adds a Tracking evidence sheet, PDFs identify a fast fit, and batch ZIPs include tracking-evidence.csv. `verified_distance` excludes links touching tracked points; total distance includes accepted tracked movement, never straight gap estimates. The full two-pass engine remains available internally for regression comparisons with `WORMEZ_FULL_VERIFICATION=true`.

Direct MP4 decoding, bounded caches, decode/compute overlap and throttled preview updates remain active. Rejected candidates skip skeleton fitting. Disposed readers release their canvas buffers immediately. Model recovery remains a separate user-triggered step for unresolved gaps; straight anchor-to-anchor estimates require another explicit action and remain excluded from measured totals. Position corrections refit only the interval bounded by neighboring approved anchors.

Performance checks and limitations are recorded in tests/fast-sections-benchmark.json. Small fixtures include worker startup overhead and do not establish a full-recording speed multiplier.


Custom shape calibration: choose **Scale & timing → Custom Shape → Select reference area**. Use Rectangle, Ellipse (with a Circle option), Lasso, or Magic wand. Replace/Add/Subtract/Intersect, live tolerance, contiguous fill, and local Undo/Redo are available. The green mask is about 18% opacity; the measured area counts original pixels, not the translucent display. Enter the known area and unit to calculate a scale. Use a reference in the same plane as the larva. Petri detection displays only a green rim and still requires an acceptable complete, near-circular reference for physical calibration.

### Boundary display and local VLM evaluation

White larva borders now use bounded source-coordinate smoothing and restricted subpixel edge alignment for display. Video, pathway chart and PDF share a bounded, symmetric display trajectory; unresolved intervals remain gaps. This does not change raw contours, measured area or movement exports. Improved biological area accuracy requires reviewed reference masks, not just smoother rendering.

Confirm Rim now confirms geometry even before a known diameter/area is entered. Point handles disappear after confirmation; the green border remains. Physical calibration remains unavailable until a valid measurement and acceptable dish geometry are provided.


### Referenced screensaver
The active screensaver now rotates 50 more detailed, individually sourced facts, rather than the earlier basic collection (archived separately). A small source link appears once typing finishes. Typing runs at 75% of the earlier speed; completed text remains for 11 seconds. Facts remain local and sources open only when clicked. The idle trigger is still two minutes.

### Larva specialist preparation
`training/larva-mask/` contains 150 unreviewed crops from the five recordings, an offline mask reviewer, and a guarded U-Net/MobileNetV2 training script. Training has not started: visible-body masks must be reviewed first. Recording-level train/validation/test separation is defined in the manifest. See that folder's README for annotation and training steps.
