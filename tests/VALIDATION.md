# WormEZ validation — 2026-10-02

## October 2 irregular.mp4 correction

Visual inspection of exact decoded frames showed the former bright target was
the larva's reflection. The segmented dark body is the animal. Discovery now
compares moving bright/dark companions by internal texture and selects the dark
body on this recording. Its nine-frame quick scan found usable dark-body
proposals at frames 0, 56, 111, 223, 278, and 445.

A native OpenCV.js replay of all 446 frames, seeded from independently detected
dark bodies at the first and last frames, accepted 408/446 body centers (91.5%)
after forward/backward agreement. It found outlines in 353 frames and assigned
heads in 290 frames. The remaining 38 centers form nine explicit uncertain
intervals; no movement is drawn across them. This replay omits the UI's bounded
retry and manual proposal controls, so it is diagnostic evidence rather than a
completed browser-session result or biological ground truth. The final center
and head overlays were visually inspected on sampled frames across the turn;
the montage is `tests/irregular-dark-validation.png`.

The 19 deterministic tracking tests, TypeScript check, and JavaScript syntax
checks pass. The earlier 296/446 result below tracked the bright reflection in
substantial parts of the video and must not be treated as an animal-accuracy
baseline.

All analysis runs locally. Coverage is the proportion of frames accepted by both
passes and the geometry checks. It measures implementation consistency, not
biological accuracy or ground-truth landmark identity.

## September 30 tracking repair

The older real-recording table below is historical and is superseded by the
September 30 results once listed below. In particular, the former claim that
all endpoint overlays avoided reflections was too strong: new testing exposed
false endpoint proposals on L4/L6. Coverage alone does not establish identity.

Repairs remove redundant diagonal skeleton shortcuts without relaxing branch
rejection, include anatomy failures in retry selection, preserve the mean of
independently verified centers, and try a brighter segmentation threshold when
a larva touches a scratch. Endpoint proposals must also remain spatially
consistent with the preceding quick-scan candidate. Unsupported gaps remain
breaks, not interpolated movement.

Current automated checks: 17/17 deterministic tracking tests, TypeScript check,
and production renderer build pass. The rebuilt macOS app passed the native
Electron smoke test with renderer build `1.2.0+20260930.pathway-repair` and no
renderer errors. The older Docker result below remains historical.

## Earlier automated checks

- `npm test`: 16 deterministic Node tests passed. These cover pause/cancel with
  concurrent waiters, reconciliation, manual precedence, gap-safe metrics,
  stationary jitter, curved outlines, endpoint identity, two-frame proximity,
  orientation, and exports.
- `npm run docker:test`: TypeScript check, production UI build, all 16 Node tests,
  and 20 Chromium cases passed in Docker in 1.9 minutes after browser startup.
  The suite covers the in-video proposal sequence, timeline placeholders and their
  accepted state, explicit Start, unavailable intervals, stage-contained ETA,
  sound, parallel pause/resume, cancellation and replacement, wrong-endpoint
  recovery, offline loading, WebM fallback, zoom/edit mapping, Petri-dish scale,
  undo/redo, CSV/Excel/PDF exports, build diagnostics, drag-safe anchor correction,
  visible boundary anchors, redundant-control removal, explicit pointer modes,
  pending anchor Save/Cancel, and the compact H/C/T landmark key.
- `npm run test:electron`: the `.app` was rebuilt successfully with the updated
  HTML and local Font Awesome assets. Playwright's native Electron launch is
  unavailable in this managed macOS session, so packaged launch was smoke-checked
  with `open -n`; Docker remains the authoritative renderer regression path.
- Responsive checks at 390×844 and 812×758 found no horizontal overflow. The setup
  panel, progress curtain, and revealed-video state are exercised by the browser
  suite.
- Reset, Stop, clip replacement, and history restoration cancel the active job.
  Ownership checks prevent an old pass from writing into a replacement clip.

## Decoder equality and performance

Direct MP4Box/WebCodecs output was compared byte-for-byte with exact browser seeks
on L4 and L6 at frames 0, 1, 29, 30, 59, 120, the midpoint, and the last frame.
Every sample had mean error 0 and maximum channel error 0. The benchmark readers
peaked at 30 buffered frames; full runs peaked at 31 around keyframe groups.

The repeatable 180-frame-per-direction benchmark is stored in
`tests/decoder-benchmark.json`:

| Recording | Sequential exact seeks | Concurrent WebCodecs | Speedup | Peak buffer |
| --- | ---: | ---: | ---: | ---: |
| L4 | 27.251 s | 4.411 s | 6.18× | 30 frames/reader |
| L6 | 25.010 s | 4.831 s | 5.18× | 30 frames/reader |

No frames are deliberately skipped. Unsupported browser containers are normalized
locally in the Electron app. The bundled FFmpeg conversion smoke test reproduced a
VideoToolbox `-12903` encoder failure, then successfully fell back to native
MPEG-4-in-MP4 and produced a 60-frame 320x200 file. A direct-decoder error switches
only that pass to exact seeks and records an explicit issue.

## Real recordings

Full 30 fps results after the guided workflow and concurrent decoder changes:

| Recording | Accepted center frames | Head-labelled frames | Wall time | Runtime errors |
| --- | ---: | ---: | ---: | ---: |
| straight final.mp4, proposals accepted | 185/324 (57.1%) | 0 | 42.9 s | 0 |
| curved final.mp4, proposals accepted | 314/331 (94.9%) | 257 | 52.5 s | 0 |
| irregular.mp4, proposals accepted | 243/446 (54.5%) | 153 | 99.1 s | 0 |
| L4 | 2,889/3,648 (79.2%) | 2,245 | 314.8 s | 0 |
| L6 | 3,340/3,633 (91.9%) | 3,006 | 405.1 s | 0 |

