"""Summarize the predeclared source-quantile audit without refitting it."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def aggregate(result: dict, quantile: str) -> dict[str, int]:
    runs = result["runs"].values()
    return {
        "tp": sum(run["quantiles"][quantile]["tp"] for run in runs),
        "fp": sum(run["quantiles"][quantile]["fp"] for run in runs),
        "episodes": sum(run["quantiles"][quantile]["detected_episodes"] for run in runs),
        "defect_frames": sum(run["defect_frames"] for run in runs),
        "normal_frames": sum(run["normal_frames"] for run in runs),
        "new_episodes": sum(run["new_episodes"] for run in runs),
    }


def validate(result: dict, verified: dict) -> None:
    if result["protocol"]["targets"] != verified["protocol"]["targets"]:
        raise ValueError("run membership or order differs from verified reference audit")
    if set(result["runs"]) != set(result["protocol"]["targets"]):
        raise ValueError("threshold audit is incomplete")
    if abs(result["source"]["thresholds"]["0.995"] -
           verified["source"]["thresholds"]["selected"]) > 1e-6:
        raise ValueError("active source limit changed")
    for name, run in result["runs"].items():
        earlier = verified["runs"][name]["methods"]["selected"]
        if run["defect_frames"] != earlier["defect_frames"] or (
            run["normal_frames"] != earlier["normal_frames"] or
            run["new_episodes"] != earlier["new_episodes"] or
            run["review_episodes"] != earlier["review_episodes"] or
            (run["average_precision"] is None) != (earlier["average_precision"] is None) or
            run["average_precision"] is not None and earlier["average_precision"] is not None
            and abs(run["average_precision"] - earlier["average_precision"]) > 0.0005
        ):
            raise ValueError(f"recorded population, ranking, or review yield changed: {name}")
        observed = run["quantiles"]["0.995"]
        if any(abs(observed[key] - earlier[key]) > 1 for key in ("tp", "fp")):
            raise ValueError(f"active limit does not reproduce: {name}")


def table(result: dict) -> list[str]:
    source = result["source"]
    rows = [
        "| Source quantile | Limit | Source continuation flags / 1,984 | Defect flags | Normal flags | New episodes flagged |",
        "| ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for q, limit in source["thresholds"].items():
        a = aggregate(result, q)
        rows.append(
            f"| {float(q) * 100:g}% | {limit:.4f} | {source['continuation_exceedances'][q]} "
            f"| {a['tp']}/{a['defect_frames']} | {a['fp']}/{a['normal_frames']} "
            f"| {a['episodes']}/{a['new_episodes']} |"
        )
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--development", type=Path, required=True)
    parser.add_argument("--final", type=Path, required=True)
    parser.add_argument("--verified-development", type=Path, required=True)
    parser.add_argument("--verified-final", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    dev = json.loads(args.development.read_text())
    final = json.loads(args.final.read_text())
    validate(dev, json.loads(args.verified_development.read_text()))
    validate(final, json.loads(args.verified_final.read_text()))
    if set(dev["protocol"]["targets"]) & set(final["protocol"]["targets"]):
        raise ValueError("development and follow-up runs overlap")
    if dev["source"] != final["source"]:
        raise ValueError("source reference or calibration changed")
    lines = [
        "# Source-only alert-limit sensitivity audit", "",
        "The selected DINOv2 reference and source calibration frames are fixed. "
        "The 97.5% candidate was recorded in `SOURCE_THRESHOLD_DECISION.md` "
        "after development and before inspecting the follow-up result. "
        "Target labels are retrospective evaluation data only; the quantile "
        "hyperparameter was chosen from public development labels.", "",
        "## Development · 5 runs", "", *table(dev), "",
        "## Follow-up · 16 runs", "", *table(final), "",
        "## Run-level comparison of 97.5% candidate and current 99.5%", "",
        "| Run | Defect flags · candidate/current | Normal flags · candidate/current | New episodes flagged · candidate/current |",
        "| --- | ---: | ---: | ---: |",
    ]
    for name, run in final["runs"].items():
        candidate = run["quantiles"]["0.975"]
        current = run["quantiles"]["0.995"]
        lines.append(
            f"| `{name}` | {candidate['tp']}/{current['tp']} "
            f"| {candidate['fp']}/{current['fp']} "
            f"| {candidate['detected_episodes']}/{current['detected_episodes']} "
            f"of {run['new_episodes']} |"
        )
    candidate = aggregate(final, "0.975")
    current = aggregate(final, "0.995")
    lines += [
        "", "## Decision", "",
        f"**Do not adopt the predeclared 97.5% candidate.** It flags "
        f"{current['tp']} → {candidate['tp']} of {current['defect_frames']} "
        f"defect frames and {current['episodes']} → {candidate['episodes']} "
        f"of {current['new_episodes']} new defect episodes, but also flags "
        f"{current['fp']:,} → {candidate['fp']:,} of "
        f"{current['normal_frames']:,} normal frames "
        f"({current['fp'] / current['normal_frames']:.1%} → "
        f"{candidate['fp'] / candidate['normal_frames']:.1%}). "
        "The added review burden is too large for a routine frame alert. "
        "Keep the existing 99.5% source limit for the current prototype; "
        "neither limit is validated for automatic rejection. "
        "The current limit still misses many defect frames on these runs, "
        "so a fixed source-calibrated frame alert is not a solved endpoint.",
    ]
    lines += [
        "", "The binary limit changes only whether a frame is flagged. "
        "Frame AP and the eight-frame rank-based review queue do not depend on it. "
        "A flagged episode means at least one eligible defect frame crossed "
        "the limit; it does not mean a person reviewed that episode. "
        "These public textile runs do not establish a rubber-belt operating limit.",
        "",
    ]
    args.out.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
