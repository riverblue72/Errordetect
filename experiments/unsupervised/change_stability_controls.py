"""Frozen change-limit comparison on two recordings without defect labels."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import numpy as np

from change_limit_trial import FACTOR, first_alarm, longest_streak
from core import DINOFeatures, IMAGE_SIZE
from drift import DriftDetector
from tsfabrics import TSFabricsArchive


RUNS = ("T1_S177_I108_1", "T2_S466_I39_1")
PREFIX = 4096
CAL_END = 2048
TEST_START = 2112
CACHE_SCHEMA = "dinov2_vits14/normalized-patch-mean/imagenet-bilinear/fp16/v1"


def global_features(archive: TSFabricsArchive, name: str, cache: Path,
                    extractor: DINOFeatures | None
                    ) -> tuple[np.ndarray, DINOFeatures | None]:
    rows = archive.scenarios[name][:PREFIX]
    if len(rows) != PREFIX:
        raise ValueError(f"{name}: expected {PREFIX} frames, found {len(rows)}")
    cache.mkdir(parents=True, exist_ok=True)
    array_file = cache / f"{name}.global.npy"
    partial_file = cache / f"{name}.partial.npy"
    metadata_file = cache / f"{name}.json"
    progress_file = cache / f"{name}.progress"
    image_names = [row["image"] for row in rows]
    image_info = [archive.zip.getinfo(image) for image in image_names]
    expected_metadata = {
        "archive": archive.path.name,
        "feature_schema": CACHE_SCHEMA,
        "image_size": list(IMAGE_SIZE),
        "images": [[image, info.CRC, info.file_size]
                   for image, info in zip(image_names, image_info)],
    }
    if metadata_file.exists():
        metadata = json.loads(metadata_file.read_text())
        if metadata != expected_metadata:
            raise ValueError(f"{name}: global-feature cache does not match the archive")
    elif array_file.exists() or partial_file.exists() or progress_file.exists():
        raise ValueError(f"{name}: cache data exists without metadata")
    else:
        metadata_temp = metadata_file.with_suffix(".json.tmp")
        metadata_temp.write_text(json.dumps(expected_metadata, separators=(",", ":")))
        os.replace(metadata_temp, metadata_file)
    if array_file.exists() and not progress_file.exists() and not partial_file.exists():
        array = np.load(array_file, mmap_mode="r")
        if array.shape != (PREFIX, 384) or array.dtype != np.float16:
            raise ValueError(f"{name}: invalid completed global-feature cache")
        return array, extractor
    if partial_file.exists() and progress_file.exists():
        array = np.lib.format.open_memmap(partial_file, mode="r+")
        start = int(progress_file.read_text())
        if array.shape != (PREFIX, 384) or array.dtype != np.float16 or not 0 <= start <= PREFIX or start % 8:
            raise ValueError(f"{name}: invalid partial global-feature cache")
    elif not array_file.exists() and not partial_file.exists() and not progress_file.exists():
        array = np.lib.format.open_memmap(partial_file, mode="w+", dtype="float16", shape=(PREFIX, 384))
        start = 0
        progress_file.write_text("0")
    else:
        raise ValueError(f"{name}: incomplete global-feature cache state")
    if extractor is None:
        extractor = DINOFeatures()
    for offset in range(start, PREFIX, 8):
        images = [archive.read_image(row["image"]) for row in rows[offset:offset + 8]]
        _, encoded = extractor.encode(images)
        array[offset:offset + len(images)] = encoded
        array.flush()
        progress_temp = progress_file.with_suffix(".progress.tmp")
        progress_temp.write_text(str(offset + len(images)))
        os.replace(progress_temp, progress_file)
        if offset % 256 == 0:
            print(f"{name}: encoded {offset + len(images)}/{PREFIX}", flush=True)
    del array
    os.replace(partial_file, array_file)
    progress_file.unlink()
    return np.load(array_file, mmap_mode="r"), extractor


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    archive = TSFabricsArchive(args.zip)
    output = {
        "protocol": {"runs": list(RUNS), "calibration": [0, CAL_END],
                     "continuation": [TEST_START, PREFIX], "factor": FACTOR,
                     "window": 128, "step": 32, "consecutive": 3,
                     "reference": "independently calibrated from each recording; diagnostic reset",
                     "label_use": "audit-only control selection and outcome interpretation"},
        "runs": {},
    }
    extractor = None
    for name in RUNS:
        control_rows = archive.scenarios[name][:PREFIX]
        if len(control_rows) != PREFIX or any(row["label"] for row in control_rows):
            raise ValueError(f"{name}: expected {PREFIX} non-defect control frames")
        features, extractor = global_features(archive, name, args.cache, extractor)
        detector = DriftDetector(np.asarray(features[:CAL_END]))
        ends, scores = detector.sequence_scores(np.asarray(features[TEST_START:PREFIX]))
        absolute_ends = ends + TEST_START
        original = detector.threshold
        trial = FACTOR * original
        rows = archive.scenarios[name][TEST_START:PREFIX]
        output["runs"][name] = {
            "frames": len(rows), "defect_labels": sum(int(row["label"]) for row in rows),
            "ambiguous_labels": sum(int(row["ambiguous"]) for row in rows),
            "original_limit": original, "trial_limit": trial,
            "window_end_frames": absolute_ends.astype(int).tolist(),
            "window_scores": scores.astype(float).tolist(),
            "original_windows_over": int((scores > original).sum()),
            "trial_windows_over": int((scores > trial).sum()),
            "original_longest_streak": longest_streak(scores, original),
            "trial_longest_streak": longest_streak(scores, trial),
            "original_first_alert": first_alarm(absolute_ends, scores, original),
            "trial_first_alert": first_alarm(absolute_ends, scores, trial),
        }
        args.out.parent.mkdir(parents=True, exist_ok=True)
        temporary = args.out.with_suffix(args.out.suffix + ".tmp")
        temporary.write_text(json.dumps(output, separators=(",", ":"), allow_nan=False) + "\n")
        temporary.replace(args.out)
        print(name, "original", output["runs"][name]["original_first_alert"],
              "trial", output["runs"][name]["trial_first_alert"], flush=True)


if __name__ == "__main__":
    main()
