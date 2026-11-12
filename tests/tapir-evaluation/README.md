# TAPIR point-tracking trial — 2026-10-03

These were isolated point-tracker trials. The trial tracks are not biological
ground truth. TAPIR now runs automatically for eligible gaps when launched through
`Launch WormEZ.command`, as described
in `../../tapir-helper/README.md`; the trial JSON never enters app results.

## Reproducibility

- Model: Google DeepMind [TAPIR panning PyTorch checkpoint](https://huggingface.co/google/tapnet/blob/main/tapir_checkpoint_panning.pt), 124,348,474 bytes; SHA-256 `628611c656b3bd65d4a70fbf5526b62afe82d1b085ce6044685287fb78509daa` (verified after download).
- Source: [google-deepmind/tapnet](https://github.com/google-deepmind/tapnet), commit `730cda1c730877cfedbe01bf87fb1cadb78a565d`.
- Runtime: Intel macOS CPU, Python 3.11, PyTorch 2.2.2, NumPy 1.26.4, OpenCV 4.10.0.84; `TAPIR(pyramid_level=0, extra_convs=False)`, evaluation mode, four CPU threads.
- Each clip was cropped around a frame-0 point from an earlier WormEZ trace, resized to 256×256 RGB, and tracked as one query point. The L4/L6 crop was 256×256 source pixels; the other crops were 512×512 source pixels. No video frames were skipped within each reported window.
- The historical WormEZ traces are **not ground truth** and may be stale. Their center point also need not coincide with the same physical surface point tracked by TAPIR. The listed motion differences compare two methods, not biological accuracy.

`pilot.py` and `l6-seeds.py` preserve the test procedure. Set `TAPNET_SOURCE` to
the cloned official source and pass the downloaded checkpoint with
`--checkpoint` to `pilot.py`; `l6-seeds.py` also reads `TAPIR_CHECKPOINT`.

| Clip | Frames | Crop source pixels | TAPIR visible | Inference time | Median relative-motion difference from historical WormEZ center |
| --- | ---: | --- | ---: | ---: | ---: |
| Straight | 64 | (240, 60), 512² | 64/64 | 15.17 s | 2.74 px |
| Curved | 64 | (240, 208), 512² | 64/64 | 15.89 s | 12.75 px |
| Irregular | 120 | (280, 170), 512² | 117/120 | 31.12 s | 10.12 px |
| L4 | 120 | (512, 224), 256² | 120/120 | 31.15 s | 1.05 px |
| L6 | 120 | (512, 224), 256² | **0/120** | 31.79 s | unavailable |

The L6 first-frame query was (630, 352), from the old WormEZ trace. A second
48-frame run with seven nearby query points showed how sensitive this small
target is to placement: (630, 352) was visible 0/48, while (627, 350) and
(630, 349) were visible 48/48. A three-pixel seed shift changed the result
completely. TAPIR still predicted coordinates for invisible points; those must
not be treated as observed movement.

The blue marks in the images are TAPIR's visible point track, and the red ring is
the historical WormEZ body center. On straight, curved, and irregular samples,
the visible blue point remains on the bright larva in inspected frames. Their
offset is expected when the larva bends: a tracked surface point is not the
geometric body center. The L4/L6 target occupies only a few pixels at this crop
scale, so these images do not establish whether the model follows the true larva
versus a close reflection throughout the recordings.

## Decision

TAPIR is useful as a **localized disagreement check** for clear
clips. It is not an automatic verifier by itself. Its CPU cost is about
0.24–0.27 s per frame in these windows, L6 is seed-sensitive, and it does not
produce a body outline or center. The app's helper now uses several seeds to
propose search locations only; ordinary segmentation, physical limits,
forward/backward agreement, and matching anatomy still decide acceptance.
The next scientific validation is manually annotated larva centers and
visibility on L4/L6 reflections and irregular turns.

## LocoTrack-S comparison

The official [LocoTrack PyTorch implementation](https://github.com/cvlab-kaist/locotrack)
at commit `3385a233a270160b253a69050c6a3934527f7775` and its 33,001,026-byte
small checkpoint were tested locally. The checkpoint SHA-256 is
`da023594e6d6c05ecad9644efc1467545481cfa899e20730bd9fdce778ffa5ac`.
The source and weights are in `/tmp/wormez-locotrack-trial`, separate from the
application. `locotrack-pilot.py` preserves the comparison procedure.

| Clip/window | Frames | LocoTrack visible | Inference time | TAPIR visible on the same opening window |
| --- | ---: | ---: | ---: | ---: |
| Irregular opening | 48 | 27/48 | 14.56 s | 48/48 |
| L6 opening, query (627, 350) | 24 | 24/24 | 6.80 s | 48/48 in a prior TAPIR seed trial |
| L6 opening, query (630, 352) | 24 | 24/24 | 6.43 s | 0/48 in the prior TAPIR trial |

The last column reports each model's own visibility judgment, not correct
larva identity; the L6 target is too small and close to a reflection to infer
accuracy from these tracks. LocoTrack-S is smaller and quicker, but its irregular
visibility was weaker in this pilot. It is not integrated. Both models need
blinded, manually annotated frames before one can replace the other.

## Local helper protocol check

The local helper accepted an eight-frame synthetic request with three
queries and returned the expected 3×8 positions and visibility flags. A
24-frame irregular crop drawn from the current app's anchor geometry returned
24 visible positions for each of three seeds; all 24 frames passed the
multi-seed consensus and endpoint gate. The predicted endpoint was
(457.87, 342.12) versus the historical body center (470.37, 360.13), within
the half-body-length gate. A 24-frame L6 crop likewise returned 24/24 visible
for all three seeds and 24 consensus hints; its predicted endpoint was
(630.38, 351.85), versus (629.00, 349.80) in the old trace. Those traces are
not ground truth, so this checks protocol and gating, not biological
correctness. The server returned HTTP 200 for status and app HTML, and HTTP 404
for private helper files.

[Roboflow Trackers](https://github.com/roboflow/trackers) was also reviewed.
It associates detector-supplied boxes across frames; it does not detect a
missing larva or recover its center when WormEZ produces no detection. It was
therefore not installed into the recovery path.

## Automatic fallback in the browser

The localhost app now runs TAPIR after the original retry for every bounded
gap up to 120 frames including accepted endpoints. Its output guides a second
ordinary forward/backward pass. Any consistent positions still rejected by
that pass remain separate model-hint columns and a dashed visual suggestion;
they are not included in verified movement metrics.

On the 446-frame irregular recording, the original tracker accepted 424
automatic points and retained three gaps totaling 13 uncertain frames. With
TAPIR enabled, the same 424 points remained accepted and the same 13 frames
remained uncertain; model positions were available for all 13. This establishes
that the fallback runs and supplies review positions without changing original
acceptance, but it does **not** establish biological accuracy or a verified
recovery on that recording. The 60-frame occlusion fixture produced no model
positions for its nine truly absent frames.
