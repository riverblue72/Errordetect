"""Compare existing DINOv2 change alarms to a fixed grayscale-histogram control."""

from __future__ import annotations

import argparse
import io
import json
import time
import zipfile
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image

from core import IMAGE_SIZE
from drift import DriftDetector
from run_tsfabrics import SOURCE
from unlabeled_review import DEVELOPMENT, SOURCE_CONTINUATION, SPLICE_PRELUDE


BINS = 32
PREFIX = 1024


def image_names(archive: zipfile.ZipFile) -> dict[str, list[str]]:
    groups: dict[str, list[str]] = defaultdict(list)
    for name in archive.namelist():
        parts = name.replace("\\", "/").split("/")
        lowered = [part.lower() for part in parts]
        if "image" not in lowered or Path(name).suffix.lower() not in {".jpg", ".jpeg", ".png"}:
            continue
        pos = lowered.index("image")
        if pos + 2 == len(parts) - 1:
            groups[parts[pos + 1]].append(name)
    return {scenario: sorted(names) for scenario, names in groups.items()}


def histograms(archive: zipfile.ZipFile, names: list[str], scenario: str) -> np.ndarray:
    features = np.empty((len(names), BINS), dtype=np.float32)
    for i, name in enumerate(names):
        with Image.open(io.BytesIO(archive.read(name))) as photo:
            resized = photo.convert("RGB").resize(
                IMAGE_SIZE, getattr(Image, "Resampling", Image).BILINEAR)
            histogram = np.asarray(resized.convert("L").histogram(), dtype=np.float32)
        bins = histogram.reshape(BINS, 256 // BINS).sum(axis=1)
        features[i] = np.sqrt(bins / bins.sum())
        if i % 1000 == 0:
            print(f"histogram {scenario} {i + 1}/{len(names)}", flush=True)
    if not np.allclose(np.linalg.norm(features, axis=1), 1, atol=1e-5):
        raise ValueError(f"histogram embeddings are not unit length: {scenario}")
    return features


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--development", type=Path, required=True)
    parser.add_argument("--final", type=Path, required=True)
    parser.add_argument("--source-full", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    started = time.perf_counter()
    with zipfile.ZipFile(args.zip) as archive:
        groups = image_names(archive)
        previous = {
            "development": json.loads(args.development.read_text()),
            "final": json.loads(args.final.read_text()),
        }
        recorded = json.loads(args.source_full.read_text())
        if set(groups) != {SOURCE, *DEVELOPMENT, *previous["final"]["runs"]}:
            raise ValueError("scenario inventory changed")
        if len(groups[SOURCE]) != recorded["source_frames"]:
            raise ValueError("source frame count changed")
        source = histograms(archive, groups[SOURCE], SOURCE)
        detector = DriftDetector(source[:2048])
        ends, scores = detector.sequence_scores(source[SOURCE_CONTINUATION[0]:])
        above = scores > detector.threshold
        source_alarm = detector.first_alarm(source[SOURCE_CONTINUATION[0]:])
        source_result = {
            "frames": len(source),
            "test_frames": [SOURCE_CONTINUATION[0], len(source)],
            "window_count": len(ends),
            "windows_above_limit": int(above.sum()),
            "first_alert_frame": None if source_alarm is None else SOURCE_CONTINUATION[0] + source_alarm,
            "limit": detector.threshold,
            "max_score": float(scores.max()),
            "window_end_frames": (SOURCE_CONTINUATION[0] + ends).tolist(),
            "window_scores": scores.astype(float).tolist(),
        }
        prelude = source[slice(*SPLICE_PRELUDE)]
        result = {
            "protocol": {
                "source": SOURCE,
                "development": list(DEVELOPMENT),
                "final": previous["final"]["protocol"]["targets"],
                "representation": "32-bin sqrt grayscale histogram from 448x364 resized frames",
                "source_baseline": [0, 2048],
                "source_continuation_start": SOURCE_CONTINUATION[0],
                "source_prelude": list(SPLICE_PRELUDE),
                "target_prefix_max": PREFIX,
                "window": detector.window,
                "step": detector.step,
                "consecutive": 3,
                "label_use": "none for the histogram detector or its threshold",
            },
            "source_histogram": source_result,
            "source_dino": {
                "window_count": recorded["window_count"],
                "windows_above_limit": recorded["windows_above_limit"],
                "first_alert_frame": recorded["first_confirmed_alert_frame"],
            },
            "phases": {},
        }
        for phase in ("development", "final"):
            earlier = previous[phase]
            targets = list(DEVELOPMENT if phase == "development" else earlier["protocol"]["targets"])
            if set(targets) != set(earlier["runs"]):
                raise ValueError(f"saved {phase} run set changed")
            phase_runs = {}
            for scenario in targets:
                target_names = groups[scenario][:PREFIX]
                target = histograms(archive, target_names, scenario)
                joined = np.concatenate((prelude, target))
                alert = detector.first_alarm(joined)
                recorded_alarm = earlier["runs"][scenario]["operational_summary"]["change_alert"]
                phase_runs[scenario] = {
                    "target_frames": len(target),
                    "histogram_alert": alert,
                    "histogram_delay": None if alert is None or alert < len(prelude) else alert - len(prelude),
                    "dino_alert": recorded_alarm,
                    "dino_delay": earlier["runs"][scenario]["operational_summary"]["change_delay_from_boundary"],
                }
                print(phase, scenario, phase_runs[scenario], flush=True)
            result["phases"][phase] = phase_runs
    result["extraction_and_scoring_seconds"] = time.perf_counter() - started
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({phase: {
        "dino": sum(item["dino_alert"] is not None for item in runs.values()),
        "histogram": sum(item["histogram_alert"] is not None for item in runs.values()),
    } for phase, runs in result["phases"].items()}), flush=True)


if __name__ == "__main__":
    main()
