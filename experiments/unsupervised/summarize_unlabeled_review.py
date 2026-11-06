"""Create an auditable run-level summary from the fixed comparison JSONs."""

from __future__ import annotations

import argparse
import json
import random
import statistics
from pathlib import Path


SELECTED = "local_selected_knn"
QUEUE = "spaced8"
METHODS = (
    ("handcrafted_source", "Handcrafted source"),
    ("source_knn", "Frozen DINO source"),
    ("local_all_knn", "Local all · kNN"),
    ("local_selected_knn", "Local selected · kNN"),
    ("local_all_pca", "Local all · PCA"),
    ("local_selected_pca", "Local selected · PCA"),
    ("source_local_knn_meanrank", "Source + local rank"),
    ("source_local_pca_meanrank", "Source + local PCA rank"),
)


def mean(values: list[float]) -> float | None:
    return statistics.mean(values) if values else None


def pct(value: float | None) -> str:
    return "—" if value is None else f"{value * 100:.1f}%"


def bootstrap_difference(runs: list[dict], left: str, right: str,
                         queue: str = QUEUE) -> tuple[float, float, float]:
    differences = [
        (run["methods"][left]["queues"][queue]["new_episodes"] -
         run["methods"][right]["queues"][queue]["new_episodes"]) /
        run["new_defect_episodes"]
        for run in runs if run["new_defect_episodes"]
    ]
    rng = random.Random(42)
    replicates = sorted(mean([rng.choice(differences) for _ in differences])
                        for _ in range(10000))
    return mean(differences), replicates[249], replicates[9749]


