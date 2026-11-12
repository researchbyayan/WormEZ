import unittest

from score_models import score


class ScoreModelsTest(unittest.TestCase):
    def setUp(self):
        self.truth = {"labels": [{"clip": "clip.mp4", "frame": 10, "split": "test", "reviewed": True,
                                   "points": {"H": {"x": 0, "y": 0}, "C": {"x": 5, "y": 0},
                                              "T": {"x": 10, "y": 0}}}]}

    def test_scores_held_out_errors_and_false_selections(self):
        result = score(self.truth, {"model": "pilot", "frames": [{"clip": "clip.mp4", "frame": 10,
                         "points": {"H": {"x": 0, "y": 0}, "C": {"x": 12, "y": 0},
                                    "T": {"x": 10, "y": 0}}, "verifiedRecovery": False}]})
        self.assertEqual(result["medianErrorBodyLengths"]["C"], .7)
        self.assertEqual(result["centerFalseSelectionsOverHalfBody"], 1)
        self.assertEqual(result["verifiedRecoveryFrames"], 0)

    def test_rejects_unreviewed_proposals(self):
        self.truth["labels"][0]["reviewed"] = False
        with self.assertRaises(ValueError):
            score(self.truth, {"frames": []})


if __name__ == "__main__":
    unittest.main()
