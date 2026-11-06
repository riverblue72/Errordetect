# Reviewed reference update

This experiment connects a visual-change alert to recorded case review and a
candidate memory-bank correction. The public TSFabrics labels stand in for the
review outcome **after** case selection. No field operator reviewed these frames.
The static site replays saved outputs; it does not recompute DINOv2 in the browser.

## Fixed protocol

- The source bank and threshold are reproduced from `run_tsfabrics.py`: first
  512 source frames for the selected reference, disjoint source frames 512–2047
  for the 99.5th-percentile threshold. Both remain fixed.
- Both changed runs alert at displayed frame 192. Frames 193–704 are the
  unlabeled query pool. Frames 705–832 are left unused; evaluation begins at
  frame 833. Query and evaluation frames never overlap.
- A budget of 24 review frames per run was fixed before consulting labels.
  Within the upper quartile of frozen anomaly scores, farthest-first selection
  on frozen global DINOv2 features gives visual diversity. Selected frames must
  be at least eight frames apart. This is a heuristic to prioritize unusual,
  nonduplicate appearances, not a calibrated uncertainty estimate.
- Only a **flagged, verified-normal** frame can correct the bank. The correction
  adds its hottest 1% of patch features if their nearest-source distance
  exceeds the median nearest-source distance of sampled source-calibration
  patches. The original source bank is retained. Defect or annotation-conflict
  frames are excluded. This adapts the idea of normal-memory correction in
  [Abbas et al.](https://arxiv.org/abs/2608.17775) to this project's frozen
  DINOv2 patch scorer; it is not a reproduction of their method.
- A seeded random query of 24 nonadjacent frames is the review-budget control.
  It uses the same label-reveal and patch-correction rule. The tested seed is
  one comparison, not a significance estimate.
- Both the normal-shift run and the larger-shift run are evaluated on their
  later, disjoint frames. The normal-shift correction is also applied to the
  larger-shift run as a separate defect-sensitivity guard. Dataset labels are
  read only after query selection and for the held-out evaluation.

## Recorded results

| Later evaluation | Current | Queried review candidate | Random-query candidate |
| --- | ---: | ---: | ---: |
| Normal-shift run: normal alerts / 975 | 11 | **0** | 11 |
| Larger-shift run: defect frames flagged / 82 | 33 | 33 (no correction) | 33 (no correction) |
| Larger-shift run: normal alerts / 2,290 | 0 | 0 | 0 |
| **Normal-shift candidate applied to larger-shift run:** defect frames flagged / 82 | 33 | **0** | 33 |

The selected review found two flagged normal frames in the normal-shift pool
and added 18 correction patches. The random query found none. In the
larger-shift pool, the selected review found two labeled defects and no flagged
normal corrections, so its candidate is identical to the current bank.

The normal-shift update is **not promoted**: its improvement on one normal run
comes with a severe loss on a separate defect-bearing run. Even a small number
of verified normal patches can suppress true defects under nearest-neighbor
scoring. This is why the UI shows both the normal-run benefit and the defect
guard, rather than presenting 11→0 as an overall model improvement.

The three runs were selected for the earlier experimental scenario, and there
is one source run and one guard run. These numbers are descriptive, not a
population-wide performance estimate. The query recipe and review budget
should be compared over more runs and seeds before field adoption. The
production workflow also needs an explicit way to scope a candidate to a run,
validate it, and roll it back at a new change alert.
The separate defect run was inspected during development of the correction
rule, so this guard is a failure analysis, not an untouched confirmatory test.

## Reproduce

```bash
python3 experiments/unsupervised/reviewed_update.py \
  --zip experiments/unsupervised/data/TSfabrics.zip \
  --cache experiments/unsupervised/features \
  --out experiments/unsupervised/review_export/results.json
```

The script saves selected JPEGs and per-frame evaluation scores beside the
result JSON. `web/review-frames/` contains the exported site assets.
