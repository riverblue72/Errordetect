"""Run-scoped, reviewed reference experiment on chronological TSFabrics streams.

The model only receives images, frozen features, and review decisions. Dataset
labels are revealed after review frames are fixed, to replay field inspection.
No evaluation frame is used for querying, calibration, or reference building.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
import torch

from core import DINOFeatures, PatchScorer, build_reference_bank, mutual_image_scores, select_reference_indices
from drift import DriftDetector
from metrics import summarize
from run_tsfabrics import CALIBRATION_END, SOURCE, STARTUP, _load
from tsfabrics import TSFabricsArchive


POOL_LENGTH = 512                 # begins only after a confirmed change alert
CALIBRATION_LENGTH = 128          # disjoint, label-free score calibration
EVALUATION_GAP = 64
BUDGET = 24
GAP = 8                         # avoid near-duplicate reviewed frames
TARGETS = ("T1_S164_I36_1", "T1_S478_I118_2", "T1_S148_I108_1", "T1_S478_I118_1")
MAX_TARGET_FRAMES = 4096


def spaced(order: np.ndarray, count: int, chosen: list[int] | None = None) -> list[int]:
    picked = [] if chosen is None else list(chosen)
    for raw in order:
        index = int(raw)
        if all(abs(index - other) >= GAP for other in picked):
            picked.append(index)
            if len(picked) == count:
                break
    if len(picked) != count:
        raise ValueError("review pool cannot satisfy spacing and budget")
    return picked


def query_indices(scores: np.ndarray, globals_: np.ndarray, strategy: str,
                  pool_bounds: tuple[int, int]) -> np.ndarray:
    """Choose 24 review frames without labels, with an explicit random control."""
    pool = np.arange(*pool_bounds)
    if strategy == "random":
        order = np.random.default_rng(42).permutation(pool)
        return np.sort(spaced(order, BUDGET)).astype(np.int32)
    if strategy == "high_score":
        return np.sort(spaced(pool[np.argsort(-scores[pool])], BUDGET)).astype(np.int32)
    if strategy != "balanced":
        raise ValueError(strategy)
    # Half the budget checks likely reference exemplars; the other half checks
    # conspicuous, nonduplicate alerts. Both are needed for a safe local bank.
    global_pool = np.asarray(globals_[pool], dtype=np.float32)
    center = np.median(global_pool, axis=0)
    center /= max(np.linalg.norm(center), 1e-8)
    representative = pool[np.argsort(1 - global_pool @ center)]
    picked = spaced(representative, BUDGET // 2)
    high = pool[np.argsort(-scores[pool])]
    return np.sort(spaced(high, BUDGET, picked)).astype(np.int32)


class SubspaceScorer:
    """PCA residual on verified-normal frozen tokens; not a SubspaceAD reproduction."""

    def __init__(self, tokens: np.ndarray, indices: np.ndarray, *, device: str = "cuda") -> None:
        if len(indices) < 2:
            raise ValueError("need two reviewed normals for a subspace")
        patch_ids = np.linspace(0, tokens.shape[1] - 1, 96, dtype=np.int32)
        patches = np.asarray(tokens[indices[:, None], patch_ids[None, :]], dtype=np.float32).reshape(-1, tokens.shape[-1])
        center = patches.mean(0)
        _, singular, vt = np.linalg.svd(patches - center, full_matrices=False)
        explained = np.cumsum(singular**2) / np.sum(singular**2)
        rank = min(128, max(1, int(np.searchsorted(explained, .95)) + 1))
        self.center = torch.as_tensor(center, device=device)
        self.basis = torch.as_tensor(vt[:rank].copy().T, device=device)
        self.rank = rank
        self.device = device

    @torch.inference_mode()
    def score(self, tokens: np.ndarray, batch: int = 8) -> np.ndarray:
        scores = np.empty(len(tokens), dtype=np.float32)
        for start in range(0, len(tokens), batch):
            x = torch.as_tensor(tokens[start:start + batch], device=self.device).float() - self.center
            projection = (x @ self.basis) @ self.basis.T
            residual = ((x - projection) ** 2).sum(-1)
            top = max(1, math.ceil(residual.shape[1] * .01))
            scores[start:start + len(x)] = residual.topk(top, dim=1).values.mean(1).cpu().numpy()
        return scores


def encode_in_memory(archive: TSFabricsArchive, name: str,
                     limit: int = MAX_TARGET_FRAMES) -> tuple[np.ndarray, np.ndarray, list[dict]]:
    """Avoid adding ~4 GB of feature files to a nearly full server disk."""
    rows = archive.scenarios[name][:limit]
    tokens = np.empty((len(rows), 832, 384), dtype=np.float16)
    globals_ = np.empty((len(rows), 384), dtype=np.float16)
    extractor = DINOFeatures()
    for start in range(0, len(rows), 8):
        images = [archive.read_image(row["image"]) for row in rows[start:start + 8]]
        tokens[start:start + len(images)], globals_[start:start + len(images)] = extractor.encode(images)
        if start % 400 < 8:
            print(f"encoded {name} {start + len(images)}/{len(rows)}", flush=True)
    return tokens, globals_, rows


def score_slice(scorer, tokens: np.ndarray, start: int, end: int) -> np.ndarray:
    result = scorer.score(tokens[start:end])
    return result[0] if isinstance(result, tuple) else result


def evaluate(rows: list[dict], scores: np.ndarray, threshold: float, evaluation_start: int) -> dict:
    eligible = np.asarray([not row["ambiguous"] for row in rows[evaluation_start:]], dtype=bool)
    labels = np.asarray([row["label"] for row in rows[evaluation_start:]], dtype=bool)[eligible]
    result = summarize(labels, scores[eligible], threshold)
    result["excluded_ambiguous"] = int((~eligible).sum())
    # A fixed-size, temporally spaced queue is useful even when no safe binary
    # threshold can be calibrated. Labels enter only the retrospective audit.
    eligible_indices = np.flatnonzero(eligible) + evaluation_start
    ranked = eligible_indices[np.argsort(-scores[eligible])]
    review = spaced(ranked, min(BUDGET, len(ranked) // GAP))
    result["priority_review"] = {"budget": len(review), "defects": int(sum(rows[i]["label"] for i in review)),
                                 "frames": [i + 1 for i in review]}
    return {key: (None if isinstance(value, float) and not math.isfinite(value) else value)
            for key, value in result.items()}


def run(archive: TSFabricsArchive, cache: Path, targets: tuple[str, ...]) -> dict:
    source, source_global, _ = _load(cache, SOURCE, archive)
    startup = np.asarray(source[:STARTUP])
    selected = select_reference_indices(mutual_image_scores(startup), np.asarray(source_global[:STARTUP]))
    source_bank = build_reference_bank(startup, selected)
    frozen = PatchScorer(source_bank)
    source_threshold = float(np.quantile(score_slice(frozen, source, STARTUP, CALIBRATION_END), .995))
    drift = DriftDetector(np.asarray(source_global[:CALIBRATION_END]))
    output = {
        "protocol": {"source": SOURCE, "targets": list(targets),
                     "relative_windows": {"review_pool": [0, POOL_LENGTH],
                                          "calibration": [POOL_LENGTH, POOL_LENGTH + CALIBRATION_LENGTH],
                                          "evaluation_start": POOL_LENGTH + CALIBRATION_LENGTH + EVALUATION_GAP},
                     "review_budget": BUDGET, "minimum_spacing": GAP,
                     "uncached_target_frame_cap": MAX_TARGET_FRAMES, "source_threshold": source_threshold,
                     "candidate_threshold": "99.5th percentile on disjoint target calibration frames; diagnostic ablation only",
                     "review": "dataset CSV labels replay field decisions after image-only query selection",
                     "candidate": "separate per-run bank of reviewed normal frames; never merged into source",
                     "promotion": "none; normal-only threshold validation and prospective guard required before activation",
                     "operational_decision": "frozen reference remains active; local scores prioritize review"},
        "runs": {},
    }
    for name in targets:
        try:
            tokens, globals_, rows = _load(cache, name, archive)
            print(f"loaded cached {name}", flush=True)
        except FileNotFoundError:
            tokens, globals_, rows = encode_in_memory(archive, name)
        alarm = drift.first_alarm(globals_)
        if alarm is None:
            print(f"{name}: no confirmed change; candidate evaluation skipped", flush=True)
            continue
        pool = (alarm, alarm + POOL_LENGTH)
        calibration = (pool[1], pool[1] + CALIBRATION_LENGTH)
        evaluation_start = calibration[1] + EVALUATION_GAP
        if len(tokens) <= evaluation_start:
            print(f"{name}: too short after alert for evaluation", flush=True)
            continue
        baseline_eval = score_slice(frozen, tokens, evaluation_start, len(tokens))
        baseline_cal = score_slice(frozen, tokens, *calibration)
        baseline_target_threshold = float(np.quantile(baseline_cal, .995))
        baseline = {"source_threshold": evaluate(rows, baseline_eval, source_threshold, evaluation_start),
                    "target_threshold": evaluate(rows, baseline_eval, baseline_target_threshold, evaluation_start)}
        record = {"change_alert_frame": alarm, "review_pool_zero_based": list(pool),
                  "calibration_zero_based": list(calibration), "evaluation_start_zero_based": evaluation_start,
                  "adaptation_allowed": True,
                  "calibration_defects_for_audit_only": int(sum(row["label"] for row in rows[calibration[0]:calibration[1]])),
                  "frozen": baseline, "strategies": {}}
        if record["adaptation_allowed"]:
            # Query scores on pool only; nothing after calibration can steer a query.
            frozen_pool = np.full(pool[1], np.nan, dtype=np.float32)
            frozen_pool[pool[0]:] = score_slice(frozen, tokens, *pool)
            for strategy in ("balanced", "random", "high_score"):
                query = query_indices(frozen_pool, globals_, strategy, pool)
                verified = np.asarray([i for i in query if not rows[i]["label"] and not rows[i]["ambiguous"]], dtype=np.int32)
                defects = [int(i) + 1 for i in query if rows[i]["label"] and not rows[i]["ambiguous"]]
                item = {"query_frames": (query + 1).tolist(), "verified_normal_frames": (verified + 1).tolist(),
                        "verified_defect_frames": defects, "ambiguous_reviews": int(sum(rows[i]["ambiguous"] for i in query))}
                if len(verified) >= 2:
                    bank = build_reference_bank(tokens, verified, max_vectors=10000)
                    local = PatchScorer(bank)
                    local_cal = score_slice(local, tokens, *calibration)
                    local_threshold = float(np.quantile(local_cal, .995))
                    local_eval = score_slice(local, tokens, evaluation_start, len(tokens))
                    item["local_bank"] = evaluate(rows, local_eval, local_threshold, evaluation_start)
                    item["local_bank"]["reference_vectors"] = len(bank)
                    if strategy == "balanced":
                        # Inspect the highest-scoring calibration cases before
                        # considering a threshold inferred from unlabeled data.
                        cal_indices = np.arange(*calibration)
                        cal_ranked = cal_indices[np.argsort(-local_cal)]
                        cal_review = spaced(cal_ranked, 8)
                        cal_defects = [i + 1 for i in cal_review if rows[i]["label"] and not rows[i]["ambiguous"]]
                        cal_uncertain = [i + 1 for i in cal_review if rows[i]["ambiguous"]]
                        item["calibration_review"] = {
                            "frames": [i + 1 for i in cal_review],
                            "confirmed_defect_frames": cal_defects,
                            "uncertain_frames": cal_uncertain,
                            "status": "blocked" if cal_defects or cal_uncertain else "top_cases_clear_not_approved",
                        }
                    # Ablation: old global union on the same verified frames.
                    union = PatchScorer(np.concatenate((source_bank, bank)))
                    union_eval = score_slice(union, tokens, evaluation_start, len(tokens))
                    item["global_union"] = evaluate(rows, union_eval, source_threshold, evaluation_start)
                    if strategy == "balanced":
                        residual = SubspaceScorer(tokens, verified)
                        sub_cal = score_slice(residual, tokens, *calibration)
                        sub_threshold = float(np.quantile(sub_cal, .995))
                        sub_eval = score_slice(residual, tokens, evaluation_start, len(tokens))
                        item["pca_residual"] = evaluate(rows, sub_eval, sub_threshold, evaluation_start)
                        item["pca_residual"]["rank"] = residual.rank
                    # Record scores for paired, label-separated plots; withheld
                    # labels are saved only in this offline evaluation artifact.
                    if strategy == "balanced":
                        item["paired_evaluation"] = [
                            {"frame": i + 1, "label": int(row["label"]),
                             "frozen": round(float(baseline_eval[i - evaluation_start]), 6),
                             "local": round(float(local_eval[i - evaluation_start]), 6),
                             "pca": round(float(sub_eval[i - evaluation_start]), 6)}
                            for i, row in enumerate(rows) if i >= evaluation_start and not row["ambiguous"]]
                record["strategies"][strategy] = item
        output["runs"][name] = record
        print(name, json.dumps({"alarm": alarm,
                                "calibration_defects_for_audit_only": record["calibration_defects_for_audit_only"],
                                "frozen": {k: {m: v for m, v in x.items() if m != "priority_review"}
                                           for k, x in baseline.items()},
                                "balanced": {k: {m: v for m, v in x.items() if m != "priority_review"}
                                             for k, x in record["strategies"].get("balanced", {}).items()
                                             if k in ("local_bank", "pca_residual", "global_union")}},
                               allow_nan=False), flush=True)
        del tokens, globals_
    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--targets", nargs="+", default=TARGETS)
    args = parser.parse_args()
    output = run(TSFabricsArchive(args.zip), args.cache, tuple(args.targets))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, separators=(",", ":"), allow_nan=False) + "\n")


if __name__ == "__main__":
    main()
