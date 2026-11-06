"""Package one fixed TSFabrics run for a label-free interval-summary replay."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

from core import PatchScorer, build_reference_bank, mutual_image_scores, select_reference_indices
from drift import DriftDetector
from run_tsfabrics import SOURCE, _load
from tsfabrics import TSFabricsArchive
from unlabeled_review import GAP, MAX_FRAMES, SOURCE_CAL, SPLICE_PRELUDE, STARTUP, review_queues
from condition_reference import encode_in_memory


TARGET = "T1_S478_I118_2"


def heat_overlay(heat: np.ndarray, low: float, high: float,
                 size: tuple[int, int], destination: Path) -> None:
    strength = np.clip((heat.astype(np.float32) - low) / max(high - low, 1e-6), 0, 1)
    mask = Image.fromarray(np.uint8(strength * 180), mode="L")
    mask = mask.resize(size, Image.Resampling.BICUBIC)
    layer = Image.new("RGBA", size, (231, 91, 83, 0))
    layer.putalpha(mask)
    layer.save(destination, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--result", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    audit = json.loads(args.result.read_text())["runs"][TARGET]
    archive = TSFabricsArchive(args.zip)
    source, source_globals, _ = _load(args.cache, SOURCE, archive)
    try:
        target, target_globals, rows = _load(args.cache, TARGET, archive)
    except FileNotFoundError:
        target, target_globals, rows = encode_in_memory(archive, TARGET, limit=MAX_FRAMES)
    target, target_globals, rows = target[:MAX_FRAMES], target_globals[:MAX_FRAMES], rows[:MAX_FRAMES]
    source_startup = np.asarray(source[:512])
    reference = select_reference_indices(mutual_image_scores(source_startup),
                                         np.asarray(source_globals[:512]))
    scorer = PatchScorer(build_reference_bank(source_startup, reference))
    first = STARTUP + GAP
    scores, maps = scorer.score(target[first:])
    queues = review_queues(scores)
    selected = queues["spaced8"]
    expected = audit["methods"]["source_knn"]["queues"]["spaced8"]["frames"]
    if [first + i + 1 for i in selected] != expected:
        raise ValueError("packaged review queue differs from locked final result")
    expected_top = audit["methods"]["source_knn"]["queues"]["top8"]["frames"]
    if [first + i + 1 for i in queues["top8"]] != expected_top:
        raise ValueError("packaged top-eight queue differs from locked final result")
    drift = DriftDetector(np.asarray(source_globals[:SOURCE_CAL[1]]))
    prelude = np.asarray(source_globals[slice(*SPLICE_PRELUDE)])
    sequence = np.concatenate((prelude, np.asarray(target_globals[:1024])))
    ends, change_scores = drift.sequence_scores(sequence)
    alert = drift.first_alarm(sequence)
    if alert != audit["operational_summary"]["change_alert"]:
        raise ValueError("packaged change alert differs from locked final result")
    args.out.mkdir(parents=True, exist_ok=True)
    low, high = np.quantile(maps, [.99, .999])
    review = []
    offline = []
    for rank, position in enumerate(selected, 1):
        index = first + position
        photo = archive.read_image(rows[index]["image"]).convert("RGB")
        stem = f"review-{rank:02d}"
        photo.save(args.out / f"{stem}.jpg", quality=88, optimize=True)
        heat_overlay(maps[position], float(low), float(high), photo.size,
                     args.out / f"{stem}-heat.png")
        review.append({"rank": rank, "frame": index + 1,
                       "score": round(float(scores[position]), 6),
                       "image": f"./unlabeled-demo/{stem}.jpg",
                       "heatmap": f"./unlabeled-demo/{stem}-heat.png"})
        offline.append({"frame": index + 1,
                        "dataset_label": "Defect" if rows[index]["label"] else "Normal",
                        "ambiguous": bool(rows[index]["ambiguous"])})
    manifest = {
        "dataset": "TSFabrics", "source": SOURCE, "run": TARGET,
        "model": "Frozen DINOv2-S/14 · selected source-run reference · patch nearest neighbor",
        "evaluation_frames": [first + 1, len(rows)],
        "frame_count": len(scores),
        "score_quantiles": dict(zip(("p50", "p90", "p99"),
                                     [round(float(v), 6) for v in np.quantile(scores, [.5, .9, .99])])),
        "scores": [round(float(value), 6) for value in scores],
        "change": {"splice_boundary": len(prelude), "alert": alert,
                   "window_ends": ends.tolist(),
                   "window_scores": [round(float(v), 6) for v in change_scores],
                   "limit": float(drift.threshold)},
        "top8_frames": expected_top,
        "review": review,
    }
    evaluation = {
        "selection": "fixed final evaluation, not shown in operational summary",
        "run": TARGET, "review": offline,
        "new_defect_episodes": audit["new_defect_episodes"],
        "episodes_found": audit["methods"]["source_knn"]["queues"]["spaced8"]["new_episodes"],
        "top8_episodes_found": audit["methods"]["source_knn"]["queues"]["top8"]["new_episodes"],
        "local_candidate_episodes_found": audit["methods"]["local_selected_knn"]["queues"]["spaced8"]["new_episodes"],
        "random_expected_episodes": audit["random_100"]["mean_episodes"],
    }
    (args.out / "manifest.json").write_text(json.dumps(manifest, separators=(",", ":")) + "\n")
    (args.out / "evaluation.json").write_text(json.dumps(evaluation, separators=(",", ":")) + "\n")
    print(json.dumps({"run": TARGET, "frames": len(scores), "review": expected,
                      "change_alert": alert, "episodes_found": evaluation["episodes_found"]}))


if __name__ == "__main__":
    main()
