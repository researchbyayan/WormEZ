# CapCut interface study for WormEZ

Target: installed CapCut 9.5.0 at `/Applications/CapCut.app`.

## Evidence and limits

This is read-only static inspection of packaged files, plus the user's supplied editor screenshot. REA native observation timed out while compiling its helper; the findings below come from ordinary file inspection, not a successful REA runtime capture. No native decompiler was available. Embedded, readable QML was recovered from length-prefixed/zlib-compressed resource records in `Contents/Frameworks/libVECreator.dylib`. Only authored notes belong in WormEZ; CapCut source and assets remain outside the project.

The exposed `Contents/Resources/qml` tree mainly contains Qt framework controls. CapCut's application-specific player/timeline/crop components are embedded in its native library. Resource paths include `qrc:/Player/view/PlayerToolbar.qml`, `qrc:/Player/view/FullScreenToolBar.qml`, and `qrc:/TimeLine/main/MainTimelineDocker.qml`. Names alone do not prove behavior; the following observations also inspect recovered QML bodies. Specific recovered editor variants are not assumed to be the exact currently visible window.

## Useful observed patterns

| Pattern | Static evidence | WormEZ adaptation |
| --- | --- | --- |
| Separate player and editor controls | Player toolbar exposes pause/resume, seeking, fullscreen, and space-key behavior. Timeline code has a separate toolbar with a 32-unit height. | One compact playback row; a separate editing toolbar directly above the clip timeline. Keep analysis actions separate. |
| Seek is an explicit drag transaction | Player slider tracks pressed state, clamps progress to 0–1, and handles press, release and cancellation. | Distinguish live preview from committed seeking. Release outside the slider must not leave it stuck. |
| Thin visible handles, larger interactive target | A recovered timeline editor uses a 3-unit trim handle, a 6-unit edit zone and a drag threshold. | Thin trim edges with comfortably larger pointer/touch hit areas; adopt the principle rather than copying fixed dimensions. |
| Timeline zoom is independent of picture zoom | Timeline code exposes zoom ratio, visible range, pinch lifecycle, and separate wheel scroll/scale handling. | Separate timeline magnification from the existing video zoom. Normal scrolling must keep working. |
| Edge scrolling during dragging | Timeline code checks pointer distance to viewport edges while dragging. | Automatically scroll an enlarged timeline while dragging a trim handle or segment. |
| Explicit crop preview and commit | A recovered crop editor constrains the crop frame to preview bounds, dims the outside, uses minimum dimensions, and converts corners to normalized coordinates on Finish. It also exposes finish/cancel actions. | Crop in source coordinates, allow move/resize, show outside dimming only during crop, commit with Apply or discard with Cancel. |
| Contextual inspector | User screenshot separates video, speed and other context controls from the player/timeline. | One inspector changes between clip timing, crop geometry and analysis context. Avoid additional permanent panels. |

## Proposed layout

1. Dominant video workspace.
2. Player row: Play/Pause, previous/next frame, time, speed, fullscreen.
3. Editing toolbar: Trim, Split at playhead, Crop, local Undo/Redo, Save edited copy.
4. One clip track with ruler, distinct playhead, trim handles, optional sparse thumbnail strip and independent timeline zoom.
5. Anchor markers in their own labelled lane, distinct from split boundaries and playhead.
6. Analysis actions remain below the editing tools, with no duplicate playback controls.

## Safe editing behavior

- Original recordings, anchors and results remain unchanged.
- Editing creates a draft recipe. Cancel discards it; saving writes new clips rather than overwriting the source.
- Splits produce explicit source ranges; trimming uses exact source timing and clear endpoint conventions.
- Cropping does not stretch or rescale the retained pixels. Opening the derived clip starts a fresh analysis session; scale must be reviewed, and the original dish boundary may be outside the crop.
- Do not carry old anchors or scientific results onto a changed frame sequence or coordinate system silently.
- Preview seeking and sparse thumbnails are bounded and generated on demand. Do not decode the entire recording just to populate the editing timeline.

This document records investigation and design recommendations. Trim/split/crop are not implemented by this study.
