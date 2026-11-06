"""Recorded, label-revealed review of post-alert TSFabrics frames.

Query frames are fixed from scores and features before labels are read. The
published labels then stand in for recorded review decisions. Evaluation uses
later, disjoint frames and the original source threshold throughout.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
import torch
from PIL import Image

from core import PatchScorer, build_reference_bank, mutual_image_scores, select_reference_indices
from metrics import summarize
from run_tsfabrics import SOURCE, STARTUP, SOURCE_TEST_START, CALIBRATION_END, _load
from tsfabrics import TSFabricsArchive


TARGETS = ("T1_S164_I36_1", "T1_S478_I118_2")
POOL = (192, 704)  # starts after the first confirmed change alert, ends before evaluation
EVALUATION = 832
BUDGET = 24
MIN_GAP = 8
PATCH_IDS = np.linspace(0, 26 * 32 - 1, 24, dtype=np.int32)


def spaced_selection(order: np.ndarray, count: int) -> np.ndarray:
    chosen: list[int] = []
    for index in order:
        index = int(index)
        if all(abs(index - earlier) >= MIN_GAP for earlier in chosen):
            chosen.append(index)
            if len(chosen) == count:
                break
    if len(chosen) != count:
        raise ValueError("not enough nonadjacent review frames")
    return np.asarray(sorted(chosen), dtype=np.int32)


def query_frames(scores: np.ndarray, globals_: np.ndarray) -> np.ndarray:
    """Select diverse high-score frames without consulting dataset labels.

    Limit to the upper score quartile, then farthest-first in frozen global
    features. This asks about surprising and nonduplicate appearances.
    """
    pool_scores = scores[POOL[0]:POOL[1]]
    candidates = np.flatnonzero(pool_scores >= np.quantile(pool_scores, .75)) + POOL[0]
    embedding = np.asarray(globals_[candidates], dtype=np.float32)
    embedding /= np.maximum(np.linalg.norm(embedding, axis=1, keepdims=True), 1e-8)
    start = int(np.argmax(scores[candidates]))
    selected = [int(candidates[start])]
    distance = 1 - embedding @ embedding[start]
    while len(selected) < BUDGET:
        ranked = np.argsort(-distance)
        next_local = next(int(i) for i in ranked if all(
            abs(int(candidates[i]) - earlier) >= MIN_GAP for earlier in selected
        ))
        selected.append(int(candidates[next_local]))
        distance = np.minimum(distance, 1 - embedding @ embedding[next_local])
    return np.asarray(sorted(selected), dtype=np.int32)


def evaluate(rows: list[dict], scores: np.ndarray, threshold: float) -> tuple[dict, list[dict]]:
    records = [
        {"frame": i + 1, "label": "Defect" if row["label"] else "Normal",
         "score": round(float(scores[i - EVALUATION]), 7)}
        for i, row in enumerate(rows)
        if i >= EVALUATION and not row["ambiguous"]
    ]
    labels = np.asarray([record["label"] == "Defect" for record in records])
    values = np.asarray([record["score"] for record in records])
    metrics = summarize(labels, values, threshold)
    metrics = {key: (None if isinstance(value, float) and not math.isfinite(value) else value)
               for key, value in metrics.items()}
    return metrics, records


@torch.inference_mode()
def novelty_distance(patches: np.ndarray, source_bank: np.ndarray) -> np.ndarray:
    """Nearest-source-patch cosine distance on the GPU."""
    bank = torch.as_tensor(source_bank, device="cuda").float().T
    query = torch.as_tensor(patches, device="cuda").float()
    return (1 - (query @ bank).max(dim=1).values).cpu().numpy()


def reviewed_patches(tokens: np.ndarray, verified: np.ndarray,
                     source_bank: np.ndarray, novelty_gate: float) -> np.ndarray:
    if len(verified) == 0:
        return np.empty((0, source_bank.shape[1]), dtype=np.float16)
    corrections = []
    for frame in verified:
        patches = np.asarray(tokens[int(frame)], dtype=np.float16)
        distances = novelty_distance(patches, source_bank)
        hottest = np.argsort(-distances)[:max(1, math.ceil(len(patches) * .01))]
        corrections.append(patches[hottest][distances[hottest] > novelty_gate])
    return np.concatenate(corrections) if corrections else np.empty((0, source_bank.shape[1]), dtype=np.float16)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    archive = TSFabricsArchive(args.zip)
    source, source_global, _ = _load(args.cache, SOURCE, archive)
    startup = np.asarray(source[:STARTUP])
    selected = select_reference_indices(mutual_image_scores(startup),
                                         np.asarray(source_global[:STARTUP]))
    source_bank = build_reference_bank(startup, selected)
    calibration_patches = np.asarray(source[STARTUP:CALIBRATION_END:12, PATCH_IDS, :],
                                     dtype=np.float16).reshape(-1, source_bank.shape[1])
    novelty_gate = float(np.median(novelty_distance(calibration_patches, source_bank)))
    threshold = float(np.quantile(PatchScorer(source_bank).score(
        source[STARTUP:CALIBRATION_END])[0], .995))
    output = {"protocol": {
        "source": SOURCE, "targets": list(TARGETS), "pool_zero_based": list(POOL),
        "evaluation_start_zero_based": EVALUATION, "budget": BUDGET,
        "minimum_frame_gap": MIN_GAP, "query": "upper score quartile; farthest-first global DINOv2 feature; 8-frame spacing",
        "threshold": threshold, "threshold_source": "source calibration; held fixed",
        "candidate": "source bank plus top-1%-score patches of flagged verified normals beyond the source-calibration median 1-NN distance",
        "novelty_gate": novelty_gate,
        "label_source": "TSFabrics CSV; revealed after query frames are fixed",
    }, "runs": {}}
    normal_shift_banks = {}
    for name in TARGETS:
        tokens, globals_, rows = _load(args.cache, name, archive)
        frozen_scores, _ = PatchScorer(source_bank).score(tokens)
        query = query_frames(frozen_scores, globals_)
        rng = np.random.default_rng(42)
        random_query = spaced_selection(rng.permutation(np.arange(*POOL)), BUDGET)
        run = {"query": [], "evaluations": {}}
        for index in query:
            row = rows[int(index)]
            image_dir = args.out.parent
            image_dir.mkdir(parents=True, exist_ok=True)
            image = archive.read_image(row["image"]).convert("RGB")
            image.thumbnail((960, 540), getattr(Image, "Resampling", Image).LANCZOS)
            image.save(image_dir / f"{name}-{int(index) + 1:05d}.jpg", quality=82, optimize=True)
            run["query"].append({
                "frame": int(index) + 1, "label": "Defect" if row["label"] else "Normal",
                "score": round(float(frozen_scores[index]), 7), "image_path": row["image"],
                "flagged": bool(frozen_scores[index] >= threshold),
                "ambiguous": bool(row["ambiguous"]),
            })
        frozen_metrics, frozen_records = evaluate(rows, frozen_scores[EVALUATION:], threshold)
        run["evaluations"]["current"] = {"metrics": frozen_metrics, "frames": frozen_records}
        for strategy, indices in (("reviewed", query), ("random", random_query)):
            verified = np.asarray([int(i) for i in indices if not rows[int(i)]["label"]
                                   and not rows[int(i)]["ambiguous"]
                                   and frozen_scores[int(i)] >= threshold], dtype=np.int32)
            run[strategy + "_query_frames"] = [int(i) + 1 for i in indices]
            run[strategy + "_verified_normal"] = [int(i) + 1 for i in verified]
            added = reviewed_patches(tokens, verified, source_bank, novelty_gate)
            run[strategy + "_added_patches"] = len(added)
            bank = np.concatenate([source_bank, added])
            if name == TARGETS[0]:
                normal_shift_banks[strategy] = bank
            candidate_scores, _ = PatchScorer(bank).score(tokens[EVALUATION:])
            metrics, records = evaluate(rows, candidate_scores, threshold)
            run["evaluations"][strategy] = {"metrics": metrics, "frames": records}
        output["runs"][name] = run
        print(name, json.dumps({key: item["metrics"] for key, item in run["evaluations"].items()}), flush=True)
    guard_name = TARGETS[1]
    guard_tokens, _, guard_rows = _load(args.cache, guard_name, archive)
    output["runs"][TARGETS[0]]["defect_guard"] = {}
    for strategy, bank in normal_shift_banks.items():
        scores, _ = PatchScorer(bank).score(guard_tokens[EVALUATION:])
        metrics, records = evaluate(guard_rows, scores, threshold)
        output["runs"][TARGETS[0]]["defect_guard"][strategy] = {
            "metrics": metrics, "frames": records,
        }
    print("normal-shift update on larger-shift defect guard",
          json.dumps({key: item["metrics"] for key, item in
                      output["runs"][TARGETS[0]]["defect_guard"].items()}), flush=True)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, separators=(",", ":"), allow_nan=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
