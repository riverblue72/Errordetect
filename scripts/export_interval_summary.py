"""Package recorded TSFabrics evaluation intervals for the static review UI."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "experiments/unsupervised/results/tsfabrics.json"
SCENARIO = ROOT / "web/scenario/manifest.json"
OUTPUT = ROOT / "web/next-samples/intervals.json"


def counts(result: dict) -> dict:
    # The site handoff has no ground-truth labels. Keep only observable decisions.
    return {"count": int(result["count"]), "flagged": int(result["tp"] + result["fp"])}


def main() -> None:
    results = json.loads(RESULTS.read_text(encoding="utf-8"))
    photos = json.loads(SCENARIO.read_text(encoding="utf-8"))
    protocol = results["protocol"]
    method = results["methods"]["mutual"]
    source_end = protocol["source_test"][1]
    intervals = [{
        "id": "reference",
        "title": "Reference run",
        "scenario": protocol["source"],
        "start": protocol["source_test"][0] + 1,
        "end": source_end,
        "first_alarm": results["drift"]["source_heldout_first_alarm"],
        "current": counts(method["source_heldout"]),
        "review_frames": [],
    }]
    for scenario in protocol["targets"]:
        result = method["targets"][scenario]
        current = result["frozen"]
        end = protocol["target_evaluation_start"] + current["count"]
        review_frames = [
            {
                "frame": photo["display_frame"],
                "image": "./scenario/" + photo["file"],
            }
            for photo in photos
            if photo["scenario"] == scenario and photo["index"] < protocol["target_adapt"]
        ]
        intervals.append({
            "id": scenario,
            "title": {
                "T1_S148_I108_2": "Run 01",
                "T1_S164_I36_1": "Run 02",
                "T1_S478_I118_2": "Run 03",
            }[scenario],
            "scenario": scenario,
            "start": protocol["target_evaluation_start"] + 1,
            "end": end,
            "first_alarm": result["drift_first_alarm_frame"],
            "current": counts(current),
            "review_frames": review_frames,
        })
    OUTPUT.write_text(json.dumps({"dataset": "TSFabrics", "intervals": intervals},
                                 indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT} ({len(intervals)} intervals)")


if __name__ == "__main__":
    main()
