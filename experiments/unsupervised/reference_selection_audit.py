"""Equal-capacity audit of label-free source-reference selection."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from condition_reference import encode_in_memory, score_slice
from core import PatchScorer, build_reference_bank, mutual_image_scores, select_reference_indices
from feedback_validation import heldout_audit
from run_tsfabrics import SOURCE, _load
from tsfabrics import TSFabricsArchive
from unlabeled_review import DEVELOPMENT, GAP, MAX_FRAMES, SOURCE_CAL, STARTUP, review_queues


SOURCE_STARTUP = 512
SOURCE_CONTINUATION = (2112, 4096)


def build_source(cache: Path, archive: TSFabricsArchive) -> tuple[dict, dict]:
    tokens, globals_, _ = _load(cache, SOURCE, archive)
    startup = np.asarray(tokens[:SOURCE_STARTUP])
    selected_indices = select_reference_indices(
        mutual_image_scores(startup), np.asarray(globals_[:SOURCE_STARTUP])
    )
    selected_bank = build_reference_bank(startup, selected_indices)
    all_bank = build_reference_bank(
        startup, np.arange(SOURCE_STARTUP), max_vectors=len(selected_bank)
    )
    assert len(selected_bank) == len(all_bank)
    scorers = {
        "selected": PatchScorer(selected_bank),
        "all": PatchScorer(all_bank),
    }
    thresholds = {
        name: float(np.quantile(score_slice(scorer, tokens, *SOURCE_CAL), .995))
        for name, scorer in scorers.items()
    }
    source_flags = {
        name: int(np.sum(score_slice(scorer, tokens, *SOURCE_CONTINUATION)
                         >= thresholds[name]))
        for name, scorer in scorers.items()
    }
    source = {
        "selected_frames": len(selected_indices),
        "bank_vectors": len(selected_bank),
        "thresholds": thresholds,
        "continuation_flags": source_flags,
        "continuation_frames": SOURCE_CONTINUATION[1] - SOURCE_CONTINUATION[0],
    }
    return source, scorers


def score_run(archive: TSFabricsArchive, cache: Path, name: str,
              scorers: dict, thresholds: dict, baseline: dict) -> dict:
    limit = min(MAX_FRAMES, len(archive.scenarios[name]))
    try:
        tokens, _, rows = _load(cache, name, archive)
        tokens, rows = tokens[:limit], rows[:limit]
        cached = True
    except FileNotFoundError:
        tokens, _, rows = encode_in_memory(archive, name, limit=limit)
        cached = False
    start = STARTUP + GAP
    if len(rows) <= start + 8:
        raise ValueError(f"too few later frames: {name}")
    scores = {key: score_slice(scorer, tokens, start, len(rows))
              for key, scorer in scorers.items()}
    fixed_queues = {key: review_queues(values)["spaced8"]
                    for key, values in scores.items()}
    # Labels are read only here, after both scores and queues have been fixed.
    audited = {key: heldout_audit(rows, values, thresholds[key], start)
               for key, values in scores.items()}
    for key, queue in fixed_queues.items():
        audited[key]["review_frames"] = [start + index + 1 for index in queue]
    selected = audited["selected"]
    recorded = baseline["runs"][name]
    prior = recorded["methods"]["source_knn"]
    selected_ap, prior_ap = selected["average_precision"], prior["average_precision"]
    if (selected_ap is None) != (prior_ap is None) or (
        selected_ap is not None and abs(selected_ap - prior_ap) > 0.0005
    ):
        raise ValueError(f"selected-reference AP does not reproduce: {name}")
    if selected["review_episodes"] != prior["queues"]["spaced8"]["new_episodes"]:
        raise ValueError(f"selected-reference review yield does not reproduce: {name}")
    selected_flags = int(np.sum(scores["selected"] >= thresholds["selected"]))
    flag_delta = selected_flags - prior["source_threshold_exceedances"]
    nearest_limit_gap = float(np.min(np.abs(scores["selected"] - thresholds["selected"])))
    # A fresh DINO encode can move one nearly threshold-tied frame across the
    # boundary under a different PyTorch attention kernel. Record the drift.
    if abs(flag_delta) > 1 or (flag_delta and nearest_limit_gap > 5e-4):
        raise ValueError(f"selected-reference thresholded flags do not reproduce: {name}: "
                         f"new={selected_flags}, recorded={prior['source_threshold_exceedances']}, "
                         f"threshold={thresholds['selected']:.8f}, "
                         f"nearest_limit_gap={nearest_limit_gap:.8f}")
    selected_quantiles = np.quantile(scores["selected"], [.5, .9, .99])
    if not np.allclose(selected_quantiles, prior["score_quantiles"], rtol=0, atol=5e-4):
        raise ValueError(f"selected-reference score distribution does not reproduce: {name}")
    if selected["defect_frames"] != recorded["defect_frames"]:
        raise ValueError(f"defect-frame population changed: {name}")
    if selected["new_episodes"] != recorded["new_defect_episodes"]:
        raise ValueError(f"episode population changed: {name}")
    return {"frames": len(rows), "cached": cached,
            "selected_flag_reproduction_delta": flag_delta,
            "methods": audited}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--phase", choices=("development", "final"), required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    archive = TSFabricsArchive(args.zip)
    baseline = json.loads(args.baseline.read_text())
    targets = list(DEVELOPMENT if args.phase == "development" else
                   sorted(set(archive.scenarios) - {SOURCE, *DEVELOPMENT}))
    if targets != baseline["protocol"]["targets"]:
        raise ValueError("target order differs from recorded benchmark")
    source, scorers = build_source(args.cache, archive)
    protocol = {"phase": args.phase, "source": SOURCE, "targets": targets,
                "source_startup": [0, SOURCE_STARTUP],
                "source_calibration": list(SOURCE_CAL),
                "source_continuation": list(SOURCE_CONTINUATION),
                "target_evaluation_start": STARTUP + GAP,
                "target_cap": MAX_FRAMES,
                "equal_bank_vectors": source["bank_vectors"],
                "label_use": "retrospective metrics only; no bank or threshold fitting"}
    result = {"protocol": protocol, "source": source, "runs": {}}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    if args.out.exists() and args.out.stat().st_size:
        previous = json.loads(args.out.read_text())
        if previous["protocol"] != protocol or previous["source"] != source:
            raise ValueError("existing checkpoint differs from this protocol")
        result = previous
    for name in targets:
        if name in result["runs"]:
            print(f"skip saved {name}", flush=True)
            continue
        result["runs"][name] = score_run(archive, args.cache, name, scorers,
                                         source["thresholds"], baseline)
        temporary = args.out.with_suffix(args.out.suffix + ".tmp")
        temporary.write_text(json.dumps(result, separators=(",", ":"), allow_nan=False) + "\n")
        temporary.replace(args.out)
        selected = result["runs"][name]["methods"]["selected"]
        all_frames = result["runs"][name]["methods"]["all"]
        print(name, "defects", selected["defect_frames"],
              "AP", selected["average_precision"], all_frames["average_precision"],
              "FP", selected["fp"], all_frames["fp"], flush=True)


if __name__ == "__main__":
    main()
