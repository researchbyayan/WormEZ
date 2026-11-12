# Proposed specialist: larva-mask segmentation

Candidate: U-Net with a MobileNetV2 encoder, compact decoder, one foreground class. Reference implementation: https://github.com/qubvel-org/segmentation_models.pytorch . No model has been installed or trained for this proposal.

Purpose: estimate the visible larval body mask inside an automatically selected source-frame crop. The mask supports boundary placement, projected area and medial centerline. It does not infer head identity by itself and must not fill invisible body regions by guessing.

Initial dataset: approximately 150–300 manually reviewed masks from the supplied recordings, including small/large larvae, straight/bent/contracted bodies, reflections, scratches, blur, near-edge bodies and empty distractor crops. This is a starting budget, not a guaranteed sufficient sample count. Automatic outlines are annotation proposals, not ground truth. Split by recording or separated bouts before sampling; reserve complete held-out recordings when enough independent recordings exist. Adjacent frames in train and test would overstate generalization. Five recordings alone provide limited evidence.

Use automatic crops with context and source transforms. Start at 256×256 crop inputs and test resolution needs, retaining full source coordinates for measurements. Train with mask and boundary-sensitive losses; compare against the existing OpenCV masks using IoU, boundary distance, projected-area error, center error and reflection false selections. Include explicit failed/absent detections.

Runtime remains offline. Benchmark an exported CPU model on this Intel Mac before adoption; quantization is a separate accuracy test. Proposed deployment limits: runtime assets below 25 MB if achievable without accuracy loss; one crop at a time, no full-video raster cache. Limits are targets, not measured performance claims.

OpenCV remains first. A specialist may propose a replacement mask only when local segmentation is poor, subject to existing position, size, temporal and independent-pass checks. It must beat the baseline on held-out masks and reflection errors without loosening gates. Its mask never becomes a verified observation solely because the network is confident. Head/tail identity still needs temporal evidence or an approved endpoint.

No training can truthfully begin without reviewed ground-truth masks. Mask annotation is the next step after the current tracker repair, not another general conversational model.
