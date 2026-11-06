"""Paired MMD limit audit at known joins, with a development-locked factor."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from core import DINOFeatures
from drift import DriftDetector
from run_tsfabrics import SOURCE, _load
from tsfabrics import TSFabricsArchive
from unlabeled_review import DEVELOPMENT, SOURCE_CAL, SOURCE_CONTINUATION, SPLICE_PRELUDE


FACTOR = .75
PREFIX = 1024
CONSECUTIVE = 3


def first_alarm(ends: np.ndarray, scores: np.ndarray, limit: float) -> int | None:
    streak = 0
    for end, score in zip(ends, scores):
        streak = streak + 1 if score > limit else 0
        if streak >= CONSECUTIVE:
            return int(end)
    return None


def longest_streak(scores: np.ndarray, limit: float) -> int:
    best = streak = 0
    for score in scores:
        streak = streak + 1 if score > limit else 0
        best = max(best, streak)
    return best


def target_features(archive: TSFabricsArchive, cache: Path, name: str,
                    extractor: DINOFeatures | None
                    ) -> tuple[np.ndarray, bool, DINOFeatures | None]:
    length = min(PREFIX, len(archive.scenarios[name]))
    try:
        _, globals_, _ = _load(cache, name, archive)
        return np.asarray(globals_[:length]), True, extractor
    except FileNotFoundError:
        if extractor is None:
            extractor = DINOFeatures()
        rows = archive.scenarios[name][:length]
        globals_ = np.empty((length, 384), dtype=np.float16)
        for offset in range(0, length, 8):
            images = [archive.read_image(row["image"]) for row in rows[offset:offset + 8]]
            _, encoded = extractor.encode(images)
            globals_[offset:offset + len(images)] = encoded
            if offset % 256 < 8:
                print(f"encoded {name} {offset + len(images)}/{length}", flush=True)
        return globals_, False, extractor


def summarize(runs: dict) -> dict:
    original = [row["original_delay"] for row in runs.values() if row["original_delay"] is not None]
    candidate = [row["candidate_delay"] for row in runs.values() if row["candidate_delay"] is not None]
    return {
        "runs": len(runs),
        "original_alerted": len(original),
        "candidate_alerted": len(candidate),
        "original_median_delay": float(np.median(original)) if original else None,
        "candidate_median_delay": float(np.median(candidate)) if candidate else None,
        "candidate_before_join": [name for name, row in runs.items()
                                  if row["candidate_alarm"] is not None and row["candidate_alarm"] <= len(range(*SPLICE_PRELUDE))],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--prior", type=Path, required=True)
    parser.add_argument("--source-full", type=Path, required=True)
    parser.add_argument("--phase", choices=("development", "final"), required=True)
    parser.add_argument("--development-result", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    if args.phase == "final":
        if args.development_result is None:
            parser.error("final phase requires --development-result")
        development = json.loads(args.development_result.read_text())
        if (development["protocol"]["factor"] != FACTOR or
            development["summary"]["runs"] != len(DEVELOPMENT) or
            development["summary"]["candidate_alerted"] != len(DEVELOPMENT) or
            development["summary"]["candidate_before_join"] or
            development["source_control"]["candidate_first_alert"] is not None):
            raise ValueError("the development gate was not met")
    archive = TSFabricsArchive(args.zip)
    prior = json.loads(args.prior.read_text())
    targets = list(DEVELOPMENT if args.phase == "development" else
                   sorted(set(archive.scenarios) - {SOURCE, *DEVELOPMENT}))
    if targets != prior["protocol"]["targets"]:
        raise ValueError("target order differs from saved comparison")
    full = json.loads(args.source_full.read_text())
    _, source, _ = _load(args.cache, SOURCE, archive)
    detector = DriftDetector(np.asarray(source[:SOURCE_CAL[1]]))
    if abs(detector.threshold - full["threshold"]) > 1e-5:
        raise ValueError("original MMD limit does not reproduce")
    candidate_limit = FACTOR * detector.threshold
    source_ends = np.asarray(full["window_end_frames"])
    source_scores = np.asarray(full["window_scores"])
    if len(source_ends) != len(source_scores) or full["test_frames"][0] != SOURCE_CONTINUATION[0]:
        raise ValueError("source continuation does not match protocol")
    source_alert = first_alarm(source_ends, source_scores, candidate_limit)
    source_control = {
        "original_limit": detector.threshold,
        "candidate_limit": candidate_limit,
        "windows": len(source_scores),
        "candidate_windows_over": int((source_scores > candidate_limit).sum()),
        "candidate_longest_streak": longest_streak(source_scores, candidate_limit),
        "candidate_first_alert": source_alert,
    }
    protocol = {
        "phase": args.phase, "source": SOURCE, "targets": targets,
        "source_baseline": [0, SOURCE_CAL[1]],
        "source_continuation": list(full["test_frames"]),
        "source_prelude": list(SPLICE_PRELUDE), "target_prefix_max": PREFIX,
        "window": detector.window, "step": detector.step,
        "consecutive": CONSECUTIVE, "factor": FACTOR,
        "join": "known synthetic boundary, not provided to detector",
        "label_use": "none",
    }
    output = {"protocol": protocol, "source_control": source_control, "runs": {}}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    if args.out.exists() and args.out.stat().st_size:
        previous = json.loads(args.out.read_text())
        if previous["protocol"] != protocol or previous["source_control"] != source_control:
            raise ValueError("existing checkpoint differs from fixed protocol")
        output = previous
    prelude = np.asarray(source[slice(*SPLICE_PRELUDE)])
    extractor = None
    for name in targets:
        if name in output["runs"]:
            print(f"skip saved {name}", flush=True)
            continue
        target, cached, extractor = target_features(archive, args.cache, name, extractor)
        joined = np.concatenate((prelude, target))
        ends, scores = detector.sequence_scores(joined)
        original = first_alarm(ends, scores, detector.threshold)
        recorded = prior["runs"][name]["operational_summary"]["change_alert"]
        if original != recorded:
            raise ValueError(f"{name}: original alarm {original} differs from saved {recorded}")
        candidate = first_alarm(ends, scores, candidate_limit)
        boundary = len(prelude)
        output["runs"][name] = {
            "target_frames": len(target), "cached": cached,
            "original_alarm": original, "candidate_alarm": candidate,
            "original_delay": original - boundary if original is not None and original > boundary else None,
            "candidate_delay": candidate - boundary if candidate is not None and candidate > boundary else None,
            "window_ends": ends.astype(int).tolist(),
            "window_scores": scores.astype(float).tolist(),
        }
        output["summary"] = summarize(output["runs"])
        temporary = args.out.with_suffix(args.out.suffix + ".tmp")
        temporary.write_text(json.dumps(output, separators=(",", ":"), allow_nan=False) + "\n")
        temporary.replace(args.out)
        print(name, "original", original, "candidate", candidate,
              "delay", output["runs"][name]["candidate_delay"], flush=True)
    print(json.dumps(output["summary"], indent=2), flush=True)


if __name__ == "__main__":
    main()
