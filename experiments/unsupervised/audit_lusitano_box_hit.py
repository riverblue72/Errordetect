"""Exact random-position control for the LUSITANOv2 box-hit metric.

Uses only public test box annotations and saved model metrics. No raw image,
PyTorch model, labels during model fitting, or GPU is required.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SIZE = 518
PATCH = 14
GRID = SIZE // PATCH
WIDTH = 4096
HEIGHT = 1024
LABEL_MD5 = "8a55ba8b620315fe74c3db92a5e042f5"


def centers(mode: str) -> list[tuple[float, float]]:
    if mode == "global":
        scaled_h = round(SIZE * HEIGHT / WIDTH)
        top = (SIZE - scaled_h) // 2
        return [
            ((x + .5) * PATCH / SIZE, ((y + .5) * PATCH - top) / scaled_h)
            for y in range(GRID)
            if top <= (y + .5) * PATCH < top + scaled_h
            for x in range(GRID)
        ]
    if mode == "tiles":
        return [
            ((start + (x + .5) * 1024 / GRID) / WIDTH, (y + .5) / GRID)
            for start in (0, 768, 1536, 2304, 3072)
            for y in range(GRID)
            for x in range(GRID)
        ]
    raise ValueError(mode)


def boxes_for(label: Path) -> list[tuple[float, float, float, float]]:
    boxes = []
    for line in label.read_text(encoding="utf-8").splitlines():
        fields = line.split()
        if len(fields) < 5:
            continue  # Match run_lusitano.boxes_for.
        _, x, y, w, h = map(float, fields[:5])
        boxes.append((x - w / 2, y - h / 2, x + w / 2, y + h / 2))
    return boxes


def random_any_hit(n: int, b: int, k: int) -> float:
    if b == 0:
        return 0.0
    if n - b < k:
        return 1.0
    log_no_hit = sum(math.log1p(-b / (n - i)) for i in range(k))
    return -math.expm1(log_no_hit)


def md5(path: Path) -> str:
    digest = hashlib.md5()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def audit(labels: Path, archive: Path, results_dir: Path) -> dict:
    if md5(archive) != LABEL_MD5:
        raise ValueError("Official annotation archive MD5 mismatch")
    paths = sorted(labels.glob("*.txt"))
    saved = {
        mode: json.loads((results_dir / f"lusitano_{mode}.json").read_text(encoding="utf-8"))
        for mode in ("global", "tiles")
    }
    for mode, result in saved.items():
        if len(paths) != result["methods"]["all_unlabeled"]["anomalies"]:
            raise ValueError(f"{mode}: defect-image count disagrees with saved test results")
        for empty in result["excluded_empty_test_files"]:
            if (labels / (Path(empty).stem + ".txt")).exists():
                raise ValueError(f"Excluded TIFF has a defect annotation: {empty}")

    box_sets = [boxes_for(path) for path in paths]
    if any(not boxes for boxes in box_sets):
        raise ValueError("A test label has no valid defect box")
    box_count = sum(map(len, box_sets))
    if box_count != 1865:
        raise ValueError(f"Expected 1,865 official test defect boxes, got {box_count}")
    output = {
        "dataset": "LUSITANOv2",
        "official_label_archive_md5": LABEL_MD5,
        "test_defect_images": len(paths),
        "test_defect_boxes": box_count,
        "control": "Uniform random patch positions without replacement, conditional on official boxes",
        "modes": {},
    }
    for mode in ("global", "tiles"):
        points = centers(mode)
        n = len(points)
        k = max(1, math.ceil(.01 * n))
        covered = []
        random_single = []
        random_top = []
        for boxes in box_sets:
            b = sum(any(x0 <= x <= x1 and y0 <= y <= y1 for x0, y0, x1, y1 in boxes) for x, y in points)
            covered.append(b > 0)
            random_single.append(b / n)
            random_top.append(random_any_hit(n, b, k))
        controls = {
            "patch_positions_per_image": n,
            "top_1pct_position_count": k,
            "images_with_a_center_inside_a_box": sum(covered),
            "random_single_hottest_patch_box_hit": sum(random_single) / len(paths),
            "random_top_1pct_patch_box_hit": sum(random_top) / len(paths),
        }
        controls["observed"] = {
            name: {
                "single_hottest_patch_box_hit": result["single_hottest_patch_box_hit"],
                "top_1pct_patch_box_hit": result["top_1pct_patch_box_hit"],
            }
            for name, result in saved[mode]["methods"].items()
        }
        output["modes"][mode] = controls
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=ROOT / "experiments/unsupervised/data/lusitano-label-audit")
    parser.add_argument("--results", type=Path, default=ROOT / "experiments/unsupervised/results")
    parser.add_argument("--out", type=Path, default=ROOT / "experiments/unsupervised/results/lusitano_box_hit_control.json")
    args = parser.parse_args()
    result = audit(args.data / "labels/test", args.data / "LUSITANOv2_labels.tar.zst", args.results)
    args.out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
