"""Stress-test fixed review queues on consecutive 512-frame intervals."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from condition_reference import score_slice
from core import (DINOFeatures, PatchScorer, build_reference_bank,
                  mutual_image_scores, select_reference_indices)
from run_tsfabrics import SOURCE, _load
from sequential_review import decision, sequential_queue
from tsfabrics import TSFabricsArchive
from unlabeled_review import (DEVELOPMENT, GAP, MAX_FRAMES, REVIEW_BUDGET,
                              STARTUP, episode_ids, review_queues)


BLOCK = 512
MIN_BLOCK = 256
PILOTS = (1, 2, 3)


def intervals(end: int) -> list[tuple[int, int]]:
    """Zero-based half-open bounds, independent of labels and scores."""
    start = STARTUP + GAP
    result = []
    while start < end:
        stop = min(start + BLOCK, end)
        if 0 < end - stop < MIN_BLOCK:
            stop = end
        if stop - start < MIN_BLOCK:
            break
        result.append((start, stop))
        start = stop
    return result


def source_scorer(archive: TSFabricsArchive, cache: Path) -> PatchScorer:
    tokens, globals_, _ = _load(cache, SOURCE, archive)
    startup = np.asarray(tokens[:512])
    selected = select_reference_indices(
        mutual_image_scores(startup), np.asarray(globals_[:512]))
    return PatchScorer(build_reference_bank(startup, selected))


def target_scores(archive: TSFabricsArchive, cache: Path, name: str,
                  scorer: PatchScorer, extractor: DINOFeatures | None
                  ) -> tuple[np.ndarray, list[dict], DINOFeatures | None, bool]:
    limit = min(MAX_FRAMES, len(archive.scenarios[name]))
    start = STARTUP + GAP
    try:
        tokens, _, rows = _load(cache, name, archive)
        return score_slice(scorer, tokens, start, limit), rows[:limit], extractor, True
    except FileNotFoundError:
        rows = archive.scenarios[name][:limit]
        if extractor is None:
            extractor = DINOFeatures()
        parts = []
        for offset in range(start, limit, 8):
            images = [archive.read_image(row["image"]) for row in rows[offset:offset + 8]]
            tokens, _ = extractor.encode(images)
            parts.append(scorer.score(tokens)[0])
            if (offset - start) % 800 < 8:
                print(f"scored {name} {offset + len(images) - start}/{limit - start}", flush=True)
        return np.concatenate(parts), rows, extractor, False


def reviewed(queue: list[int], rows: list[dict], pilot: int) -> list[int]:
    if pilot == REVIEW_BUDGET:
        return queue
    seen = []

    def inspect(frame: int) -> str:
        seen.append(frame)
        return decision(rows[frame - 1])

    chosen = sequential_queue(queue, inspect, pilot)
    if seen != queue[:pilot]:
        raise ValueError("pilot read an unrequested decision")
    return chosen


def evaluate_run(rows: list[dict], scores: np.ndarray, previous: dict) -> dict:
    start = STARTUP + GAP
    ids, eligible = episode_ids(rows)
    if len(eligible) != previous["new_defect_episodes"]:
        raise ValueError("episode definition changed")
    whole = [start + int(i) + 1 for i in review_queues(scores)["spaced8"]]
    saved = previous["methods"]["source_knn"]["queues"]["spaced8"]["frames"]
    queue_check = {
        "matches_saved": whole == saved,
        "overlap": len(set(whole) & set(saved)),
        "first_two_match": whole[:2] == saved[:2],
    }
    if whole != saved:
        queue_check.update({"current": whole, "saved": saved})

    blocks = []
    for left, right in intervals(len(rows)):
        local = review_queues(scores[left - start:right - start])["spaced8"]
        queue = [left + int(i) + 1 for i in local]
        if len(queue) != REVIEW_BUDGET:
            raise ValueError("incomplete interval review queue")
        methods = {}
        for pilot in (*PILOTS, REVIEW_BUDGET):
            frames = reviewed(queue, rows, pilot)
            found = sorted({int(ids[frame - 1]) for frame in frames
                            if decision(rows[frame - 1]) == "defect"} & eligible)
            methods[str(pilot)] = {
                "frames": frames,
                "requests": len(frames),
                "found_episode_ids": found,
            }
        has_defect = any(decision(row) == "defect" for row in rows[left:right])
        blocks.append({
            "first_frame": left + 1,
            "last_frame": right,
            "frames": right - left,
            "has_defect_photo": has_defect,
            "queue": queue,
            "methods": methods,
            "stopped_with_hidden_queue_defect": {
                str(pilot): len(methods[str(pilot)]["frames"]) == pilot and any(
                    decision(rows[frame - 1]) == "defect" for frame in queue[pilot:])
                for pilot in PILOTS
            },
        })
    return {"frames": len(rows), "new_defect_episodes": len(eligible),
            "whole_queue_check": queue_check, "blocks": blocks}


def summarize(runs: dict[str, dict]) -> dict:
    result = {
        "runs": len(runs),
        "whole_queue_differences": [name for name, run in runs.items()
                                    if not run["whole_queue_check"]["matches_saved"]],
        "first_two_queue_differences": [name for name, run in runs.items()
                                         if not run["whole_queue_check"]["first_two_match"]],
        "intervals": sum(len(run["blocks"]) for run in runs.values()),
        "defect_bearing_intervals": sum(block["has_defect_photo"]
                                         for run in runs.values() for block in run["blocks"]),
        "new_defect_episodes": sum(run["new_defect_episodes"] for run in runs.values()),
        "methods": {},
    }
    for pilot in (*PILOTS, REVIEW_BUDGET):
        key = str(pilot)
        found_by_run = {
            name: set().union(*(set(block["methods"][key]["found_episode_ids"])
                                for block in run["blocks"]))
            for name, run in runs.items()
        }
        fixed_by_run = {
            name: set().union(*(set(block["methods"][str(REVIEW_BUDGET)]["found_episode_ids"])
                                for block in run["blocks"]))
            for name, run in runs.items()
        }
        stopped = [(name, block) for name, run in runs.items() for block in run["blocks"]
                   if pilot != REVIEW_BUDGET and
                   block["methods"][key]["requests"] == pilot]
        result["methods"][key] = {
            "requests": sum(block["methods"][key]["requests"]
                            for run in runs.values() for block in run["blocks"]),
            "unique_episodes_found": sum(map(len, found_by_run.values())),
            "runs_losing_vs_fixed8": [name for name in runs
                                       if fixed_by_run[name] - found_by_run[name]],
            "stopped_intervals": len(stopped),
            "stopped_intervals_containing_defect": sum(block["has_defect_photo"]
                                                        for _, block in stopped),
            "stopped_intervals_hiding_queue_defect": sum(
                block["stopped_with_hidden_queue_defect"][key] for _, block in stopped),
            "episodes_lost_vs_fixed8": sum(len(fixed_by_run[name] - found_by_run[name])
                                           for name in runs),
        }
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--prior", type=Path, required=True)
    parser.add_argument("--phase", choices=("development", "final"), required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    prior = json.loads(args.prior.read_text())
    if prior["protocol"]["phase"] != args.phase:
        raise ValueError("phase mismatch")
    archive = TSFabricsArchive(args.zip)
    expected = set(DEVELOPMENT if args.phase == "development" else
                   archive.scenarios.keys() - {SOURCE, *DEVELOPMENT})
    if set(prior["runs"]) != expected:
        raise ValueError("saved evaluation runs changed")
    scorer = source_scorer(archive, args.cache)
    extractor = None
    runs = {}
    for name in sorted(expected):
        scores, rows, extractor, cached = target_scores(
            archive, args.cache, name, scorer, extractor)
        runs[name] = evaluate_run(rows, scores, prior["runs"][name])
        runs[name]["features_cached"] = cached
        print(name, len(runs[name]["blocks"]), "intervals", flush=True)
    output = {
        "protocol": {"phase": args.phase, "block": BLOCK, "minimum_block": MIN_BLOCK,
                     "start_index": STARTUP + GAP, "cap": MAX_FRAMES,
                     "pilots": list(PILOTS), "fixed_queue": REVIEW_BUDGET,
                     "label_use": "requested decisions for stopping; all labels only for audit"},
        "summary": summarize(runs), "runs": runs,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, indent=2) + "\n")
    print(json.dumps(output["summary"], indent=2), flush=True)


if __name__ == "__main__":
    main()
