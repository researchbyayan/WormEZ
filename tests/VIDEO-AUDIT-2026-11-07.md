# Recording audit and startup repairs

The initial diagnostic opened all 21 supplied recordings and six synthetic samples.
`video-audit-all-single-worm-before-repair.json` contains that pass. It bypassed
multiworm discovery to isolate single-worm setup; it is not full tracking validation.
Twelve supplied recordings needed manual identification, and L4 had a seek timeout.
The normal startup checks also exposed a slow full-frame multiworm discovery pass.

Repairs made:

- Genuine multiworm discovery retains every frame because later identity checks depend on it. A sparse-discovery trial failed the coverage regression and was reverted.
- Nearby candidates within two body lengths with matching displacement count as one discovery
  hypothesis, reducing duplicate body/reflection hypotheses.
- Multiworm proposals require persistent paths and displacement relative to the median
  background motion. They remain suggestions requiring review.
- Endpoint discovery cannot place the final boundary before a later existing proposal. Failed endpoint discovery no longer turns the last interior detection into a false end boundary; manual endpoint placement is required.
- Exact seeks allow 15 seconds and one retry; an already decoded target may complete
  without a redundant seek event. Actual media errors still fail explicitly.
- Manual-recovery instructions name Place anchor, Save, and Start analysis rather than
  the obsolete Track control. The status no longer remains stuck on decoder preparation.

The isolated single-worm L4 repeat produced eight proposals in 18 seconds without a decoding error.
One repeat is not proof that the intermittent decoding issue is eliminated.
The curved retest before persistence filtering reached review in 18 seconds but
incorrectly listed 28 contour paths; that result motivated the additional filter.
`video-audit-latest.json` records the latest targeted normal-workflow retest; it is not an all-video final validation.

All 33 existing unit tests and three UI shell scenarios passed during this repair.
Full frame-by-frame animal identity, head labels, and complete analyses remain separate
validation work. Ambiguous automatic identification continues to require manual anchors.

The final L4 normal-startup repeat completed in 16 seconds with eight proposals, no multiworm list, and no recorded errors. Its end remains explicitly unconfirmed because the last visible boundary was not reliably detected.

Close co-moving candidates are treated as ambiguous hypotheses during discovery; this can require manual help for genuinely close worms. The full tracking proximity and verification thresholds were not relaxed.

Final curved normal-workflow retest: review reached in 88 seconds, no runtime errors, but three candidate identities remain. Automatic multiworm discovery is still unreliable on this recording; review of candidate identity is required. This is not a successful biological tracking validation. The final two-worm browser regression passed with complete 60-frame outputs and the existing coverage requirement.
