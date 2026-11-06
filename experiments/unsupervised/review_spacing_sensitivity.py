"""Audit review-spacing choices with the frozen DINOv2 source scorer."""

from __future__ import annotations

import argparse
import gc
import json
from pathlib import Path

import numpy as np
import torch

from condition_reference import encode_in_memory, score_slice
from core import PatchScorer, build_reference_bank, mutual_image_scores, select_reference_indices
from run_tsfabrics import SOURCE, _load
from tsfabrics import TSFabricsArchive
from unlabeled_review import GAP, MAX_FRAMES, REVIEW_BUDGET, STARTUP, audit_queue, episode_ids


SPACINGS = (1, 4, 8, 12, 16)


def choose(scores: np.ndarray, spacing: int) -> list[int]:
    selected: list[int] = []
    for raw in np.argsort(-scores, kind="stable"):
        frame = int(raw)
        if all(abs(frame - previous) >= spacing for previous in selected):
            selected.append(frame)
            if len(selected) == REVIEW_BUDGET:
                break
    if len(selected) != REVIEW_BUDGET:
        raise ValueError(f"Only {len(selected)} reviews fit at spacing {spacing}")
    return selected


def audited_run(rows: list[dict], scores: np.ndarray, saved: dict) -> dict:
    start = STARTUP + GAP
    if len(rows) != saved["frames"] or len(scores) != len(rows) - start:
        raise ValueError("Recorded frame range changed")
    queues = {spacing: choose(scores, spacing) for spacing in SPACINGS}
    original = saved["methods"]["source_knn"]["queues"]["spaced8"]["frames"]
    if [start + i + 1 for i in queues[16]] != original:
        raise ValueError("Recomputed 16-frame queue differs from the saved benchmark")

    # No dataset label is read until every score-only queue is fixed.
    ids, eligible = episode_ids(rows)
    if len(eligible) != saved["new_defect_episodes"]:
        raise ValueError("Episode definition changed")
    output = {"frames": len(rows), "new_episodes": len(eligible), "spacing": {}}
    for spacing, queue in queues.items():
        fixed = audit_queue(queue, rows, ids, eligible, start)
        first_two = queue[:2]
        both_normal = all(not rows[start + frame]["label"] and
                          not rows[start + frame]["ambiguous"] for frame in first_two)
        routed = audit_queue(first_two if both_normal else queue, rows, ids, eligible, start)
        output["spacing"][str(spacing)] = {"fixed8": fixed, "two_first": routed}
    return output


def summarize(runs: dict[str, dict]) -> dict:
    total_episodes = sum(run["new_episodes"] for run in runs.values())
    defect_runs = [run for run in runs.values() if run["new_episodes"]]
    summary = {}
    for spacing in SPACINGS:
        key = str(spacing)
        summary[key] = {}
        for rule in ("fixed8", "two_first"):
            rows = [run["spacing"][key][rule] for run in runs.values()]
            summary[key][rule] = {
                "requests": sum(row["review_count"] for row in rows),
                "normal_reviews": sum(row["normal_reviews"] for row in rows),
                "defect_reviews": sum(row["defect_reviews"] for row in rows),
                "episodes_found": sum(row["new_episodes"] for row in rows),
                "episodes_total": total_episodes,
                "macro_coverage": float(np.mean([
                    run["spacing"][key][rule]["new_episodes"] / run["new_episodes"]
                    for run in defect_runs
                ])) if defect_runs else None,
            }
    return summary


def save(path: Path, result: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(result, indent=2, allow_nan=False) + "\n")
    temporary.replace(path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--phase", choices=("development", "final"), required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--runs", nargs="*", help="Optional subset for a reproducibility check")
    args = parser.parse_args()

    baseline_file = Path(__file__).parent / "results" / f"unlabeled_review_{args.phase}.json"
    baseline = json.loads(baseline_file.read_text())
    if baseline["protocol"]["review_spacing"] != 16 or baseline["protocol"]["source"] != SOURCE:
        raise ValueError("Saved benchmark protocol changed")
    targets = args.runs if args.runs is not None else baseline["protocol"]["targets"]
    if len(targets) != len(set(targets)) or any(name not in baseline["runs"] for name in targets):
        raise ValueError("Unknown or repeated run")
    output = {"protocol": {"phase": args.phase, "source": SOURCE, "targets": targets,
                           "spacing_frames": SPACINGS, "review_budget": REVIEW_BUDGET,
                           "evaluation_start": STARTUP + GAP,
                           "label_use": "post-selection audit only"}, "runs": {}}
    if args.out.exists():
        prior = json.loads(args.out.read_text())
        if prior["protocol"] != json.loads(json.dumps(output["protocol"])):
            raise ValueError("Existing output uses a different protocol")
        output = prior

    archive = TSFabricsArchive(args.zip)
    source, globals_, _ = _load(args.cache, SOURCE, archive)
    startup = np.asarray(source[:512])
    selected = select_reference_indices(mutual_image_scores(startup), np.asarray(globals_[:512]))
    scorer = PatchScorer(build_reference_bank(startup, selected))
    for name in targets:
        if name in output["runs"]:
            print(f"reused {name}", flush=True)
            continue
        try:
            tokens, _, rows = _load(args.cache, name, archive)
            tokens, rows = tokens[:MAX_FRAMES], rows[:MAX_FRAMES]
            print(f"cached {name}", flush=True)
        except FileNotFoundError:
            tokens, _, rows = encode_in_memory(archive, name, limit=MAX_FRAMES)
        scores = score_slice(scorer, tokens, STARTUP + GAP, len(rows))
        output["runs"][name] = audited_run(rows, scores, baseline["runs"][name])
        output["summary"] = summarize(output["runs"])
        save(args.out, output)
        print(f"verified {name}: " + json.dumps({
            spacing: output["runs"][name]["spacing"][str(spacing)]["fixed8"]["new_episodes"]
            for spacing in SPACINGS
        }), flush=True)
        del tokens, rows, scores
        gc.collect()
        torch.cuda.empty_cache()
    output["complete"] = True
    save(args.out, output)
    print(json.dumps({"phase": args.phase, "runs": len(output["runs"]),
                      "episodes_by_spacing": {
                          key: value["fixed8"]["episodes_found"]
                          for key, value in output["summary"].items()
                      }}, allow_nan=False), flush=True)


if __name__ == "__main__":
    main()
