"""Export the recorded source/target change scores for the site figure."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from drift import DriftDetector


ROOT = Path(__file__).resolve().parent
FEATURES = ROOT / "features"
SOURCE = "T1_S174_I111_1"
TARGET = "T1_S164_I36_1"


def global_features(scenario: str) -> np.ndarray:
    return np.load(FEATURES / f"{scenario}.global.npy", mmap_mode="r")


def main() -> None:
    source = global_features(SOURCE)
    target = global_features(TARGET)
    detector = DriftDetector(np.asarray(source[:2048]))
    heldout = np.asarray(source[2112:4096])
    source_ends, source_scores = detector.sequence_scores(heldout)
    target_ends, target_scores = detector.sequence_scores(np.asarray(target[:608]))
    assert detector.first_alarm(heldout) is None
    assert detector.first_alarm(np.asarray(target)) == 192
    payload = {
        "source": SOURCE,
        "source_holdout_start": 2112,
        "target": TARGET,
        "window": detector.window,
        "step": detector.step,
        "consecutive": 3,
        "limit": detector.threshold,
        "source_holdout": {"ends": source_ends.tolist(), "scores": source_scores.tolist(), "first_alarm": None},
        "target_start": {"ends": target_ends.tolist(), "scores": target_scores.tolist(), "first_alarm": 192},
    }
    output = ROOT / "change_figure_export.json"
    output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps({"limit": payload["limit"],
                      "source_max": float(source_scores.max()),
                      "target_start": target_scores.tolist(),
                      "source_windows": len(source_scores)}, indent=2))


if __name__ == "__main__":
    main()
