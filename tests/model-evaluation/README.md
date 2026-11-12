# Local model evaluation (deferred promotion)

The production tracker and TAPIR helper remain the only active inference path. No SLEAP, NanoTrack, SAM 2, or Florence model is enabled or bundled. The user asked to choose one effective addition later, rather than keep multiple runtime models.

## Review data

`build_review_set.py` extracted 125 exact frames from the five supplied clips: 20 training and five separated test images per clip. `review.html` shows the current tracker's proposed H/C/T landmarks on full-frame images. A proposal is **not a label**. The reviewer must correct/approve all three points, or skip an uncertain frame. Approval is stored locally in the browser and exported as `wormez-reviewed-hct.json`. The page draws points, never a model search box. Open the HTML page locally; it makes no network requests.

`export_coco.py` accepts only 100 approved training and 25 approved test frames and writes separate COCO keypoint sets for later SLEAP training and evaluation. `score_models.py` rejects unreviewed data and reports held-out H/C/T error normalized by H–T span, missing predictions, large center errors, and verified recovery counts. Error versus the existing machine trace is diagnostic only and must not be reported as biological accuracy.

`make_sleap_trial.py --reviewed wormez-reviewed-hct.json --output /tmp/wormez-sleap-reviewed` makes cropped SLEAP training and held-out test `.slp` files after **all 125 frames** have been explicitly approved. Without `--reviewed`, it makes clearly named `UNREVIEWED` files for a resource probe only. The crop box is generated internally from H/C/T and is never shown to the WormEZ user. `sleap_to_predictions.py` maps SLEAP predictions back to original video coordinates so `score_models.py` can compare them with the held-out reviewed frames. SLEAP suggestions are never marked as verified recovery by this converter.

## SLEAP feasibility probe

SLEAP-NN 0.3.3 was tested outside the app in `/tmp`, using the existing Python 3.11/PyTorch 2.2.2 CPU environment. Current `sleap-nn[torch,export]` dependency resolution fails on this Intel Mac because its `torchvision>=0.20` requirement has no compatible wheel here. An isolated probe imported with `torchvision==0.17.2`, the existing PyTorch, and pinned ANTLR 4.9.3. No production helper package was replaced. This compatibility workaround is **not yet a supported runtime combination**.

A single-instance U-Net (7.8 million parameters) completed one epoch on 90 machine-proposed training crops and ten validation crops in 1.7 minutes; observed Python RSS was approximately 650 MiB. Its checkpoint was 89 MiB. One epoch produced no detected instances on the 25 unreviewed test crops at the default 0.2 peak threshold. This demonstrates CPU training and inference can run, **not** that SLEAP is accurate or inaccurate on larvae. No SLEAP weights are bundled or used by WormEZ. The temporary model must not be used as an analysis result.

A four-epoch probe on the same unreviewed set also produced **0/25 detected instances** at the same threshold. It took 54 minutes in this environment, including a large stall during the third epoch; the 25-frame CPU inference took 15 seconds end to end. The extra run did not make SLEAP eligible for promotion. It is not a fair accuracy benchmark: the proposed points contain H/T uncertainty and reflections, and the separated test images have not been independently reviewed. The current production tracker remains authoritative.

## NanoTrack pilot

`nanotrack_pilot.py` uses an **internal** box derived from a trusted contour. It evaluated five windows per recording plus up to three difficult gap windows per recording on the supplied clips. Its OpenCV V2 weights were downloaded to `/tmp` for the pilot and are not part of the app. This model gives a search location only; it cannot identify head or tail, and no point is accepted without WormEZ's contour, motion, and two-pass checks. The pilot report is in `nanotrack-pilot-results.json`.

The 36-window pilot took 51 seconds in total with 140 MiB peak Python RSS and 1.78 MB of weights. It behaved well in several L4/L6 gaps versus the existing trace, but drifted by **0.779 body lengths** in the irregular 235–259 gap. Because the reference trace is itself unreviewed, this is a warning rather than a biological error rate. NanoTrack is **not promoted**.

The source weights came from [SiamTrackers](https://github.com/HonglinChu/SiamTrackers/tree/master/NanoTrack/models/nanotrackv2). That repository does not state a license at its root, so these particular weights must **not** be redistributed with WormEZ without resolving their rights. The related [NanoTrack deployment repository](https://github.com/HonglinChu/NanoTrack) declares Apache 2.0, but that does not by itself license the V2 files in SiamTrackers.

## Later decision gate

After H/C/T review, compare the current method, SLEAP, and at most one gap-localization candidate on the *same held-out frames and difficult windows*. Only a candidate that improves verified recovery without new reflection selections and stays under 5.5 GB peak combined memory and 500 MB new runtime assets may replace or augment the current path. Run models sequentially on this 8 GB Intel Mac. Keep rejected trial assets outside the app and remove them. ByteTrack is excluded because it links supplied detections rather than finding a missing larva. SAM 2 tiny and Florence-2-base-ft are deferred and not installed; the former requires a newer PyTorch than this helper currently uses, and the latter alone has a 463 MB weight file.

The display-only One Euro filter in `lib/one-euro.js` is already active. It resets at gaps and manual anchors and preserves sharp turns; raw points, measurements, H/C/T, metrics, and exports are unchanged.
