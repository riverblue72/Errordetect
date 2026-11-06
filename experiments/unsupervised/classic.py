"""Landscape port of the original eight-statistic patch baseline."""

from __future__ import annotations

import math

import numpy as np
import torch
from PIL import Image, ImageFilter


SIZE = (224, 176)
GRID = (22, 28)
BLOCK = 8


def feature_map(image: Image.Image) -> np.ndarray:
    gray_image = image.convert("L").resize(SIZE, getattr(Image, "Resampling", Image).BILINEAR)
    raw = np.asarray(gray_image, dtype=np.float32) / 255.0
    centered = np.clip((raw - np.median(raw)) / max(float(np.std(raw)), 0.06), -4, 4)

    def blocks(array: np.ndarray) -> np.ndarray:
        return array.reshape(GRID[0], BLOCK, GRID[1], BLOCK).transpose(0, 2, 1, 3)

    pixels = blocks(centered)
    close = gray_image.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))
    dark_gap = blocks(np.maximum(np.asarray(close, dtype=np.float32) / 255.0 - raw, 0))
    dx = blocks(np.abs(np.diff(centered, axis=1, prepend=centered[:, :1])))
    dy = blocks(np.abs(np.diff(centered, axis=0, prepend=centered[:1, :])))
    return np.stack(
        [
            pixels.mean((2, 3)),
            pixels.std((2, 3)),
            np.percentile(pixels, 10, axis=(2, 3)),
            np.percentile(pixels, 90, axis=(2, 3)),
            dark_gap.mean((2, 3)),
            np.percentile(dark_gap, 95, axis=(2, 3)),
            dx.mean((2, 3)),
            dy.mean((2, 3)),
        ],
        axis=-1,
    ).astype(np.float16)


class ClassicScorer:
    def __init__(self, startup_features: np.ndarray, seed: int = 42, device: str = "cuda") -> None:
        self.device = device
        rng = np.random.default_rng(seed)
        sampled = []
        for frame in startup_features:
            chosen = rng.choice(len(frame), size=16, replace=False)
            sampled.append(np.asarray(frame[chosen], dtype=np.float32))
        reference = np.concatenate(sampled)
        self.center = np.median(reference, axis=0).astype(np.float32)
        self.scale = np.maximum(np.std(reference, axis=0), 0.025).astype(np.float32)
        reference = (reference - self.center) / self.scale
        bank = reference[rng.choice(len(reference), size=2048, replace=False)]
        self.bank = torch.as_tensor(bank, device=device).float().T.contiguous()
        self.bank_squared = (self.bank * self.bank).sum(0)

    @torch.inference_mode()
    def score(self, features: np.ndarray, frame_batch: int = 8) -> tuple[np.ndarray, np.ndarray]:
        image_scores = np.empty(len(features), dtype=np.float32)
        maps = np.empty((len(features), *GRID), dtype=np.float16)
        for start in range(0, len(features), frame_batch):
            batch = (np.asarray(features[start : start + frame_batch], dtype=np.float32) - self.center) / self.scale
            q = torch.as_tensor(batch, device=self.device).float()
            shape = q.shape[:3]
            q = q.reshape(-1, 8)
            distance2 = (q * q).sum(1)[:, None] + self.bank_squared[None, :] - 2 * (q @ self.bank)
            distances = torch.sqrt(distance2.min(dim=1).values.clamp_min_(0)).reshape(shape)
            count = max(1, math.ceil(GRID[0] * GRID[1] * 0.005))
            image_scores[start : start + shape[0]] = (
                distances.reshape(shape[0], -1).topk(count, dim=1).values.mean(1).cpu().numpy()
            )
            maps[start : start + shape[0]] = distances.cpu().numpy().astype(np.float16)
        return image_scores, maps
