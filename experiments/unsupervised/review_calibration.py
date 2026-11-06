"""Replay normal-only threshold calibration after a run-scoped PCA update.

Public labels stand in for human decisions on prespecified review cases only.
The threshold never reads unreviewed labels or any future evaluation labels.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np

from condition_reference import (CALIBRATION_LENGTH, EVALUATION_GAP, POOL_LENGTH,
                                 SubspaceScorer, encode_in_memory, query_indices, score_slice)
from core import PatchScorer, build_reference_bank, mutual_image_scores, select_reference_indices
from drift import DriftDetector
from metrics import summarize
from run_tsfabrics import CALIBRATION_END, SOURCE, STARTUP, _load
from tsfabrics import TSFabricsArchive


BUDGETS = (32, 64, 128)
PRIMARY_BUDGET = 64
SUPPLEMENTAL_REVIEW_BUDGET = 24
SUPPLEMENTAL_GAP = 8
SOURCE_ALERT_COOLDOWN = 32
DEVELOPMENT = ("T1_S164_I36_1", "T1_S478_I118_2", "T1_S148_I108_1", "T1_S478_I118_1")


def systematic_reviews(start: int, budget: int) -> np.ndarray:
    if CALIBRATION_LENGTH % budget:
        raise ValueError("budget must divide calibration length")
    stride = CALIBRATION_LENGTH // budget
    phase = int(np.random.default_rng(42).integers(stride))
    return start + phase + np.arange(budget) * stride


def summarize_stream(rows: list[dict], scores: np.ndarray, threshold: float,
                     start: int) -> dict:
    eligible = np.asarray([not row["ambiguous"] for row in rows[start:]], dtype=bool)
    labels = np.asarray([row["label"] for row in rows[start:]], dtype=bool)[eligible]
    result = summarize(labels, scores[eligible], threshold)
    result["excluded_ambiguous"] = int((~eligible).sum())
    frame_numbers = np.arange(start, start + len(scores))[eligible]
    defect_indices = np.flatnonzero(labels)
    if len(defect_indices):
        episode_ids = np.cumsum(np.r_[True, np.diff(frame_numbers[defect_indices]) > SUPPLEMENTAL_GAP])
        result["defect_episodes"] = int(episode_ids[-1])
        result["detected_episodes"] = int(len(set(episode_ids[scores[eligible][defect_indices] >= threshold])))
    else:
        result["defect_episodes"] = 0
        result["detected_episodes"] = 0
    result["episode_recall"] = (result["detected_episodes"] / result["defect_episodes"]
                                if result["defect_episodes"] else float("nan"))
    return {key: (None if isinstance(value, float) and not math.isfinite(value) else value)
            for key, value in result.items()}


def supplemental_queue(rows: list[dict], start: int, frozen_scores: np.ndarray,
                       source_threshold: float, candidates: dict[str, np.ndarray]) -> dict:
    """Rank source-unflagged frames after the interval, without using labels."""
    source_alerts = np.flatnonzero(frozen_scores >= source_threshold)
    eligible = np.ones(len(frozen_scores), dtype=bool)
    for i in source_alerts:
        eligible[max(0, i - SOURCE_ALERT_COOLDOWN):min(len(eligible), i + SOURCE_ALERT_COOLDOWN + 1)] = False
    available = np.flatnonzero(eligible)
    frames = np.arange(start, start + len(frozen_scores))
    # Episode IDs are audit-only. They never influence the review queue.
    episode_ids = np.full(len(frozen_scores), -1, dtype=np.int32)
    positive = [i for i, row in enumerate(rows[start:]) if row["label"] and not row["ambiguous"]]
    episode = -1
    last_positive = -10_000
    for i in positive:
        if i - last_positive > SUPPLEMENTAL_GAP:
            episode += 1
        episode_ids[i] = episode
        last_positive = i
    caught_episodes = set(episode_ids[source_alerts]) - {-1}
    def choose(order: np.ndarray) -> list[int]:
        selected: list[int] = []
        for raw in order:
            i = int(raw)
            if all(abs(frames[i] - frames[j]) >= SUPPLEMENTAL_GAP for j in selected):
                selected.append(i)
                if len(selected) == SUPPLEMENTAL_REVIEW_BUDGET:
                    break
        return selected
    selections = {key: choose(available[np.argsort(-scores[available])])
                  for key, scores in candidates.items()}
    random_selections = [choose(np.random.default_rng(seed).permutation(available))
                         for seed in range(100)]
    count = min(len(selected) for selected in list(selections.values()) + random_selections)
    def audit(selected: list[int]) -> dict:
        selected = selected[:count]
        chosen_rows = [rows[start + i] for i in selected]
        found_episodes = set(episode_ids[selected]) - {-1}
        return {"frames": [int(frames[i]) + 1 for i in selected],
                "defects": int(sum(row["label"] and not row["ambiguous"] for row in chosen_rows)),
                "new_defect_episodes": len(found_episodes - caught_episodes),
                "ambiguous": int(sum(row["ambiguous"] for row in chosen_rows))}
    random_yield = [audit(selected)["defects"] for selected in random_selections]
    return {"budget": count, "eligible_after_cooldown": len(available),
            "source_alert_cooldown": SOURCE_ALERT_COOLDOWN,
            "total_defect_episodes_for_audit_only": episode + 1,
            "episodes_caught_by_source_for_audit_only": len(caught_episodes),
            "eligible_defects_for_audit_only": int(sum(rows[start + i]["label"] and
                                                     not rows[start + i]["ambiguous"] for i in available)),
            "ranked": {key: audit(selected) for key, selected in selections.items()},
            "random_100": {"mean_defects": float(np.mean(random_yield)),
                           "min_defects": min(random_yield), "max_defects": max(random_yield)}}


def run_one(archive: TSFabricsArchive, cache: Path, name: str, frozen: PatchScorer,
            source_threshold: float, drift: DriftDetector,
            *, max_frames: int, later_start: int | None = None) -> dict:
    try:
        tokens, globals_, rows = _load(cache, name, archive)
        tokens, globals_, rows = tokens[:max_frames], globals_[:max_frames], rows[:max_frames]
        print(f"loaded cache {name}: {len(rows)}", flush=True)
    except FileNotFoundError:
        tokens, globals_, rows = encode_in_memory(archive, name, limit=max_frames)
    alarm = drift.first_alarm(globals_)
    if alarm is None:
        return {"status": "no_change_alert", "frames": len(rows)}
    pool = (alarm, alarm + POOL_LENGTH)
    cal = (pool[1], pool[1] + CALIBRATION_LENGTH)
    evaluation_start = max(cal[1] + EVALUATION_GAP, later_start or 0)
    if len(rows) <= evaluation_start:
        return {"status": "too_short", "alert_frame": alarm, "frames": len(rows)}

    frozen_pool = np.full(pool[1], np.nan, dtype=np.float32)
    frozen_pool[pool[0]:] = score_slice(frozen, tokens, *pool)
    query = query_indices(frozen_pool, globals_, "balanced", pool)
    reviewed_normal = np.asarray([i for i in query if not rows[i]["label"] and not rows[i]["ambiguous"]], dtype=np.int32)
    if len(reviewed_normal) < 2:
        return {"status": "insufficient_reference_reviews", "alert_frame": alarm}
    candidate = SubspaceScorer(tokens, reviewed_normal)
    unfiltered = SubspaceScorer(tokens, query)
    frozen_cal = score_slice(frozen, tokens, *cal)
    candidate_cal = score_slice(candidate, tokens, *cal)
    frozen_eval = score_slice(frozen, tokens, evaluation_start, len(rows))
    candidate_eval = score_slice(candidate, tokens, evaluation_start, len(rows))
    unfiltered_eval = score_slice(unfiltered, tokens, evaluation_start, len(rows))
    candidate_summary = summarize_stream(rows, candidate_eval, 0.0, evaluation_start)
    unfiltered_summary = summarize_stream(rows, unfiltered_eval, 0.0, evaluation_start)
    result = {
        "status": "evaluated",
        "frames": len(rows), "alert_frame": alarm,
        "review_pool": list(pool), "calibration": list(cal), "evaluation_start": evaluation_start,
        "reviewed_reference_normal": len(reviewed_normal),
        "reviewed_reference_defect": int(sum(rows[i]["label"] for i in query)),
        "calibration_defects_for_audit_only": int(sum(row["label"] for row in rows[cal[0]:cal[1]])),
        "frozen_active": summarize_stream(rows, frozen_eval, source_threshold, evaluation_start),
        "candidate_ranking": {"auroc": candidate_summary["auroc"],
                              "average_precision": candidate_summary["average_precision"]},
        "unfiltered_ranking": {"auroc": unfiltered_summary["auroc"],
                               "average_precision": unfiltered_summary["average_precision"]},
        "supplemental_review": supplemental_queue(
            rows, evaluation_start, frozen_eval, source_threshold,
            {"frozen_continuation": frozen_eval, "reviewed_pca": candidate_eval,
             "unfiltered_pca": unfiltered_eval}),
        "budgets": {},
    }
    result["evaluation_scores_for_audit_only"] = [
        {"frame": i + 1, "label": int(row["label"]), "ambiguous": bool(row["ambiguous"]),
         "frozen": round(float(frozen_eval[i - evaluation_start]), 6),
         "reviewed_pca": round(float(candidate_eval[i - evaluation_start]), 6),
         "unfiltered_pca": round(float(unfiltered_eval[i - evaluation_start]), 6)}
        for i, row in enumerate(rows) if i >= evaluation_start]
    for budget in BUDGETS:
        review = systematic_reviews(cal[0], budget)
        normal = np.asarray([i for i in review if not rows[i]["label"] and not rows[i]["ambiguous"]], dtype=np.int32)
        defect = np.asarray([i for i in review if rows[i]["label"] and not rows[i]["ambiguous"]], dtype=np.int32)
        uncertain = np.asarray([i for i in review if rows[i]["ambiguous"]], dtype=np.int32)
        item = {"review_frames": (review + 1).tolist(), "normal_count": len(normal),
                "defect_count": len(defect), "uncertain_count": len(uncertain)}
        if len(normal) < 16:
            item["status"] = "insufficient_confirmed_normals"
        else:
            # The score model is already fixed. These disjoint reviews only
            # calibrate thresholds; a score from a fitting image is never used.
            positions = normal - cal[0]
            candidate_threshold = float(np.nextafter(candidate_cal[positions].max(), np.inf))
            frozen_threshold = float(np.nextafter(frozen_cal[positions].max(), np.inf))
            defect_detection = int((candidate_cal[defect - cal[0]] >= candidate_threshold).sum())
            item["candidate_threshold"] = candidate_threshold
            item["frozen_review_threshold"] = frozen_threshold
            item["reviewed_defects_detected"] = defect_detection
            item["status"] = ("blocked_missed_reviewed_defect" if defect_detection < len(defect)
                              else "no_reviewed_defect_evidence" if len(defect) == 0
                              else "shadow_candidate_passed_review")
            item["candidate"] = summarize_stream(rows, candidate_eval, candidate_threshold, evaluation_start)
            item["frozen_same_reviews"] = summarize_stream(rows, frozen_eval, frozen_threshold, evaluation_start)
            item["safety_or"] = summarize_stream(
                rows, np.maximum(frozen_eval / source_threshold,
                                 candidate_eval / candidate_threshold), 1.0, evaluation_start)
        result["budgets"][str(budget)] = item
    print(name, json.dumps({"alert": alarm, "evaluation": result["frozen_active"]["count"],
                            "normal": result["frozen_active"]["tn"] + result["frozen_active"]["fp"],
                            "defect": result["frozen_active"]["anomalies"],
                            "extra_review": {k: v["defects"] for k, v in
                                             result["supplemental_review"]["ranked"].items()},
                            "new_episodes": {k: v["new_defect_episodes"] for k, v in
                                             result["supplemental_review"]["ranked"].items()},
                            "budgets": {k: {"status": v["status"], "normal": v["normal_count"],
                                            "defect": v["defect_count"],
                                            "candidate_tp": v.get("candidate", {}).get("tp"),
                                            "candidate_fp": v.get("candidate", {}).get("fp")}
                                        for k, v in result["budgets"].items()}}, allow_nan=False), flush=True)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--targets", nargs="+", default=DEVELOPMENT)
    parser.add_argument("--max-frames", type=int, default=4096)
    parser.add_argument("--later-start", type=int)
    args = parser.parse_args()
    archive = TSFabricsArchive(args.zip)
    source, source_global, _ = _load(args.cache, SOURCE, archive)
    startup = np.asarray(source[:STARTUP])
    selected = select_reference_indices(mutual_image_scores(startup), np.asarray(source_global[:STARTUP]))
    source_bank = build_reference_bank(startup, selected)
    frozen = PatchScorer(source_bank)
    source_threshold = float(np.quantile(score_slice(frozen, source, STARTUP, CALIBRATION_END), .995))
    drift = DriftDetector(np.asarray(source_global[:CALIBRATION_END]))
    output = {"protocol": {"source": SOURCE, "review_reference_budget": 24,
                           "calibration_length": CALIBRATION_LENGTH, "calibration_review_budgets": BUDGETS,
                           "primary_calibration_review_budget": PRIMARY_BUDGET,
                           "supplemental_review_budget": SUPPLEMENTAL_REVIEW_BUDGET,
                           "source_alert_cooldown": SOURCE_ALERT_COOLDOWN,
                           "calibration_review_selection": "systematic phase-42 sample, score blind",
                           "threshold": "max candidate score of disjoint reviewed normals",
                           "candidate": "PCA residual on balanced reviewed normal references",
                           "max_frames": args.max_frames, "later_start": args.later_start,
                           "label_use": "only prespecified review decisions and retrospective evaluation",
                           "promotion": "none; all decision results are retrospective shadow comparisons"},
              "runs": {}}
    for name in args.targets:
        output["runs"][name] = run_one(archive, args.cache, name, frozen, source_threshold, drift,
                                       max_frames=args.max_frames, later_start=args.later_start)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, separators=(",", ":"), allow_nan=False) + "\n")


if __name__ == "__main__":
    main()
