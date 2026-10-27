"""Package every held-out test photo and a landscape display copy.

Run this only when refreshing the checked-in demo photos from KolektorSDD.
The original JPEG remains unchanged for model inference and reproducibility.
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path

from PIL import Image

from sample_catalog import test_rows


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data" / "ksdd" / "manifest.csv"
RAW = Path(os.environ["KSDD_DATA_DIR"]).expanduser().resolve() if os.environ.get("KSDD_DATA_DIR") else ROOT.parent / "data" / "public" / "ksdd"
ORIGINALS = ROOT / "web" / "samples"
LANDSCAPE = ROOT / "web" / "landscape"


def main() -> None:
    ORIGINALS.mkdir(parents=True, exist_ok=True)
    LANDSCAPE.mkdir(parents=True, exist_ok=True)
    rows = test_rows(MANIFEST)
    for number, row in enumerate(rows, 1):
        name = f"sample-{number:02d}.jpg"
        source = RAW / row["image"]
        if not source.exists():
            raise FileNotFoundError(source)
        target = ORIGINALS / name
        if not target.exists() or target.read_bytes() != source.read_bytes():
            shutil.copyfile(source, target)
        with Image.open(source) as image:
            landscape = image.convert("RGB").transpose(Image.Transpose.ROTATE_270)
            width = min(1000, landscape.width)
            height = round(landscape.height * width / landscape.width)
            landscape = landscape.resize((width, height), Image.Resampling.LANCZOS)
            landscape.save(LANDSCAPE / name, "JPEG", quality=88, optimize=True)
    print(f"Prepared {len(rows)} held-out photos with landscape display copies")


if __name__ == "__main__":
    main()
