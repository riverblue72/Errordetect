"""Check packaged reviewed-update results against their fixed protocol."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "web/review-frames"


def check_frames(frames: list[dict], metrics: dict, threshold: float) -> None:
    tp = fp = fn = tn = 0
    for frame in frames:
        flagged = frame["score"] >= threshold
        defect = frame["label"] == "Defect"
        if defect and flagged:
            tp += 1
        elif defect:
            fn += 1
        elif flagged:
            fp += 1
        else:
            tn += 1
    assert (tp, fp, fn, tn) == tuple(metrics[key] for key in ("tp", "fp", "fn", "tn"))
    assert len(frames) == metrics["count"]


def main() -> None:
    data = json.loads((ASSETS / "results.json").read_text(encoding="utf-8"))
    protocol = data["protocol"]
    threshold = protocol["threshold"]
    start, end = protocol["pool_zero_based"]
    evaluation = protocol["evaluation_start_zero_based"]
    assert end <= evaluation and len(data["runs"]) == 2
    for name, run in data["runs"].items():
        selected = sorted(item["frame"] for item in run["query"])
        assert len(selected) == protocol["budget"] == len(set(selected))
        assert all(start < frame <= end for frame in selected)
        assert all(b - a >= protocol["minimum_frame_gap"] for a, b in zip(selected, selected[1:]))
        for item in run["query"]:
            assert (ASSETS / f"{name}-{item['frame']:05d}.jpg").is_file()
            assert item["flagged"] == (item["score"] >= threshold)
        verified = [item["frame"] for item in run["query"]
                    if item["flagged"] and item["label"] == "Normal" and not item["ambiguous"]]
        assert sorted(verified) == sorted(run["reviewed_verified_normal"])
        frames_by_method = {}
        for method, result in run["evaluations"].items():
            frames = result["frames"]
            assert all(frame["frame"] > evaluation for frame in frames)
            check_frames(frames, result["metrics"], threshold)
            frames_by_method[method] = [(frame["frame"], frame["label"]) for frame in frames]
        assert all(frames == frames_by_method["current"] for frames in frames_by_method.values())
    guard = data["runs"]["T1_S164_I36_1"]["defect_guard"]
    comparison = data["runs"]["T1_S478_I118_2"]["evaluations"]["current"]["frames"]
    for result in guard.values():
        check_frames(result["frames"], result["metrics"], threshold)
        assert [(item["frame"], item["label"]) for item in result["frames"]] == [
            (item["frame"], item["label"]) for item in comparison]
    print("Reviewed-update export: 48 photos, aligned held-out scores, and metrics verified")


if __name__ == "__main__":
    main()
