"""Raw-image preprocessing ablation on LUSITANOv2.

Official validation images simulate an unlabeled startup stream; official test is
held out. Validation labels are used solely to set a documented rare-defect
prevalence and to audit selection. No labels enter model fitting or thresholds.
"""

from __future__ import annotations

import argparse
import json
import math
import time
from pathlib import Path

import numpy as np
import torch
from PIL import Image

from core import DINOFeatures, MEAN, STD, build_reference_bank, mutual_image_scores, select_reference_indices
from metrics import summarize


SIZE = 518
PATCH = 14
GRID = SIZE // PATCH


def boxes_for(image: Path) -> list[tuple[float, float, float, float]]:
    label = image.parents[2] / "labels" / image.parent.name / (image.stem + ".txt")
    boxes = []
    if label.exists():
        for line in label.read_text().splitlines():
            fields = line.split()
            if len(fields) < 5:
                continue
            _, x, y, w, h = map(float, fields[:5])
            boxes.append((x - w / 2, y - h / 2, x + w / 2, y + h / 2))
    return boxes


def split_validation(root: Path, seed: int) -> tuple[list[Path], list[Path], dict]:
    paths = sorted((root / "images" / "val").glob("*.tif"))
    normal = [p for p in paths if not boxes_for(p)]
    defect = [p for p in paths if boxes_for(p)]
    available_normal, available_defect = len(normal), len(defect)
    if len(normal) < 1014 or len(defect) < 6:
        raise ValueError(f"Need >=1014 normal and >=6 defective val images; got {len(normal)}, {len(defect)}")
    rng = np.random.default_rng(seed)
    normal = list(rng.permutation(normal)[:1014])
    defect = list(rng.permutation(defect)[:6])
    bank = list(rng.permutation(normal[:507] + defect[:3]))
    calibration = list(rng.permutation(normal[507:] + defect[3:]))
    assert not set(bank) & set(calibration)
    return bank, calibration, {"val_total": len(paths), "val_normal_available": available_normal, "val_defect_available": available_defect, "startup": len(bank), "startup_defects": 3, "calibration": len(calibration), "calibration_defects": 3}


def views(image: Image.Image, mode: str) -> tuple[list[Image.Image], np.ndarray]:
    width, height = image.size
    if mode == "global":
        scaled_h = round(SIZE * height / width)
        resized = image.convert("RGB").resize((SIZE, scaled_h), Image.Resampling.BILINEAR)
        canvas = Image.new("RGB", (SIZE, SIZE), (124, 116, 104))
        top = (SIZE - scaled_h) // 2
        canvas.paste(resized, (0, top))
        y, x = np.mgrid[:GRID, :GRID]
        cx, cy = (x + 0.5) * PATCH, (y + 0.5) * PATCH
        valid = (cy >= top) & (cy < top + scaled_h)
        centers = np.column_stack((cx[valid].ravel() / SIZE, (cy[valid].ravel() - top) / scaled_h))
        return [canvas], centers.astype(np.float32)
    if mode == "tiles":
        if height != 1024 or width != 4096:
            raise ValueError(f"Expected raw 4096x1024 image, got {image.size}")
        starts = (0, 768, 1536, 2304, 3072)
        y, x = np.mgrid[:GRID, :GRID]
        centers = np.concatenate([
            np.column_stack(((start + (x.ravel() + 0.5) * 1024 / GRID) / width,
                             (y.ravel() + 0.5) / GRID))
            for start in starts
        ]).astype(np.float32)
        return [image.crop((start, 0, start + 1024, 1024)).convert("RGB").resize((SIZE, SIZE), Image.Resampling.BILINEAR) for start in starts], centers
    raise ValueError(mode)


@torch.inference_mode()
def encode(path: Path, mode: str, model: DINOFeatures) -> tuple[np.ndarray, np.ndarray]:
    with Image.open(path) as im:
        images, centers = views(im, mode)
    arrays = [np.transpose((np.asarray(image, dtype=np.float32) / 255 - MEAN) / STD, (2, 0, 1)) for image in images]
    x = torch.from_numpy(np.stack(arrays)).to(model.device)
    with torch.autocast(device_type="cuda", dtype=torch.float16, enabled=model.device == "cuda"):
        features = model.model.forward_features(x)["x_norm_patchtokens"]
    features = torch.nn.functional.normalize(features.float(), dim=-1).reshape(-1, 384)
    if mode == "global":
        with Image.open(path) as im:
            scaled_h = round(SIZE * im.height / im.width)
        top = (SIZE - scaled_h) // 2
        y, _ = np.mgrid[:GRID, :GRID]
        keep = (((y + .5) * PATCH >= top) & ((y + .5) * PATCH < top + scaled_h)).ravel()
        features = features[torch.as_tensor(keep, device=model.device)]
    return features.cpu().numpy().astype(np.float16), centers


class Scorer:
    def __init__(self, bank: np.ndarray, device: str):
        self.reference = torch.as_tensor(bank, device=device).float().T.contiguous()
        self.device = device

    @torch.inference_mode()
    def score(self, features: np.ndarray) -> tuple[float, np.ndarray]:
        output = []
        for start in range(0, len(features), 2048):
            query = torch.as_tensor(features[start:start + 2048], device=self.device).float()
            distance = 1 - (query @ self.reference).topk(3, dim=1).values[:, -1]
            output.append(distance.cpu().numpy())
        values = np.concatenate(output)
        count = max(1, math.ceil(len(values) * .01))
        return float(np.partition(values, -count)[-count:].mean()), values


