"""Reaggregate saved TSFabrics results after removing repeated T/S/I settings."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).parent / "results"
NAME = re.compile(r"T\d+_S\d+_I\d+_\d+")


def read(name: str) -> dict:
    return json.loads((ROOT / name).read_text())


def setting(name: str) -> str:
    if NAME.fullmatch(name) is None:
        raise ValueError(f"Unexpected scenario name: {name}")
    return name.rsplit("_", 1)[0]


def mean(values: list[float]) -> float:
    return sum(values) / len(values)


def summarize(names: list[str], benchmark: dict, reference: dict, factorial: dict) -> dict:
    defect = [name for name in names if benchmark["runs"][name]["defect_frames"] > 0]
    episodes = sum(benchmark["runs"][name]["new_defect_episodes"] for name in names)
    methods = {}
    for method in ("handcrafted_source", "source_knn"):
        methods[method] = {
            "macro_ap": mean([benchmark["runs"][name]["methods"][method]["average_precision"]
                              for name in defect]),
            "per_run_ap": {name: benchmark["runs"][name]["methods"][method]["average_precision"]
                           for name in defect},
        }
    ref = {}
    for method in ("all", "selected"):
        ref[method] = {
            "macro_ap": mean([reference["runs"][name]["methods"][method]["average_precision"]
                              for name in defect]),
            "normal_flags": sum(reference["runs"][name]["methods"][method]["fp"] for name in names),
            "normal_frames": sum(reference["runs"][name]["methods"][method]["normal_frames"] for name in names),
            "defect_flags": sum(reference["runs"][name]["methods"][method]["tp"] for name in names),
            "defect_frames": sum(reference["runs"][name]["methods"][method]["defect_frames"] for name in names),
            "episodes_in_eight_reviews": sum(
                factorial["runs"][name]["methods"][method]["spaced8"]["new_episodes"]
                for name in names),
        }
    reviews = {
        queue: sum(benchmark["runs"][name]["methods"]["source_knn"]["queues"][queue]["new_episodes"]
                   for name in names)
        for queue in ("top8", "spaced8")
    }
    for name in names:
        assert (reference["runs"][name]["methods"]["selected"]["review_episodes"] ==
                factorial["runs"][name]["methods"]["selected"]["spaced8"]["new_episodes"])
        assert (benchmark["runs"][name]["methods"]["source_knn"]["queues"]["spaced8"]["new_episodes"] ==
                factorial["runs"][name]["methods"]["selected"]["spaced8"]["new_episodes"])
    return {"runs": names, "defect_runs": defect, "new_episodes": episodes,
            "methods": methods, "reference": ref, "review_episodes": reviews}


def main() -> None:
    development = read("unlabeled_review_development.json")
    benchmark = read("unlabeled_review_final.json")
    reference = read("reference_selection_final_verified.json")
    factorial = read("reference_review_factorial_final.json")
    names = benchmark["protocol"]["targets"]
    if set(names) != set(reference["runs"]) or set(names) != set(factorial["runs"]):
        raise ValueError("Evaluation run sets differ")
    development_settings = {setting(name) for name in development["protocol"]["targets"]}
    repeated = [name for name in names if setting(name) in development_settings]
    distinct = [name for name in names if setting(name) not in development_settings]
    output = {
        "grouping": "same T, S, and I; recording index may differ",
        "development_settings": sorted(development_settings),
        "repeated_setting_runs": repeated,
        "all_final": summarize(names, benchmark, reference, factorial),
        "different_setting_subset": summarize(distinct, benchmark, reference, factorial),
        "interpretation": "Post-hoc subset of previously inspected runs; not a new independent benchmark",
    }
    path = ROOT / "setting_disjoint_audit.json"
    path.write_text(json.dumps(output, indent=2, allow_nan=False) + "\n")
    print(json.dumps({"repeated": repeated, "remaining": len(distinct),
                      "defect_remaining": output["different_setting_subset"]["defect_runs"],
                      "episodes": output["different_setting_subset"]["new_episodes"]}))


if __name__ == "__main__":
    main()
