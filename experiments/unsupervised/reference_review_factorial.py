"""Cross reference selection with review spacing at equal bank and review size."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from condition_reference import encode_in_memory, score_slice
from reference_selection_audit import build_source
from run_tsfabrics import SOURCE, _load
from tsfabrics import TSFabricsArchive
from unlabeled_review import (DEVELOPMENT, GAP, MAX_FRAMES, STARTUP,
                              audit_queue, episode_ids, review_queues)


def audit_run(archive: TSFabricsArchive, cache: Path, name: str,
              scorers: dict, reference: dict, ranking: dict) -> dict:
    limit = min(MAX_FRAMES, len(archive.scenarios[name]))
    try:
        tokens, _, rows = _load(cache, name, archive)
        tokens, rows = tokens[:limit], rows[:limit]
        cached = True
    except FileNotFoundError:
        tokens, _, rows = encode_in_memory(archive, name, limit=limit)
        cached = False
    start = STARTUP + GAP
    if len(rows) <= start + 8:
        raise ValueError(f"too few later frames: {name}")
    scores = {key: score_slice(scorer, tokens, start, len(rows))
              for key, scorer in scorers.items()}
    queues = {key: review_queues(values) for key, values in scores.items()}
    # Published labels are read only after all four queues have been fixed.
    ids, episodes = episode_ids(rows)
    audited = {key: {policy: audit_queue(queue[policy], rows, ids, episodes, start)
                     for policy in ("top8", "spaced8")}
               for key, queue in queues.items()}
    if (len(episodes) != reference["methods"]["selected"]["new_episodes"] or
        len(episodes) != ranking["new_defect_episodes"]):
        raise ValueError(f"episode denominator differs: {name}")
    for key in ("all", "selected"):
        if (audited[key]["spaced8"]["new_episodes"] !=
            reference["methods"][key]["review_episodes"]):
            raise ValueError(f"reference+spacing result did not reproduce: {name}/{key}")
    if (audited["selected"]["top8"]["new_episodes"] !=
        ranking["methods"]["source_knn"]["queues"]["top8"]["new_episodes"]):
        raise ValueError(f"selected+top-eight result did not reproduce: {name}")
    if any(item["review_count"] != 8 for methods in audited.values()
           for item in methods.values()):
        raise ValueError(f"review budget differs: {name}")
    return {"frames": len(rows), "cached": cached, "new_episodes": len(episodes),
            "methods": audited}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--reference", type=Path, required=True)
    parser.add_argument("--ranking", type=Path, required=True)
    parser.add_argument("--phase", choices=("development", "final"), required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    archive = TSFabricsArchive(args.zip)
    reference = json.loads(args.reference.read_text())
    ranking = json.loads(args.ranking.read_text())
    targets = list(DEVELOPMENT if args.phase == "development" else
                   sorted(set(archive.scenarios) - {SOURCE, *DEVELOPMENT}))
    if targets != reference["protocol"]["targets"] or targets != ranking["protocol"]["targets"]:
        raise ValueError("target order differs from recorded audits")
    source, scorers = build_source(args.cache, archive)
    if source["bank_vectors"] != reference["protocol"]["equal_bank_vectors"]:
        raise ValueError("reference-bank capacity changed")
    protocol = {
        "phase": args.phase, "source": SOURCE, "targets": targets,
        "target_evaluation_start": STARTUP + GAP, "target_cap": MAX_FRAMES,
        "bank_vectors_each": source["bank_vectors"], "review_budget": 8,
        "spacing": 16, "reference": ["all", "selected"],
        "queue": ["top8", "spaced8"],
        "label_use": "four queues fixed before retrospective audit",
        "status": "descriptive factorial on previously studied runs",
    }
    result = {"protocol": protocol, "runs": {}}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    if args.out.exists() and args.out.stat().st_size:
        previous = json.loads(args.out.read_text())
        if previous["protocol"] != protocol:
            raise ValueError("existing checkpoint differs from protocol")
        result = previous
    for name in targets:
        if name in result["runs"]:
            print(f"skip saved {name}", flush=True)
            continue
        result["runs"][name] = audit_run(
            archive, args.cache, name, scorers,
            reference["runs"][name], ranking["runs"][name]
        )
        temporary = args.out.with_suffix(args.out.suffix + ".tmp")
        temporary.write_text(json.dumps(result, separators=(",", ":"), allow_nan=False) + "\n")
        temporary.replace(args.out)
        print(name, {key: {p: audit["new_episodes"] for p, audit in policies.items()}
                     for key, policies in result["runs"][name]["methods"].items()}, flush=True)


if __name__ == "__main__":
    main()
