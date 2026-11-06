"""Check mask presence against actual nonzero pixels in the published ZIP."""

from __future__ import annotations

import argparse
import csv
import io
import json
from collections import Counter
from pathlib import Path

from PIL import Image

from tsfabrics import TSFabricsArchive


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", type=Path)
    args = parser.parse_args()
    dataset = TSFabricsArchive(args.archive)
    empty_defect = []
    empty_cutline = []
    csv_counts = Counter()
    csv_disagreements = []
    csv_paths = {Path(name).stem: name for name in dataset.zip.namelist() if name.lower().endswith(".csv")}
    for scenario, rows in dataset.scenarios.items():
        csv_labels = {}
        if scenario in csv_paths:
            text = dataset.zip.read(csv_paths[scenario]).decode("utf-8-sig")
            csv_labels = {
                Path(record["FileName"]).stem: int(record["Label"])
                for record in csv.DictReader(io.StringIO(text))
            }
        for row in rows:
            label = csv_labels.get(Path(row["image"]).stem)
            csv_counts[label] += 1
            if label is not None and (label >= 3) != bool(row["defect_mask"]):
                csv_disagreements.append(
                    {"scenario": scenario, "image": row["image"], "csv_label": label, "has_defect_mask": bool(row["defect_mask"])}
                )
            for field, bucket in (("defect_mask", empty_defect), ("cutline_mask", empty_cutline)):
                path = row[field]
                if path:
                    with Image.open(io.BytesIO(dataset.zip.read(path))) as image:
                        if image.getbbox() is None:
                            bucket.append({"scenario": scenario, "image": row["image"], "mask": path})
    print(json.dumps({"csv_counts": csv_counts, "csv_disagreements": csv_disagreements, "empty_defect": empty_defect, "empty_cutline": empty_cutline}, indent=2))


if __name__ == "__main__":
    main()
