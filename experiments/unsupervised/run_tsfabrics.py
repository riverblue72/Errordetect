"""Fixed, target-label-free TSFabrics change experiment."""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np

from core import (
    PatchScorer,
    build_reference_bank,
    mutual_image_scores,
    select_reference_indices,
)
from classic import ClassicScorer
from drift import DriftDetector
from metrics import summarize, top_region_hit
from tsfabrics import TSFabricsArchive, extract_classic_scenario, extract_scenario


SOURCE = "T1_S174_I111_1"
TARGETS = ("T1_S148_I108_2", "T1_S164_I36_1", "T1_S478_I118_2")
SOURCE_LIMIT = 4096
STARTUP = 512
CALIBRATION_END = 2048
SOURCE_TEST_START = 2112  # 64-frame gap after calibration
TARGET_ADAPT = 512
TARGET_CALIBRATION_END = 768
TARGET_EVAL_START = 832  # 64-frame gap after target calibration


def _load(cache: Path, scenario: str, archive: TSFabricsArchive) -> tuple[np.ndarray, np.ndarray, list[dict]]:
    prefix = cache / scenario
    metadata = json.loads(prefix.with_suffix(".json").read_text())
    tokens = np.load(prefix.with_suffix(".tokens.npy"), mmap_mode="r")
    globals_ = np.load(prefix.with_suffix(".global.npy"), mmap_mode="r")
    if len(metadata["rows"]) != len(tokens) or len(tokens) != len(globals_):
        raise ValueError(f"incomplete feature cache: {scenario}")
    current_rows = archive.scenarios[scenario][: len(tokens)]
    if [row["image"] for row in current_rows] != [row["image"] for row in metadata["rows"]]:
        raise ValueError(f"cached images differ from current archive: {scenario}")
    return tokens, globals_, current_rows


def _calibrate(scorer: PatchScorer, features: np.ndarray, start: int, end: int) -> float:
    scores, _ = scorer.score(features[start:end])
    return float(np.quantile(scores, 0.995))


def _evaluate(
    archive: TSFabricsArchive,
    rows: list[dict],
    scores: np.ndarray,
    maps: np.ndarray,
    threshold: float,
    start: int,
) -> dict:
    rows = rows[start:]
    scores = scores[start:]
    maps = maps[start:]
    excluded = int(sum(row["ambiguous"] for row in rows))
    eligible = np.asarray([not row["ambiguous"] for row in rows], dtype=bool)
    rows = [row for row, keep in zip(rows, eligible) if keep]
    scores = scores[eligible]
    maps = maps[eligible]
    labels = np.asarray([row["label"] for row in rows], dtype=np.int8)
    result = summarize(labels, scores, threshold)
    result["excluded_csv_mask_conflicts"] = excluded
    defect_indices = [i for i, row in enumerate(rows) if row["label"]]
    if defect_indices:
        masks = np.stack(
            [archive.read_mask(rows[i]["defect_mask"], maps.shape[1:]) for i in defect_indices]
        )
        result["defect_top_1pct_region_hit"] = top_region_hit(maps[defect_indices], masks)
    cutline = np.asarray([row["cutline_mask"] is not None and not row["label"] for row in rows])
    result["normal_cutline_count"] = int(cutline.sum())
    result["normal_cutline_alert_rate"] = (
        float(np.mean(scores[cutline] >= threshold)) if cutline.any() else float("nan")
    )
    return result


