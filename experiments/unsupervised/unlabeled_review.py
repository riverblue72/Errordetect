"""Run-disjoint, label-free TSFabrics ranking and limited-review benchmark.

Operational functions consume frozen features and image scores only. The
published labels enter audit_run after every reference and review queue is
fixed. The local reference is never promoted into the frozen source detector.
"""

from __future__ import annotations

import argparse
import json
import math
import time
from pathlib import Path

import numpy as np

from classic import ClassicScorer, feature_map
from condition_reference import SubspaceScorer, encode_in_memory, score_slice
from core import PatchScorer, build_reference_bank, mutual_image_scores
from drift import DriftDetector
from metrics import average_precision, roc_auc
from run_tsfabrics import SOURCE, _load
from tsfabrics import TSFabricsArchive


DEVELOPMENT = (
    "T1_S164_I36_1", "T1_S148_I108_2", "T1_S478_I118_1",
    "T1_S555_I117_1", "T2_S262_I52_1",
)
STARTUP = 256
GAP = 64
MAX_FRAMES = 4096
REFERENCE_FRAMES = 32
REVIEW_BUDGET = 8
REVIEW_SPACING = 16
EPISODE_GAP = 8
RANDOM_REPEATS = 100
SOURCE_CAL = (512, 2048)
SOURCE_CONTINUATION = (2112, 4096)
SPLICE_PRELUDE = (2112, 3136)


