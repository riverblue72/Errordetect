"""Turn fixed eight-review results into a complete, auditable run table."""

from __future__ import annotations

import argparse
import json
import statistics
from pathlib import Path


def counts(item: dict | None) -> str:
    return "—" if item is None else f"{item['tp']} / {item['fp']}"


def pct(value: float | None) -> str:
    return "—" if value is None else f"{100 * value:.1f}%"


def phase(title: str, data: dict) -> list[str]:
    runs = data["runs"]
    evaluated = {name: row for name, row in runs.items() if row["status"] == "evaluated"}
    excluded = {name: row for name, row in runs.items() if row["status"] != "evaluated"}
    positives = [row for row in evaluated.values() if row["source"]["defect_frames"]]
    normals = [row for row in evaluated.values() if not row["source"]["defect_frames"]]
    exclusion_word = "exclusion" if len(excluded) == 1 else "exclusions"
    lines = [f"## {title}", "",
             f"{len(evaluated)} evaluated runs; {len(positives)} with later defect frames; "
             f"{len(normals)} normal-only. {len(excluded)} length-based {exclusion_word}.", "",
             "TP / FP are defect / normal **frames flagged on later photos**, "
             "using the unchanged source threshold. A zero in the TP column on "
             "a normal run has no recall meaning. Episodes that began before the "
             "later test boundary are excluded from *new* episode counts, even "
             "if their later defect frames are flagged.", "",
             "| Run | Change before review | Later defect frames | Frozen TP / FP | Raw addition TP / FP | Gated addition TP / FP | Same-size random TP / FP | Reviewed normal / defect |",
             "| --- | :---: | ---: | ---: | ---: | ---: | ---: | ---: |"]
    for name, row in runs.items():
        if row["status"] != "evaluated":
            lines.append(f"| `{name}` | — | — | — | — | — | — | excluded: {row['frames']} frames |")
            continue
        primary = row["strategies"]["spaced8"]
        lines.append(f"| `{name}` | {'yes' if row['changed_before_review'] else 'no'} | "
                     f"{row['source']['defect_frames']} | {counts(row['source'])} | "
                     f"{counts(primary['candidate'])} | {counts(primary.get('gated_candidate'))} | "
                     f"{counts(primary.get('equal_patch_count_random_control'))} | "
                     f"{primary['confirmed_normal']} / {primary['confirmed_defect']} |")
    if excluded:
        lines += ["", "Excluded solely by the prespecified minimum of 128 later frames: "
                  + ", ".join(f"`{name}` ({row['frames']})" for name, row in excluded.items()) + "."]
    lines += ["", "### Aggregates", "",
              "| Path | Defect frames flagged / total | Normal frames flagged / total | Defect episodes flagged / total | Episodes found in eight later reviews / total | Macro AP on defect runs |",
              "| --- | ---: | ---: | ---: | ---: | ---: |"]
    paths = (("Frozen active", lambda row: row["source"]),
             ("Raw reviewed-normal addition", lambda row: row["strategies"]["spaced8"]["candidate"] or row["source"]),
             ("Novelty-gated addition", lambda row: row["strategies"]["spaced8"].get("gated_candidate") or row["source"]),
             ("Equal-size random patch subset", lambda row: row["strategies"]["spaced8"].get("equal_patch_count_random_control") or row["source"]),
             ("Reviewed-defect guard, raw", lambda row: row["strategies"]["spaced8"]["guarded_shadow"]))
    for label, getter in paths:
        items = [getter(row) for row in evaluated.values()]
        defect = sum(item["defect_frames"] for item in items)
        normal = sum(item["normal_frames"] for item in items)
        tp = sum(item["tp"] for item in items)
        fp = sum(item["fp"] for item in items)
        events = sum(item["new_episodes"] for item in items)
        found = sum(item["detected_episodes"] for item in items)
        reviewed = sum(item["review_episodes"] for item in items)
        ap = statistics.mean(item["average_precision"] for item in items
                             if item["average_precision"] is not None) if positives else None
        lines.append(f"| {label} | {tp}/{defect} | {fp}/{normal} | "
                     f"{found}/{events} | {reviewed}/{events} | {pct(ap)} |")
    guarded = [row for row in evaluated.values()
               if row["strategies"]["spaced8"]["status"] == "shadow_only"]
    harmed = [row for row in guarded
              if row["strategies"]["spaced8"]["candidate"]["tp"] < row["source"]["tp"]]
    gated_harmed = [row for row in guarded
                    if row["strategies"]["spaced8"]["gated_candidate"]["tp"] < row["source"]["tp"]]
    no_defect_evidence = sum(row["strategies"]["spaced8"]["reviewed_detected_defects"] == 0
                             for row in guarded)
    lines += ["", f"The reviewed-defect guard let {len(guarded)} candidates pass "
              f"its local check; {len(harmed)} later lost defect frames under raw "
              f"addition, and {len(gated_harmed)} under novelty gating. "
              f"{no_defect_evidence} of the passing cases had no previously detected "
              "defect among the eight reviewed frames. This is a diagnostic guard, "
              "not an approval rule.", ""]
    if positives:
        lines += ["### Defect-bearing runs", "",
                  "| Run | Source TP / episodes | Raw TP / episodes | Gated TP / episodes | Source AP / AUROC | Raw AP / AUROC |",
                  "| --- | ---: | ---: | ---: | ---: | ---: |"]
        for name, row in evaluated.items():
            if not row["source"]["defect_frames"]:
                continue
            source = row["source"]
            raw = row["strategies"]["spaced8"]["candidate"] or source
            gated = row["strategies"]["spaced8"].get("gated_candidate") or source
            def detected(item: dict) -> str:
                return f"{item['tp']} / {item['detected_episodes']}"
            def ranking(item: dict) -> str:
                return f"{pct(item['average_precision'])} / {pct(item['auroc'])}"
            lines.append(f"| `{name}` | {detected(source)} | {detected(raw)} | "
                         f"{detected(gated)} | {ranking(source)} | {ranking(raw)} |")
        lines.append("")
    lines += ["### Review queue and capacity controls", "",
              "| Queue or control | Later TP | Later FP | Later episodes | Confirmed normal / defect reviews |",
              "| --- | ---: | ---: | ---: | ---: |"]
    for label, key in (("Spaced high-score eight", "spaced8"),
                       ("High six + random two", "high6_random2"),
                       ("Random eight", "random8")):
        entries = [row["strategies"][key] for row in evaluated.values()]
        candidates = [entry["candidate"] or row["source"]
                      for entry, row in zip(entries, evaluated.values())]
        lines.append(f"| {label} | {sum(item['tp'] for item in candidates)} | "
                     f"{sum(item['fp'] for item in candidates)} | "
                     f"{sum(item['detected_episodes'] for item in candidates)} | "
                     f"{sum(entry['confirmed_normal'] for entry in entries)} / "
                     f"{sum(entry['confirmed_defect'] for entry in entries)} |")
    controls = [row["unlabeled_control"]["result"] or row["source"]
                for row in evaluated.values()]
    lines.append(f"| Unreviewed frames, capacity matched | "
                 f"{sum(item['tp'] for item in controls)} | "
                 f"{sum(item['fp'] for item in controls)} | "
                 f"{sum(item['detected_episodes'] for item in controls)} | n/a |")
    lines += ["", "The unreviewed control uses the same number of frames as confirmed "
              "normals in the primary queue, without using their labels. All rows are "
              "offline candidates, not adopted detectors.", ""]
    primary = [row["strategies"]["spaced8"] for row in evaluated.values()]
    lost_tp = sum(entry["candidate"] is not None and
                  entry["candidate"]["tp"] < row["source"]["tp"]
                  for entry, row in zip(primary, evaluated.values())
                  if row["source"]["defect_frames"])
    improved_fp = sum(entry["candidate"] is not None and
                      entry["candidate"]["fp"] < row["source"]["fp"]
                      for entry, row in zip(primary, evaluated.values()))
    lines += [f"Raw addition lowered normal-frame alerts in {improved_fp}/{len(evaluated)} "
              f"runs, but lost defect-frame detections in {lost_tp}/{len(positives)} "
              "defect-bearing runs. The remaining defect-bearing runs tied; no run "
              "gained a newly detected defect at the unchanged threshold.", ""]
    return lines


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("development", type=Path)
    parser.add_argument("final", type=Path)
    parser.add_argument("out", type=Path)
    args = parser.parse_args()
    development = json.loads(args.development.read_text())
    final = json.loads(args.final.read_text())
    dev_targets = set(development["protocol"]["targets"])
    final_targets = set(final["protocol"]["targets"])
    if len(dev_targets) != 5 or len(final_targets) != 16 or dev_targets & final_targets:
        raise ValueError("expected five development and sixteen disjoint final runs")
    if (set(development["runs"]) != dev_targets or set(final["runs"]) != final_targets or
        development["protocol"]["review_window"] != final["protocol"]["review_window"] or
        development["protocol"]["later_test_start"] != final["protocol"]["later_test_start"] or
        development["protocol"]["source_threshold"] != final["protocol"]["source_threshold"]):
        raise ValueError("phase output is incomplete or window definitions differ")
    for phase_data in (development, final):
        start = phase_data["protocol"]["later_test_start"]
        review_end = phase_data["protocol"]["review_window"][1]
        if start <= review_end:
            raise ValueError("review and later test windows overlap")
        for name, row in phase_data["runs"].items():
            if row["status"] != "evaluated":
                continue
            source = row["source"]
            for key in ("spaced8", "high6_random2", "random8"):
                entry = row["strategies"][key]
                if any(frame > review_end for frame in entry["review_frames"]):
                    raise ValueError(f"review frame beyond window: {name}")
                for variant in ("candidate", "gated_candidate", "equal_patch_count_random_control"):
                    candidate = entry.get(variant)
                    if candidate is None:
                        continue
                    for metric in ("defect_frames", "normal_frames", "new_episodes"):
                        if candidate[metric] != source[metric]:
                            raise ValueError(f"different test set: {name} {variant}")
                    if candidate["tp"] > source["tp"] or candidate["fp"] > source["fp"]:
                        raise ValueError(f"patch addition raised a score: {name} {variant}")
    lines = ["# Eight-review feedback validation", "",
             "Recorded operator decisions use public TSFabrics labels only on "
             "the eight selected review photos. Every later score is evaluated "
             "on chronologically disjoint frames. The frozen source is the active "
             "path; all update paths are offline counterfactuals. The final "
             "runs were inspected in earlier studies, so this locked new comparison "
             "is not an untouched external benchmark.", "",
             "The later eight-review episode yield is a separate retrospective "
             "request from each method's later scores, not a label used to fit "
             "the candidate.", ""]
    lines += phase("Development", development)
    lines += phase("Final", final)
    lines += ["## Decision", "",
              "Adding reviewed normal patches to a nearest-neighbor bank can only "
              "lower or preserve a query's nearest-neighbor distances. At an "
              "unchanged threshold it cannot create a newly detected defect. "
              "Its possible benefit is fewer normal false alerts, which must be "
              "weighed against suppressed true detections. Novelty gating and a "
              "few reviewed-defect checks do not establish safety unless the "
              "separate later evaluation also preserves defect detection. "
              "AP can improve even while fixed-threshold TP falls, so neither "
              "metric alone is an approval criterion.", "",
              "The earlier two-run update demonstration is an illustrative "
              "shadow experiment. The full, fixed-budget comparison here is the "
              "basis for the current operating choice: retain the frozen source "
              "and use sparse review for triage and evidence collection; do not "
              "promote a candidate automatically. Production deployment still "
              "requires company images and prospectively reviewed defect and "
              "normal cases.", ""]
    args.out.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
