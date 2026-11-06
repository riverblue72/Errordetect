"""Measure the current DINOv2/patch-bank path on decoded TSFabrics photos."""

from __future__ import annotations

import argparse
import json
import platform
import statistics
import time
from pathlib import Path

import numpy as np
import torch
from PIL import __version__ as pillow_version

from core import (DINOFeatures, IMAGE_SIZE, PatchScorer, build_reference_bank,
                  mutual_image_scores, select_reference_indices)
from run_tsfabrics import SOURCE, _load
from tsfabrics import TSFabricsArchive


TARGET = "T1_S148_I108_2"
WARMUP = (680, 696)
STREAM = (2240, 2368)
BATCHED = ((704, 1216), (1216, 1728), (1728, 2240))


def quantiles(values: list[float]) -> dict:
    return {"median_ms": float(np.median(values) * 1000),
            "p95_ms": float(np.quantile(values, .95) * 1000)}


def measure(archive: TSFabricsArchive, rows: list[dict], extractor: DINOFeatures,
            scorer: PatchScorer, start: int, end: int, batch_size: int) -> dict:
    phases: dict[str, list[float]] = {key: [] for key in
                                     ("decode", "encode", "score", "total")}
    began = time.perf_counter()
    for offset in range(start, end, batch_size):
        stop = min(offset + batch_size, end)
        tick = time.perf_counter()
        photos = [archive.read_image(row["image"]) for row in rows[offset:stop]]
        decoded = time.perf_counter()
        tokens, _ = extractor.encode(photos)
        torch.cuda.synchronize()
        encoded = time.perf_counter()
        scores, maps = scorer.score(tokens)
        torch.cuda.synchronize()
        scored = time.perf_counter()
        if len(scores) != stop - offset or len(maps) != stop - offset or (
                not np.isfinite(scores).all() or not np.isfinite(maps).all()):
            raise ValueError("inference did not produce one finite score and map per photo")
        phases["decode"].append(decoded - tick)
        phases["encode"].append(encoded - decoded)
        phases["score"].append(scored - encoded)
        phases["total"].append(scored - tick)
    elapsed = time.perf_counter() - began
    count = end - start
    output = {"zero_based_range": [start, end], "frames": count,
              "batch_size": batch_size, "elapsed_s": elapsed,
              "frames_per_s": count / elapsed,
              "phase_elapsed_s": {key: sum(values) for key, values in phases.items()}}
    if batch_size == 1:
        output["single_photo_latency"] = {key: quantiles(values)
                                          for key, values in phases.items()}
    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    if not torch.cuda.is_available():
        raise RuntimeError("this benchmark requires CUDA")
    archive = TSFabricsArchive(args.zip)
    rows = archive.scenarios[TARGET]
    if len(rows) < STREAM[1]:
        raise ValueError("target run is shorter than the fixed benchmark range")

    source, globals_, _ = _load(args.cache, SOURCE, archive)
    startup = np.asarray(source[:512])
    indices = select_reference_indices(mutual_image_scores(startup),
                                        np.asarray(globals_[:512]))
    bank = build_reference_bank(startup, indices)
    scorer = PatchScorer(bank)
    extractor = DINOFeatures()
    for offset in range(*WARMUP, 8):
        images = [archive.read_image(row["image"]) for row in rows[offset:offset + 8]]
        tokens, _ = extractor.encode(images)
        scorer.score(tokens)
    torch.cuda.synchronize()
    torch.cuda.reset_peak_memory_stats()

    batched = []
    for start, end in BATCHED:
        block = measure(archive, rows, extractor, scorer, start, end, 8)
        batched.append(block)
        print(f"batch8 {start}:{end} {block['frames_per_s']:.2f} frames/s", flush=True)
    streaming = measure(archive, rows, extractor, scorer, *STREAM, 1)
    print(f"batch1 {STREAM[0]}:{STREAM[1]} "
          f"{streaming['single_photo_latency']['total']['median_ms']:.2f} ms median",
          flush=True)

    result = {
        "protocol": {
            "target": TARGET, "source": SOURCE, "warmup": list(WARMUP),
            "stream": list(STREAM), "batched": [list(item) for item in BATCHED],
            "image_size": list(IMAGE_SIZE), "model": "frozen DINOv2-S/14",
            "scorer": "source PatchScorer, k=3, top 1% patch distances",
            "reference_images": len(indices), "reference_vectors": len(bank),
            "zip_read_and_decode_included": True,
            "excluded": ["ZIP index construction", "model load", "reference build",
                         "warmup", "camera capture", "change detector", "UI and export"],
            "labels_used": False,
        },
        "environment": {
            "gpu": torch.cuda.get_device_name(), "torch": torch.__version__,
            "cuda_runtime": torch.version.cuda, "python": platform.python_version(),
            "numpy": np.__version__, "pillow": pillow_version,
            "peak_cuda_allocated_bytes": torch.cuda.max_memory_allocated(),
            "peak_cuda_reserved_bytes": torch.cuda.max_memory_reserved(),
        },
        "batched": batched,
        "batched_median_frames_per_s": statistics.median(
            block["frames_per_s"] for block in batched),
        "streaming": streaming,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2, allow_nan=False) + "\n")
    print(f"saved {args.out}", flush=True)


if __name__ == "__main__":
    main()
