"""Source-only threshold sensitivity audit for the selected DINOv2 reference.

Every threshold is a quantile of the disjoint source calibration interval.
Target labels enter only after each target's scores have been computed; this
script diagnoses the operating tradeoff and does not choose a new threshold.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from condition_reference import encode_in_memory, score_slice
from feedback_validation import heldout_audit
from reference_selection_audit import SOURCE_CONTINUATION, build_source
from run_tsfabrics import SOURCE, _load
from tsfabrics import TSFabricsArchive
from unlabeled_review import DEVELOPMENT, GAP, MAX_FRAMES, SOURCE_CAL, STARTUP


QUANTILES = (0.95, 0.975, 0.99, 0.995, 0.9975)


def source_limits(cache: Path, archive: TSFabricsArchive) -> tuple[dict, object]:
    prior_source, scorers = build_source(cache, archive)
    scorer = scorers["selected"]
    source, _, _ = _load(cache, SOURCE, archive)
    calibration = score_slice(scorer, source, *SOURCE_CAL)
    continuation = score_slice(scorer, source, *SOURCE_CONTINUATION)
    thresholds = {str(q): float(np.quantile(calibration, q)) for q in QUANTILES}
    if abs(thresholds["0.995"] - prior_source["thresholds"]["selected"]) > 1e-6:
        raise ValueError("active 99.5% threshold did not reproduce")
    source_record = {
        "selected_frames": prior_source["selected_frames"],
        "bank_vectors": prior_source["bank_vectors"],
        "thresholds": thresholds,
        "calibration_exceedances": {
            key: int(np.sum(calibration >= value)) for key, value in thresholds.items()
        },
        "continuation_exceedances": {
            key: int(np.sum(continuation >= value)) for key, value in thresholds.items()
        },
        "continuation_frames": len(continuation),
    }
    return source_record, scorer


def audit_target(archive: TSFabricsArchive, cache: Path, name: str,
                 scorer: object, thresholds: dict[str, float]) -> dict:
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
    scores = score_slice(scorer, tokens, start, len(rows))
    audits = {key: heldout_audit(rows, scores, threshold, start)
              for key, threshold in thresholds.items()}
    common = audits["0.995"]
    for audit in audits.values():
        if any(audit[field] != common[field] for field in (
            "scored", "defect_frames", "normal_frames", "new_episodes",
            "review_episodes", "average_precision",
        )):
            raise ValueError(f"threshold-independent metric changed: {name}")
    return {
        "frames": len(rows), "cached": cached,
        "scored": common["scored"],
        "defect_frames": common["defect_frames"],
        "normal_frames": common["normal_frames"],
        "new_episodes": common["new_episodes"],
        "review_episodes": common["review_episodes"],
        "average_precision": common["average_precision"],
        "quantiles": {key: {metric: audit[metric] for metric in
                            ("tp", "fp", "detected_episodes")}
                      for key, audit in audits.items()},
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--phase", choices=("development", "final"), required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    archive = TSFabricsArchive(args.zip)
    targets = list(DEVELOPMENT if args.phase == "development" else
                   sorted(set(archive.scenarios) - {SOURCE, *DEVELOPMENT}))
    source_record, scorer = source_limits(args.cache, archive)
    protocol = {
        "phase": args.phase, "source": SOURCE, "targets": targets,
        "source_calibration": list(SOURCE_CAL),
        "source_continuation": list(SOURCE_CONTINUATION),
        "target_evaluation_start": STARTUP + GAP,
        "target_cap": MAX_FRAMES,
        "quantiles_predeclared": list(QUANTILES),
        "label_use": "retrospective metrics only; never threshold fitting",
    }
    result = {"protocol": protocol, "source": source_record, "runs": {}}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    if args.out.exists() and args.out.stat().st_size:
        previous = json.loads(args.out.read_text())
        if previous["protocol"] != protocol or previous["source"] != source_record:
            raise ValueError("existing checkpoint differs from this protocol")
        result = previous
    for name in targets:
        if name in result["runs"]:
            print(f"skip saved {name}", flush=True)
            continue
        result["runs"][name] = audit_target(
            archive, args.cache, name, scorer, source_record["thresholds"]
        )
        temporary = args.out.with_suffix(args.out.suffix + ".tmp")
        temporary.write_text(json.dumps(result, separators=(",", ":"), allow_nan=False) + "\n")
        temporary.replace(args.out)
        recorded = result["runs"][name]
        print(name, "defects", recorded["defect_frames"],
              "q995", recorded["quantiles"]["0.995"], flush=True)


if __name__ == "__main__":
    main()
