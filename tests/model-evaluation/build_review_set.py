"""Create exact-frame, proposal-only H/C/T review images for five supplied clips."""
import json
from pathlib import Path

import cv2

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / "review-set"
CLIPS = [
    ("03-05-2026 da Gal4 x w1118 L4.MP4", "03-05-2026 da Gal4 x w1118 L4", "L4"),
    ("03-05-2026 da Gal4 x w1118 L6.MP4", "03-05-2026 da Gal4 x w1118 L6", "L6"),
    ("straight final.mp4", "straight final", "straight"),
    ("curved final.mp4", "curved final", "curved"),
    ("irregular.mp4", "irregular", "irregular"),
]


def proposal(point):
    anatomy = point["anatomy"]
    ends = anatomy.get("ends") or []
    head = anatomy.get("head")
    tail = anatomy.get("tail")
    if not head and len(ends) == 2:
        head = ends[0]
    if not tail and len(ends) == 2:
        tail = ends[1]
    center = anatomy.get("center") or {"x": point["x"], "y": point["y"]}
    return {"H": head, "C": center, "T": tail}


def select_frames(points):
    available = [p for p in points if p.get("anatomy") and p.get("status") in ("verified", "manual", "accepted")]
    if len(available) < 25:
        raise RuntimeError("Too few candidate frames for a 25-image review set")
    selected = []
    for index in range(25):
        target = round(index * (len(available) - 1) / 24)
        candidate = available[target]
        if candidate["frame"] not in {p["frame"] for p in selected}:
            selected.append(candidate)
    if len(selected) != 25:
        raise RuntimeError("Could not find 25 distinct frames")
    # Entire holdout windows are separated by more than one neighboring frame.
    return [(p, "test" if i in (2, 7, 12, 17, 22) else "train") for i, p in enumerate(selected)]


def main():
    OUT.mkdir(exist_ok=True)
    records = []
    for filename, stem, short in CLIPS:
        points = json.loads((ROOT / "tests" / f"trace-{stem}.json").read_text())
        capture = cv2.VideoCapture(str(ROOT.parent / filename))
        if not capture.isOpened():
            raise RuntimeError(f"Cannot read {filename}")
        fps = capture.get(cv2.CAP_PROP_FPS) or 30
        for point, split in select_frames(points):
            frame_no = point["frame"]
            capture.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
            ok, frame = capture.read()
            if not ok:
                raise RuntimeError(f"Cannot decode {filename} frame {frame_no}")
            name = f"{short}-{frame_no:05d}.jpg"
            cv2.imwrite(str(OUT / name), frame, [cv2.IMWRITE_JPEG_QUALITY, 92])
            records.append({"id": f"{short}:{frame_no}", "clip": filename, "frame": frame_no,
                            "seconds": round(frame_no / fps, 4), "split": split,
                            "image": f"review-set/{name}", "width": frame.shape[1], "height": frame.shape[0],
                            "proposal": proposal(point), "reviewed": False,
                            "headStatus": point["anatomy"].get("headStatus", "unassigned"),
                            "headNeedsReview": not bool(point["anatomy"].get("head"))})
        capture.release()
    manifest = {"schema": 1, "notes": "Proposals are unreviewed. Only explicit human approval creates a label.",
                "trainCount": 100, "testCount": 25, "frames": records}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
    (OUT / "manifest.js").write_text("window.WormReviewManifest = " + json.dumps(manifest) + ";\n")
    print(f"Wrote {len(records)} exact-frame images: {OUT}")


if __name__ == "__main__":
    main()
