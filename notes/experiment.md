# Current experiment

## Scope

This is a small, CPU-only baseline used to test an image review workflow. It is not PatchCore or a calibrated defect probability. The data contains industrial metal surface photos, so the results do not estimate rubber belt performance.

## Split

`data/ksdd/make_manifest.py` shuffles 50 `kosXX` item groups with seed 42, then assigns 35 groups to training, 7 to validation, and 8 to held-out testing. Groups do not overlap. Defective images in training groups are excluded from the normal reference.

| Split | Normal | Defect | Use |
| --- | ---: | ---: | --- |
| Train | 243 | 36 excluded | Build the normal patch bank |
| Validation | 48 | 8 unused | Set a threshold from normal images only |
| Test | 56 | 8 | Report held-out image metrics |

This is a project-specific split, not the official three-fold KolektorSDD benchmark protocol.

## Method

1. Resize each photo to 256 × 640 grayscale and normalize its brightness.
2. Divide it into 8 × 8 patches. Compute eight handcrafted intensity, dark-gap, and gradient statistics per patch.
3. Sample 16 patches per normal training photo, standardize features, and retain 2,048 normal feature vectors.
4. For a new photo, score each patch by Euclidean distance to its nearest normal vector. The image score is the 99.5th percentile of patch distances. Patch distances form a heatmap.
5. Use the 95th percentile of 48 normal validation image scores as the review threshold. The browser implementation recalibrates this threshold after Canvas preprocessing.

## Held-out browser result

`model/browser_calibration.json` records image AUROC **0.879**, defect images flagged **5/8**, and normal false alarms **7/56** at threshold **2.477**. The test contains only eight defect images, and three were missed. Localization accuracy has not been measured against pixel masks. All 64 held-out test photos are available in the site's sample explorer; their dataset labels are separate from the model's review result.

## Next experiment

Compare a pretrained deep-feature method such as PatchCore against this baseline on the same held-out groups. Report defect recall, normal false-alarm rate, image AUROC, heatmap localization accuracy, and per-image latency. After obtaining company photos, define the inspection task and hold out product, lot, or acquisition sessions before selecting a model for that domain.

