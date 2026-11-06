"""Audit the existing MMD detector on the full continuation of its source run."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from core import DINOFeatures
from drift import DriftDetector
from run_tsfabrics import SOURCE
from tsfabrics import TSFabricsArchive
from unlabeled_review import SOURCE_CAL, SOURCE_CONTINUATION


def longest_true_streak(values: np.ndarray) -> int:
    longest = current = 0
    for value in values:
        current = current + 1 if value else 0
        longest = max(longest, current)
    return longest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    archive = TSFabricsArchive(args.zip)
    rows = archive.scenarios[SOURCE]
    cached = np.load(args.cache / f"{SOURCE}.global.npy", mmap_mode="r")
    if len(cached) != SOURCE_CONTINUATION[1] or cached.shape[1] != 384:
        raise ValueError("expected the published 4,096-frame source cache")
    features = np.empty((len(rows), cached.shape[1]), dtype=np.float16)
    features[: len(cached)] = cached
    extractor = DINOFeatures()
    for start in range(len(cached), len(rows), 8):
        photos = [archive.read_image(row["image"]) for row in rows[start:start + 8]]
        _, global_batch = extractor.encode(photos)
        features[start:start + len(photos)] = global_batch
        if (start - len(cached)) % 800 < 8:
            print(f"encoded source {start + len(photos)}/{len(rows)}", flush=True)

    detector = DriftDetector(np.asarray(features[:SOURCE_CAL[1]]))
    prior_suffix = np.asarray(features[slice(*SOURCE_CONTINUATION)])
    if detector.first_alarm(prior_suffix) is not None:
        raise ValueError("the published 1,984-frame negative control did not reproduce")
    suffix_start = SOURCE_CONTINUATION[0]
    suffix = np.asarray(features[suffix_start:])
    ends, scores = detector.sequence_scores(suffix)
    confirmed = detector.first_alarm(suffix)
    above = scores > detector.threshold
    result = {
        "source": SOURCE,
        "source_frames": len(rows),
        "calibration_frames": list(SOURCE_CAL),
        "test_frames": [suffix_start, len(rows)],
        "prior_test_frames": list(SOURCE_CONTINUATION),
        "prior_alert": None,
        "window": detector.window,
        "step": detector.step,
        "consecutive_required": 3,
        "threshold": detector.threshold,
        "window_count": len(ends),
        "windows_above_limit": int(above.sum()),
        "fraction_above_limit": float(above.mean()),
        "longest_above_limit_streak": longest_true_streak(above),
        "first_confirmed_alert_frame": None if confirmed is None else suffix_start + confirmed,
        "window_end_frames": (suffix_start + ends).tolist(),
        "window_scores": scores.astype(float).tolist(),
        "interpretation": "same recorded scenario; no annotated within-scenario process-change times",
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({key: result[key] for key in (
        "source_frames", "window_count", "windows_above_limit",
        "longest_above_limit_streak", "first_confirmed_alert_frame",
    )}), flush=True)


if __name__ == "__main__":
    main()
