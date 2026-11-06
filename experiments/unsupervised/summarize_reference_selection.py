"""Report every run in the equal-capacity source-reference audit."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from random import Random
from statistics import mean


def pair(left: object, right: object) -> str:
    return f"{left} / {right}"


def percentage(value: float | None) -> str:
    return "—" if value is None else f"{value:.1%}"


def paired_interval(differences: list[float], *, seed: int = 42) -> str:
    if not differences:
        return "—"
    rng = Random(seed)
    count = len(differences)
    resampled = sorted(mean(differences[rng.randrange(count)] for _ in range(count))
                       for _ in range(10_000))
    return (f"{mean(differences) * 100:+.1f} pp "
            f"[{resampled[249] * 100:+.1f}, {resampled[9749] * 100:+.1f}]")


def summarize(phase: str, result: dict) -> list[str]:
    if result["protocol"]["phase"] != phase:
        raise ValueError(f"expected {phase} result")
    targets = result["protocol"]["targets"]
    if list(result["runs"]) != targets:
        raise ValueError(f"{phase} audit is incomplete or out of target order")

    rows = []
    for name in targets:
        methods = result["runs"][name]["methods"]
        selected, all_frames = methods["selected"], methods["all"]
        for field in ("scored", "defect_frames", "normal_frames", "new_episodes"):
            if selected[field] != all_frames[field]:
                raise ValueError(f"different evaluation populations in {name}: {field}")
        rows.append((name, selected, all_frames))

    positive = [(name, chosen, control) for name, chosen, control in rows
                if chosen["defect_frames"] and chosen["normal_frames"]]
    episodic = [(name, chosen, control) for name, chosen, control in rows
                if chosen["new_episodes"]]
    ap = [mean(method["average_precision"] for _, method, _ in positive),
          mean(method["average_precision"] for _, _, method in positive)] if positive else [None, None]
    coverage = [mean(method["review_episodes"] / method["new_episodes"]
                     for _, method, _ in episodic),
                mean(method["review_episodes"] / method["new_episodes"]
                     for _, _, method in episodic)] if episodic else [None, None]
    wins = sum(chosen["average_precision"] > control["average_precision"] + 1e-9
               for _, chosen, control in positive)
    losses = sum(chosen["average_precision"] + 1e-9 < control["average_precision"]
                 for _, chosen, control in positive)
    ties = len(positive) - wins - losses
    fp_fewer = sum(chosen["fp"] < control["fp"] for _, chosen, control in rows)
    fp_more = sum(chosen["fp"] > control["fp"] for _, chosen, control in rows)
    fp_tied = len(rows) - fp_fewer - fp_more
    ap_difference = [chosen["average_precision"] - control["average_precision"]
                     for _, chosen, control in positive]
    coverage_difference = [(chosen["review_episodes"] - control["review_episodes"])
                           / chosen["new_episodes"] for _, chosen, control in episodic]
    flag_deltas = [(name, run["selected_flag_reproduction_delta"])
                   for name, run in result["runs"].items()
                   if run.get("selected_flag_reproduction_delta", 0)]
    source = result["source"]
    selected_limit = f"{source['thresholds']['selected']:.4f}"
    all_limit = f"{source['thresholds']['all']:.4f}"

    lines = [
        f"## {phase.title()} · {len(rows)} recorded runs",
        "",
        f"Source continuation flags / {source['continuation_frames']} frames "
        f"(selected / all): {pair(source['continuation_flags']['selected'], source['continuation_flags']['all'])}.",
        f"Source-calibrated thresholds (selected / all): "
        f"{pair(selected_limit, all_limit)}",
        "",
        "| Measure | Selected / all-startup |",
        "| --- | ---: |",
        f"| Macro frame AP · {len(positive)} defect runs | {pair(*map(percentage, ap))} |",
        f"| Macro new-episode coverage @8 · {len(episodic)} episode-bearing runs | "
        f"{pair(*map(percentage, coverage))} |",
        f"| Defect frames flagged / {sum(chosen['defect_frames'] for _, chosen, _ in rows)} | "
        f"{pair(sum(chosen['tp'] for _, chosen, _ in rows), sum(control['tp'] for _, _, control in rows))} |",
        f"| Normal frames flagged / {sum(chosen['normal_frames'] for _, chosen, _ in rows)} | "
        f"{pair(sum(chosen['fp'] for _, chosen, _ in rows), sum(control['fp'] for _, _, control in rows))} |",
        f"| New episodes found in eight reviews / {sum(chosen['new_episodes'] for _, chosen, _ in rows)} | "
        f"{pair(sum(chosen['review_episodes'] for _, chosen, _ in rows), sum(control['review_episodes'] for _, _, control in rows))} |",
        "",
        f"Selected-reference AP wins / ties / losses: {wins} / {ties} / {losses} defect runs.",
        f"Selected-reference normal-alert reductions / ties / increases: "
        f"{fp_fewer} / {fp_tied} / {fp_more} runs.",
        f"Paired run-bootstrap AP difference (selected − all): "
        f"{paired_interval(ap_difference)}.",
        f"Paired run-bootstrap episode-coverage difference (selected − all): "
        f"{paired_interval(coverage_difference)}.",
        "Fresh-encode selected-reference alert-count differences from the saved "
        "benchmark: " + (", ".join(f"`{name}` {delta:+d}" for name, delta in flag_deltas)
                        if flag_deltas else "none") + ".",
        "",
        "| Run | Defect frames | Frame AP · selected / all | Defect flags · selected / all | "
        "Normal flags · selected / all | Episodes @8 · selected / all |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
    ]
    for name, chosen, control in rows:
        lines.append(
            f"| `{name}` | {chosen['defect_frames']} | "
            f"{pair(percentage(chosen['average_precision']), percentage(control['average_precision']))} | "
            f"{pair(chosen['tp'], control['tp'])} | {pair(chosen['fp'], control['fp'])} | "
            f"{pair(chosen['review_episodes'], control['review_episodes'])} "
            f"of {chosen['new_episodes']} |"
        )
    lines.append("")
    return lines


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--development", type=Path, required=True)
    parser.add_argument("--final", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    development = json.loads(args.development.read_text(encoding="utf-8"))
    final = json.loads(args.final.read_text(encoding="utf-8"))
    for key in ("source_startup", "source_calibration", "source_continuation",
                "target_evaluation_start", "target_cap", "equal_bank_vectors"):
        if development["protocol"][key] != final["protocol"][key]:
            raise ValueError(f"protocol differs across phases: {key}")
    if development["source"] != final["source"]:
        raise ValueError("source references differ across phases")
    lines = [
        "# Source-reference selection: equal-capacity audit",
        "",
        "The DINOv2 features, startup frames, patch-bank size, scorer, and review budget "
        "are fixed. Only the label-free source-reference selection changes. Each bank "
        "has its own source-calibrated threshold. Public labels are used only after "
        "scoring and review selection.",
        "",
        "The 5 development and 16 extended-evaluation runs are separate for this "
        "comparison, but some runs appeared in earlier project studies. The extended "
        "evaluation is not an untouched external benchmark.",
        "",
    ]
    lines += summarize("development", development)
    lines += summarize("final", final)
    lines += [
        "Thresholded flag counts depend on each bank's separate source calibration. "
        "AP and eight-review episode coverage compare the reference representations "
        "without choosing a target threshold. Per-run results should be read alongside "
        "the macro figures before changing the site or active reference. Paired "
        "run-bootstrap intervals reflect the few recorded runs, not field uncertainty.",
        "",
    ]
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
