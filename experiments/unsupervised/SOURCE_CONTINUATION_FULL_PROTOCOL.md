# Full source-run continuation: fixed change-signal audit

## Question

The current site reports no MMD change alert on source frames 2112–4095,
1,984 consecutive images. Does the **unchanged detector** remain quiet on the
rest of this same recorded production scenario? TSFabrics provides per-scenario
conditions and per-frame defect/cutline annotations, but no ground-truth
timestamps of process setting changes within a scenario. A later alert is an
observed appearance change, not automatically a false process-change alarm.

## Fixed protocol before running

- Source scenario: `T1_S174_I111_1`, all published frames in chronological
  filename order. Fit the existing `DriftDetector` on global DINOv2 features
  from frames `[0,2048)`, exactly as in `unlabeled_review.py`.
- Leave the MMD bandwidth, pairwise-block 99th-percentile limit, 128-frame
  window, 32-frame step, and three-consecutive-window confirmation unchanged.
  The model and detector do not use defect, cutline, or lighting labels.
- Apply the detector to the continuous suffix `[2112,end)`. The 64-frame gap
  and the first 1,984 test frames reproduce the previous source continuation.
  Require that this prefix has no confirmed alert, as recorded in the prior
  result. Encode only missing global features after the existing 4,096-frame
  cache; do not refit or select a favorable subinterval.
- Report the complete frame count, first confirmed alert (if any), number and
  proportion of score windows over the fixed limit, and longest consecutive
  over-limit stretch. Preserve all score-window endpoints for plotting.
- This is **one same-scenario continuity stress test**, not an independent
  specificity estimate or a scored test of unknown real process-change times.
  Do not silently change the alert rule based on this result. If late alerts
  occur, inspect their photos and report them as signals requiring review.

## Run

From the authorized server repository root:

```sh
.venv-dino-audit/bin/python experiments/unsupervised/source_continuation_full.py \
  --zip experiments/unsupervised/data/TSfabrics.zip \
  --cache experiments/unsupervised/features \
  --out experiments/unsupervised/results/source_continuation_full.json
```
