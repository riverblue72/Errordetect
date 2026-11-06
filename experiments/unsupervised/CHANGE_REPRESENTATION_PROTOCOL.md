# Change signal: frozen DINOv2 versus grayscale histogram

## Question

The site reports a DINOv2 global-feature MMD alarm on 15 of 16 known joins
between recorded TSFabrics production scenarios, and no alarm on a long
continuation of its source recording. Would a much cheaper image-level
brightness histogram produce the same evidence? This is a
**representation ablation**, not a new real process-change benchmark.

## Fixed comparison before inspecting histogram outcomes

- Use the published source `T1_S174_I111_1`, the same five development runs,
  all sixteen extended runs, and the same chronological order, target prefix
  of at most 1,024 frames, and 1,024-frame source prelude as
  `unlabeled_review.py`. Do not omit a run based on its result.
- The existing DINOv2 arm is the saved `unlabeled_review_{phase}.json`
  operational change result. The control first resizes each image to the same
  448×364 input size, then represents its grayscale pixels by a **32-bin
  intensity histogram**, summing eight neighboring 8-bit values per bin and
  taking square roots of bin proportions. This
  Hellinger embedding has unit length, matching the cosine geometry expected
  by the existing `DriftDetector`. No defect or cutline label is used.
- Fit **the same detector implementation** on the first 2,048 source frames
  separately for each representation: 128-frame MMD windows, 32-frame step,
  median-distance RBF bandwidth, 99th-percentile pairwise-block limit, and
  confirmation after three consecutive over-limit windows. Do not tune bins,
  thresholds, or persistence on target results.
- Score the same source continuation `[2112,18630)` for each representation.
  The DINOv2 result is fixed in `source_continuation_full.json`. For every
  target, join source frames `[2112,3136)` to target frames
  `[0,min(1024,run_length))` and record the first alarm and delay from the
  known join. Preserve per-run results, source-window counts, and frame
  positions. Compute separate totals for five development and sixteen
  extended runs only after every histogram decision is fixed.
- The join is known to the evaluation but not passed to either detector.
  Neither dataset annotation nor result establishes a timestamp for an
  unannounced within-scenario process change. Report alert burden on the
  one source recording, not a population false-positive rate. A simpler
  method that ties or wins here would need independent validation before
  replacing the deployed explanation.

## Run

On the authorized server, within the project repository:

```sh
.venv-dino-audit/bin/python experiments/unsupervised/change_representation_audit.py \
  --zip experiments/unsupervised/data/TSfabrics.zip \
  --development experiments/unsupervised/results/unlabeled_review_development.json \
  --final experiments/unsupervised/results/unlabeled_review_final.json \
  --source-full experiments/unsupervised/results/source_continuation_full.json \
  --out experiments/unsupervised/results/change_representation_audit.json
```
