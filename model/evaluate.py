"""Report the small held-out test result for the CPU-only prototype baseline."""

import csv

import numpy as np
from PIL import Image

from model import Analyzer, DATA, feature_map, image_score, nearest_distances


analyzer = Analyzer()
rows = [r for r in csv.DictReader((DATA / "manifest.csv").open(encoding="utf-8")) if r["split"] == "test"]
scores = []
labels = []
locations = []
for row in rows:
    with Image.open(DATA / row["image"]) as image:
        f = (feature_map(image) - analyzer.center) / analyzer.scale
    patch = nearest_distances(f, analyzer.bank)
    score = image_score(patch)
    label = int(row["is_anomaly"])
    scores.append(score)
    labels.append(label)
    if label:
        with Image.open(DATA / row["mask"]) as mask:
            mask = np.asarray(mask.resize((patch.shape[1], patch.shape[0]), Image.Resampling.NEAREST)) > 0
        locations.append(float(np.max(patch[mask])) if mask.any() else float("nan"))

scores = np.asarray(scores)
labels = np.asarray(labels)
positives = scores[labels == 1]
negatives = scores[labels == 0]
auroc = float(np.mean(positives[:, None] > negatives[None, :]) + 0.5 * np.mean(positives[:, None] == negatives[None, :]))
print(f"Test images: {len(rows)} (anomaly {len(positives)}, normal {len(negatives)})")
print(f"Image AUROC: {auroc:.3f}")
print(f"Review threshold: {analyzer.threshold:.3f}")
print(f"Detected anomalies: {int(np.sum(positives >= analyzer.threshold))}/{len(positives)}")
print(f"Normal false alarms: {int(np.sum(negatives >= analyzer.threshold))}/{len(negatives)}")
print(f"Median score, anomaly / normal: {np.median(positives):.3f} / {np.median(negatives):.3f}")
