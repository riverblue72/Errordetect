"""Allocate a fixed batch review budget using only requested outcomes."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from sequential_review import decision, sequential_queue
from tsfabrics import TSFabricsArchive
from unlabeled_review import DEVELOPMENT, MAX_FRAMES, REVIEW_BUDGET, REVIEW_SPACING, episode_ids


def inputs(block_result: dict, previous: dict) -> dict[str, dict]:
    if set(block_result["runs"]) != set(previous["runs"]):
        raise ValueError("block and whole-run evaluations have different runs")
    runs = {}
    for name, item in block_result["runs"].items():
        prior = previous["runs"][name]["methods"]["source_knn"]["queues"]
        whole = item["whole_queue_check"].get("current", prior["spaced8"]["frames"])
        random = prior["random8"]["frames"]
        if len(whole) != REVIEW_BUDGET or len(random) != REVIEW_BUDGET:
            raise ValueError(f"incomplete whole-run queue: {name}")
        blocks = item["blocks"]
        if not blocks or any(len(block["queue"]) != REVIEW_BUDGET for block in blocks):
            raise ValueError(f"incomplete block queue: {name}")
        stream = [frame for depth in range(REVIEW_BUDGET)
                  for block in blocks for frame in block["queue"][depth:depth + 1]]
        runs[name] = {"whole": whole, "random": random, "stream": stream,
                      "new_episodes": item["new_defect_episodes"],
                      "frames": item["frames"]}
    return runs


def separated(frame: int, chosen: list[int]) -> bool:
    return frame not in chosen and all(abs(frame - other) >= REVIEW_SPACING
                                       for other in chosen)


def baseline_queues(runs: dict[str, dict], rows: dict[str, list[dict]]) -> dict[str, dict]:
    fixed = {name: item["whole"][:] for name, item in runs.items()}
    two = {}
    for name, item in runs.items():
        checked = []

        def inspect(frame: int) -> str:
            checked.append(frame)
            return decision(rows[name][frame - 1])

        two[name] = sequential_queue(item["whole"], inspect, 2)
        if checked != item["whole"][:2]:
            raise ValueError("two-first read an unrequested decision")
    return {"fixed8": fixed, "two_first": two}


def feedback_queues(runs: dict[str, dict], rows: dict[str, list[dict]],
                    *, random_audit: bool) -> dict[str, list[int]]:
    selected = {name: item["whole"][:2].copy() for name, item in runs.items()}
    active = {name for name, frames in selected.items()
              if any(decision(rows[name][frame - 1]) != "normal" for frame in frames)}
    if random_audit:
        for name in sorted(runs):
            if name in active:
                continue
            audit = next((frame for frame in runs[name]["random"]
                          if separated(frame, selected[name])), None)
            if audit is None:
                raise ValueError(f"no independent audit photo: {name}")
            selected[name].append(audit)
            if decision(rows[name][audit - 1]) != "normal":
                active.add(name)

    return allocate_remaining(runs, selected, active)


def allocate_remaining(runs: dict[str, dict], selected: dict[str, list[int]],
                       active: set[str]) -> dict[str, list[int]]:
    budget = REVIEW_BUDGET * len(runs)
    cursors = {name: 0 for name in runs}
    while sum(map(len, selected.values())) < budget:
        progress = False
        for name in sorted(active):
            if sum(map(len, selected.values())) >= budget:
                break
            stream = runs[name]["stream"]
            while cursors[name] < len(stream):
                frame = stream[cursors[name]]
                cursors[name] += 1
                if separated(frame, selected[name]):
                    selected[name].append(frame)
                    progress = True
                    break
        if not progress:
            break
    return selected


def baseline_reserving_queues(runs: dict[str, dict],
                              rows: dict[str, list[dict]]) -> dict[str, list[int]]:
    selected = {name: item["whole"][:2].copy() for name, item in runs.items()}
    active = {name for name, frames in selected.items()
              if any(decision(rows[name][frame - 1]) != "normal" for frame in frames)}
    for name in sorted(runs):
        if name in active:
            continue
        audit = next((frame for frame in runs[name]["random"]
                      if separated(frame, runs[name]["whole"])), None)
        if audit is None:
            raise ValueError(f"no audit away from the baseline queue: {name}")
        selected[name].append(audit)
        if decision(rows[name][audit - 1]) != "normal":
            active.add(name)

    budget = REVIEW_BUDGET * len(runs)
    for rank in range(2, REVIEW_BUDGET):
        for name in sorted(active):
            if sum(map(len, selected.values())) >= budget:
                return selected
            frame = runs[name]["whole"][rank]
            if not separated(frame, selected[name]):
                raise ValueError("audit photo conflicts with reserved baseline")
            selected[name].append(frame)
    return allocate_remaining(runs, selected, active)


def audit(runs: dict[str, dict], rows: dict[str, list[dict]],
          queues: dict[str, list[int]]) -> dict:
    output = {}
    for name, frames in queues.items():
        ids, eligible = episode_ids(rows[name])
        if len(eligible) != runs[name]["new_episodes"]:
            raise ValueError(f"episode count changed: {name}")
        if len(frames) != len(set(frames)) or any(
                not 321 <= frame <= len(rows[name]) for frame in frames):
            raise ValueError(f"invalid request frame: {name}")
        if any(not separated(frame, frames[:i]) for i, frame in enumerate(frames)):
            raise ValueError(f"review spacing changed: {name}")
        decisions = [decision(rows[name][frame - 1]) for frame in frames]
        found = sorted({int(ids[frame - 1]) for frame, value in zip(frames, decisions)
                        if value == "defect"} & eligible)
        output[name] = {
            "frames": frames, "requests": len(frames),
            "normal_reviews": decisions.count("normal"),
            "defect_reviews": decisions.count("defect"),
            "uncertain_reviews": decisions.count("uncertain"),
            "found_episode_ids": found,
            "new_episodes": len(eligible),
            "stopped_with_unseen_episode": bool(eligible - set(found)) and
                                           all(value == "normal" for value in decisions),
        }
    return output


def summarize(methods: dict[str, dict[str, dict]], runs: dict[str, dict]) -> dict:
    budget = REVIEW_BUDGET * len(runs)
    fixed = methods["fixed8"]
    summary = {"runs": len(runs), "budget": budget,
               "new_episodes": sum(item["new_episodes"] for item in runs.values()),
               "methods": {}}
    for method, items in methods.items():
        used = sum(item["requests"] for item in items.values())
        if used > budget:
            raise ValueError("review allocation exceeded the shared cap")
        defect_runs = [name for name, run in runs.items() if run["new_episodes"]]
        summary["methods"][method] = {
            "requests": used,
            "normal_reviews": sum(item["normal_reviews"] for item in items.values()),
            "defect_reviews": sum(item["defect_reviews"] for item in items.values()),
            "uncertain_reviews": sum(item["uncertain_reviews"] for item in items.values()),
            "episodes_found": sum(len(item["found_episode_ids"])
                                  for item in items.values()),
            "macro_episode_coverage": sum(len(items[name]["found_episode_ids"]) /
                                          runs[name]["new_episodes"] for name in defect_runs) /
                                      len(defect_runs) if defect_runs else None,
            "runs_losing_vs_fixed8": [name for name in defect_runs
                                      if set(fixed[name]["found_episode_ids"]) -
                                         set(items[name]["found_episode_ids"])],
            "stopped_defect_runs": [name for name in defect_runs
                                    if items[name]["stopped_with_unseen_episode"]],
        }
    return summary


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--blocks", type=Path, required=True)
    parser.add_argument("--prior", type=Path, required=True)
    parser.add_argument("--phase", choices=("development", "final"), required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    block_result = json.loads(args.blocks.read_text())
    previous = json.loads(args.prior.read_text())
    if block_result["protocol"]["phase"] != args.phase or (
            previous["protocol"]["phase"] != args.phase):
        raise ValueError("phase mismatch")
    archive = TSFabricsArchive(args.zip)
    expected = set(DEVELOPMENT if args.phase == "development" else
                   archive.scenarios.keys() - {previous["protocol"]["source"], *DEVELOPMENT})
    runs = inputs(block_result, previous)
    if set(runs) != expected:
        raise ValueError("evaluation run set changed")
    rows = {name: archive.scenarios[name][:min(MAX_FRAMES, len(archive.scenarios[name]))]
            for name in runs}
    if any(len(rows[name]) != item["frames"] for name, item in runs.items()):
        raise ValueError("recording length changed")
    queues = baseline_queues(runs, rows)
    queues["feedback_audit"] = feedback_queues(runs, rows, random_audit=True)
    queues["feedback_no_audit"] = feedback_queues(runs, rows, random_audit=False)
    queues["baseline_reserving_audit"] = baseline_reserving_queues(runs, rows)
    methods = {name: audit(runs, rows, selected) for name, selected in queues.items()}
    output = {
        "protocol": {"phase": args.phase, "per_run_baseline": REVIEW_BUDGET,
                     "batch_budget": REVIEW_BUDGET * len(runs),
                     "review_spacing": REVIEW_SPACING,
                     "candidate_stream": "rank rounds across chronological 512-frame blocks",
                     "label_use": "requested decisions for routing; remaining labels for audit"},
        "summary": summarize(methods, runs), "methods": methods,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, indent=2) + "\n")
    print(json.dumps(output["summary"], indent=2), flush=True)


if __name__ == "__main__":
    main()
