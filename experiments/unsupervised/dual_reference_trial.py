"""Fixed, source-calibrated blend of two equal-capacity DINOv2 source banks."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from condition_reference import encode_in_memory, score_slice
from feedback_validation import heldout_audit
from reference_selection_audit import SOURCE_STARTUP, build_source
from run_tsfabrics import SOURCE, _load
from tsfabrics import TSFabricsArchive
from unlabeled_review import DEVELOPMENT, GAP, MAX_FRAMES, SOURCE_CAL, STARTUP, review_queues


def blend(selected: np.ndarray, all_startup: np.ndarray,
          selected_limit: float, all_limit: float) -> np.ndarray:
    if selected_limit <= 0 or all_limit <= 0 or selected.shape != all_startup.shape:
        raise ValueError("source limits and score lengths must match")
    return .5 * (selected / selected_limit + all_startup / all_limit)


def checked_metrics(audited: dict, recorded: dict, name: str, method: str) -> None:
    previous = recorded["methods"][method]
    for metric in ("average_precision", "auroc"):
        old, new = previous[metric], audited[metric]
        if (old is None) != (new is None) or (
            old is not None and abs(old - new) > .0005
        ):
            raise ValueError(f"{name}: {method} {metric} does not reproduce")
    if audited["review_episodes"] != previous["review_episodes"]:
        raise ValueError(f"{name}: {method} review yield does not reproduce")
    if audited["defect_frames"] != previous["defect_frames"]:
        raise ValueError(f"{name}: {method} defect population changed")


def evaluate_run(archive: TSFabricsArchive, cache: Path, name: str,
                 scorers: dict, limits: dict, reference: dict) -> dict:
    end = min(MAX_FRAMES, len(archive.scenarios[name]))
    start = STARTUP + GAP
    if end <= start + 8:
        raise ValueError(f"{name}: too few target frames")
    try:
        tokens, _, rows = _load(cache, name, archive)
        tokens, rows = tokens[:end], rows[:end]
        cached = True
    except FileNotFoundError:
        tokens, _, rows = encode_in_memory(archive, name, limit=end)
        cached = False
    scores = {key: score_slice(scorer, tokens, start, end)
              for key, scorer in scorers.items()}
    scores["dual"] = blend(scores["selected"], scores["all"],
                            limits["selected"], limits["all"])
    queues = {key: review_queues(value)["spaced8"] for key, value in scores.items()}
    # Labels are consulted only after scores, thresholds, and queues are fixed.
    audited = {key: heldout_audit(rows, value, limits[key], start)
               for key, value in scores.items()}
    for key, queue in queues.items():
        audited[key]["review_frames"] = [start + int(index) + 1 for index in queue]
    for key in ("selected", "all"):
        checked_metrics(audited[key], reference, name, key)
    return {"frames": end, "cached": cached, "methods": audited}


def summary(runs: dict) -> dict:
    defects = [run for run in runs.values() if run["methods"]["selected"]["defect_frames"]]
    return {
        "runs": len(runs),
        "defect_runs": len(defects),
        "macro_ap": {key: float(np.mean([run["methods"][key]["average_precision"]
                                          for run in defects])) if defects else None
                     for key in ("selected", "all", "dual")},
        "normal_flags": {key: sum(run["methods"][key]["fp"] for run in runs.values())
                         for key in ("selected", "all", "dual")},
        "defect_flags": {key: sum(run["methods"][key]["tp"] for run in runs.values())
                         for key in ("selected", "all", "dual")},
        "review_episodes": {key: sum(run["methods"][key]["review_episodes"]
                                     for run in runs.values())
                            for key in ("selected", "all", "dual")},
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--reference", type=Path, required=True)
    parser.add_argument("--phase", choices=("development", "final"), required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    archive = TSFabricsArchive(args.zip)
    reference = json.loads(args.reference.read_text())
    targets = list(DEVELOPMENT if args.phase == "development" else
                   sorted(set(archive.scenarios) - {SOURCE, *DEVELOPMENT}))
    if targets != reference["protocol"]["targets"]:
        raise ValueError("target order differs from the verified reference audit")
    source, scorers = build_source(args.cache, archive)
    tokens, _, _ = _load(args.cache, SOURCE, archive)
    calibration = {key: score_slice(scorer, tokens, *SOURCE_CAL)
                   for key, scorer in scorers.items()}
    dual_source = blend(calibration["selected"], calibration["all"],
                        source["thresholds"]["selected"], source["thresholds"]["all"])
    limits = {**source["thresholds"], "dual": float(np.quantile(dual_source, .995))}
    protocol = {"phase": args.phase, "source": SOURCE, "targets": targets,
                "source_startup": [0, SOURCE_STARTUP],
                "source_calibration": list(SOURCE_CAL),
                "target_evaluation_start": STARTUP + GAP,
                "target_cap": MAX_FRAMES, "bank_vectors_each": source["bank_vectors"],
                "blend": "mean of scores divided by separate source 99.5% limits",
                "dual_limit": "source 99.5% quantile", "review_budget": 8,
                "review_gap": 16, "label_use": "retrospective evaluation only"}
    output = {"protocol": protocol, "source_limits": limits, "runs": {}}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    if args.out.exists() and args.out.stat().st_size:
        previous = json.loads(args.out.read_text())
        if previous["protocol"] != protocol or previous["source_limits"] != limits:
            raise ValueError("existing checkpoint differs from this fixed trial")
        output = previous
    for name in targets:
        if name in output["runs"]:
            print(f"skip saved {name}", flush=True)
            continue
        output["runs"][name] = evaluate_run(archive, args.cache, name, scorers,
                                            limits, reference["runs"][name])
        output["summary"] = summary(output["runs"])
        temporary = args.out.with_suffix(args.out.suffix + ".tmp")
        temporary.write_text(json.dumps(output, separators=(",", ":"), allow_nan=False) + "\n")
        temporary.replace(args.out)
        row = output["runs"][name]["methods"]
        print(name, "AP", row["selected"]["average_precision"],
              row["all"]["average_precision"], row["dual"]["average_precision"],
              "FP", row["selected"]["fp"], row["all"]["fp"], row["dual"]["fp"],
              flush=True)
    print(json.dumps(output["summary"], indent=2), flush=True)


if __name__ == "__main__":
    main()
