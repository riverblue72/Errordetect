# Threshold-near review requests: equal-budget audit

## Question

Would replacing some high-score review requests with photos close to the
source-calibrated alert threshold find more distinct defect episodes? A score
near the threshold is ambiguous as an **alert decision**, but is not by itself
evidence that the photo is especially informative for defect discovery.

## Protocol

- Reuse the frozen DINOv2 source reference and the 99.5th-percentile source
  threshold from `unlabeled_review.py`. The active baseline is the eight
  highest-scoring photos, with at least 16 frames between requests.
- Compare four score-only queues on the same five previously inspected
  development runs, evaluating frames after the 256-frame startup and 64-frame
  gap. Each queue makes exactly eight requests per run and uses the same
  16-frame spacing. The alternatives retain the highest six or four photos,
  then fill the remaining positions closest to the threshold, either on both
  sides or strictly below it.
- Use the published labels **only after selection** to count distinct new
  defect episodes. Episode grouping uses an eight-frame gap, as in the
  original benchmark. There are 43 eligible episodes in three of the five
  development runs.
- PyTorch 1.13's internal scaled attention kernel was used for uncached
  DINOv2 feature extraction. Re-encoding eight cached source photos gave
  mean patch cosine similarity 0.9999988 and mean absolute feature difference
  0.0000574. The baseline's eight selected frames exactly match the original
  `unlabeled_review_development.json` on all five runs.

## Results

| Queue, eight reviews per run | New episodes / 43 | Defect reviews / 40 | Normal reviews / 40 |
| --- | ---: | ---: | ---: |
| Highest eight, spaced (active rule) | **20** | 24 | 16 |
| Highest six + two nearest threshold | 17 | 22 | 18 |
| Highest six + two just below threshold | 17 | 22 | 18 |
| Highest four + four nearest threshold | 17 | 20 | 20 |

Per-run new episode counts for the active rule are 0, 8, 7, 5, 0. The
six-plus-two alternatives give 0, 6, 7, 4, 0. The four-plus-four alternative
gives 0, 4, 7, 6, 0. One previously inspected final run was checked as a
reference only: all four queues found its six eligible episodes. That single
run is **not** an independent final evaluation of the alternatives.

## Decision

Keep the spaced high-score queue for defect discovery. Threshold-near
sampling reduced episode discovery at the same review budget on the
development runs. A photo's distance to a source-calibrated threshold is not
a calibrated probability of its label. A separate threshold-calibration or
quality-control request could still be useful, but it needs a distinct
objective, review budget, and prospective evaluation before being added to
the field workflow. Do not claim that the near-threshold alternatives improve
the current pipeline.

## Reproduce

```sh
cd experiments/unsupervised
python3 uncertainty_review.py --zip data/TSfabrics.zip --cache features \
  --runs T1_S164_I36_1 T1_S148_I108_2 T1_S478_I118_1 T1_S555_I117_1 T2_S262_I52_1 \
  --out results/uncertainty_review_development.json
```

Source: `uncertainty_review.py`. Recorded outputs:
`results/uncertainty_review_development.json` and
`results/uncertainty_review_final_probe.json`.