Straight, curved, and irregular were rerun after boundary-anchor repair. The
straight clip now uses frame 242 as the final visible anchor and marks trailing
frames 243-323 unavailable instead of inventing motion. Curved remains fully
bounded at frame 330 with high coverage. Irregular correctly leaves reflection and
disagreement ranges unresolved, including frames 112-222 and 235-277; the app does
not convert those gaps into movement. The earlier L4/L6 overlays were inspected:
the tracked shapes remain on the bright larva rather than the dish rim or
surrounding reflections.

## Limits

Head direction is inferred from sustained motion and can require correction.
Tight curls, occlusion, reflections, camera movement, and insufficient resolution
can prevent verification. Display feathering does not alter measurements. Zoom
cannot recover detail absent from the recording. Landmarks are head, body center,
and tail; there is no validated leg or gait detector. Manual anchors take
precedence, and exports preserve stationary samples and uncertainty status.

## Credit-limited checkpoint

The user requested limiting further credit use. Repeated full-video/browser
runs were stopped. All five recordings completed before the last local-radius
scan guard. The 17 tracking tests and 20 browser scenarios passed before that
last guard; the final packaged app smoke test passed after it. Final-source
L6 and irregular full reruns are NOT complete. Do not present those as verified.

Most recent completed coverage: straight 324/324 (100%), curved 329/331
(99.4%), irregular 296/446 (66.4%), L4 3121/3648 (85.6%). L6's completed
2707/3633 (74.5%) run still had an incorrect rim endpoint, prompting the last
scan guard; it is diagnostic evidence, not an approved result. These runs
automatically accepted proposals and measured consistency, not biological
accuracy. L4 excludes the unresolved tail after frame 3191. Final L6 endpoint
review and irregular gaps remain outstanding.
# 2026-10-03 local-model evaluation checkpoint

- The 27 Node tracking/display tests and TypeScript check pass. The browser suite reached 20/22; its two remaining assertions were checked again after updating old UI expectations and both passed, so all 22 browser scenarios passed across the final runs.
- A 125-frame exact-image H/C/T review set was generated across L4, L6, straight, curved, and irregular. The 100 training and 25 test points are proposals, **not reviewed labels**. SLEAP training and biological H/C/T accuracy claims remain pending explicit review.
- NanoTrackV2 was piloted on 36 windows in all five recordings (51 seconds, 140 MiB peak Python RSS, 1.78 MB trial weights). It drifted 0.779 body lengths against the existing unreviewed trace through irregular frames 235–259, so it was not promoted. Trial weights were removed.
- SAM 2 and Florence-2 were not installed or promoted; model selection is deferred by user request. The existing tracking, TAPIR hint verification, metrics, and export path remain authoritative.
- One Euro filtering affects only the displayed verified pathway and restarts at gaps/manual anchors. The exported trajectory chart and numerical output still use the original points. Browser and unit checks cover the screen path and jitter behavior.
- A synthetic dark frame at intensity 125 is withheld by the current reference contrast gate; this is recorded as uncertain rather than falsely accepted. No threshold was loosened for this evaluation.

# 2026-10-04 SLEAP feasibility checkpoint

- SLEAP-NN 0.3.3 imported and trained on CPU in an isolated `/tmp` trial with the existing PyTorch 2.2.2. Its current declared torchvision requirement has no compatible Intel-macOS wheel here; the probe used torchvision 0.17.2 without replacing the app helper. This is an experimental compatibility combination, not a packaged dependency.
- A 7.8M-parameter single-instance U-Net completed one epoch in 1.7 minutes with about 650 MiB observed Python RSS. A four-epoch run took 54 minutes including an unexplained long stall. Both produced 0/25 test detections at the 0.2 peak threshold on **unreviewed machine proposals**. The test cannot establish biological accuracy; no SLEAP model was promoted or bundled.
- Added a reviewed-label gate for SLEAP `.slp` creation, original-coordinate prediction conversion, and an H/T approval guard when head identity was unassigned. Four model-evaluation unit tests and the local review-page browser check passed. The 27 Node tracking tests passed. Production analysis and exports remain unchanged.

# 2026-10-04 control cleanup

- Removed the obsolete select-pointer control, duplicate Add anchors actions, hidden Start action, and legacy clear controls. The timeline Place anchor control remains the single placement entry point; Reset session and Undo/Redo remain the recovery actions.
- Pan clicks no longer select/reset the worm. Place anchor now exits calibration and landmark modes before placement, and clicking it again exits placement. Selecting a timeline anchor opens its contextual card without leaving a hidden pointer mode active.
- Inline JavaScript parsing, TypeScript checking, UI build, a static one-control-per-action inventory, and 27 tracking tests passed. A fresh visual/browser pass was unavailable in this session because the computer-use browser blocked the local `file:` page; this is not a claim that visual QA passed.

# 2026-11-04 optional area change

- Added a Results-only projected-area view. Teal denotes an earlier gain retained in the current aligned silhouette; amber denotes a gain since the preceding verified frame. Missing/uncertain outlines reset the comparison and break the graph.
- Area comparison uses the existing verified outlines. It keeps scalar graph samples and short-lived raster masks only while the optional view is open. The main tracker, timing, movement metrics, and export schema are unchanged.
- `npm test`: 29/29 deterministic tests passed, including translation invariance, retained/new gains, and area retraction. The focused browser scenario passed in Chromium and confirmed opt-in measurement, scrubbing, and reset. A full browser-suite or real-video biological accuracy rerun was not part of this isolated feature check.
