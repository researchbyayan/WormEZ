import json
import unittest
from pathlib import Path

from make_sleap_trial import approved_points


class ReviewedDatasetTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((Path(__file__).parent / "review-set/manifest.json").read_text())

    def test_incomplete_proposals_cannot_become_reviewed_training_data(self):
        with self.assertRaisesRegex(ValueError, "incomplete"):
            approved_points(self.manifest, {"labels": []})

    def test_approved_set_requires_every_valid_landmark(self):
        labels = [{"clip": f["clip"], "frame": f["frame"], "reviewed": True,
                   "points": f["proposal"]} for f in self.manifest["frames"]]
        self.assertEqual(len(approved_points(self.manifest, {"labels": labels})), 125)
        labels[0]["points"] = {**labels[0]["points"], "H": {"x": -1, "y": 0}}
        with self.assertRaisesRegex(ValueError, "Invalid H"):
            approved_points(self.manifest, {"labels": labels})


if __name__ == "__main__":
    unittest.main()
