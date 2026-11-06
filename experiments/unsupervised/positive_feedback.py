"""Time-ordered test of confirmed-defect examples for later review ranking.

The detector is frozen. Public labels are read for the eight requested early
photos only until the later queues have been constructed.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch

from condition_reference import encode_in_memory, score_slice
from core import PatchScorer, build_reference_bank, mutual_image_scores, select_reference_indices
from feedback_validation import MIN_TEST, REVIEW, TEST_START
from run_tsfabrics import SOURCE, _load
from tsfabrics import TSFabricsArchive
from unlabeled_review import MAX_FRAMES, episode_ids, review_queues, spaced


PATCHES_PER_PHOTO = 8
RANDOM_REPEATS = 100


def top_patch_ids(maps: np.ndarray) -> np.ndarray:
    flat = maps.reshape(len(maps), -1)
    return np.argpartition(flat, -PATCHES_PER_PHOTO, axis=1)[:, -PATCHES_PER_PHOTO:]


@torch.inference_mode()
def positive_similarity(tokens: np.ndarray, patch_ids: np.ndarray,
                        exemplars: np.ndarray, *, batch_size: int = 64) -> np.ndarray:
    prototypes = torch.as_tensor(exemplars, device="cuda").float().T.contiguous()
    result = np.empty(len(patch_ids), dtype=np.float32)
    for start in range(0, len(patch_ids), batch_size):
        end = min(start + batch_size, len(patch_ids))
        patches = np.take_along_axis(
            np.asarray(tokens[start:end]), patch_ids[start:end, :, None], axis=1)
        query = torch.as_tensor(patches, device="cuda").float()
        result[start:end] = (query @ prototypes).amax(dim=(1, 2)).cpu().numpy()
    return result


def queue_audit(rows: list[dict], ids: np.ndarray, queue: list[int],
                new_events: set[int]) -> dict:
    frames = [TEST_START + int(index) for index in queue]
    found = {int(ids[frame]) for frame in frames} & new_events
    return {
        "frames": [frame + 1 for frame in frames],
        "defect_reviews": sum(bool(rows[frame]["label"] and not rows[frame]["ambiguous"])
                              for frame in frames),
        "normal_reviews": sum(bool(not rows[frame]["label"] and
                                   not rows[frame]["ambiguous"]) for frame in frames),
        "ambiguous_reviews": sum(bool(rows[frame]["ambiguous"]) for frame in frames),
        "new_episodes_found": len(found),
    }


def later_episodes(rows: list[dict]) -> tuple[np.ndarray, set[int]]:
    ids, _ = episode_ids(rows)
    first: dict[int, int] = {}
    for index, event in enumerate(ids):
        if event >= 0 and int(event) not in first:
            first[int(event)] = index
    return ids, {event for event, index in first.items() if index >= TEST_START}


def evaluate_run(archive: TSFabricsArchive, cache: Path, name: str,
                 scorer: PatchScorer, previous: dict) -> dict:
    size = min(MAX_FRAMES, len(archive.scenarios[name]))
    if size < TEST_START + MIN_TEST:
        if previous["status"] != "too_short":
            raise ValueError(f"length status changed for {name}")
        return {"status": "too_short", "frames": size}

    earlier = previous["strategies"]["spaced8"]
    if earlier["confirmed_defect"] == 0:
        baseline = previous["source"]
        return {
            "status": "no_confirmed_defect", "frames": size,
            "initial_confirmed_defect": 0,
            "later_new_episodes": baseline["new_episodes"],
            "baseline_episodes_found": baseline["review_episodes"],
            "positive_episodes_found": baseline["review_episodes"],
            "control_mean_episodes_found": float(baseline["review_episodes"]),
        }

    try:
        tokens, _, rows = _load(cache, name, archive)
        tokens, rows = tokens[:size], rows[:size]
        cached = True
    except FileNotFoundError:
        tokens, _, rows = encode_in_memory(archive, name, limit=size)
        cached = False

    review_scores = score_slice(scorer, tokens, *REVIEW)
    review_frames = [REVIEW[0] + position for position in
                     review_queues(review_scores)["spaced8"]]
    if [index + 1 for index in review_frames] != earlier["review_frames"]:
        raise ValueError(f"initial review queue changed for {name}")
    confirmed = [index for index in review_frames
                 if rows[index]["label"] and not rows[index]["ambiguous"]]
    if len(confirmed) != earlier["confirmed_defect"]:
        raise ValueError(f"initial review labels changed for {name}")

    _, prototype_maps = scorer.score(tokens[confirmed])
    prototype_ids = top_patch_ids(prototype_maps)
    exemplars = np.concatenate([
        np.asarray(tokens[frame, prototype_ids[position]])
        for position, frame in enumerate(confirmed)
    ])
    later_scores, later_maps = scorer.score(tokens[TEST_START:size])
    patch_ids = top_patch_ids(later_maps)
    positive_scores = positive_similarity(tokens[TEST_START:size], patch_ids, exemplars)

    baseline_queue = review_queues(later_scores)["spaced8"]
    first_six = spaced(np.argsort(-later_scores, kind="stable"), 6)
    positive_queue = spaced(np.argsort(-positive_scores, kind="stable"), 8, first_six)
    control_queues = [
        spaced(np.random.default_rng(seed).permutation(len(later_scores)), 8, first_six)
        for seed in range(RANDOM_REPEATS)
    ]
    if len(baseline_queue) != 8 or len(positive_queue) != 8 or any(
            len(queue) != 8 for queue in control_queues):
        raise ValueError(f"incomplete later review queue for {name}")

    ids, new_events = later_episodes(rows)
    baseline = queue_audit(rows, ids, baseline_queue, new_events)
    positive = queue_audit(rows, ids, positive_queue, new_events)
    control = [queue_audit(rows, ids, queue, new_events)["new_episodes_found"]
               for queue in control_queues]
    if len(new_events) != previous["source"]["new_episodes"] or (
            baseline["new_episodes_found"] != previous["source"]["review_episodes"]):
        raise ValueError(f"frozen later baseline changed for {name}")

    return {
        "status": "evaluated", "frames": size, "cached": cached,
        "initial_review_frames": [index + 1 for index in review_frames],
        "initial_confirmed_defect": len(confirmed),
        "initial_defect_frames": [index + 1 for index in confirmed],
        "prototype_patches": len(exemplars),
        "later_new_episodes": len(new_events),
        "baseline": baseline, "positive": positive,
        "control": {"mean_episodes_found": float(np.mean(control)),
                    "minimum": min(control), "maximum": max(control),
                    "seeds": RANDOM_REPEATS},
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--prior", type=Path, required=True)
    parser.add_argument("--phase", choices=("development", "final"), required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    if not torch.cuda.is_available():
        raise RuntimeError("this experiment requires CUDA")
    archive = TSFabricsArchive(args.zip)
    prior = json.loads(args.prior.read_text())
    if prior["protocol"]["phase"] != args.phase:
        raise ValueError("prior experiment phase differs")
    targets = prior["protocol"]["targets"]
    source, globals_, _ = _load(args.cache, SOURCE, archive)
    startup = np.asarray(source[:512])
    selected = select_reference_indices(mutual_image_scores(startup),
                                         np.asarray(globals_[:512]))
    scorer = PatchScorer(build_reference_bank(startup, selected))
    protocol = {"phase": args.phase, "targets": targets,
                "review_window": list(REVIEW), "later_test_start": TEST_START,
                "patches_per_photo": PATCHES_PER_PHOTO,
                "later_baseline_slots": 6, "positive_slots": 2,
                "spacing": 16, "random_seeds": list(range(RANDOM_REPEATS)),
                "detector": "frozen DINOv2 source; review ranking only"}
    result = {"protocol": protocol, "runs": {}}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    if args.out.exists() and args.out.stat().st_size:
        result = json.loads(args.out.read_text())
        if result["protocol"] != protocol:
            raise ValueError("existing checkpoint has a different protocol")
    for name in targets:
        if name in result["runs"]:
            print(f"skip saved {name}", flush=True)
            continue
        entry = evaluate_run(archive, args.cache, name, scorer, prior["runs"][name])
        result["runs"][name] = entry
        temporary = args.out.with_suffix(args.out.suffix + ".tmp")
        temporary.write_text(json.dumps(result, separators=(",", ":"), allow_nan=False) + "\n")
        temporary.replace(args.out)
        print(name, entry["status"], entry.get("later_new_episodes"),
              entry.get("baseline", {}).get("new_episodes_found", entry.get("baseline_episodes_found")),
              entry.get("positive", {}).get("new_episodes_found", entry.get("positive_episodes_found")),
              flush=True)


if __name__ == "__main__":
    main()
