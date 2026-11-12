"""Build a *machine-proposal* SLEAP resource trial, never a reviewed accuracy set.

The crop is generated internally from proposed H/C/T coordinates. This is a
localization-conditioned pose trial only; no box is shown to a WormEZ user.
"""
import argparse
import json
import math
from pathlib import Path

import cv2
import numpy as np


def approved_points(manifest, reviewed):
    """Require a complete, separate human-reviewed train/test set."""
    if reviewed is None:
        return None
    expected = {(item["clip"], item["frame"]): item for item in manifest["frames"]}
    labels = reviewed.get("labels", [])
    accepted = {}
    for label in labels:
        key = (label.get("clip"), label.get("frame"))
        if key not in expected or key in accepted or label.get("reviewed") is not True:
            raise ValueError("Review file contains an unknown, duplicate, or unapproved frame")
        points = label.get("points", {})
        frame = expected[key]
        for name in "HCT":
            point = points.get(name, {})
            if not all(isinstance(point.get(axis), (int, float)) and
                       math.isfinite(point[axis]) and
                       0 <= point[axis] < frame["width" if axis == "x" else "height"]
                       for axis in ("x", "y")):
                raise ValueError(f"Invalid {name} point in {frame['id']}")
        accepted[key] = points
    if set(accepted) != set(expected):
        raise ValueError(f"Reviewed set is incomplete: {len(accepted)} of {len(expected)} frames")
    return accepted


def build(manifest, root, output, reviewed=None):
    import sleap_io as sio

    accepted = approved_points(manifest, reviewed)
    status = "REVIEWED" if accepted is not None else "UNREVIEWED"
    output.mkdir(parents=True, exist_ok=True)
    skeleton = sio.Skeleton(name="larva-hct")
    for name in ("head", "center", "tail"):
        skeleton.add_node(name)
    skeleton.add_edge("head", "center")
    skeleton.add_edge("center", "tail")
    for split in ("train", "test"):
        frames = [item for item in manifest["frames"] if item["split"] == split]
        paths, instances, transforms = [], [], []
        for item in frames:
            image = cv2.imread(str(root / item["image"]), cv2.IMREAD_COLOR)
            if image is None:
                raise ValueError(f"Cannot load {item['image']}")
            proposal = accepted[(item["clip"], item["frame"])] if accepted is not None else item["proposal"]
            h, c, t = [proposal[key] for key in "HCT"]
            length = math.dist((h["x"], h["y"]), (t["x"], t["y"]))
            side = max(48, 3.2 * length)
            scale = 256 / side
            tx, ty = 128 - scale*c["x"], 128 - scale*c["y"]
            matrix = np.float32([[scale, 0, tx], [0, scale, ty]])
            crop = cv2.warpAffine(image, matrix, (256, 256), flags=cv2.INTER_LINEAR,
                                  borderMode=cv2.BORDER_CONSTANT, borderValue=(40, 40, 40))
            path = output / f"{split}-{item['id'].replace(':','-')}.png"
            if not cv2.imwrite(str(path), crop):
                raise RuntimeError(f"Could not write {path}")
            paths.append(str(path))
            points = np.array([[scale*p["x"]+tx, scale*p["y"]+ty] for p in (h,c,t)], dtype=np.float64)
            instances.append(points)
            transforms.append({"id":item["id"],"clip":item["clip"],"frame":item["frame"],
                               "split":split,"scale":scale,"tx":tx,"ty":ty,
                               "headStatus":item.get("headStatus"),
                               "provenance":"human reviewed" if accepted is not None else
                               "machine proposal, visually unapproved"})
        video = sio.Video(filename=paths)
        labeled = [sio.LabeledFrame(video=video, frame_idx=index,
                                   instances=[sio.Instance.from_numpy(points, skeleton)])
                   for index, points in enumerate(instances)]
        labels = sio.Labels(labeled_frames=labeled, videos=[video], skeletons=[skeleton],
                            provenance={"source":"WormEZ reviewed labels" if accepted is not None else
                                        "WormEZ machine proposals",
                                        "warning":"Not human-reviewed; do not report as biological accuracy"
                                        if accepted is None else "Held-out split must remain separate"})
        path = output / f"hct-{split}-{status}.slp"
        labels.save(str(path), verbose=False)
        (output / f"{split}-transforms.json").write_text(json.dumps(transforms, indent=2))
        print(path, len(labeled))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=Path(__file__).parent / "review-set/manifest.json")
    parser.add_argument("--output", type=Path, default=Path("/tmp/wormez-sleap-trial"))
    parser.add_argument("--reviewed", type=Path,
                        help="Exported wormez-reviewed-hct.json; requires all 125 frames approved")
    args = parser.parse_args()
    reviewed = json.loads(args.reviewed.read_text()) if args.reviewed else None
    build(json.loads(args.manifest.read_text()), args.manifest.parent.parent, args.output, reviewed)


if __name__ == "__main__":
    main()