def box_hits(values: np.ndarray, centers: np.ndarray, boxes: list[tuple[float, float, float, float]]) -> tuple[bool, bool]:
    inside = np.zeros(len(values), dtype=bool)
    for x0, y0, x1, y1 in boxes:
        inside |= (centers[:, 0] >= x0) & (centers[:, 0] <= x1) & (centers[:, 1] >= y0) & (centers[:, 1] <= y1)
    count = max(1, math.ceil(len(values) * .01))
    return bool(inside[np.argmax(values)]), bool(inside[np.argpartition(values, -count)[-count:]].any())


def evaluate(paths: list[Path], mode: str, model: DINOFeatures, scorers: dict[str, Scorer]) -> dict:
    labels, scores, single_hits, region_hits, seconds = [], {k: [] for k in scorers}, {k: [] for k in scorers}, {k: [] for k in scorers}, []
    for index, path in enumerate(paths):
        start = time.perf_counter()
        features, centers = encode(path, mode, model)
        boxes = boxes_for(path)
        labels.append(bool(boxes))
        for name, scorer in scorers.items():
            score, heat = scorer.score(features)
            scores[name].append(score)
            if boxes:
                single, region = box_hits(heat, centers, boxes)
                single_hits[name].append(single)
                region_hits[name].append(region)
        seconds.append(time.perf_counter() - start)
        if index % 100 == 0:
            print(mode, index + 1, '/', len(paths), flush=True)
    return {"labels": np.asarray(labels), "scores": {k: np.asarray(v) for k, v in scores.items()}, "single_hits": single_hits, "region_hits": region_hits, "seconds": seconds}


def run(root: Path, out: Path, seed: int, mode: str, model: DINOFeatures) -> dict:
    startup, calibration, split = split_validation(root, seed)
    test_all = sorted((root / "images" / "test").glob("*.tif"))
    empty_test_files = [path.name for path in test_all if path.stat().st_size == 0]
    test = [path for path in test_all if path.stat().st_size > 0]
    if not test:
        raise ValueError("No official test images found")
    rng = np.random.default_rng(seed)
    sampled = []
    global_features = []
    start = time.perf_counter()
    for index, path in enumerate(startup):
        features, _ = encode(path, mode, model)
        selected = rng.choice(len(features), size=12, replace=False)
        sampled.append(features[selected])
        global_features.append(features.astype(np.float32).mean(0))
        if index % 100 == 0:
            print(mode, 'reference', index + 1, '/', len(startup), flush=True)
    sampled = np.stack(sampled)
    global_features = np.stack(global_features)
    novelty = mutual_image_scores(sampled, seed=seed, patches_per_image=12, max_bank=12000, query_patches=12, device=model.device)
    chosen = select_reference_indices(novelty, global_features)
    bank_size = 12 * len(chosen)
    scorers = {
        "all_unlabeled": Scorer(build_reference_bank(sampled, np.arange(len(sampled)), seed=seed, per_image=12, max_vectors=bank_size), model.device),
        "mutual_selected": Scorer(build_reference_bank(sampled, chosen, seed=seed, per_image=12, max_vectors=bank_size), model.device),
    }
    reference_seconds = time.perf_counter() - start
    cal = evaluate(calibration, mode, model, scorers)
    thresholds = {name: float(np.quantile(scores, .995)) for name, scores in cal['scores'].items()}
    evaluated = evaluate(test, mode, model, scorers)
    results = {}
    for name in scorers:
        results[name] = summarize(evaluated['labels'], evaluated['scores'][name], thresholds[name])
        results[name]['single_hottest_patch_box_hit'] = float(np.mean(evaluated['single_hits'][name]))
        results[name]['top_1pct_patch_box_hit'] = float(np.mean(evaluated['region_hits'][name]))
    result = {
        "dataset": "LUSITANOv2", "mode": mode, "seed": seed, "split": split,
        "test_count": len(test), "excluded_empty_test_files": empty_test_files,
        "reference_selected": len(chosen), "reference_vectors_per_method": bank_size,
        "reference_selected_actual_defects": int(sum(bool(boxes_for(startup[i])) for i in chosen)),
        "reference_seconds": reference_seconds,
        "evaluation_seconds": sum(evaluated['seconds']),
        "mean_test_seconds_per_image": float(np.mean(evaluated['seconds'])),
        "methods": results,
        "protocol": "Validation labels construct a 0.59% defect startup/calibration scenario only; model and thresholds use unlabeled images. Official test held out. q99.5 calibration. Frozen DINOv2-S/14, k=3 patch cosine distance, top 1% image score. This is a public-dataset simulation, not factory validation.",
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2, allow_nan=True))
    print(json.dumps(result, indent=2), flush=True)
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path('experiments/unsupervised/data/lusitano'))
    parser.add_argument('--out-dir', type=Path, default=Path('experiments/unsupervised/results'))
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--mode', choices=['global', 'tiles', 'both'], default='both')
    args = parser.parse_args()
    model = DINOFeatures()
    for mode in (['global', 'tiles'] if args.mode == 'both' else [args.mode]):
        run(args.root, args.out_dir / f'lusitano_{mode}.json', args.seed, mode, model)