def phase_lines(title: str, data: dict) -> list[str]:
    runs = data["runs"]
    positives = [run for run in runs.values() if run["new_defect_episodes"]]
    lines = [f"## {title}", "", f"{len(runs)} runs; {len(positives)} with new post-startup defect episodes.", "",
             "| Scorer | Macro episode coverage @8 | Episodes found / total | Macro AP on defect runs | Normal reviews |",
             "| --- | ---: | ---: | ---: | ---: |"]
    for key, label in METHODS:
        coverages = [run["methods"][key]["queues"][QUEUE]["new_episodes"] /
                     run["new_defect_episodes"] for run in positives]
        found = sum(run["methods"][key]["queues"][QUEUE]["new_episodes"] for run in positives)
        total = sum(run["new_defect_episodes"] for run in positives)
        ap = mean([run["methods"][key]["average_precision"] for run in positives
                   if run["methods"][key]["average_precision"] is not None])
        normal = sum(run["methods"][key]["queues"][QUEUE]["normal_reviews"] for run in runs.values())
        lines.append(f"| {label} | {pct(mean(coverages))} | {found}/{total} | {pct(ap)} | {normal} |")
    lines += ["", "### Fixed review budget, different queue rules", "",
              "| Queue on selected scorer | Macro episode coverage @8 | Defect reviews | Normal reviews |",
              "| --- | ---: | ---: | ---: |"]
    for queue, label in (("top8", "Top 8 adjacent allowed"),
                         ("spaced8", "Top 8, ≥16 frames apart"),
                         ("high6_random2", "Top 6 + random 2"),
                         ("random8", "Random 8, seed 42")):
        covered = [run["methods"][SELECTED]["queues"][queue]["new_episodes"] /
                   run["new_defect_episodes"] for run in positives]
        defect = sum(run["methods"][SELECTED]["queues"][queue]["defect_reviews"]
                     for run in runs.values())
        normal = sum(run["methods"][SELECTED]["queues"][queue]["normal_reviews"]
                     for run in runs.values())
        lines.append(f"| {label} | {pct(mean(covered))} | {defect} | {normal} |")
    random_mean = mean([run["random_100"]["mean_episodes"] / run["new_defect_episodes"]
                        for run in positives])
    lines.append(f"\n100-seed random mean macro episode coverage: {pct(random_mean)}.\n")
    lines += ["### Per-run selected scorer versus frozen source", "",
              "| Run | Scored frames | New episodes | Selected @8 | Frozen @8 | Random expected @8 | Selected AP |",
              "| --- | ---: | ---: | ---: | ---: | ---: | ---: |"]
    for name, run in runs.items():
        selected = run["methods"][SELECTED]["queues"][QUEUE]["new_episodes"]
        frozen = run["methods"]["source_knn"]["queues"][QUEUE]["new_episodes"]
        ap = run["methods"][SELECTED]["average_precision"]
        lines.append(f"| `{name}` | {run['evaluation_frames']} | {run['new_defect_episodes']} | "
                     f"{selected} | {frozen} | {run['random_100']['mean_episodes']:.2f} | {pct(ap)} |")
    if len(positives) >= 2:
        for left, right, label in ((SELECTED, "source_knn", "Local selected − frozen DINO"),
                                   (SELECTED, "local_all_knn", "Selection − unselected local bank")):
            value, low, high = bootstrap_difference(positives, left, right)
            lines.append(f"\nRun-bootstrap difference in macro episode coverage, {label}: "
                         f"{value:+.3f} [{low:+.3f}, {high:+.3f}] (95% percentile; few runs).")
    alarms = [run["operational_summary"]["change_alert"] for run in runs.values()]
    delays = [run["operational_summary"]["change_delay_from_boundary"]
              for run in runs.values() if run["operational_summary"]["change_delay_from_boundary"] is not None]
    before = sum(alarm is not None and alarm < run["operational_summary"]["splice_boundary"]
                 for alarm, run in zip(alarms, runs.values()))
    selected_contamination = sum(run["reference_contamination_for_audit_only"]["selected"]
                                 for run in runs.values())
    all_contamination = sum(run["reference_contamination_for_audit_only"]["all"]
                            for run in runs.values())
    lines += ["", "### Visual-change and reference audit", "",
              f"Source continuation alarm: {data['protocol']['source_continuation_alarm'] or 'none'}. "
              f"Synthetic run switch: {len(delays)}/{len(runs)} targets alerted; "
              f"{before} alerted before the boundary. Alert delay after the boundary: "
              f"median {statistics.median(delays):.0f} frames "
              f"(range {min(delays)}–{max(delays)}).",
              f"Startup reference frames labeled defective in the offline audit: "
              f"selected {selected_contamination}, time-spread {all_contamination}. "
              "These labels were not available to the selector."]
    return lines + [""]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("development", type=Path)
    parser.add_argument("final", type=Path)
    parser.add_argument("out", type=Path)
    args = parser.parse_args()
    development = json.loads(args.development.read_text())
    final = json.loads(args.final.read_text())
    expected = set(development["protocol"]["targets"]) | set(final["protocol"]["targets"])
    if len(expected) != 21 or set(development["runs"]) & set(final["runs"]):
        raise ValueError("run partition is not 21 disjoint targets")
    lines = ["# Unlabeled review benchmark", "",
             "Selected on development runs: local low-novelty 32-frame DINO patch bank,",
             "highest eight scores spaced by at least 16 frames. Public labels enter only",
             "the retrospective metrics. All remaining scenarios form the final evaluation.", ""]
    lines += phase_lines("Development", development)
    lines += phase_lines("Final evaluation", final)
    lines += ["## Interpretation", "",
              "The development choice found the same 26 of 90 episodes as the frozen DINO "
              "source on the four defect-bearing final runs. Its macro episode coverage "
              "was 71.1% for both, while frozen-source macro frame AP was 85.4% versus "
              "81.5% for the selected local bank. The local bank did not demonstrate "
              "a gain over keeping the source reference fixed. Selection improved the "
              "equal-capacity local bank relative to time-spread startup frames "
              "(45.7% to 71.1% macro episode coverage), but the four-run bootstrap "
              "interval includes zero. Treat it as an optional candidate, not an "
              "approved replacement.", "",
              "The packaged interval replay therefore keeps the frozen source DINO "
              "reference active and uses the same 16-frame-spaced eight-review rule. "
              "This conservative deployment choice was made after seeing final results; "
              "it is not a new independent test of that choice.", "",
              "Temporal spacing was the stronger tested change: 37.3% to 71.1% macro "
              "episode coverage for eight ranked reviews. It spread requests across "
              "events but did not reduce the workload: all 16 runs still requested "
              "eight reviews, including 101 normal-frame reviews out of 128. The "
              "69-episode run can contribute at most eight discoveries, so macro "
              "coverage and pooled 26/90 answer different questions.", "",
              "The change test concatenates separate recorded runs at a known boundary. "
              "It supports a visual-shift signal, not localization of a genuine "
              "within-line process change. The prototype shows observed score "
              "summaries and review requests; it neither knows defect truth before "
              "review nor updates the production reference automatically. A rule for "
              "when to request fewer than eight reviews, and a guarded feedback "
              "update, need a new development protocol and independent validation.", ""]
    args.out.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
