"""Unlabeled distribution-change scoring on frozen global image features."""

from __future__ import annotations

import numpy as np


def _kernel(x: np.ndarray, y: np.ndarray, bandwidth: float) -> np.ndarray:
    x = np.asarray(x, dtype=np.float32)
    y = np.asarray(y, dtype=np.float32)
    distance2 = np.maximum(
        (x * x).sum(1)[:, None] + (y * y).sum(1)[None, :] - 2 * x @ y.T,
        0,
    )
    return np.exp(-distance2 / (2 * bandwidth * bandwidth))


def mmd2(x: np.ndarray, y: np.ndarray, bandwidth: float) -> float:
    return float(
        _kernel(x, x, bandwidth).mean()
        + _kernel(y, y, bandwidth).mean()
        - 2 * _kernel(x, y, bandwidth).mean()
    )


class DriftDetector:
    def __init__(self, baseline: np.ndarray, window: int = 128, step: int = 32) -> None:
        if len(baseline) < window * 4:
            raise ValueError("need at least four baseline windows")
        self.window = window
        self.step = step
        self.blocks = [
            np.asarray(baseline[i : i + window], dtype=np.float32)
            for i in range(0, len(baseline) - window + 1, window)
        ]
        sample = np.concatenate(self.blocks[: min(4, len(self.blocks))])
        distances = np.maximum(2 - 2 * sample[::4] @ sample[::4].T, 0)
        self.bandwidth = float(np.sqrt(max(np.median(distances[distances > 0]), 1e-6)))
        null_scores = [
            mmd2(self.blocks[i], self.blocks[j], self.bandwidth)
            for i in range(len(self.blocks))
            for j in range(i + 1, len(self.blocks))
        ]
        self.threshold = float(np.quantile(null_scores, 0.99))
        self.reference = self.blocks[0]

    def sequence_scores(self, features: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        ends = np.arange(self.window, len(features) + 1, self.step)
        scores = np.asarray(
            [mmd2(self.reference, features[end - self.window : end], self.bandwidth) for end in ends],
            dtype=np.float32,
        )
        return ends, scores

    def first_alarm(self, features: np.ndarray, consecutive: int = 3) -> int | None:
        ends, scores = self.sequence_scores(features)
        count = 0
        for end, score in zip(ends, scores):
            count = count + 1 if score > self.threshold else 0
            if count >= consecutive:
                return int(end)
        return None
