"""Causal interval review and a shadow PCA-reference update.

Select boundary, model-disagreement, and audit cases from one completed
interval; reveal their dataset labels as recorded operator decisions; refit a
run-local PCA reference only from confirmed false alerts; test on later frames.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from condition_reference import (CALIBRATION_LENGTH, EVALUATION_GAP, POOL_LENGTH,
                                 SubspaceScorer, encode_in_memory, query_indices, score_slice)
from core import PatchScorer, build_reference_bank, mutual_image_scores, select_reference_indices
from drift import DriftDetector
from review_calibration import summarize_stream, systematic_reviews
from run_tsfabrics import CALIBRATION_END, SOURCE, STARTUP, _load
from tsfabrics import TSFabricsArchive


SUMMARY_BUDGET = 24
SUMMARY_SPACING = 8
CALIBRATION_REVIEWS = 64
SUMMARY_TEST_GAP = 64


def select_summary_cases(frozen: np.ndarray, candidate: np.ndarray,
                         frozen_threshold: float, candidate_threshold: float,
                         start: int) -> list[dict]:
    """Select 24 cases without labels, preserving three distinct review roles."""
    selected: list[tuple[int, str]] = []

    def add(order: np.ndarray, count: int, role: str) -> None:
        for raw in order:
            i = int(raw)
            if all(abs(i - earlier) >= SUMMARY_SPACING for earlier, _ in selected):
                selected.append((i, role))
                count -= 1
                if count == 0:
                    break

    below = np.flatnonzero(frozen < frozen_threshold)
    above = np.flatnonzero(frozen >= frozen_threshold)
    add(below[np.argsort(frozen_threshold - frozen[below])], 2, "boundary_source")
    add(above[np.argsort(frozen[above] - frozen_threshold)], 2, "boundary_source")
    below_candidate = np.flatnonzero(candidate < candidate_threshold)
    above_candidate = np.flatnonzero(candidate >= candidate_threshold)
    add(below_candidate[np.argsort(candidate_threshold - candidate[below_candidate])], 2,
        "boundary_candidate")
    add(above_candidate[np.argsort(candidate[above_candidate] - candidate_threshold)], 2,
        "boundary_candidate")
    source_flag = frozen >= frozen_threshold
    candidate_flag = candidate >= candidate_threshold
    candidate_only = np.flatnonzero(candidate_flag & ~source_flag)
    source_only = np.flatnonzero(source_flag & ~candidate_flag)
    add(candidate_only[np.argsort(-candidate[candidate_only])], 4, "disagreement")
    add(source_only[np.argsort(-frozen[source_only])], 4, "disagreement")
    if len(selected) < 16:
        differing = np.flatnonzero(source_flag != candidate_flag)
        strength = np.maximum(frozen[differing] / frozen_threshold,
                              candidate[differing] / candidate_threshold)
        add(differing[np.argsort(-strength)], 16 - len(selected), "disagreement")
    add(np.random.default_rng(42).permutation(len(frozen)), SUMMARY_BUDGET - len(selected), "audit")
    if len(selected) != SUMMARY_BUDGET:
        raise ValueError("not enough temporally distinct interval review cases")
    return [{"index": i + start, "role": role} for i, role in selected]


def experiment(archive: TSFabricsArchive, cache: Path, name: str, limit: int,
               summary_end: int, test_start: int, test_end: int) -> dict:
    source, source_global, _ = _load(cache, SOURCE, archive)
    startup = np.asarray(source[:STARTUP])
    selected = select_reference_indices(mutual_image_scores(startup), np.asarray(source_global[:STARTUP]))
    frozen = PatchScorer(build_reference_bank(startup, selected))
    source_threshold = float(np.quantile(score_slice(frozen, source, STARTUP, CALIBRATION_END), .995))
    drift = DriftDetector(np.asarray(source_global[:CALIBRATION_END]))
    try:
        tokens, globals_, rows = _load(cache, name, archive)
        tokens, globals_, rows = tokens[:limit], globals_[:limit], rows[:limit]
    except FileNotFoundError:
        tokens, globals_, rows = encode_in_memory(archive, name, limit=limit)
    if not (test_end <= len(rows) and summary_end + SUMMARY_TEST_GAP <= test_start):
        raise ValueError("test must follow the summary by at least 64 frames")
    alarm = drift.first_alarm(globals_)
    if alarm is None:
        raise ValueError("no confirmed visual change")
    pool = (alarm, alarm + POOL_LENGTH)
    cal = (pool[1], pool[1] + CALIBRATION_LENGTH)
    summary_start = cal[1] + EVALUATION_GAP
    if summary_start >= summary_end:
        raise ValueError("summary interval begins before candidate calibration ends")
    source_pool = np.full(pool[1], np.nan, dtype=np.float32)
    source_pool[pool[0]:] = score_slice(frozen, tokens, *pool)
    query = query_indices(source_pool, globals_, "balanced", pool)
    initial_normals = np.asarray([i for i in query if not rows[i]["label"] and not rows[i]["ambiguous"]], dtype=np.int32)
    if len(initial_normals) < 2:
        raise ValueError("too few reviewed normals to fit candidate")
    original = SubspaceScorer(tokens, initial_normals)
    cal_review = systematic_reviews(cal[0], CALIBRATION_REVIEWS)
    cal_normals = np.asarray([i for i in cal_review if not rows[i]["label"] and not rows[i]["ambiguous"]], dtype=np.int32)
    if len(cal_normals) < 16:
        raise ValueError("too few confirmed normals to calibrate candidate")
    original_cal = score_slice(original, tokens, *cal)
    original_threshold = float(np.nextafter(original_cal[cal_normals - cal[0]].max(), np.inf))
    summary_source = score_slice(frozen, tokens, summary_start, summary_end)
    summary_candidate = score_slice(original, tokens, summary_start, summary_end)
    cases = select_summary_cases(summary_source, summary_candidate,
                                 source_threshold, original_threshold, summary_start)
    reviewed_normals = np.asarray([case["index"] for case in cases
                                   if not rows[case["index"]]["label"] and not rows[case["index"]]["ambiguous"]],
                                  dtype=np.int32)
    # Only a confirmed normal that the current candidate actually flagged can
    # correct the reference. Ordinary random-audit normals provide no evidence
    # that the representation needs changing.
    hard_normals = np.asarray([i for i in reviewed_normals
                               if summary_candidate[i - summary_start] >= original_threshold], dtype=np.int32)
    if len(hard_normals):
        updated = SubspaceScorer(tokens, np.concatenate((initial_normals, hard_normals)))
        updated_cal = score_slice(updated, tokens, *cal)
        recalibrated_threshold = float(np.nextafter(updated_cal[cal_normals - cal[0]].max(), np.inf))
        updated_threshold = max(original_threshold, recalibrated_threshold)
    else:
        updated = original
        recalibrated_threshold = original_threshold
        updated_threshold = original_threshold
    original_test = score_slice(original, tokens, test_start, test_end)
    updated_test = score_slice(updated, tokens, test_start, test_end)
    frozen_test = score_slice(frozen, tokens, test_start, test_end)
    reviewed_defects = [case["index"] for case in cases if rows[case["index"]]["label"] and
                        not rows[case["index"]]["ambiguous"]]
    old_review = sum(summary_candidate[i - summary_start] >= original_threshold for i in reviewed_defects)
    new_review_scores = score_slice(updated, tokens, summary_start, summary_end)
    new_review = sum(new_review_scores[i - summary_start] >= updated_threshold for i in reviewed_defects)
    review_guard = bool(new_review == len(reviewed_defects)) if reviewed_defects else None
    update_status = ("blocked_reviewed_defect" if review_guard is False else
                     "shadow_refit" if len(hard_normals) else "no_reference_change")
    result = {
        "protocol": {"source": SOURCE, "target": name, "alert": alarm,
                     "initial_review_pool": list(pool), "normal_only_calibration": list(cal),
                     "calibration_review_budget": CALIBRATION_REVIEWS,
                     "summary_interval": [summary_start, summary_end],
                     "summary_role_targets": {"boundary_source": 4,
                                              "boundary_candidate": 4,
                                              "disagreement": 8, "audit": 8},
                     "summary_temporal_spacing": SUMMARY_SPACING,
                     "summary_test_gap": SUMMARY_TEST_GAP,
                     "test_interval": [test_start, test_end],
                     "status": "shadow update only; no automatic promotion"},
        "initial_reference_normals": len(initial_normals),
        "summary_review": [{"frame": case["index"] + 1, "role": case["role"],
                            "source_score": round(float(summary_source[case["index"] - summary_start]), 6),
                            "candidate_score": round(float(summary_candidate[case["index"] - summary_start]), 6),
                            "candidate_flagged": bool(summary_candidate[case["index"] - summary_start] >= original_threshold),
                            "decision": "uncertain" if rows[case["index"]]["ambiguous"] else
                            "defect" if rows[case["index"]]["label"] else "normal"} for case in cases],
        "summary_verified_normal": len(reviewed_normals),
        "summary_verified_defect": len(reviewed_defects),
        "hard_normals_used_for_update": len(hard_normals),
        "update_status": update_status,
        "summary_role_counts": {role: sum(case["role"] == role for case in cases)
                                for role in ("boundary_source", "boundary_candidate",
                                             "disagreement", "audit")},
        "reviewed_defects_detected": {"before": int(old_review), "after": int(new_review)},
        "reviewed_defect_guard": review_guard,
        "thresholds": {"source": source_threshold, "before": original_threshold,
                       "after_recalibrated": recalibrated_threshold,
                       "after_conservative": updated_threshold},
        "test": {"frozen_active": summarize_stream(rows[:test_end], frozen_test, source_threshold, test_start),
                 "candidate_before": summarize_stream(rows[:test_end], original_test, original_threshold, test_start),
                 "candidate_after_recalibrated": summarize_stream(rows[:test_end], updated_test, recalibrated_threshold, test_start),
                 "candidate_after_conservative": summarize_stream(rows[:test_end], updated_test, updated_threshold, test_start)},
    }
    print(json.dumps({"summary_normal": len(reviewed_normals), "summary_defect": len(reviewed_defects),
                      "hard_normals": len(hard_normals),
                      "test": {key: {k: value[k] for k in ("tp", "fp", "defect_episodes", "detected_episodes")}
                               for key, value in result["test"].items()}}, allow_nan=False), flush=True)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--target", default="T1_S555_I117_1")
    parser.add_argument("--limit", type=int, required=True)
    parser.add_argument("--summary-end", type=int, default=4096)
    parser.add_argument("--test-start", type=int, required=True)
    parser.add_argument("--test-end", type=int, required=True)
    args = parser.parse_args()
    output = experiment(TSFabricsArchive(args.zip), args.cache, args.target,
                        args.limit, args.summary_end, args.test_start, args.test_end)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, separators=(",", ":"), allow_nan=False) + "\n")


if __name__ == "__main__":
    main()
