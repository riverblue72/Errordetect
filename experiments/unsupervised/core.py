"""Frozen visual features and label-free patch-reference anomaly scoring."""

from __future__ import annotations

import math
import os
from pathlib import Path
from typing import Sequence

import numpy as np
import torch
from PIL import Image


IMAGE_SIZE = (448, 364)  # width, height; both divisible by DINOv2's patch size 14
GRID_SHAPE = (26, 32)
MEAN = np.asarray([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.asarray([0.229, 0.224, 0.225], dtype=np.float32)


def preprocess(image: Image.Image) -> np.ndarray:
    rgb = image.convert("RGB").resize(IMAGE_SIZE, getattr(Image, "Resampling", Image).BILINEAR)
    array = np.asarray(rgb, dtype=np.float32) / 255.0
    return np.transpose((array - MEAN) / STD, (2, 0, 1))


class DINOFeatures:
    def __init__(self, device: str = "cuda") -> None:
        hub = Path(torch.hub.get_dir()) / "facebookresearch_dinov2_main"
        if hub.exists():
            model = torch.hub.load(str(hub), "dinov2_vits14", source="local", pretrained=True)
        else:
            model = torch.hub.load("facebookresearch/dinov2", "dinov2_vits14", pretrained=True)
        self.model = model.eval().to(device)
        self.device = device

    @torch.inference_mode()
    def encode(self, images: Sequence[Image.Image]) -> tuple[np.ndarray, np.ndarray]:
        x = torch.from_numpy(np.stack([preprocess(im) for im in images])).to(self.device)
        with torch.autocast(device_type="cuda", dtype=torch.float16, enabled=self.device == "cuda"):
            tokens = self.model.forward_features(x)["x_norm_patchtokens"]
        tokens = torch.nn.functional.normalize(tokens.float(), dim=-1)
        global_features = torch.nn.functional.normalize(tokens.mean(dim=1), dim=-1)
        return tokens.cpu().numpy().astype(np.float16), global_features.cpu().numpy().astype(np.float16)


def _sample_bank(
    features: np.ndarray,
    image_indices: np.ndarray,
    *,
    seed: int,
    per_image: int,
    max_vectors: int,
) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    vectors = []
    owners = []
    for image_index in image_indices:
        patch_ids = rng.choice(features.shape[1], size=min(per_image, features.shape[1]), replace=False)
        vectors.append(np.asarray(features[image_index, patch_ids], dtype=np.float32))
        owners.extend([int(image_index)] * len(patch_ids))
    bank = np.concatenate(vectors)
    owner_array = np.asarray(owners, dtype=np.int32)
    if len(bank) > max_vectors:
        chosen = rng.choice(len(bank), size=max_vectors, replace=False)
        bank, owner_array = bank[chosen], owner_array[chosen]
    bank /= np.maximum(np.linalg.norm(bank, axis=1, keepdims=True), 1e-8)
    return bank.astype(np.float16), owner_array


def mutual_image_scores(
    features: np.ndarray,
    *,
    seed: int = 42,
    patches_per_image: int = 24,
    max_bank: int = 12000,
    query_patches: int = 64,
    device: str = "cuda",
) -> np.ndarray:
    """Rank an unlabeled startup batch against other images, excluding self matches.

    This is a bounded mutual-similarity initializer, not the published MuSc model.
    """
    indices = np.arange(len(features))
    bank, owners = _sample_bank(
        features, indices, seed=seed, per_image=patches_per_image, max_vectors=max_bank
    )
    bank_t = torch.as_tensor(bank, device=device).float().T
    owner_t = torch.as_tensor(owners, device=device)
    patch_ids = np.linspace(0, features.shape[1] - 1, query_patches, dtype=np.int32)
    scores = np.empty(len(features), dtype=np.float32)
    for image_index in indices:
        query = torch.as_tensor(features[image_index, patch_ids], device=device).float()
        query = torch.nn.functional.normalize(query, dim=-1)
        similarity = query @ bank_t
        similarity[:, owner_t == image_index] = -1
        k = min(3, max(1, len(bank) - int((owners == image_index).sum())))
        distance = 1 - similarity.topk(k, dim=1).values[:, -1]
        top = max(1, math.ceil(len(distance) * 0.05))
        scores[image_index] = distance.topk(top).values.mean().item()
    return scores


def select_reference_indices(
    mutual_scores: np.ndarray, global_features: np.ndarray, fraction: float = 0.6
) -> np.ndarray:
    """Retain low-novelty frames from each unsupervised appearance cluster.

    Clusters are four bins along the first principal component; no labels enter.
    """
    centered = global_features.astype(np.float32) - global_features.astype(np.float32).mean(0)
    _, _, vh = np.linalg.svd(centered, full_matrices=False)
    coordinate = centered @ vh[0]
    bins = np.quantile(coordinate, [0.25, 0.5, 0.75])
    group = np.digitize(coordinate, bins)
    chosen = []
    for cluster in range(4):
        members = np.flatnonzero(group == cluster)
        count = max(1, math.ceil(len(members) * fraction))
        chosen.extend(members[np.argsort(mutual_scores[members])[:count]].tolist())
    return np.sort(np.asarray(chosen, dtype=np.int32))


def build_reference_bank(
    features: np.ndarray,
    image_indices: np.ndarray,
    *,
    seed: int = 42,
    per_image: int = 24,
    max_vectors: int = 10000,
) -> np.ndarray:
    bank, _ = _sample_bank(
        features, image_indices, seed=seed, per_image=per_image, max_vectors=max_vectors
    )
    return bank


class PatchScorer:
    def __init__(self, bank: np.ndarray, *, device: str = "cuda", k: int = 3) -> None:
        self.device = device
        self.bank = torch.as_tensor(bank, device=device).float().T.contiguous()
        self.k = min(k, bank.shape[0])

    @torch.inference_mode()
    def score(self, features: np.ndarray, frame_batch: int = 4) -> tuple[np.ndarray, np.ndarray]:
        image_scores = np.empty(len(features), dtype=np.float32)
        maps = np.empty((len(features), features.shape[1]), dtype=np.float16)
        for start in range(0, len(features), frame_batch):
            batch = torch.as_tensor(features[start : start + frame_batch], device=self.device).float()
            shape = batch.shape[:2]
            similarity = batch.reshape(-1, batch.shape[-1]) @ self.bank
            distances = 1 - similarity.topk(self.k, dim=1).values[:, -1]
            distances = distances.reshape(shape)
            top_count = max(1, math.ceil(shape[1] * 0.01))
            image_scores[start : start + shape[0]] = (
                distances.topk(top_count, dim=1).values.mean(dim=1).cpu().numpy()
            )
            maps[start : start + shape[0]] = distances.cpu().numpy().astype(np.float16)
        return image_scores, maps.reshape((-1, *GRID_SHAPE))
