# User-started local TAPIR gap recovery

Double-click `../Launch WormEZ.command` to open WormEZ with the local model
helper. Keep its Terminal window open while analyzing. This binds only to
`127.0.0.1:8765`; videos and model requests stay on this computer. Opening
`WormEZ.html` directly still runs the original tracker, but cannot run model
recovery because a browser page cannot start the local Python process.

After the normal two-pass analysis and its existing retry have finished, click **Recover Gaps**. Only then the helper considers
every **bounded** uncertain interval. Each must have accepted
points on both sides, at most 120 frames including those points, no user-marked
unavailable frames, a crop covering both endpoints, and at least two points on
the segmented body. Corrected anchors without an outline are re-detected at
their approved position to seed the model. TAPIR tracks those points in a 256×256 crop. The app rejects
invisible, inconsistent, or endpoint-incompatible tracks. A surviving track
only guides a new contour search. Segmentation, movement limits, independent
forward/backward checks, and matching body anatomy must still pass for a frame
to become verified. Otherwise a consistent model position is shown as a faint
dashed review suggestion and exported in separate model-hint columns; it remains
uncertain and contributes nothing to verified movement totals. Recovered points carry
`tapir-guided` origin in exports. Model inference can add tens of seconds when
difficult gaps occur.

This is an offline local Python helper rather than a browser-only model. The
checkpoint is 124,348,474 bytes and the copied Intel macOS Python environment
is about 982 MB. The helper is not part of the Electron build. It is
not an internet API, and the app does not upload recordings. The checkpoint
and source are pinned:

- [Google DeepMind TAPIR](https://github.com/google-deepmind/tapnet), commit
  `730cda1c730877cfedbe01bf87fb1cadb78a565d`, Apache 2.0;
- [panning checkpoint](https://huggingface.co/google/tapnet/blob/main/tapir_checkpoint_panning.pt),
  SHA-256 `628611c656b3bd65d4a70fbf5526b62afe82d1b085ce6044685287fb78509daa`;
- Python 3.11, PyTorch 2.2.2, NumPy 1.26.4, OpenCV 4.10.0.84, dm-tree,
  einshape, and einops 0.8.1 (einops is present for the separate LocoTrack trial).

The current runtime was built for this Intel Mac and uses the local Homebrew
Python 3.11 installation. On another machine it must be rebuilt; it cannot be
copied as a cross-platform binary. A model track remains a search hint until
WormEZ's original contour, motion, two-pass, and anatomy checks verify it.
In genuinely absent or still ambiguous frames, the gap remains unresolved.

For a local end-to-end check while the helper is running, use
`npm run test:tapir-browser`. It analyzes the synthetic occlusion fixture and
checks that missing-larva frames remain unverified. Use
`npm run test:tapir-browser -- ../irregular.mp4` to inspect another recording.
