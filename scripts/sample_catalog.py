"""Stable, held-out sample order shared by asset preparation and site builds."""

from __future__ import annotations

import csv
from pathlib import Path


FEATURED = (
    "raw/kos07/Part1.jpg",
    "raw/kos15/Part3.jpg",
    "raw/kos02/Part6.jpg",
    "raw/kos02/Part0.jpg",
    "raw/kos02/Part1.jpg",
    "raw/kos02/Part2.jpg",
)


def test_rows(manifest: Path) -> list[dict[str, str]]:
    with manifest.open(encoding="utf-8", newline="") as source:
        rows = list(csv.DictReader(source))
    held_out = {row["image"]: row for row in rows if row["split"] == "test"}
    if any(path not in held_out for path in FEATURED):
        raise ValueError("A featured sample is outside the held-out test split")
    ordered = [held_out[path] for path in FEATURED]
    ordered.extend(row for row in rows if row["split"] == "test" and row["image"] not in FEATURED)
    if len(ordered) != len(held_out):
        raise ValueError("Duplicate image in the held-out test split")
    return ordered
