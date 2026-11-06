"""Export small, traceable TSFabrics assets for the next-method animations.

Run from the repository root on the experiment machine. All images remain in
the ignored animation_data directory; the published animation is generated
separately and credits the CC BY 4.0 dataset.
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
SOURCE = "T1_S174_I111_1"
TARGET = "T1_S478_I118_2"
DRIFT_TARGET = "T1_S164_I36_1"
OUT = ROOT / "animation_data"


def cached(scenario: str) -> tuple[np.ndarray, np.ndarray]:
    prefix = ROOT / "features" / scenario
    return (np.load(prefix.with_suffix(".tokens.npy"), mmap_mode="r"),
            np.load(prefix.with_suffix(".global.npy"), mmap_mode="r"))


def write_jpeg(archive: TSFabricsArchive, name: str, path: Path) -> None:
    archive.read_image(name).convert("RGB").save(path, quality=90, optimize=True)


def main() -> None:
    if not hasattr(Image, "Resampling"):
        Image.Resampling = Image
    OUT.mkdir(parents=True, exist_ok=True)
    archive = TSFabricsArchive(ROOT / "data" / "TSfabrics.zip")
    source, source_global = cached(SOURCE)
    target, target_global = cached(TARGET)
    _, drift_global = cached(DRIFT_TARGET)

    startup = np.asarray(source[:512])
    novelty = mutual_image_scores(startup)
    chosen = select_reference_indices(novelty, np.asarray(source_global[:512]))
    selected_bank = build_reference_bank(startup, chosen)
    scorer = PatchScorer(selected_bank)

    candidate_startup = np.asarray(target[:512])
    candidate_novelty = mutual_image_scores(candidate_startup)
    candidate_chosen = select_reference_indices(candidate_novelty, np.asarray(target_global[:512]))
    candidate_scorer = PatchScorer(build_reference_bank(candidate_startup, candidate_chosen))

    scores, maps = scorer.score(target[832:])
    candidate_scores, candidate_maps = candidate_scorer.score(target[832:])
    results = json.loads((ROOT / "results" / "tsfabrics.json").read_text())
    threshold = results["methods"]["mutual"]["threshold"]
    candidate_threshold = results["methods"]["mutual"]["targets"][TARGET]["candidate_adaptation"]["threshold"]
    rows = archive.scenarios[TARGET]

    options = []
    for offset, (score, candidate_score) in enumerate(zip(scores, candidate_scores)):
        index = 832 + offset
        row = rows[index]
        if not row["label"] or not row["defect_mask"] or score < threshold or candidate_score >= candidate_threshold:
            continue
        mask = archive.read_mask(row["defect_mask"])
        heat = np.asarray(maps[offset], dtype=np.float32)
        top = np.argpartition(heat.ravel(), -max(1, int(np.ceil(heat.size * .01))))[-max(1, int(np.ceil(heat.size * .01))):]
        if not mask.ravel()[top].any():
            continue
        ys, xs = np.where(mask)
        centrality = 1 - abs(float(xs.mean()) / 31 - .5) - abs(float(ys.mean()) / 25 - .5)
        options.append((float(score - threshold) + .1 * centrality, index, offset))
    if not options:
        raise RuntimeError("No held-out defect is both flagged by the frozen model and missed by the shadow candidate")
    _, hero_index, hero_offset = max(options)

    hero_row = rows[hero_index]
    write_jpeg(archive, hero_row["image"], OUT / "hero.jpg")
    for slot, index in enumerate(range(hero_index - 2, hero_index + 3)):
        write_jpeg(archive, rows[index]["image"], OUT / f"stream_{slot:02d}.jpg")
    for slot, (scenario, index) in enumerate(((SOURCE, 3500), (SOURCE, 4000),
                                               (DRIFT_TARGET, 0), (DRIFT_TARGET, 96),
                                               (DRIFT_TARGET, 192))):
        write_jpeg(archive, archive.scenarios[scenario][index]["image"], OUT / f"drift_{slot:02d}.jpg")

    selected_set = set(map(int, chosen))
    # Draw source examples from separated positions in the startup interval.
    examples = []
    for slot, anchor in enumerate((30, 120, 210, 300, 390, 480)):
        radius = np.arange(max(0, anchor - 25), min(512, anchor + 26))
        wanted = slot % 3 != 2
        matches = [int(i) for i in radius if (int(i) in selected_set) == wanted]
        index = min(matches, key=lambda i: abs(i - anchor)) if matches else int(anchor)
        row = archive.scenarios[SOURCE][index]
        write_jpeg(archive, row["image"], OUT / f"reference_{slot:02d}.jpg")
        examples.append({"file": f"reference_{slot:02d}.jpg", "index": index, "selected": index in selected_set})

    detector = DriftDetector(np.asarray(source_global[:2048]))
    ends, drift_values = detector.sequence_scores(np.asarray(drift_global))
    _, source_drift_values = detector.sequence_scores(np.asarray(source_global[2112:4096]))
    token = np.asarray(target[hero_index], dtype=np.float32)
    projection = token[:, 0].reshape(26, 32)
    metadata = {
        "dataset": "TSFabrics",
        "doi": "https://doi.org/10.6084/m9.figshare.29573381",
        "license": "CC BY 4.0, as stated by the dataset paper",
        "source": SOURCE,
        "target": TARGET,
        "drift_target": DRIFT_TARGET,
        "source_startup_frames": 512,
        "source_selected_frames": int(len(chosen)),
        "reference_examples": examples,
        "hero_frame": int(hero_index),
        "hero_image": hero_row["image"],
        "hero_ground_truth_defect": bool(hero_row["label"]),
        "hero_score": float(scores[hero_offset]),
        "hero_threshold": float(threshold),
        "shadow_score": float(candidate_scores[hero_offset]),
        "shadow_threshold": float(candidate_threshold),
        "heatmap": np.asarray(maps[hero_offset], dtype=float).tolist(),
        "shadow_heatmap": np.asarray(candidate_maps[hero_offset], dtype=float).tolist(),
        "feature_projection": projection.tolist(),
        "drift_ends": ends.tolist(),
        "drift_values": drift_values.astype(float).tolist(),
        "drift_source_values": source_drift_values.astype(float).tolist(),
        "drift_threshold": float(detector.threshold),
        "drift_first_alarm": detector.first_alarm(np.asarray(drift_global)),
    }
    (OUT / "metadata.json").write_text(json.dumps(metadata, indent=2))
    print(json.dumps({k: metadata[k] for k in ("hero_frame", "hero_score", "hero_threshold", "shadow_score", "shadow_threshold", "drift_first_alarm")}, indent=2))


if __name__ == "__main__":
    main()