def selected_reference(tokens: np.ndarray, globals_: np.ndarray) -> np.ndarray:
    """Choose 32 low-novelty startup frames across appearance quartiles."""
    novelty = mutual_image_scores(tokens)
    global32 = np.asarray(globals_, dtype=np.float32)
    centered = global32 - global32.mean(0)
    _, _, vh = np.linalg.svd(centered, full_matrices=False)
    coordinate = centered @ vh[0]
    bins = np.digitize(coordinate, np.quantile(coordinate, [.25, .5, .75]))
    selected: list[int] = []
    for group in range(4):
        members = np.flatnonzero(bins == group)
        selected.extend(members[np.argsort(novelty[members])[:REFERENCE_FRAMES // 4]].tolist())
    if len(selected) < REFERENCE_FRAMES:
        remaining = np.setdiff1d(np.arange(len(tokens)), selected)
        selected.extend(remaining[np.argsort(novelty[remaining])[:REFERENCE_FRAMES - len(selected)]].tolist())
    return np.sort(np.asarray(selected, dtype=np.int32))


def percentile_rank(scores: np.ndarray) -> np.ndarray:
    order = np.argsort(scores, kind="stable")
    ranks = np.empty(len(scores), dtype=np.float32)
    ranks[order] = np.arange(len(scores), dtype=np.float32) / max(1, len(scores) - 1)
    return ranks


def spaced(order: np.ndarray, count: int, initial: list[int] | None = None) -> list[int]:
    selected = [] if initial is None else list(initial)
    for raw in order:
        index = int(raw)
        if index in selected:
            continue
        if all(abs(index - previous) >= REVIEW_SPACING for previous in selected):
            selected.append(index)
            if len(selected) >= count:
                break
    return selected[:count]


def review_queues(scores: np.ndarray) -> dict[str, list[int]]:
    """Return positions within a completed interval; no labels are read."""
    top = np.argsort(-scores, kind="stable")
    random = np.random.default_rng(42).permutation(len(scores))
    high = spaced(top, min(6, REVIEW_BUDGET))
    return {
        "top8": [int(i) for i in top[:REVIEW_BUDGET]],
        "spaced8": spaced(top, REVIEW_BUDGET),
        "high6_random2": spaced(random, REVIEW_BUDGET, high),
        "random8": spaced(random, REVIEW_BUDGET),
    }


def episode_ids(rows: list[dict]) -> tuple[np.ndarray, set[int]]:
    """Full-run episode IDs prevent startup-spanning events earning credit."""
    ids = np.full(len(rows), -1, dtype=np.int32)
    positives = [i for i, row in enumerate(rows)
                 if row["label"] and not row["ambiguous"]]
    first: dict[int, int] = {}
    event = -1
    previous = -EPISODE_GAP - 1
    for i in positives:
        if i - previous > EPISODE_GAP:
            event += 1
            first[event] = i
        ids[i] = event
        previous = i
    eligible = {event for event, start in first.items() if start >= STARTUP + GAP}
    return ids, eligible


def audit_queue(queue: list[int], rows: list[dict], ids: np.ndarray,
                eligible_episodes: set[int], evaluation_start: int) -> dict:
    frames = [evaluation_start + i for i in queue]
    return {
        "frames": [i + 1 for i in frames],
        "review_count": len(frames),
        "defect_reviews": sum(bool(rows[i]["label"] and not rows[i]["ambiguous"]) for i in frames),
        "normal_reviews": sum(bool(not rows[i]["label"] and not rows[i]["ambiguous"]) for i in frames),
        "ambiguous_reviews": sum(bool(rows[i]["ambiguous"]) for i in frames),
        "new_episodes": len({int(ids[i]) for i in frames} & eligible_episodes),
    }


def audit_run(rows: list[dict], source_threshold: float,
              scores: dict[str, np.ndarray], queues: dict[str, dict[str, list[int]]],
              reference_indices: dict[str, np.ndarray]) -> dict:
    start = STARTUP + GAP
    ids, episodes = episode_ids(rows)
    eligible = np.asarray([not row["ambiguous"] for row in rows[start:]], dtype=bool)
    labels = np.asarray([row["label"] for row in rows[start:]], dtype=bool)[eligible]
    random_trials = [audit_queue(
        spaced(np.random.default_rng(seed).permutation(len(rows) - start), REVIEW_BUDGET),
        rows, ids, episodes, start,
    ) for seed in range(RANDOM_REPEATS)]
    result = {
        "frames": len(rows), "evaluation_frames": len(labels),
        "defect_frames": int(labels.sum()),
        "new_defect_episodes": len(episodes),
        "excluded_ambiguous": int((~eligible).sum()),
        "reference_contamination_for_audit_only": {
            key: int(sum(rows[i]["label"] and not rows[i]["ambiguous"] for i in indices))
            for key, indices in reference_indices.items()
        },
        "random_100": {
            "mean_episodes": float(np.mean([item["new_episodes"] for item in random_trials])),
            "min_episodes": min(item["new_episodes"] for item in random_trials),
            "max_episodes": max(item["new_episodes"] for item in random_trials),
            "mean_defect_reviews": float(np.mean([item["defect_reviews"] for item in random_trials])),
        },
        "methods": {},
    }
    for name, values in scores.items():
        item = {
            "auroc": roc_auc(labels, values[eligible]),
            "average_precision": average_precision(labels, values[eligible]),
            "score_quantiles": np.quantile(values, [.5, .9, .99]).tolist(),
            "queues": {kind: audit_queue(queue, rows, ids, episodes, start)
                       for kind, queue in queues[name].items()},
        }
        if name == "source_knn":
            item["source_threshold_exceedances"] = int(np.sum(values >= source_threshold))
        result["methods"][name] = item
    return result


def score_target(archive: TSFabricsArchive, cache: Path, name: str,
                 source_scorer: PatchScorer, classic_scorer: ClassicScorer,
                 source_threshold: float, drift: DriftDetector,
                 prelude: np.ndarray) -> dict:
    started = time.perf_counter()
    try:
        tokens, globals_, rows = _load(cache, name, archive)
        tokens, globals_, rows = tokens[:MAX_FRAMES], globals_[:MAX_FRAMES], rows[:MAX_FRAMES]
        from_cache = True
    except FileNotFoundError:
        tokens, globals_, rows = encode_in_memory(archive, name, limit=MAX_FRAMES)
        from_cache = False
    feature_seconds = time.perf_counter() - started
    start = STARTUP + GAP
    if len(rows) <= start + REVIEW_BUDGET:
        raise ValueError(f"{name} has too few evaluation frames")
    reference_started = time.perf_counter()
    startup = np.asarray(tokens[:STARTUP])
    all_indices = np.linspace(0, STARTUP - 1, REFERENCE_FRAMES, dtype=np.int32)
    selected_indices = selected_reference(startup, globals_[:STARTUP])
    references = {"all": all_indices, "selected": selected_indices}
    patch_all = PatchScorer(build_reference_bank(startup, all_indices, max_vectors=768))
    patch_selected = PatchScorer(build_reference_bank(startup, selected_indices, max_vectors=768))
    pca_all = SubspaceScorer(tokens, all_indices)
    pca_selected = SubspaceScorer(tokens, selected_indices)
    reference_seconds = time.perf_counter() - reference_started
    scores = {}
    scorer_seconds = {}
    for method, scorer in (
        ("source_knn", source_scorer),
        ("local_all_knn", patch_all),
        ("local_selected_knn", patch_selected),
        ("local_all_pca", pca_all),
        ("local_selected_pca", pca_selected),
    ):
        tick = time.perf_counter()
        scores[method] = score_slice(scorer, tokens, start, len(rows))
        scorer_seconds[method] = time.perf_counter() - tick
    scores["source_local_pca_meanrank"] = (
        percentile_rank(scores["source_knn"]) +
        percentile_rank(scores["local_selected_pca"])) / 2
    scores["source_local_knn_meanrank"] = (
        percentile_rank(scores["source_knn"]) +
        percentile_rank(scores["local_selected_knn"])) / 2
    classic_started = time.perf_counter()
    classics = np.stack([feature_map(archive.read_image(row["image"]))
                         for row in rows[start:]])
    scores["handcrafted_source"] = score_slice(classic_scorer, classics, 0, len(classics))
    classic_seconds = time.perf_counter() - classic_started
    queues = {key: review_queues(value) for key, value in scores.items()}
    splice = np.concatenate((prelude, np.asarray(globals_[:min(1024, len(rows))])))
    splice_alarm = drift.first_alarm(splice)
    operational = {
        "frames_scored": len(rows) - start,
        "first_target_frame": start + 1,
        "source_score_quantiles": np.quantile(scores["source_knn"], [.5, .9, .99]).tolist(),
        "source_threshold_exceedances": int(np.sum(scores["source_knn"] >= source_threshold)),
        "splice_boundary": len(prelude),
        "change_alert": splice_alarm,
        "change_delay_from_boundary": None if splice_alarm is None or splice_alarm < len(prelude)
                                      else splice_alarm - len(prelude),
        "review_frames_by_method": {key: [start + i + 1 for i in queue["spaced8"]]
                                    for key, queue in queues.items()},
    }
    audited = audit_run(rows, source_threshold, scores, queues, references)
    audited["operational_summary"] = operational
    audited["timing_seconds"] = {
        "feature_load_or_encode": feature_seconds,
        "features_loaded_from_cache": from_cache,
        "local_reference_build": reference_seconds,
        "scoring_by_method": scorer_seconds,
        "handcrafted_extract_and_score": classic_seconds,
    }
    print(name, json.dumps({"defect_frames": audited["defect_frames"],
                            "episodes": audited["new_defect_episodes"],
                            "queues": {key: value["queues"]["spaced8"]["new_episodes"]
                                       for key, value in audited["methods"].items()}},
                           allow_nan=False), flush=True)
    return audited


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--phase", choices=("development", "final"), required=True)
    args = parser.parse_args()
    archive = TSFabricsArchive(args.zip)
    targets = list(DEVELOPMENT if args.phase == "development" else
                   sorted(set(archive.scenarios) - {SOURCE, *DEVELOPMENT}))
    source, globals_, source_rows = _load(args.cache, SOURCE, archive)
    startup = np.asarray(source[:512])
    # Keep the already published frozen source reference fixed for comparability.
    from core import select_reference_indices
    original_indices = select_reference_indices(
        mutual_image_scores(startup), np.asarray(globals_[:512]))
    source_scorer = PatchScorer(build_reference_bank(startup, original_indices))
    source_threshold = float(np.quantile(score_slice(source_scorer, source, *SOURCE_CAL), .995))
    classic_features = np.load(args.cache / f"{SOURCE}.classic.npy", mmap_mode="r")
    classic_scorer = ClassicScorer(classic_features[:512].reshape(512, -1, 8))
    drift = DriftDetector(np.asarray(globals_[:SOURCE_CAL[1]]))
    prelude = np.asarray(globals_[slice(*SPLICE_PRELUDE)])
    source_continuation_alarm = drift.first_alarm(np.asarray(globals_[slice(*SOURCE_CONTINUATION)]))
    output = {
        "protocol": {
            "phase": args.phase, "source": SOURCE, "targets": targets,
            "source_startup": [0, 512], "source_calibration": SOURCE_CAL,
            "source_continuation": SOURCE_CONTINUATION,
            "target_startup": [0, STARTUP], "target_evaluation_start": STARTUP + GAP,
            "target_cap": MAX_FRAMES, "local_reference_frames": REFERENCE_FRAMES,
            "review_budget_per_run": REVIEW_BUDGET, "review_spacing": REVIEW_SPACING,
            "episode_gap": EPISODE_GAP,
            "label_use": "only post-selection retrospective audit; no target labels for operational methods",
            "change_boundary": "synthetic splice between recorded runs",
            "source_continuation_alarm": source_continuation_alarm,
            "source_startup_defects_for_audit_only": int(sum(r["label"] for r in source_rows[:512])),
        },
        "runs": {},
    }
    for name in targets:
        output["runs"][name] = score_target(
            archive, args.cache, name, source_scorer, classic_scorer,
            source_threshold, drift, prelude)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    def safe(value):
        if isinstance(value, float) and not math.isfinite(value):
            return None
        if isinstance(value, dict):
            return {key: safe(item) for key, item in value.items()}
        if isinstance(value, (list, tuple)):
            return [safe(item) for item in value]
        if isinstance(value, np.generic):
            return safe(value.item())
        return value
    args.out.write_text(json.dumps(safe(output), separators=(",", ":"), allow_nan=False) + "\n")


if __name__ == "__main__":
    main()
