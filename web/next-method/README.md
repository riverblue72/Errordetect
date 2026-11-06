# New pipeline animation assets

Six looping, 720 × 420 GIFs and matching poster frames remain as source assets.
The landing page presents improvements rather than the six-step sequence.
`hero.webp` combines four visual themes: DINOv2 features (`02`), unlabeled
reference selection (`03`), visual change (`05`), and candidate comparison
(`06`). The complete asset set depicts:

1. Continuous production frames
2. Frozen visual features
3. Unlabeled reference selection
4. Patch anomaly localization and review decision
5. Distribution change detection
6. Current reference versus trial candidate on the same photo

The photographs are real TSFabrics production frames. The feature projection,
reference choices, anomaly maps, scores, and drift curve come from the recorded
experiment. Animation timing and arrows explain the process; they are not
camera or model outputs. The example in `06.gif` is a real
held-out defect flagged by the frozen model and missed by the shadow candidate.
Step `05.gif` pairs photos from source run `T1_S174_I111_1` with photos from the
separate all-normal changed run `T1_S164_I36_1`. Its plot uses the last 16
source-holdout windows and the first 16 changed-run windows at equal spacing;
the third changed-run window confirms the frame-192 alert. The run boundary is
illustrative, not a continuous camera recording across both runs.
The fabric dataset is a proxy for the intended rubber-belt application; these
assets do not show performance on Dongil rubber-belt images.

Source: Yan-Qin Ni, Pei-Kai Huang, Wei-Jen Wang, Deron Liang, and Chia-Yu Lin,
*TSFabrics: A Time-Series Fabric Dataset for Real-Time Defect Detection on
Circular Knitting Machines*, Scientific Data (2026),
https://doi.org/10.1038/s41597-026-06748-9.
Dataset: https://doi.org/10.6084/m9.figshare.29573381. The authors state that
the dataset is released under CC BY 4.0. These images were cropped, resized,
colored with model-derived overlays, and composed into animations. Retain this
attribution and a visible dataset credit when the assets are placed on a site.

To regenerate: run `experiments/unsupervised/export_animation_data.py` on the
experiment machine, transfer its ignored `animation_data/` folder to the same
repository path locally, then run `scripts/generate_next_method_gifs.py`.
Run `scripts/generate_hero_animation.py` afterward to rebuild the landing loop.
