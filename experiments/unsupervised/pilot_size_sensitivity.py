"""Audit a one-photo start against the saved two-photo review schedule."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from sequential_review import audited_queue, decision, sequential_queue
from tsfabrics import TSFabricsArchive
from unlabeled_review import MAX_FRAMES, episode_ids


def evaluate(rows: list[dict], previous: dict) -> dict:
    rows = rows[:MAX_FRAMES]
    queue = previous["fixed8"]["frames"]
    seen: list[int] = []

    def inspect(frame: int) -> str:
        seen.append(frame)
        return decision(rows[frame - 1])

    requested = sequential_queue(queue, inspect, 1)
    if seen != queue[:1]:
        raise ValueError("selector read an unrequested decision")
    ids, eligible = episode_ids(rows)
    one = audited_queue(requested, rows, ids, eligible)
    two = audited_queue(previous["pilot2"]["frames"], rows, ids, eligible)
    fixed = audited_queue(queue, rows, ids, eligible)
    if two != previous["pilot2"] or fixed != previous["fixed8"]:
        raise ValueError("saved two-photo or fixed-eight audit changed")
    stopped = len(requested) == 1
    hidden = [frame for frame in queue[1:] if decision(rows[frame - 1]) == "defect"] if stopped else []
    hidden_events = {int(ids[frame - 1]) for frame in hidden} & eligible
    return {
        "first_decision": decision(rows[queue[0] - 1]),
        "total_new_episodes": len(eligible),
        "pilot1": one, "pilot2": two, "fixed8": fixed,
        "stopped_after_one": stopped,
        "hidden_defect_photos_in_remaining_queue": len(hidden),
        "hidden_new_episodes_in_remaining_queue": len(hidden_events),
    }


def summarize(runs: dict[str, dict]) -> dict:
    methods = {}
    for key in ("pilot1", "pilot2", "fixed8"):
        methods[key] = {
            "requests": sum(run[key]["requests"] for run in runs.values()),
            "normal_reviews": sum(run[key]["normal_reviews"] for run in runs.values()),
            "new_episodes_found": sum(run[key]["new_episodes"] for run in runs.values()),
            "defect_runs_losing_vs_fixed8": [name for name, run in runs.items()
                if run["total_new_episodes"] and run[key]["new_episodes"] <
                   run["fixed8"]["new_episodes"]],
        }
    stopped = {name: run for name, run in runs.items() if run["stopped_after_one"]}
    return {
        "runs": len(runs),
        "defect_runs": sum(bool(run["total_new_episodes"]) for run in runs.values()),
        "stopped_after_one": len(stopped),
        "defect_runs_stopped_after_one": sum(bool(run["total_new_episodes"])
                                             for run in stopped.values()),
        "stopped_runs_hiding_defect_photos": [name for name, run in stopped.items()
            if run["hidden_defect_photos_in_remaining_queue"]],
        "methods": methods,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--prior", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    previous = json.loads(args.prior.read_text())
    archive = TSFabricsArchive(args.zip)
    runs = {name: evaluate(archive.scenarios[name], item)
            for name, item in previous["runs"].items()}
    result = {
        "protocol": {"phase": previous["protocol"]["phase"],
                     "source_queue": "saved frozen-source spaced8",
                     "pilot1": "normal first photo stops; defect/uncertain opens eight",
                     "label_use": "first requested photo before stop; all queue labels for later audit"},
        "summary": summarize(runs), "runs": runs,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result["summary"], indent=2), flush=True)


if __name__ == "__main__":
    main()
