"""Convert fully reviewed WormEZ H/C/T labels to separate COCO keypoint sets."""
import argparse
import json
import math
from pathlib import Path


def export(labels, manifest):
    images = {item["id"]: item for item in manifest["frames"]}
    approved = {(item["clip"], item["frame"]): item for item in labels["labels"]
                if item.get("reviewed") is True}
    if len(approved) != len(labels["labels"]):
        raise ValueError("The input contains unreviewed or duplicate labels")
    result = {}
    for split, required in (("train", 100), ("test", 25)):
        relevant = [item for item in images.values() if item["split"] == split]
        reviewed = [item for item in relevant if (item["clip"], item["frame"]) in approved]
        if len(reviewed) < required:
            raise ValueError(f"{split} requires {required} reviewed frames; found {len(reviewed)}")
        coco = {"info": {"description": f"WormEZ reviewed H/C/T {split} set"},
                "images": [], "annotations": [],
                "categories": [{"id": 1, "name": "larva", "supercategory": "animal",
                                "keypoints": ["head", "center", "tail"],
                                "skeleton": [[1, 2], [2, 3]]}]}
        for image_id, item in enumerate(reviewed, 1):
            label = approved[(item["clip"], item["frame"])]
            pts = [label["points"][k] for k in "HCT"]
            if any(not all(math.isfinite(p[k]) for k in ("x", "y")) or
                   not (0 <= p["x"] < item["width"] and 0 <= p["y"] < item["height"]) for p in pts):
                raise ValueError(f"Out-of-frame landmark in {item['id']}")
            xs, ys = [p["x"] for p in pts], [p["y"] for p in pts]
            x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
            coco["images"].append({"id": image_id, "file_name": item["image"],
                                   "width": item["width"], "height": item["height"]})
            coco["annotations"].append({"id": image_id, "image_id": image_id, "category_id": 1,
                                        "keypoints": [value for p in pts for value in (p["x"], p["y"], 2)],
                                        "num_keypoints": 3, "bbox": [x0, y0, x1-x0, y1-y0],
                                        "area": max(1, (x1-x0)*(y1-y0)), "iscrowd": 0})
        result[split] = coco
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("reviewed", type=Path)
    parser.add_argument("--manifest", type=Path, default=Path(__file__).parent / "review-set/manifest.json")
    parser.add_argument("--output", type=Path, default=Path(__file__).parent / "review-set")
    args = parser.parse_args()
    result = export(json.loads(args.reviewed.read_text()), json.loads(args.manifest.read_text()))
    for split, coco in result.items():
        path = args.output / f"hct-{split}.coco.json"
        path.write_text(json.dumps(coco, indent=2))
        print(path)


if __name__ == "__main__":
    main()
