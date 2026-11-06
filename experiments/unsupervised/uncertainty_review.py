"""Compare threshold-near review requests with the frozen eight-photo queue.

Queues are fixed from source-calibrated scores only. Published TSFabrics labels
are consulted afterward to count reviewed defect episodes and normal reviews.
This is an exploratory budget-matched comparison, not a new independent test.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch.nn.functional as functional

from condition_reference import encode_in_memory, score_slice
from core import PatchScorer, build_reference_bank, mutual_image_scores, select_reference_indices
from run_tsfabrics import SOURCE, _load
from tsfabrics import TSFabricsArchive
from unlabeled_review import (DEVELOPMENT, EPISODE_GAP, GAP, MAX_FRAMES,
                              REVIEW_BUDGET, REVIEW_SPACING, SOURCE_CAL,
                              STARTUP, audit_queue, episode_ids)


def enable_legacy_attention() -> None:
    """Use PyTorch 1.13's equivalent kernel when DINOv2 expects the 2.0 API."""
    if not hasattr(functional, "scaled_dot_product_attention"):
        def attention(query, key, value, attn_mask=None, dropout_p=0.0, is_causal=False):
            return functional._scaled_dot_product_attention(
                query, key, value, attn_mask=attn_mask,
                dropout_p=dropout_p, is_causal=is_causal,
            )[0]

        functional.scaled_dot_product_attention = attention


def spaced_add(order: np.ndarray, picked: list[int], total: int) -> list[int]:
    chosen = list(picked)
    for raw in order:
        index = int(raw)
        if all(abs(index - previous) >= REVIEW_SPACING for previous in chosen):
            chosen.append(index)
            if len(chosen) == total:
                break
    if len(chosen) != total:
        raise ValueError("Not enough spaced review candidates")
    return chosen


def queues(scores: np.ndarray, threshold: float) -> dict[str, list[int]]:
    top = np.argsort(-scores, kind="stable")
    near = np.argsort(np.abs(scores - threshold), kind="stable")
    below = np.flatnonzero(scores < threshold)
    near_below = below[np.argsort(threshold - scores[below], kind="stable")]
    high8 = spaced_add(top, [], REVIEW_BUDGET)
    high6 = spaced_add(top, [], 6)
    high4 = spaced_add(top, [], 4)
    result = {
        "top8_spaced": high8,
        "high6_near2": spaced_add(near, high6, REVIEW_BUDGET),
        "high6_below2": spaced_add(near_below, high6, REVIEW_BUDGET),
        "high4_near4": spaced_add(near, high4, REVIEW_BUDGET),
    }
    for selected in result.values():
        assert len(selected) == len(set(selected)) == REVIEW_BUDGET
        assert all(abs(a - b) >= REVIEW_SPACING for i, a in enumerate(selected)
                   for b in selected[:i])
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--runs", nargs="+", required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    archive = TSFabricsArchive(args.zip)
    source, global_features, _ = _load(args.cache, SOURCE, archive)
    startup = np.asarray(source[:512])
    selected = select_reference_indices(mutual_image_scores(startup),
                                         np.asarray(global_features[:512]))
    scorer = PatchScorer(build_reference_bank(startup, selected))
    threshold = float(np.quantile(score_slice(scorer, source, *SOURCE_CAL), .995))
    output = {
        "protocol": {
            "source": SOURCE, "source_threshold": threshold,
            "targets": args.runs,
            "scorer": "frozen source DINOv2 patch nearest neighbor",
            "evaluation_start": STARTUP + GAP, "target_cap": MAX_FRAMES,
            "review_budget": REVIEW_BUDGET, "spacing": REVIEW_SPACING,
            "episode_gap": EPISODE_GAP,
            "label_use": "retrospective audit only; no labels in queue selection",
            "selection": "exploratory comparison on previously inspected runs",
        },
        "runs": {},
    }
    if args.out.exists() and args.out.stat().st_size:
        previous = json.loads(args.out.read_text(encoding="utf-8"))
        if previous["protocol"] != output["protocol"]:
            raise ValueError("Existing result has a different protocol")
        output = previous
    for name in args.runs:
        if name in output["runs"]:
            print(f"skip saved {name}", flush=True)
            continue
        try:
            tokens, _, rows = _load(args.cache, name, archive)
            feature_source = "cache"
        except FileNotFoundError:
            enable_legacy_attention()
            tokens, _, rows = encode_in_memory(archive, name, limit=MAX_FRAMES)
            feature_source = "in_memory"
        tokens, rows = tokens[:MAX_FRAMES], rows[:MAX_FRAMES]
        start = STARTUP + GAP
        scores = score_slice(scorer, tokens, start, len(rows))
        selected_queues = queues(scores, threshold)
        ids, episodes = episode_ids(rows)
        output["runs"][name] = {
            "split": "development" if name in DEVELOPMENT else "previously inspected final",
            "feature_source": feature_source,
            "evaluation_frames": len(scores), "new_defect_episodes": len(episodes),
            "queues": {kind: audit_queue(chosen, rows, ids, episodes, start)
                       for kind, chosen in selected_queues.items()},
        }
        print(name, {kind: row["new_episodes"] for kind, row in
                     output["runs"][name]["queues"].items()}, flush=True)
        args.out.parent.mkdir(parents=True, exist_ok=True)
        temporary = args.out.with_suffix(args.out.suffix + ".tmp")
        temporary.write_text(json.dumps(output, indent=2, allow_nan=False) + "\n",
                             encoding="utf-8")
        temporary.replace(args.out)


if __name__ == "__main__":
    main()
