"""Small CPU-only visual anomaly baseline for the HTML prototype.

This uses hand-crafted patch statistics and nearest-normal-patch distance. It is
not PatchCore, and its score is not a probability of product failure.
"""

from __future__ import annotations

import csv
import io
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
DATA = Path(os.environ["KSDD_DATA_DIR"]).expanduser().resolve() if os.environ.get("KSDD_DATA_DIR") else ROOT / "data" / "ksdd"
MODEL = Path(__file__).with_name("normal_reference.npz")
WIDTH, HEIGHT, BLOCK = 256, 640, 8


def feature_map(image: Image.Image) -> np.ndarray:
    image = image.convert("L").resize((WIDTH, HEIGHT), Image.Resampling.BILINEAR)
    raw = np.asarray(image, dtype=np.float32) / 255.0
    median = float(np.median(raw))
    spread = float(np.std(raw))
    gray = np.clip((raw - median) / max(spread, 0.06), -4, 4)

    def blocks(a: np.ndarray) -> np.ndarray:
        return a.reshape(HEIGHT // BLOCK, BLOCK, WIDTH // BLOCK, BLOCK).transpose(0, 2, 1, 3)

    b = blocks(gray)
    close = image.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))
    dark_gap = np.maximum(np.asarray(close, dtype=np.float32) / 255.0 - raw, 0)
    d = blocks(dark_gap)
    gx = np.abs(np.diff(gray, axis=1, prepend=gray[:, :1]))
    gy = np.abs(np.diff(gray, axis=0, prepend=gray[:1, :]))
    features = np.stack(
        [
            b.mean((2, 3)),
            b.std((2, 3)),
            np.percentile(b, 10, axis=(2, 3)),
            np.percentile(b, 90, axis=(2, 3)),
            d.mean((2, 3)),
            np.percentile(d, 95, axis=(2, 3)),
            blocks(gx).mean((2, 3)),
            blocks(gy).mean((2, 3)),
        ],
        axis=-1,
    )
    return features.astype(np.float32)


def nearest_distances(features: np.ndarray, bank: np.ndarray) -> np.ndarray:
    flat = features.reshape(-1, features.shape[-1])
    bank_norm = np.sum(bank * bank, axis=1)
    result = np.empty(len(flat), dtype=np.float32)
    for start in range(0, len(flat), 128):
        q = flat[start : start + 128]
        dist2 = np.sum(q * q, axis=1)[:, None] + bank_norm[None, :] - 2 * (q @ bank.T)
        result[start : start + len(q)] = np.sqrt(np.maximum(np.min(dist2, axis=1), 0))
    return result.reshape(features.shape[:2])


def image_score(patch_scores: np.ndarray) -> float:
    return float(np.percentile(patch_scores, 99.5))


def train() -> None:
    rows = list(csv.DictReader((DATA / "manifest.csv").open(encoding="utf-8")))
    training = [r for r in rows if r["split"] == "train"]
    validation = [r for r in rows if r["split"] == "val" and r["is_anomaly"] == "0"]
    rng = np.random.default_rng(42)
    patches = []
    for row in training:
        with Image.open(DATA / row["image"]) as image:
            f = feature_map(image).reshape(-1, 8)
        patches.append(f[rng.choice(len(f), size=16, replace=False)])
    raw_bank = np.concatenate(patches)
    center = np.median(raw_bank, axis=0).astype(np.float32)
    scale = np.maximum(np.std(raw_bank, axis=0), 0.025).astype(np.float32)
    normalized_bank = ((raw_bank - center) / scale).astype(np.float32)
    bank = normalized_bank[rng.choice(len(normalized_bank), size=min(2048, len(normalized_bank)), replace=False)]

    normal_scores = []
    for row in validation:
        with Image.open(DATA / row["image"]) as image:
            f = (feature_map(image) - center) / scale
        normal_scores.append(image_score(nearest_distances(f, bank)))
    threshold = float(np.percentile(normal_scores, 95))
    np.savez_compressed(
        MODEL, bank=bank, center=center, scale=scale,
        normal_scores=np.asarray(normal_scores, dtype=np.float32), threshold=np.float32(threshold)
    )
    print(f"Model: {len(training)} normal training images, {len(validation)} normal validation images")
    print(f"Reference patches: {len(bank)}; review threshold: {threshold:.3f}")
    print(f"Saved: {MODEL}")


class Analyzer:
    def __init__(self) -> None:
        if not MODEL.exists():
            raise FileNotFoundError(f"Run model.py once to build {MODEL}")
        saved = np.load(MODEL)
        self.bank = saved["bank"]
        self.center = saved["center"]
        self.scale = saved["scale"]
        self.normal_scores = saved["normal_scores"]
        self.threshold = float(saved["threshold"])

    def analyze(self, data: bytes) -> dict:
        with Image.open(io.BytesIO(data)) as input_image:
            input_image.verify()
        with Image.open(io.BytesIO(data)) as input_image:
            width, height = input_image.size
            features = (feature_map(input_image) - self.center) / self.scale
        scores = nearest_distances(features, self.bank)
        score = image_score(scores)
        percentile = float(100 * np.mean(self.normal_scores <= score))
        ratio = width / height
        comparable = 0.32 <= ratio <= 0.50 and min(width, height) >= 200
        heat = np.clip((scores - self.threshold * 0.35) / max(self.threshold * 0.9, 0.01), 0, 1)
        heat = Image.fromarray(np.uint8(heat * 200), mode="L").resize((WIDTH, HEIGHT), Image.Resampling.BILINEAR)
        heat = heat.filter(ImageFilter.GaussianBlur(radius=5))
        alpha = np.asarray(heat, dtype=np.uint8)
        overlay = np.zeros((HEIGHT, WIDTH, 4), dtype=np.uint8)
        overlay[:, :, 0] = 244
        overlay[:, :, 1] = 64
        overlay[:, :, 2] = 54
        overlay[:, :, 3] = alpha
        out = io.BytesIO()
        Image.fromarray(overlay, mode="RGBA").save(out, format="PNG")
        import base64

        return {
            "score": round(score, 3),
            "threshold": round(self.threshold, 3),
            "normal_percentile": round(percentile, 1),
            "review": bool(score >= self.threshold) if comparable else None,
            "comparable": comparable,
            "heatmap": "data:image/png;base64," + base64.b64encode(out.getvalue()).decode("ascii"),
            "image_width": width,
            "image_height": height,
        }


if __name__ == "__main__":
    train()