def experiment(
    archive: TSFabricsArchive,
    cache: Path,
    output: Path,
    source_name: str = SOURCE,
    target_names: tuple[str, ...] = TARGETS,
) -> None:
    source, source_global, source_rows = _load(cache, source_name, archive)
    if len(source) < SOURCE_LIMIT:
        raise ValueError("source extraction does not cover protocol")
    startup = np.asarray(source[:STARTUP])
    mutual = mutual_image_scores(startup)
    selected = select_reference_indices(mutual, np.asarray(source_global[:STARTUP]))
    selected_bank = build_reference_bank(startup, selected)
    all_bank = build_reference_bank(startup, np.arange(STARTUP), max_vectors=len(selected_bank))
    oracle_indices = np.asarray(
        [i for i, row in enumerate(source_rows[:STARTUP]) if not row["label"]], dtype=np.int32
    )
    oracle_bank = build_reference_bank(startup, oracle_indices, max_vectors=len(selected_bank))
    banks = {"mutual": selected_bank, "all_unlabeled": all_bank, "oracle_normal": oracle_bank}
    drift = DriftDetector(np.asarray(source_global[:CALIBRATION_END]))
    result: dict = {
        "protocol": {
            "source": source_name,
            "targets": list(target_names),
            "source_limit": SOURCE_LIMIT,
            "startup": STARTUP,
            "calibration": [STARTUP, CALIBRATION_END],
            "source_test": [SOURCE_TEST_START, SOURCE_LIMIT],
            "target_adapt": TARGET_ADAPT,
            "target_calibration_end": TARGET_CALIBRATION_END,
            "target_evaluation_start": TARGET_EVAL_START,
            "label_use": "Labels select oracle reference and compute evaluation only; operational banks and thresholds use none.",
        },
        "startup": {
            "frames": STARTUP,
            "actual_defects": int(sum(row["label"] for row in source_rows[:STARTUP])),
            "selected_frames": len(selected),
            "selected_actual_defects": int(sum(source_rows[i]["label"] for i in selected)),
            "reference_vectors": len(selected_bank),
        },
        "drift": {
            "window": drift.window,
            "step": drift.step,
            "threshold": drift.threshold,
            "source_heldout_first_alarm": drift.first_alarm(
                np.asarray(source_global[SOURCE_TEST_START:SOURCE_LIMIT])
            ),
        },
        "methods": {},
    }
    for name, bank in banks.items():
        scorer = PatchScorer(bank)
        threshold = _calibrate(scorer, source, STARTUP, CALIBRATION_END)
        source_scores, source_maps = scorer.score(source[SOURCE_TEST_START:SOURCE_LIMIT])
        method_result = {
            "threshold": threshold,
            "source_heldout": _evaluate(
                archive,
                source_rows[SOURCE_TEST_START:SOURCE_LIMIT],
                source_scores,
                source_maps,
                threshold,
                0,
            ),
            "targets": {},
        }
        for scenario in target_names:
            target, global_target, rows = _load(cache, scenario, archive)
            started = time.perf_counter()
            scores, maps = scorer.score(target)
            score_seconds = time.perf_counter() - started
            target_result = {
                "frozen": _evaluate(
                    archive, rows, scores, maps, threshold, TARGET_EVAL_START
                ),
                "scoring_seconds": score_seconds,
                "drift_first_alarm_frame": drift.first_alarm(np.asarray(global_target)),
            }
            if name == "mutual":
                target_bootstrap = np.asarray(target[:TARGET_ADAPT])
                target_mutual = mutual_image_scores(target_bootstrap)
                target_chosen = select_reference_indices(
                    target_mutual, np.asarray(global_target[:TARGET_ADAPT])
                )
                candidate_bank = build_reference_bank(target_bootstrap, target_chosen)
                candidate_scorer = PatchScorer(candidate_bank)
                candidate_threshold = _calibrate(
                    candidate_scorer, target, TARGET_ADAPT, TARGET_CALIBRATION_END
                )
                candidate_scores, candidate_maps = candidate_scorer.score(target)
                target_result["candidate_adaptation"] = _evaluate(
                    archive,
                    rows,
                    candidate_scores,
                    candidate_maps,
                    candidate_threshold,
                    TARGET_EVAL_START,
                )
                target_result["candidate_adaptation"]["threshold"] = candidate_threshold
                target_result["candidate_adaptation"]["selected_frames"] = len(target_chosen)
                target_result["candidate_adaptation"]["selected_actual_defects"] = int(
                    sum(rows[i]["label"] for i in target_chosen)
                )
            method_result["targets"][scenario] = target_result
            print(f"{name} {scenario}: {json.dumps(target_result, allow_nan=True)}", flush=True)
        result["methods"][name] = method_result

    classic_source = np.load(cache / f"{source_name}.classic.npy", mmap_mode="r")
    classic_scorer = ClassicScorer(classic_source[:STARTUP].reshape(STARTUP, -1, 8))
    classic_threshold = _calibrate(classic_scorer, classic_source, STARTUP, CALIBRATION_END)
    classic_scores, classic_maps = classic_scorer.score(
        classic_source[SOURCE_TEST_START:SOURCE_LIMIT]
    )
    classic_result = {
        "threshold": classic_threshold,
        "source_heldout": _evaluate(
            archive,
            source_rows[SOURCE_TEST_START:SOURCE_LIMIT],
            classic_scores,
            classic_maps,
            classic_threshold,
            0,
        ),
        "targets": {},
    }
    for scenario in target_names:
        target_classic = np.load(cache / f"{scenario}.classic.npy", mmap_mode="r")
        rows = archive.scenarios[scenario][: len(target_classic)]
        started = time.perf_counter()
        scores, maps = classic_scorer.score(target_classic)
        classic_result["targets"][scenario] = {
            "frozen": _evaluate(archive, rows, scores, maps, classic_threshold, TARGET_EVAL_START),
            "scoring_seconds": time.perf_counter() - started,
        }
    result["methods"]["classic_8_feature"] = classic_result
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, allow_nan=True))
    print(f"saved {output}", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["audit", "extract", "evaluate"])
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, default=Path("experiments/unsupervised/features"))
    parser.add_argument("--output", type=Path, default=Path("experiments/unsupervised/results/tsfabrics.json"))
    parser.add_argument("--source", default=SOURCE)
    parser.add_argument("--targets", nargs="+", default=list(TARGETS))
    args = parser.parse_args()
    archive = TSFabricsArchive(args.zip)
    audit = archive.audit()
    print(json.dumps(audit, indent=2))
    if args.command == "audit":
        return
    if args.command == "extract":
        extract_scenario(archive, args.source, args.cache, limit=SOURCE_LIMIT)
        extract_classic_scenario(archive, args.source, args.cache, limit=SOURCE_LIMIT)
        for scenario in args.targets:
            extract_scenario(archive, scenario, args.cache)
            extract_classic_scenario(archive, scenario, args.cache)
        return
    experiment(archive, args.cache, args.output, args.source, tuple(args.targets))


if __name__ == "__main__":
    main()
