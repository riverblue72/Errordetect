"""Validate and summarize the reviewed-normal alert-limit shadow audit."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


FIELDS = ("fp", "tp", "detected_episodes", "normal_frames", "defect_frames", "new_episodes")


def format_limit(value: float | None) -> str:
    return "—" if value is None else f"{value:.4f}"


def validate(result: dict, recorded: dict) -> None:
    if result["protocol"]["targets"] != recorded["protocol"]["targets"]:
        raise ValueError("target order differs from recorded feedback validation")
    if set(result["runs"]) != set(result["protocol"]["targets"]):
        raise ValueError("reviewed-threshold audit is incomplete")
    if abs(result["protocol"]["source_limit"] - recorded["protocol"]["source_threshold"]) > 1e-6:
        raise ValueError("source limit differs")
    for name, run in result["runs"].items():
        earlier = recorded["runs"][name]
        if earlier["status"] != "evaluated":
            if run["status"] != earlier["status"]:
                raise ValueError(f"status mismatch: {name}")
            continue
        if run["review_frames"] != earlier["strategies"]["spaced8"]["review_frames"]:
            raise ValueError(f"review queue changed: {name}")
        if (run["normal_reviews"] != earlier["strategies"]["spaced8"]["confirmed_normal"] or
            run["defect_reviews"] != earlier["strategies"]["spaced8"]["confirmed_defect"]):
            raise ValueError(f"review outcomes changed: {name}")
        if run["trial_limit"] is not None and run["trial_limit"] < run["source_limit"]:
            raise ValueError(f"trial limit below source: {name}")
        if run["status"] == "trial_applied":
            if run["effective"] != run["trial"] or not run["reviewed_defect_guard"] or not run["confirmed_change"]:
                raise ValueError(f"unsafe trial application: {name}")
        elif run["effective"] != run["baseline"]:
            raise ValueError(f"frozen result not retained: {name}")
        if run["baseline"]["normal_frames"] != earlier["source"]["normal_frames"] or (
            run["baseline"]["defect_frames"] != earlier["source"]["defect_frames"]
        ):
            raise ValueError(f"later population changed: {name}")


def totals(result: dict, key: str) -> dict[str, int]:
    runs = [run for run in result["runs"].values() if run["status"] in ("trial_applied", "frozen_retained")]
    return {field: sum(run[key][field] for run in runs) for field in FIELDS}


def summary(result: dict) -> list[str]:
    base, effective = totals(result, "baseline"), totals(result, "effective")
    applied = sum(run["status"] == "trial_applied" for run in result["runs"].values())
    evaluated = sum(run["status"] in ("trial_applied", "frozen_retained")
                    for run in result["runs"].values())
    return [
        f"Evaluated runs: {evaluated}. Trial applied: {applied}. "
        f"Normal-frame flags: {base['fp']:,} → {effective['fp']:,} "
        f"/ {base['normal_frames']:,}. Defect-frame flags: "
        f"{base['tp']:,} → {effective['tp']:,} / {base['defect_frames']:,}. "
        f"New episodes flagged: {base['detected_episodes']} → "
        f"{effective['detected_episodes']} / {base['new_episodes']}.",
        "",
        "| Run | Confirmed normal/defect reviews | Trial limit | Applied? | Normal flags · frozen/effective | Defect flags · frozen/effective | New episodes flagged · frozen/effective |",
        "| --- | ---: | ---: | --- | ---: | ---: | ---: |",
    ] + [
        f"| `{name}` | {run['normal_reviews']}/{run['defect_reviews']} "
        f"| {format_limit(run['trial_limit'])} | {'Yes' if run['status'] == 'trial_applied' else 'No'} "
        f"| {run['baseline']['fp']}/{run['effective']['fp']} "
        f"| {run['baseline']['tp']}/{run['effective']['tp']} "
        f"| {run['baseline']['detected_episodes']}/{run['effective']['detected_episodes']} "
        f"of {run['baseline']['new_episodes']} |"
        for name, run in result["runs"].items()
        if run["status"] in ("trial_applied", "frozen_retained")
    ]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--development", type=Path, required=True)
    parser.add_argument("--final", type=Path, required=True)
    parser.add_argument("--recorded-development", type=Path, required=True)
    parser.add_argument("--recorded-final", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    dev = json.loads(args.development.read_text())
    final = json.loads(args.final.read_text())
    recorded_dev = json.loads(args.recorded_development.read_text())
    recorded_final = json.loads(args.recorded_final.read_text())
    validate(dev, recorded_dev)
    validate(final, recorded_final)
    if set(dev["protocol"]["targets"]) & set(final["protocol"]["targets"]):
        raise ValueError("development and follow-up runs overlap")
    lines = [
        "# Reviewed-normal alert-limit shadow audit", "",
        "The DINOv2 source reference, scores, spaced-eight queue, and source "
        "limit stay fixed. The trial limit uses only confirmed normal reviews "
        "and is tested on disjoint later frames. `REVIEWED_THRESHOLD_PROTOCOL.md` "
        "records the rule and development success condition before the results. "
        "The later test begins at frame 704, after the review window and gap; "
        "its episode denominator differs from the earlier frame-320 ranking audit.", "",
        "## Development · five runs", "", *summary(dev), "",
        "## Follow-up · sixteen runs", "", *summary(final), "",
    ]
    baseline, effective = totals(final, "baseline"), totals(final, "effective")
    lost = [name for name, run in final["runs"].items()
            if run["status"] in ("trial_applied", "frozen_retained")
            and run["effective"]["detected_episodes"] < run["baseline"]["detected_episodes"]]
    if effective["tp"] < baseline["tp"] or effective["detected_episodes"] < baseline["detected_episodes"]:
        lines += [
            "## Decision", "",
            "**Reject the reviewed-normal alert-limit update.** It reduced normal "
            f"flags from {baseline['fp']:,} to {effective['fp']:,}, but also "
            f"reduced defect flags from {baseline['tp']} to {effective['tp']} "
            f"and newly flagged episodes from {baseline['detected_episodes']} "
            f"to {effective['detected_episodes']}. Episode loss occurred in "
            f"{', '.join(f'`{name}`' for name in lost)}. The guard kept "
            "previously flagged *reviewed* defects above the trial limit; "
            "it could not protect later unreviewed defect frames. "
            "The source reference and source alert limit remain active.",
            "",
        ]
    else:
        lines += [
            "## Decision", "",
            "No aggregate loss of flagged defect frames or new episodes was "
            "observed in this follow-up set. This does not establish safety "
            "outside these recorded runs; leave the candidate in shadow mode.",
            "",
        ]
    lines += [
        "The five development runs met the prespecified screen, but their "
        "normal-alert reduction came from one normal-only run. One of the "
        "sixteen follow-up runs was too short for the separated later test. "
        "All findings use public textile recordings, not rubber-belt photos.",
        "",
    ]
    earlier_fp = sum(run["source"]["fp"] for run in recorded_final["runs"].values()
                     if run["status"] == "evaluated")
    fresh_fp = totals(final, "baseline")["fp"]
    if earlier_fp != fresh_fp:
        changed = [name for name, run in final["runs"].items()
                   if run["status"] in ("trial_applied", "frozen_retained")
                   and run["baseline"]["fp"] != recorded_final["runs"][name]["source"]["fp"]]
        lines += [
            f"Fresh feature encoding gave {fresh_fp:,} frozen normal flags "
            f"versus {earlier_fp:,} in the saved feedback-validation result. "
            f"The difference is one flag in each of {len(changed)} runs "
            f"({', '.join(f'`{name}`' for name in changed)}); the scorer, "
            "source limit, run population, and review frames are unchanged.",
            "",
        ]
    args.out.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
