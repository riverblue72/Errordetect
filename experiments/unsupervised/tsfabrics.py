"""Read TSFabrics directly from its published ZIP without extracting 9 GB twice."""

from __future__ import annotations

import io
import json
import csv
import zipfile
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image

from classic import GRID as CLASSIC_GRID, feature_map
from core import DINOFeatures, GRID_SHAPE


def _kind(name: str) -> tuple[str, str, str] | None:
    parts = name.replace("\\", "/").split("/")
    lowered = [part.lower() for part in parts]
    if "image" in lowered and Path(name).suffix.lower() in {".jpg", ".jpeg", ".png"}:
        pos = lowered.index("image")
        if pos + 2 == len(parts) - 1:
            return "image", parts[pos + 1], Path(name).stem
    if "annotation" in lowered and Path(name).suffix.lower() == ".png":
        pos = lowered.index("annotation")
        if pos + 3 == len(parts) - 1 and lowered[pos + 2] in {"defect", "cutline"}:
            return lowered[pos + 2], parts[pos + 1], Path(name).stem
    return None


class TSFabricsArchive:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.zip = zipfile.ZipFile(path)
        images: dict[str, list[dict]] = defaultdict(list)
        masks: dict[tuple[str, str, str], str] = {}
        for name in self.zip.namelist():
            parsed = _kind(name)
            if not parsed:
                continue
            kind, scenario, stem = parsed
            if kind == "image":
                images[scenario].append({"image": name, "stem": stem})
            else:
                masks[(kind, scenario, stem)] = name
        csv_files = {
            Path(name).stem: name for name in self.zip.namelist() if name.lower().endswith(".csv")
        }
        self.scenarios = {}
        for scenario, rows in images.items():
            if scenario not in csv_files:
                raise ValueError(f"missing authoritative CSV labels for {scenario}")
            csv_text = self.zip.read(csv_files[scenario]).decode("utf-8-sig")
            csv_labels = {
                Path(record["FileName"]).stem: int(record["Label"])
                for record in csv.DictReader(io.StringIO(csv_text))
            }
            rows.sort(key=lambda row: row["image"])
            for row in rows:
                stem = row.pop("stem")
                row["defect_mask"] = masks.get(("defect", scenario, stem))
                row["cutline_mask"] = masks.get(("cutline", scenario, stem))
                if stem not in csv_labels:
                    raise ValueError(f"missing CSV label: {scenario}/{stem}")
                row["csv_label"] = csv_labels[stem]
                row["label"] = int(csv_labels[stem] >= 3)
                row["ambiguous"] = bool(row["label"]) != bool(row["defect_mask"])
            self.scenarios[scenario] = rows

    def read_image(self, name: str) -> Image.Image:
        with Image.open(io.BytesIO(self.zip.read(name))) as image:
            return image.copy()

    def read_mask(self, name: str | None, grid_shape: tuple[int, int] = GRID_SHAPE) -> np.ndarray:
        if name is None:
            return np.zeros(grid_shape, dtype=bool)
        with Image.open(io.BytesIO(self.zip.read(name))) as image:
            resized = image.convert("L").resize((grid_shape[1], grid_shape[0]), Image.Resampling.BOX)
            return np.asarray(resized) > 0

    def audit(self) -> list[dict]:
        return [
            {
                "scenario": name,
                "frames": len(rows),
                "defects": sum(row["label"] for row in rows),
                "cutlines": sum(row["cutline_mask"] is not None for row in rows),
                "overlap_masks": sum(
                    row["defect_mask"] is not None and row["cutline_mask"] is not None for row in rows
                ),
                "ambiguous": sum(row["ambiguous"] for row in rows),
            }
            for name, rows in sorted(self.scenarios.items())
        ]


def extract_scenario(
    archive: TSFabricsArchive,
    scenario: str,
    output_dir: Path,
    *,
    limit: int | None = None,
    batch_size: int = 8,
) -> dict:
    rows = archive.scenarios[scenario][:limit]
    output_dir.mkdir(parents=True, exist_ok=True)
    prefix = output_dir / scenario
    metadata_path = prefix.with_suffix(".json")
    token_path = prefix.with_suffix(".tokens.npy")
    global_path = prefix.with_suffix(".global.npy")
    progress_path = prefix.with_suffix(".progress")
    expected = {"scenario": scenario, "rows": rows, "source": archive.path.name}
    if metadata_path.exists():
        stored = json.loads(metadata_path.read_text())
        if stored["scenario"] != scenario or stored["source"] != archive.path.name or [
            row["image"] for row in stored["rows"]
        ] != [row["image"] for row in rows]:
            raise ValueError(f"cached image order differs for {scenario}")
        if stored != expected:
            metadata_path.write_text(json.dumps(expected, indent=2))
        tokens = np.lib.format.open_memmap(token_path, mode="r+")
        globals_ = np.lib.format.open_memmap(global_path, mode="r+")
        start = int(progress_path.read_text()) if progress_path.exists() else len(rows)
    else:
        metadata_path.write_text(json.dumps(expected, indent=2))
        tokens = np.lib.format.open_memmap(token_path, mode="w+", dtype="float16", shape=(len(rows), 832, 384))
        globals_ = np.lib.format.open_memmap(global_path, mode="w+", dtype="float16", shape=(len(rows), 384))
        start = 0
        progress_path.write_text("0")
    if start >= len(rows):
        return expected
    extractor = DINOFeatures()
    for offset in range(start, len(rows), batch_size):
        batch = rows[offset : offset + batch_size]
        images = [archive.read_image(row["image"]) for row in batch]
        token_batch, global_batch = extractor.encode(images)
        tokens[offset : offset + len(batch)] = token_batch
        globals_[offset : offset + len(batch)] = global_batch
        tokens.flush()
        globals_.flush()
        progress_path.write_text(str(offset + len(batch)))
        if (offset // batch_size) % 100 == 0:
            print(f"{scenario}: {offset + len(batch)}/{len(rows)}", flush=True)
    progress_path.unlink()
    return expected


def extract_classic_scenario(
    archive: TSFabricsArchive, scenario: str, output_dir: Path, *, limit: int | None = None
) -> None:
    rows = archive.scenarios[scenario][:limit]
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / f"{scenario}.classic.npy"
    progress = output_dir / f"{scenario}.classic.progress"
    if path.exists():
        features = np.lib.format.open_memmap(path, mode="r+")
        if len(features) != len(rows):
            raise ValueError(f"classic cache length differs for {scenario}")
        start = int(progress.read_text()) if progress.exists() else len(rows)
    else:
        features = np.lib.format.open_memmap(
            path, mode="w+", dtype="float16", shape=(len(rows), *CLASSIC_GRID, 8)
        )
        start = 0
        progress.write_text("0")
    for index in range(start, len(rows)):
        features[index] = feature_map(archive.read_image(rows[index]["image"]))
        if index % 100 == 0:
            features.flush()
            progress.write_text(str(index + 1))
            print(f"classic {scenario}: {index + 1}/{len(rows)}", flush=True)
    features.flush()
    progress.unlink()
