"""Create a group-separated, normal-only training split for a quick anomaly demo.

Run from the repository root with: python data/public/ksdd/make_manifest.py
This is a project split, not the official Kolektor benchmark protocol.
"""

import csv
import random
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw"
groups = sorted(p for p in RAW.glob("kos*") if p.is_dir())
if len(groups) != 50:
    raise SystemExit(f"Expected 50 item groups, found {len(groups)}")

rng = random.Random(42)
rng.shuffle(groups)
group_split = {
    group.name: ("train" if i < 35 else "val" if i < 42 else "test")
    for i, group in enumerate(groups)
}

rows = []
for image in sorted(RAW.glob("kos*/Part*.jpg")):
    mask = image.with_name(f"{image.stem}_label.bmp")
    if not mask.exists():
        raise SystemExit(f"Missing mask: {mask}")
    anomaly = bool(np.asarray(Image.open(mask)).max())
    split = group_split[image.parent.name]
    if split == "train" and anomaly:
        split = "excluded_train_group_defect"
    rows.append(
        {
            "image": image.relative_to(ROOT).as_posix(),
            "mask": mask.relative_to(ROOT).as_posix(),
            "item_group": image.parent.name,
            "split": split,
            "is_anomaly": int(anomaly),
        }
    )

if len(rows) != 399 or sum(r["is_anomaly"] for r in rows) != 52:
    raise SystemExit("Unexpected image or anomaly count")

with (ROOT / "manifest.csv").open("w", newline="", encoding="utf-8") as file:
    writer = csv.DictWriter(file, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)

from collections import Counter

print("Images by split:", dict(Counter(r["split"] for r in rows)))
print("Anomalies by split:", dict(Counter(r["split"] for r in rows if r["is_anomaly"])))
