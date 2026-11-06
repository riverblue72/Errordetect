"""Summarize the four-cell reference × review-spacing audit."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


METHODS = ("all", "selected")
QUEUES = ("top8", "spaced8")


def validate(result: dict, phase: str) -> None:
    protocol = result["protocol"]
    if protocol["phase"] != phase or set(result["runs"]) != set(protocol["targets"]):
        raise ValueError(f"incomplete or wrong-phase audit: {phase}")
    if protocol["bank_vectors_each"] != 7392 or protocol["review_budget"] != 8:
        raise ValueError("bank capacity or review budget changed")
    for name, run in result["runs"].items():
        for method in METHODS:
            for queue in QUEUES:
                item = run["methods"][method][queue]
                if item["review_count"] != 8 or item["new_episodes"] > run["new_episodes"]:
                    raise ValueError(f"invalid review audit: {name}/{method}/{queue}")


def total(result: dict, method: str, queue: str, field: str) -> int:
    return sum(run["methods"][method][queue][field] for run in result["runs"].values())


def table(result: dict) -> list[str]:
    episodes = sum(run["new_episodes"] for run in result["runs"].values())
    lines = [
        f"New defect episodes in evaluated runs: **{episodes}**. "
        "Each cell uses eight review requests per run.", "",
        "| Reference | Highest 8 | Highest 8, ≥16 frames apart |",
        "| --- | ---: | ---: |",
    ]
    for method, title in (("all", "All startup frames"), ("selected", "Low-novelty selection")):
        lines.append(f"| {title} | " + " | ".join(
            f"**{total(result, method, queue, 'new_episodes')}/{episodes}**"
            for queue in QUEUES
        ) + " |")
    lines += ["", "| Reference + queue | Normal reviews | Defect reviews |",
              "| --- | ---: | ---: |"]
    for method in METHODS:
        for queue in QUEUES:
            lines.append(f"| {method} + {queue} | "
                         f"{total(result, method, queue, 'normal_reviews')} | "
                         f"{total(result, method, queue, 'defect_reviews')} |")
    return lines


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--development", type=Path, required=True)
    parser.add_argument("--final", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    dev = json.loads(args.development.read_text())
    final = json.loads(args.final.read_text())
    validate(dev, "development")
    validate(final, "final")
    if set(dev["protocol"]["targets"]) & set(final["protocol"]["targets"]):
        raise ValueError("development and extended runs overlap")
    lines = [
        "# Reference choice × review spacing: four-cell result", "",
        "All four queues use the same frozen DINOv2 features, target frames, "
        "7,392-vector source bank capacity, and eight-review budget. Only the "
        "bank's source-frame selection and review spacing change. Public labels "
        "are read after each queue is fixed. This factorial is descriptive on "
        "previously studied textile runs.", "",
        "## Development · five runs", "", *table(dev), "",
        "## Extended evaluation · sixteen runs", "", *table(final), "",
        "## Final defect-bearing runs", "",
        "| Run | Episodes | All + top | All + spaced | Selected + top | Selected + spaced |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
    ]
    for name, run in final["runs"].items():
        if run["new_episodes"]:
            values = [run["methods"][method][queue]["new_episodes"]
                      for method in METHODS for queue in QUEUES]
            lines.append(f"| `{name}` | {run['new_episodes']} | "
                         + " | ".join(map(str, values)) + " |")
    all_top = total(final, "all", "top8", "new_episodes")
    all_spaced = total(final, "all", "spaced8", "new_episodes")
    selected_top = total(final, "selected", "top8", "new_episodes")
    selected_spaced = total(final, "selected", "spaced8", "new_episodes")
    lines += [
        "", "The two previously separate comparisons both end at the "
        "selected-reference, spaced-eight cell; they should not be read as "
        "two sequential transitions from their different starting cells. "
        f"From the common all-startup/top-eight cell ({all_top}), selecting "
        f"the reference adds {selected_top - all_top} episodes, spacing adds "
        f"{all_spaced - all_top}, and the combined cell finds "
        f"{selected_spaced}. In these aggregate counts the interaction is "
        f"{selected_spaced - selected_top - all_spaced + all_top}, though "
        "per-run effects vary. Review discovery is distinct "
        "from thresholded frame alerts; this audit does not change the active "
        "detector or its source-calibrated limit.", "",
    ]
    args.out.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
