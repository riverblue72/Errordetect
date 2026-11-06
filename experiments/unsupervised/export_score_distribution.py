"""Export label-conditional score-rank distributions from full recorded runs.

The fixed scorers and frames reproduce the published final comparison. Labels
are read only after scoring, to audit and display score separation by run.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from classic import ClassicScorer, feature_map
from condition_reference import encode_in_memory, score_slice
from core import PatchScorer, build_reference_bank, mutual_image_scores, select_reference_indices
from metrics import average_precision, roc_auc
from run_tsfabrics import SOURCE, _load
from tsfabrics import TSFabricsArchive
from unlabeled_review import GAP, MAX_FRAMES, STARTUP


BINS = np.linspace(0.0, 1.0, 21)


def score_percentiles(values: np.ndarray) -> np.ndarray:
    if len(values) == 0:
        raise ValueError("cannot rank empty scores")
    order = np.argsort(values, kind="stable")
    sorted_values = values[order]
    starts = np.r_[0, np.flatnonzero(sorted_values[1:] != sorted_values[:-1]) + 1]
    ends = np.r_[starts[1:], len(values)]
    result = np.empty(len(values), dtype=np.float64)
    result[order] = np.repeat((starts + ends) / (2 * len(values)), ends - starts)
    return result


def distribution(scores: np.ndarray, labels: np.ndarray, eligible: np.ndarray,
                 saved: dict) -> dict:
    if len(scores) != len(labels) or len(labels) != len(eligible):
        raise ValueError("score and label lengths differ")
    scored_labels = labels[eligible]
    scored_scores = scores[eligible]
    ap = average_precision(scored_labels, scored_scores)
    auroc = roc_auc(scored_labels, scored_scores)
    if not np.isclose(ap, saved["average_precision"], atol=5e-4, rtol=0) or not np.isclose(
        auroc, saved["auroc"], atol=5e-4, rtol=0
    ):
        raise ValueError(f"scorer does not reproduce the saved final AP/AUROC: {ap:.6f}, {auroc:.6f}")
    ranks = score_percentiles(scores)[eligible]
    result = {"average_precision": float(ap), "auroc": float(auroc), "classes": {}}
    for label, name in ((False, "normal"), (True, "defect")):
        count = int((scored_labels == label).sum())
        if count == 0:
            raise ValueError(f"missing {name} frames in selected defect run")
        counts = np.histogram(ranks[scored_labels == label], bins=BINS)[0]
        result["classes"][name] = {"frames": count, "fraction_by_bin": (counts / count).tolist()}
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--final", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    archive = TSFabricsArchive(args.zip)
    saved = json.loads(args.final.read_text())
    if saved["protocol"]["source"] != SOURCE:
        raise ValueError("saved comparison uses a different source recording")

    source_tokens, source_globals, _ = _load(args.cache, SOURCE, archive)
    startup = np.asarray(source_tokens[:512])
    selected = select_reference_indices(
        mutual_image_scores(startup), np.asarray(source_globals[:512]))
    dino = PatchScorer(build_reference_bank(startup, selected))
    source_classic = np.load(args.cache / f"{SOURCE}.classic.npy", mmap_mode="r")
    classic = ClassicScorer(source_classic[:512].reshape(512, -1, 8))

    output = {
        "dataset": "TSFabrics",
        "source": SOURCE,
        "phase": "final recorded runs; previously studied",
        "score_axis": "percentile within each run and method, before reading labels",
        "label_use": "retrospective visualization and AP/AUROC reproduction only",
        "evaluation_start": STARTUP + GAP,
        "bin_edges": BINS.tolist(),
        "runs": {},
    }
    for name in saved["protocol"]["targets"]:
        comparison = saved["runs"][name]
        if comparison["defect_frames"] == 0:
            continue
        try:
            tokens, _, rows = _load(args.cache, name, archive)
            tokens, rows = tokens[:MAX_FRAMES], rows[:MAX_FRAMES]
        except FileNotFoundError:
            tokens, _, rows = encode_in_memory(archive, name, limit=MAX_FRAMES)
        start = STARTUP + GAP
        if len(rows) - start != comparison["evaluation_frames"] + comparison["excluded_ambiguous"]:
            raise ValueError(f"{name}: evaluation frame count differs from saved result")
        labels = np.asarray([row["label"] for row in rows[start:]], dtype=bool)
        eligible = np.asarray([not row["ambiguous"] for row in rows[start:]], dtype=bool)
        dino_scores = score_slice(dino, tokens, start, len(rows))
        classic_maps = np.stack([feature_map(archive.read_image(row["image"]))
                                 for row in rows[start:]])
        classic_scores = score_slice(classic, classic_maps, 0, len(classic_maps))
        output["runs"][name] = {
            "normal_frames": int((~labels & eligible).sum()),
            "defect_frames": int((labels & eligible).sum()),
            "methods": {
                "handcrafted_source": distribution(
                    classic_scores, labels, eligible, comparison["methods"]["handcrafted_source"]),
                "source_knn": distribution(
                    dino_scores, labels, eligible, comparison["methods"]["source_knn"]),
            },
        }
        print(name, "verified", output["runs"][name]["defect_frames"], "defect frames", flush=True)
    if len(output["runs"]) != 4:
        raise ValueError("expected four defect-bearing final recordings")
    args.out.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.out.with_suffix(args.out.suffix + ".tmp")
    temporary.write_text(json.dumps(output, separators=(",", ":"), allow_nan=False) + "\n")
    temporary.replace(args.out)


if __name__ == "__main__":
    main()
