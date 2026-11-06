"""Audit a label-feedback stopping rule on saved, unlabeled review queues.

The queue was fixed by the prior frozen-DINO experiment. An operational
selection callback sees only the labels of pilot photos it requested; the
remaining dataset labels enter the retrospective audit afterward.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from unlabeled_review import MAX_FRAMES, REVIEW_BUDGET, episode_ids
from tsfabrics import TSFabricsArchive


def decision(row: dict) -> str:
    if row["ambiguous"]:
        return "uncertain"
    return "defect" if row["label"] else "normal"


def sequential_queue(queue: list[int], inspect, pilot: int) -> list[int]:
    """One-based queued frames; `inspect` is called on pilot frames only."""
    if not 1 <= pilot <= len(queue) <= REVIEW_BUDGET:
        raise ValueError("invalid pilot or queue length")
    observed = [inspect(frame) for frame in queue[:pilot]]
    return queue[:pilot] if all(value == "normal" for value in observed) else queue


def audited_queue(frames: list[int], rows: list[dict], ids, eligible: set[int]) -> dict:
    decisions = [decision(rows[frame - 1]) for frame in frames]
    return {
        "frames": frames,
        "requests": len(frames),
        "normal_reviews": decisions.count("normal"),
        "defect_reviews": decisions.count("defect"),
        "uncertain_reviews": decisions.count("uncertain"),
        "new_episodes": len({int(ids[frame - 1]) for frame, value in zip(frames, decisions)
                             if value == "defect"} & eligible),
    }


def evaluate_run(rows: list[dict], saved: dict) -> dict:
    rows = rows[:MAX_FRAMES]
    queue = saved["methods"]["source_knn"]["queues"]["spaced8"]["frames"]
    if len(queue) != REVIEW_BUDGET or any(not 321 <= frame <= len(rows) for frame in queue):
        raise ValueError("saved review queue is inconsistent with the run")
    ids, eligible = episode_ids(rows)
    if len(eligible) != saved["new_defect_episodes"]:
        raise ValueError("episode audit differs from the saved benchmark")
    fixed = audited_queue(queue, rows, ids, eligible)
    original = saved["methods"]["source_knn"]["queues"]["spaced8"]
    for key in ("normal_reviews", "defect_reviews", "ambiguous_reviews", "new_episodes"):
        value = fixed["uncertain_reviews"] if key == "ambiguous_reviews" else fixed[key]
        if value != original[key]:
            raise ValueError(f"saved queue audit mismatch: {key}")
    output = {"total_new_episodes": len(eligible), "fixed8": fixed}
    for pilot in (2, 3):
        observed_frames = []

        def inspect(frame: int) -> str:
            observed_frames.append(frame)
            return decision(rows[frame - 1])

        chosen = sequential_queue(queue, inspect, pilot)
        if observed_frames != queue[:pilot]:
            raise ValueError("selector inspected an unrequested label")
        output[f"pilot{pilot}"] = audited_queue(chosen, rows, ids, eligible)
    return output


def summarize(runs: dict) -> dict:
    defect_runs = [run for run in runs.values() if run["total_new_episodes"]]
    summary = {"runs": len(runs), "defect_runs": len(defect_runs), "methods": {}}
    for method in ("fixed8", "pilot2", "pilot3"):
        requests = sum(run[method]["requests"] for run in runs.values())
        normal = sum(run[method]["normal_reviews"] for run in runs.values())
        found = sum(run[method]["new_episodes"] for run in defect_runs)
        macro = sum(run[method]["new_episodes"] / run["total_new_episodes"]
                    for run in defect_runs) / len(defect_runs) if defect_runs else None
        harmed = [name for name, run in runs.items()
                  if run[method]["new_episodes"] < run["fixed8"]["new_episodes"]]
        summary["methods"][method] = {
            "requests": requests, "normal_reviews": normal,
            "episodes_found": found, "macro_episode_coverage": macro,
            "runs_losing_episodes": harmed,
        }
    return summary


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--result", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    saved = json.loads(args.result.read_text())
    archive = TSFabricsArchive(args.zip)
    runs = {name: evaluate_run(archive.scenarios[name], item)
            for name, item in saved["runs"].items()}
    output = {"protocol": {"phase": saved["protocol"]["phase"],
                           "queue": "frozen source DINO, score-ranked, 16-frame-spaced eight",
                           "pilot_sizes": [2, 3],
                           "stop": "pilot outcomes all confirmed normal; otherwise inspect eight",
                           "label_use": "only selected review outcomes before stop; other labels for audit"},
              "summary": summarize(runs), "runs": runs}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, indent=2) + "\n")
    print(json.dumps(output["summary"], indent=2), flush=True)


if __name__ == "__main__":
    main()
