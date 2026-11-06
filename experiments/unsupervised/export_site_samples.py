"""Export selected, held-out TSFabrics frames and recorded model outputs for GitHub Pages.

Selection uses public labels only to include both successes and errors in the
static explorer. Labels never enter reference building, scoring, or calibration.
Run from the repository root on the experiment machine.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

from core import PatchScorer, build_reference_bank, mutual_image_scores, select_reference_indices
from drift import DriftDetector
from tsfabrics import TSFabricsArchive


ROOT = Path("experiments/unsupervised")
OUT = ROOT / "site_export"
SOURCE = "T1_S174_I111_1"
STREAMS = (
    ("T1_S148_I108_2", "Related run", ("hit", "clear", "false_alarm", "miss")),
    ("T1_S164_I36_1", "Changed run · normal", ("false_alarm", "clear")),
    ("T1_S478_I118_2", "Larger-shift run", ("hero", "miss", "clear", "hit", "miss", "clear")),
)
MORE_SAMPLES = (
    ("T1_S148_I108_2", "Related run", ("hit", "miss", "clear", "hit")),
    ("T1_S164_I36_1", "Changed run · normal", ("clear", "clear", "clear", "clear")),
    ("T1_S478_I118_2", "Larger-shift run", ("hit", "clear", "clear", "clear")),
)
START = 832
GAP = 64


def cached(scenario: str) -> tuple[np.ndarray, np.ndarray]:
    prefix = ROOT / "features" / scenario
    return (np.load(prefix.with_suffix(".tokens.npy"), mmap_mode="r"),
            np.load(prefix.with_suffix(".global.npy"), mmap_mode="r"))


def choose(kind: str, scores: np.ndarray, labels: np.ndarray, threshold: float,
           used: list[int]) -> int:
    if kind == "hero":
        choice = 1508
        if not labels[choice - START] or scores[choice - START] < threshold:
            raise ValueError("Recorded hero frame no longer matches the experiment")
        return choice
    defect = kind in {"hit", "miss"}
    flagged = kind in {"hit", "false_alarm"}
    pool = np.flatnonzero((labels == defect) & ((scores >= threshold) == flagged)) + START
    pool = [int(i) for i in pool if all(abs(int(i) - prior) >= GAP for prior in used)]
    if not pool:
        raise ValueError(f"No separated {kind} example available")
    # Prefer visible, decisive examples; the explorer is explicitly a curated sample.
    return max(pool, key=lambda i: abs(float(scores[i - START]) - threshold))


def overlay(heat: np.ndarray, threshold: float, size: tuple[int, int], path: Path) -> None:
    strength = np.clip((np.asarray(heat, dtype=np.float32) - threshold * .55)
                       / max(threshold * .55, 1e-5), 0, 1)
    mask = Image.fromarray(np.asarray(strength * 190, dtype=np.uint8), "L")
    mask = mask.resize(size, Image.Resampling.BICUBIC)
    colored = Image.new("RGBA", size, (237, 88, 83, 0))
    colored.putalpha(mask)
    colored.save(path, optimize=True)


def main() -> None:
    if not hasattr(Image, "Resampling"):
        Image.Resampling = Image
    OUT.mkdir(parents=True, exist_ok=True)
    archive = TSFabricsArchive(ROOT / "data" / "TSfabrics.zip")
    source, source_global = cached(SOURCE)
    startup = np.asarray(source[:512])
    chosen = select_reference_indices(mutual_image_scores(startup),
                                      np.asarray(source_global[:512]))
    scorer = PatchScorer(build_reference_bank(startup, chosen))
    detector = DriftDetector(np.asarray(source_global[:2048]))
    results = json.loads((ROOT / "results" / "tsfabrics.json").read_text())
    threshold = float(results["methods"]["mutual"]["threshold"])
    samples: list[dict] = []
    streams: dict[str, dict] = {}
    used_by_scenario: dict[str, list[int]] = {}

    for scenario, title, plan in (*STREAMS, *MORE_SAMPLES):
        tokens, global_features = cached(scenario)
        rows = archive.scenarios[scenario]
        scores, maps = scorer.score(tokens[START:])
        labels = np.asarray([bool(row["label"]) for row in rows[START:]], dtype=bool)
        used = used_by_scenario.setdefault(scenario, [])
        selected: list[int] = []
        for kind in plan:
            index = choose(kind, scores, labels, threshold, used)
            used.append(index)
            selected.append(index)

        target_startup = np.asarray(tokens[:512])
        target_chosen = select_reference_indices(mutual_image_scores(target_startup),
                                                 np.asarray(global_features[:512]))
        candidate = PatchScorer(build_reference_bank(target_startup, target_chosen))
        candidate_scores, candidate_maps = candidate.score(tokens[selected])
        candidate_threshold = float(results["methods"]["mutual"]["targets"][scenario]
                                    ["candidate_adaptation"]["threshold"])
        ends, changes = detector.sequence_scores(np.asarray(global_features))
        alarm = detector.first_alarm(np.asarray(global_features))
        streams[scenario] = {
            "title": title,
            "first_alarm": alarm,
            "change_threshold": detector.threshold,
            "change_ends": ends.tolist(),
            "change_scores": changes.astype(float).tolist(),
        }

        for index, kind, candidate_score, candidate_map in zip(selected, plan,
                                                                 candidate_scores, candidate_maps):
            number = len(samples) + 1
            stem = f"sample-{number:02d}"
            image = archive.read_image(rows[index]["image"]).convert("RGB")
            image.save(OUT / f"{stem}.jpg", quality=88, optimize=True)
            overlay(maps[index - START], threshold, image.size, OUT / f"{stem}-current.png")
            overlay(candidate_map, candidate_threshold, image.size,
                    OUT / f"{stem}-candidate.png")
            samples.append({
                "id": number,
                "scenario": scenario,
                "frame": int(index),
                "label": "Defect" if labels[index - START] else "Normal",
                "selection": kind,
                "image": f"./next-samples/{stem}.jpg",
                "current": {
                    "score": float(scores[index - START]),
                    "threshold": threshold,
                    "heatmap": f"./next-samples/{stem}-current.png",
                },
                "candidate": {
                    "score": float(candidate_score),
                    "threshold": candidate_threshold,
                    "heatmap": f"./next-samples/{stem}-candidate.png",
                },
            })

    payload = {"dataset": "TSFabrics", "source": SOURCE, "samples": samples,
               "streams": streams}
    (OUT / "catalog.json").write_text(json.dumps(payload, separators=(",", ":")))
    print(json.dumps({"samples": len(samples), "labels": [s["label"] for s in samples],
                      "first_alarms": {k: v["first_alarm"] for k, v in streams.items()}}, indent=2))


if __name__ == "__main__":
    main()
