"""Evaluation measures; ground-truth labels are consumed only here."""

from __future__ import annotations

import numpy as np


def roc_auc(labels: np.ndarray, scores: np.ndarray) -> float:
    labels = np.asarray(labels, dtype=bool)
    scores = np.asarray(scores, dtype=np.float64)
    positive = int(labels.sum())
    negative = len(labels) - positive
    if not positive or not negative:
        return float("nan")
    order = np.argsort(scores, kind="stable")
    sorted_scores = scores[order]
    ranks = np.empty(len(scores), dtype=np.float64)
    start = 0
    while start < len(scores):
        end = start + 1
        while end < len(scores) and sorted_scores[end] == sorted_scores[start]:
            end += 1
        ranks[order[start:end]] = (start + 1 + end) / 2
        start = end
    return float((ranks[labels].sum() - positive * (positive + 1) / 2) / (positive * negative))


def average_precision(labels: np.ndarray, scores: np.ndarray) -> float:
    labels = np.asarray(labels, dtype=bool)
    scores = np.asarray(scores, dtype=np.float64)
    positives = int(labels.sum())
    if not positives:
        return float("nan")
    order = np.argsort(-scores, kind="stable")
    sorted_scores = scores[order]
    sorted_labels = labels[order]
    true_positives = 0
    area = 0.0
    start = 0
    while start < len(scores):
        end = start + 1
        while end < len(scores) and sorted_scores[end] == sorted_scores[start]:
            end += 1
        group_positives = int(sorted_labels[start:end].sum())
        true_positives += group_positives
        area += group_positives / positives * true_positives / end
        start = end
    return float(area)


def threshold_metrics(labels: np.ndarray, scores: np.ndarray, threshold: float) -> dict:
    labels = np.asarray(labels, dtype=bool)
    alerted = np.asarray(scores) >= threshold
    tp = int((alerted & labels).sum())
    fp = int((alerted & ~labels).sum())
    fn = int((~alerted & labels).sum())
    tn = int((~alerted & ~labels).sum())
    return {
        "threshold": float(threshold),
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
        "recall": tp / (tp + fn) if tp + fn else float("nan"),
        "precision": tp / (tp + fp) if tp + fp else float("nan"),
        "false_alarms_per_10000_normals": 10000 * fp / (fp + tn) if fp + tn else float("nan"),
    }


def summarize(labels: np.ndarray, scores: np.ndarray, threshold: float) -> dict:
    result = threshold_metrics(labels, scores, threshold)
    result["count"] = len(labels)
    result["anomalies"] = int(np.asarray(labels, dtype=bool).sum())
    result["auroc"] = roc_auc(labels, scores)
    result["average_precision"] = average_precision(labels, scores)
    return result


def top_region_hit(maps: np.ndarray, masks: np.ndarray, top_fraction: float = 0.01) -> float:
    """Fraction of defective images with a labeled pixel in their hottest region."""
    if maps.shape != masks.shape:
        raise ValueError("maps and masks must have equal shape")
    hits = []
    for score_map, mask in zip(maps, masks):
        if not np.any(mask):
            continue
        count = max(1, int(np.ceil(score_map.size * top_fraction)))
        chosen = np.argpartition(score_map.ravel(), -count)[-count:]
        hits.append(bool(mask.ravel()[chosen].any()))
    return float(np.mean(hits)) if hits else float("nan")
