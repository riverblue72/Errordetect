"""Run-disjoint retrospective validation of eight-review reference updates.

Only selected review decisions are revealed before a shadow candidate is fit.
The source bank and score threshold stay fixed; target labels enter the later
test only after all candidates and queues have been constructed.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch

from condition_reference import encode_in_memory, score_slice
from core import PatchScorer, build_reference_bank, mutual_image_scores, select_reference_indices
from drift import DriftDetector
from metrics import average_precision, roc_auc
from run_tsfabrics import SOURCE, _load
from tsfabrics import TSFabricsArchive
from unlabeled_review import (DEVELOPMENT, MAX_FRAMES, SOURCE_CAL,
                              SPLICE_PRELUDE, episode_ids, review_queues,
                              spaced)


REVIEW = (320, 640)
TEST_START = 704
MIN_TEST = 128
STRATEGIES = ("spaced8", "high6_random2", "random8")


def heldout_audit(rows: list[dict], scores: np.ndarray,
                  threshold: float, start: int) -> dict:
    if len(scores) != len(rows) - start:
        raise ValueError("score and test-window lengths differ")
    eligible = np.asarray([not row["ambiguous"] for row in rows[start:]], dtype=bool)
    labels = np.asarray([row["label"] for row in rows[start:]], dtype=bool)
    flags = scores >= threshold
    ids, _ = episode_ids(rows)
    first = {}
    for index, event in enumerate(ids):
        if event >= 0 and event not in first:
            first[int(event)] = index
    new_events = {event for event, index in first.items() if index >= start}
    detected = {int(ids[start + index]) for index in np.flatnonzero(flags & labels & eligible)}
    queue = review_queues(scores)["spaced8"]
    queue_frames = [start + position for position in queue]
    found = {int(ids[frame]) for frame in queue_frames} & new_events
    ap = average_precision(labels[eligible], scores[eligible])
    auc = roc_auc(labels[eligible], scores[eligible])
    return {
        "scored": int(eligible.sum()),
        "defect_frames": int((labels & eligible).sum()),
        "normal_frames": int((~labels & eligible).sum()),
        "ambiguous_excluded": int((~eligible).sum()),
        "tp": int((flags & labels & eligible).sum()),
        "fp": int((flags & ~labels & eligible).sum()),
        "new_episodes": len(new_events),
        "detected_episodes": len(detected & new_events),
        "review_episodes": len(found),
        "review_defects": int(sum(rows[i]["label"] and not rows[i]["ambiguous"]
                                  for i in queue_frames)),
        "average_precision": ap if np.isfinite(ap) else None,
        "auroc": auc if np.isfinite(auc) else None,
    }


def scoped_union(source_bank: np.ndarray, tokens: np.ndarray,
                 indices: list[int]) -> PatchScorer:
    local_bank = build_reference_bank(tokens, np.asarray(indices, dtype=np.int32),
                                      max_vectors=24 * len(indices))
    return PatchScorer(np.concatenate((source_bank, local_bank)))


@torch.inference_mode()
def novelty_to_source(patches: np.ndarray, source_bank: np.ndarray) -> np.ndarray:
    """Cosine distance to the nearest existing patch; no labels or test data."""
    bank = torch.as_tensor(source_bank, device="cuda").float().T.contiguous()
    output = np.empty(len(patches), dtype=np.float32)
    for start in range(0, len(patches), 512):
        query = torch.as_tensor(patches[start:start + 512], device="cuda").float()
        output[start:start + len(query)] = (1 - (query @ bank).amax(dim=1)).cpu().numpy()
    return output


def novelty_gated_bank(source_bank: np.ndarray, tokens: np.ndarray,
                       normals: list[int]) -> tuple[np.ndarray, float, int]:
    """Insert only novel patches from the same reviewed-normal images.

    The median gate follows Abbas et al. (2026); the 24-patch-per-image
    budget is our bounded DINOv2 adaptation, not a reproduction of PatchCore.
    """
    all_patches = np.asarray(tokens[normals]).reshape(-1, tokens.shape[-1])
    threshold = float(np.median(novelty_to_source(all_patches, source_bank)))
    sampled = build_reference_bank(tokens, np.asarray(normals, dtype=np.int32),
                                   max_vectors=24 * len(normals))
    novelty = novelty_to_source(sampled, source_bank)
    return sampled[novelty > threshold], threshold, len(sampled)


def run_target(archive: TSFabricsArchive, cache: Path, name: str,
               source_bank: np.ndarray, source_threshold: float,
               drift: DriftDetector, prelude: np.ndarray) -> dict:
    size = min(MAX_FRAMES, len(archive.scenarios[name]))
    if size < TEST_START + MIN_TEST:
        return {"status": "too_short", "frames": size, "minimum": TEST_START + MIN_TEST}
    try:
        tokens, globals_, rows = _load(cache, name, archive)
        tokens, globals_, rows = tokens[:size], globals_[:size], rows[:size]
        cached = True
    except FileNotFoundError:
        tokens, globals_, rows = encode_in_memory(archive, name, limit=size)
        cached = False
    source_scorer = PatchScorer(source_bank)
    review_source = score_slice(source_scorer, tokens, *REVIEW)
    later_source = score_slice(source_scorer, tokens, TEST_START, size)
    baseline = heldout_audit(rows, later_source, source_threshold, TEST_START)
    sequence = np.concatenate((prelude, np.asarray(globals_[:min(1024, size)])))
    alert = drift.first_alarm(sequence)
    changed_before_review = alert is not None and len(prelude) < alert <= len(prelude) + REVIEW[0]
    queues = review_queues(review_source)
    output = {"status": "evaluated", "frames": size, "cached": cached,
              "change_alert": alert, "changed_before_review": changed_before_review,
              "source": baseline, "strategies": {}}
    for strategy in STRATEGIES:
        positions = queues[strategy]
        frames = [REVIEW[0] + index for index in positions]
        normals = [index for index in frames if not rows[index]["label"]
                   and not rows[index]["ambiguous"]]
        defects = [index for index in frames if rows[index]["label"]
                   and not rows[index]["ambiguous"]]
        uncertain = [index for index in frames if rows[index]["ambiguous"]]
        entry = {
            "review_frames": [index + 1 for index in frames],
            "confirmed_normal": len(normals), "confirmed_defect": len(defects),
            "uncertain": len(uncertain), "normal_frames_used": [index + 1 for index in normals],
        }
        if len(normals) < 2:
            entry.update({"status": "insufficient_confirmed_normals", "candidate": None,
                          "guarded_shadow": baseline})
        else:
            candidate_scorer = scoped_union(source_bank, tokens, normals)
            later_candidate = score_slice(candidate_scorer, tokens, TEST_START, size)
            candidate = heldout_audit(rows, later_candidate, source_threshold, TEST_START)
            gated_patches, gate_threshold, raw_patches = novelty_gated_bank(
                source_bank, tokens, normals)
            gated_scorer = PatchScorer(np.concatenate((source_bank, gated_patches)))
            gated_scores = score_slice(gated_scorer, tokens, TEST_START, size)
            gated_result = heldout_audit(rows, gated_scores, source_threshold, TEST_START)
            earlier_detected = [index for index in defects
                                if review_source[index - REVIEW[0]] >= source_threshold]
            preserved = True
            gated_preserved = True
            if earlier_detected:
                new_scores = score_slice(candidate_scorer, tokens,
                                         min(earlier_detected), max(earlier_detected) + 1)
                preserved = all(new_scores[index - min(earlier_detected)] >= source_threshold
                                for index in earlier_detected)
                gated_review_scores = score_slice(gated_scorer, tokens,
                                                  min(earlier_detected), max(earlier_detected) + 1)
                gated_preserved = all(gated_review_scores[index - min(earlier_detected)] >= source_threshold
                                      for index in earlier_detected)
            guarded = changed_before_review and preserved
            gated_guarded = changed_before_review and gated_preserved
            entry.update({
                "status": ("no_confirmed_change" if not changed_before_review else
                           "reviewed_defect_block" if not preserved else "shadow_only"),
                "reviewed_detected_defects": len(earlier_detected),
                "review_guard_preserved": preserved,
                "candidate": candidate,
                "guarded_shadow": candidate if guarded else baseline,
                "gate_threshold": gate_threshold,
                "patches_sampled": raw_patches,
                "gated_patches_inserted": len(gated_patches),
                "gated_candidate": gated_result,
                "gated_review_guard_preserved": gated_preserved,
                "gated_guarded_shadow": gated_result if gated_guarded else baseline,
            })
            if strategy == "spaced8":
                sampled_bank = build_reference_bank(tokens, np.asarray(normals, dtype=np.int32),
                                                    max_vectors=24 * len(normals))
                matched = np.random.default_rng(73).choice(
                    len(sampled_bank), size=len(gated_patches), replace=False)
                size_control = PatchScorer(np.concatenate((source_bank, sampled_bank[matched])))
                entry["equal_patch_count_random_control"] = heldout_audit(
                    rows, score_slice(size_control, tokens, TEST_START, size),
                    source_threshold, TEST_START)
        output["strategies"][strategy] = entry
    # Capacity-matched control: add the same number of unreviewed, unlabeled
    # frames as the primary queue's confirmed normals. Labels never filter it.
    normal_count = output["strategies"]["spaced8"]["confirmed_normal"]
    if normal_count >= 2:
        random_pool = np.random.default_rng(91).permutation(REVIEW[1] - REVIEW[0])
        random_indices = [REVIEW[0] + index for index in spaced(random_pool, normal_count)]
        control_scorer = scoped_union(source_bank, tokens, random_indices)
        control_scores = score_slice(control_scorer, tokens, TEST_START, size)
        output["unlabeled_control"] = {
            "frames": [index + 1 for index in random_indices],
            "defects_for_audit_only": int(sum(rows[i]["label"] for i in random_indices)),
            "result": heldout_audit(rows, control_scores, source_threshold, TEST_START),
        }
    else:
        output["unlabeled_control"] = None
    print(name, json.dumps({
        "test_defects": baseline["defect_frames"], "baseline_fp": baseline["fp"],
        "strategies": {key: {"normals": value["confirmed_normal"],
                             "status": value["status"],
                             "tp": None if value["candidate"] is None else value["candidate"]["tp"],
                             "fp": None if value["candidate"] is None else value["candidate"]["fp"]}
                       for key, value in output["strategies"].items()},
    }), flush=True)
    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--phase", choices=("development", "final"), required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    archive = TSFabricsArchive(args.zip)
    targets = list(DEVELOPMENT if args.phase == "development" else
                   sorted(set(archive.scenarios) - {SOURCE, *DEVELOPMENT}))
    source, global_features, _ = _load(args.cache, SOURCE, archive)
    startup = np.asarray(source[:512])
    selected = select_reference_indices(mutual_image_scores(startup),
                                         np.asarray(global_features[:512]))
    source_bank = build_reference_bank(startup, selected)
    source_scorer = PatchScorer(source_bank)
    source_threshold = float(np.quantile(score_slice(source_scorer, source, *SOURCE_CAL), .995))
    drift = DriftDetector(np.asarray(global_features[:SOURCE_CAL[1]]))
    prelude = np.asarray(global_features[slice(*SPLICE_PRELUDE)])
    result = {
        "protocol": {"phase": args.phase, "source": SOURCE, "targets": targets,
                     "source_threshold": source_threshold,
                     "review_window": REVIEW, "later_test_start": TEST_START,
                     "minimum_later_frames": MIN_TEST,
                     "target_cap": MAX_FRAMES, "review_budget": 8,
                     "review_spacing": 16,
                     "candidate": "source bank plus confirmed-normal reviewed patches, per-run only",
                     "threshold": "unchanged source 99.5th percentile",
                     "change_boundary": "synthetic splice between separate recorded runs",
                     "label_use": "reviewed frames simulate operator decisions; later labels audit only",
                     "promotion": "shadow only; no automatic update"},
        "runs": {},
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    if args.out.exists() and args.out.stat().st_size:
        previous = json.loads(args.out.read_text())
        if previous["protocol"] != result["protocol"]:
            raise ValueError("existing checkpoint has a different protocol")
        result = previous
    for name in targets:
        if name in result["runs"]:
            print(f"skip saved {name}", flush=True)
            continue
        result["runs"][name] = run_target(archive, args.cache, name,
                                          source_bank, source_threshold, drift, prelude)
        temporary = args.out.with_suffix(args.out.suffix + ".tmp")
        temporary.write_text(json.dumps(result, separators=(",", ":"), allow_nan=False) + "\n")
        temporary.replace(args.out)


if __name__ == "__main__":
    main()
