"""Check saved fusion queues against the earlier benchmark and replay two reviews."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from tsfabrics import TSFabricsArchive
from unlabeled_review import GAP, MAX_FRAMES, STARTUP, audit_queue, episode_ids


BASELINE_NAMES = {"frozen_dino": "source_knn", "handcrafted": "handcrafted_source"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--result", type=Path, required=True)
    parser.add_argument("--baseline", type=Path, required=True)
    args = parser.parse_args()

    result = json.loads(args.result.read_text(encoding="utf-8"))
    baseline = json.loads(args.baseline.read_text(encoding="utf-8"))
    if set(result["runs"]) != set(baseline["runs"]):
        raise ValueError("Fusion and baseline runs differ")
    archive = TSFabricsArchive(args.zip)
    methods = tuple(next(iter(result["runs"].values()))["methods"])
    summary = {name: {"ap": [], "first2_triggered": 0, "pilot_requests": 0,
                      "pilot_normal_reviews": 0, "pilot_episodes": 0, "spaced8_episodes": 0,
                      "normal_reviews": 0, "per_defect_run": {}}
               for name in methods}
    for run, entry in result["runs"].items():
        original = baseline["runs"][run]
        rows = archive.scenarios[run][:MAX_FRAMES]
        episode_index, episodes = episode_ids(rows)
        if entry["new_defect_episodes"] != len(episodes):
            raise ValueError(f"Episode count differs for {run}")
        for name, method in entry["methods"].items():
            eight = method["spaced8"]
            if name in BASELINE_NAMES:
                before = original["methods"][BASELINE_NAMES[name]]
                # Near-tied scores can reorder a few frames across PyTorch builds;
                # the selected frame set must still be identical.
                if set(eight["frames"]) != set(before["queues"]["spaced8"]["frames"]):
                    raise ValueError(f"Baseline selected frames differ: {run}/{name}")
                if before["average_precision"] is not None and not np.isclose(
                    method["average_precision"], before["average_precision"], atol=5e-4
                ):
                    raise ValueError(f"Baseline AP differs: {run}/{name}")
            first = [frame - 1 - STARTUP - GAP for frame in eight["frames"][:2]]
            pilot = audit_queue(first, rows, episode_index, episodes, STARTUP + GAP)
            triggered = bool(pilot["defect_reviews"] or pilot["ambiguous_reviews"])
            aggregate = summary[name]
            aggregate["first2_triggered"] += triggered
            aggregate["pilot_requests"] += 8 if triggered else 2
            aggregate["pilot_normal_reviews"] += (eight if triggered else pilot)["normal_reviews"]
            aggregate["pilot_episodes"] += (eight if triggered else pilot)["new_episodes"]
            aggregate["spaced8_episodes"] += eight["new_episodes"]
            aggregate["normal_reviews"] += eight["normal_reviews"]
            if method["average_precision"] is not None:
                aggregate["ap"].append(method["average_precision"])
            if episodes:
                aggregate["per_defect_run"][run] = {
                    "total_episodes": len(episodes),
                    "first2_episodes": pilot["new_episodes"],
                    "first2_triggered": triggered,
                    "spaced8_episodes": eight["new_episodes"],
                    "pilot_episodes": (eight if triggered else pilot)["new_episodes"],
                }
    for aggregate in summary.values():
        aggregate["macro_ap"] = float(np.mean(aggregate.pop("ap")))
        aggregate["macro_episode_coverage"] = float(np.mean([
            item["spaced8_episodes"] / item["total_episodes"]
            for item in aggregate["per_defect_run"].values()
        ]))
    print(json.dumps({"phase": result["protocol"]["phase"],
                      "runs": len(result["runs"]), "methods": summary}, indent=2))


if __name__ == "__main__":
    main()
