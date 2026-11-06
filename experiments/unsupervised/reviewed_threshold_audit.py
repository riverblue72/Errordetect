"""Shadow-test a run-local alert limit fitted only to reviewed normal frames.

The DINOv2 reference and score function remain frozen. Review frames and
change gates come from the earlier score-only feedback-validation protocol.
Only those review labels can affect the trial limit; later labels are audit-only.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from condition_reference import encode_in_memory, score_slice
from feedback_validation import REVIEW, TEST_START, heldout_audit
from reference_selection_audit import build_source
from run_tsfabrics import SOURCE, _load
from tsfabrics import TSFabricsArchive
from unlabeled_review import MAX_FRAMES


MIN_NORMAL_REVIEWS = 2


def audit_run(archive: TSFabricsArchive, cache: Path, name: str,
              scorer: object, source_limit: float, recorded: dict) -> dict:
    if recorded["status"] != "evaluated":
        return {"status": recorded["status"]}
    limit = min(MAX_FRAMES, len(archive.scenarios[name]))
    try:
        tokens, _, rows = _load(cache, name, archive)
        tokens, rows = tokens[:limit], rows[:limit]
        cached = True
    except FileNotFoundError:
        tokens, _, rows = encode_in_memory(archive, name, limit=limit)
        cached = False
    if len(rows) != recorded["frames"]:
        raise ValueError(f"frame count differs from feedback audit: {name}")
    review_scores = score_slice(scorer, tokens, *REVIEW)
    later_scores = score_slice(scorer, tokens, TEST_START, len(rows))
    earlier = recorded["source"]
    baseline = heldout_audit(rows, later_scores, source_limit, TEST_START)
    ap_reproduced = ((baseline["average_precision"] is None and
                      earlier["average_precision"] is None) or
                     (baseline["average_precision"] is not None and
                      earlier["average_precision"] is not None and
                      abs(baseline["average_precision"] - earlier["average_precision"]) <= 0.0005))
    if (baseline["defect_frames"] != earlier["defect_frames"] or
        baseline["normal_frames"] != earlier["normal_frames"] or
        baseline["new_episodes"] != earlier["new_episodes"] or
        not ap_reproduced or
        abs(baseline["tp"] - earlier["tp"]) > 1 or
        abs(baseline["fp"] - earlier["fp"]) > 1):
        raise ValueError(f"frozen source scoring did not reproduce: {name}")

    # This queue was fixed from the earlier unlabeled review scores, before
    # any labels were revealed. The stored one-based frame IDs are audited.
    saved = recorded["strategies"]["spaced8"]
    frame_indices = np.asarray(saved["review_frames"], dtype=np.int32) - 1
    if len(frame_indices) != 8 or np.any(frame_indices < REVIEW[0]) or np.any(frame_indices >= REVIEW[1]):
        raise ValueError(f"invalid prespecified review frames: {name}")
    normals = [int(i) for i in frame_indices if not rows[i]["label"] and not rows[i]["ambiguous"]]
    defects = [int(i) for i in frame_indices if rows[i]["label"] and not rows[i]["ambiguous"]]
    if (len(normals) != saved["confirmed_normal"] or
        len(defects) != saved["confirmed_defect"] or
        [i + 1 for i in normals] != saved["normal_frames_used"]):
        raise ValueError(f"review outcomes differ from recorded decisions: {name}")

    trial_limit = None
    trial = None
    guard = None
    if len(normals) >= MIN_NORMAL_REVIEWS:
        # The maximum is deliberately conservative for reviewed normals.
        # The floor forbids a lower limit after an appearance-change alert.
        normal_scores = review_scores[np.asarray(normals) - REVIEW[0]]
        trial_limit = float(max(source_limit, np.nextafter(float(normal_scores.max()), np.inf)))
        detected_review_defects = [i for i in defects
                                   if review_scores[i - REVIEW[0]] >= source_limit]
        guard = bool(all(review_scores[i - REVIEW[0]] >= trial_limit
                         for i in detected_review_defects))
        trial = heldout_audit(rows, later_scores, trial_limit, TEST_START)
    apply = bool(recorded["changed_before_review"] and guard and trial_limit is not None)
    return {
        "status": "trial_applied" if apply else "frozen_retained",
        "cached": cached,
        "confirmed_change": bool(recorded["changed_before_review"]),
        "review_frames": saved["review_frames"],
        "normal_reviews": len(normals),
        "defect_reviews": len(defects),
        "reviewed_defect_guard": guard,
        "source_limit": source_limit,
        "trial_limit": trial_limit,
        "baseline": baseline,
        "trial": trial,
        "effective": trial if apply else baseline,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    recorded = json.loads(args.baseline.read_text())
    archive = TSFabricsArchive(args.zip)
    names = recorded["protocol"]["targets"]
    if recorded["protocol"]["source"] != SOURCE or set(names) - set(archive.scenarios):
        raise ValueError("source or target set differs from recorded protocol")
    source, scorers = build_source(args.cache, archive)
    source_limit = source["thresholds"]["selected"]
    if abs(source_limit - recorded["protocol"]["source_threshold"]) > 1e-6:
        raise ValueError("source threshold changed")
    protocol = {
        "source": SOURCE, "targets": names,
        "review_window": list(REVIEW), "test_start": TEST_START,
        "target_cap": MAX_FRAMES, "min_normal_reviews": MIN_NORMAL_REVIEWS,
        "source_limit": source_limit,
        "trial_limit": "max(source limit, maximum score of reviewed normals)",
        "reviewed_defect_guard": "preserve all previously flagged reviewed defects",
        "change_gate": "earlier recorded change alert before review",
        "label_use": "prespecified reviews only; later labels for audit",
        "promotion": "shadow-only; no automatic update",
    }
    output = {"protocol": protocol, "runs": {}}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    if args.out.exists() and args.out.stat().st_size:
        previous = json.loads(args.out.read_text())
        if previous["protocol"] != protocol:
            raise ValueError("existing checkpoint differs from protocol")
        output = previous
    for name in names:
        if name in output["runs"]:
            print(f"skip saved {name}", flush=True)
            continue
        output["runs"][name] = audit_run(
            archive, args.cache, name, scorers["selected"],
            source_limit, recorded["runs"][name]
        )
        temporary = args.out.with_suffix(args.out.suffix + ".tmp")
        temporary.write_text(json.dumps(output, separators=(",", ":"), allow_nan=False) + "\n")
        temporary.replace(args.out)
        run = output["runs"][name]
        print(name, run["status"], "normal reviews", run.get("normal_reviews"),
              "trial limit", run.get("trial_limit"), flush=True)


if __name__ == "__main__":
    main()
