"""Budget-matched review ranking from frozen DINOv2 and handcrafted scores.

The mixed ranks use the full unlabeled evaluation interval, so they are
applicable to completed-interval review, not online frame alerts. Published
labels enter only after every method's review frames have been selected.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from classic import ClassicScorer, feature_map
from condition_reference import encode_in_memory, score_slice
from core import PatchScorer, build_reference_bank, mutual_image_scores, select_reference_indices
from metrics import average_precision, roc_auc
from run_tsfabrics import SOURCE, _load
from tsfabrics import TSFabricsArchive
from uncertainty_review import enable_legacy_attention
from unlabeled_review import (DEVELOPMENT, GAP, MAX_FRAMES, REVIEW_BUDGET,
                              REVIEW_SPACING, STARTUP, audit_queue,
                              episode_ids, percentile_rank, spaced)


def rankings(dino: np.ndarray, handcrafted: np.ndarray) -> dict[str, np.ndarray]:
    deep_rank = percentile_rank(dino)
    manual_rank = percentile_rank(handcrafted)
    return {
        "frozen_dino": dino,
        "handcrafted": handcrafted,
        "dino_75_handcrafted_25": .75 * deep_rank + .25 * manual_rank,
        "equal_rank_mean": .5 * deep_rank + .5 * manual_rank,
    }


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
    source, global_features, _ = _load(args.cache, SOURCE, archive)
    startup = np.asarray(source[:512])
    source_indices = select_reference_indices(
        mutual_image_scores(startup), np.asarray(global_features[:512]))
    deep_scorer = PatchScorer(build_reference_bank(startup, source_indices))
    classic_features = np.load(args.cache / f"{SOURCE}.classic.npy", mmap_mode="r")
    manual_scorer = ClassicScorer(classic_features[:512].reshape(512, -1, 8))

    output = {
        "protocol": {
            "phase": args.phase, "source": SOURCE, "targets": targets,
            "evaluation_start": STARTUP + GAP, "target_cap": MAX_FRAMES,
            "review_budget": REVIEW_BUDGET, "spacing": REVIEW_SPACING,
            "fusion": "within-interval percentile ranks of frozen source scores",
            "label_use": "post-selection audit only; development chooses the comparison rule",
            "status": "exploratory; these runs have been inspected in earlier studies",
        },
        "runs": {},
    }
    if args.out.exists() and args.out.stat().st_size:
        previous = json.loads(args.out.read_text(encoding="utf-8"))
        if previous["protocol"] != output["protocol"]:
            raise ValueError("Existing result has a different protocol")
        output = previous

    for name in targets:
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
        if len(rows) <= start + REVIEW_BUDGET:
            raise ValueError(f"Too few evaluation frames in {name}")
        dino_scores = score_slice(deep_scorer, tokens, start, len(rows))
        del tokens
        classic_maps = np.stack([feature_map(archive.read_image(row["image"]))
                                 for row in rows[start:]])
        handcrafted_scores = score_slice(manual_scorer, classic_maps, 0, len(classic_maps))
        del classic_maps

        values = rankings(dino_scores, handcrafted_scores)
        queues = {method: spaced(np.argsort(-score, kind="stable"), REVIEW_BUDGET)
                  for method, score in values.items()}
        if any(len(queue) != REVIEW_BUDGET for queue in queues.values()):
            raise ValueError(f"Insufficient spaced review candidates in {name}")
        episode_index, episodes = episode_ids(rows)
        eligible = np.asarray([not row["ambiguous"] for row in rows[start:]], dtype=bool)
        labels = np.asarray([row["label"] for row in rows[start:]], dtype=bool)[eligible]
        output["runs"][name] = {
            "feature_source": feature_source,
            "evaluated_frames": int(eligible.sum()),
            "defect_frames": int(labels.sum()),
            "new_defect_episodes": len(episodes),
            "methods": {
                method: {
                    "average_precision": average_precision(labels, score[eligible])
                    if labels.any() else None,
                    "auroc": roc_auc(labels, score[eligible])
                    if labels.any() and (~labels).any() else None,
                    "spaced8": audit_queue(queues[method], rows, episode_index, episodes, start),
                }
                for method, score in values.items()
            },
        }
        print(name, {method: item["spaced8"]["new_episodes"]
                     for method, item in output["runs"][name]["methods"].items()}, flush=True)
        args.out.parent.mkdir(parents=True, exist_ok=True)
        temporary = args.out.with_suffix(args.out.suffix + ".tmp")
        temporary.write_text(json.dumps(output, indent=2, allow_nan=False) + "\n",
                             encoding="utf-8")
        temporary.replace(args.out)


if __name__ == "__main__":
    main()
