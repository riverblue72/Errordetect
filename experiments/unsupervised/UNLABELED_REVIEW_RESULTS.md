# Unlabeled review benchmark

Selected on development runs: local low-novelty 32-frame DINO patch bank,
highest eight scores spaced by at least 16 frames. Public labels enter only
the retrospective metrics. All remaining scenarios form the final evaluation.

## Development

5 runs; 3 with new post-startup defect episodes.

| Scorer | Macro episode coverage @8 | Episodes found / total | Macro AP on defect runs | Normal reviews |
| --- | ---: | ---: | ---: | ---: |
| Handcrafted source | 48.7% | 18/43 | 79.2% | 17 |
| Frozen DINO source | 53.2% | 20/43 | 89.7% | 16 |
| Local all · kNN | 45.1% | 13/43 | 63.1% | 24 |
| Local selected · kNN | 53.2% | 20/43 | 91.6% | 16 |
| Local all · PCA | 36.0% | 10/43 | 53.4% | 27 |
| Local selected · PCA | 50.4% | 18/43 | 86.7% | 18 |
| Source + local rank | 53.2% | 20/43 | 90.9% | 16 |
| Source + local PCA rank | 51.8% | 19/43 | 89.0% | 17 |

### Fixed review budget, different queue rules

For the **frozen source reference used in the interval replay**, keeping its
scorer and eight-review budget fixed, allowing adjacent high scores found
**41.8%** of new episodes on average across the four defect-bearing runs;
requiring at least 16 frames between requests found **71.1%**. These percentages
are calculated from `source_knn.queues` in `results/unlabeled_review_final.json`.
The table below reports the same queue-rule comparison for the selected local
scorer, which has a different adjacent top-eight result.

| Queue on selected scorer | Macro episode coverage @8 | Defect reviews | Normal reviews |
| --- | ---: | ---: | ---: |
| Top 8 adjacent allowed | 25.8% | 24 | 16 |
| Top 8, ≥16 frames apart | 53.2% | 24 | 16 |
| Top 6 + random 2 | 36.0% | 18 | 22 |
| Random 8, seed 42 | 4.2% | 1 | 39 |

100-seed random mean macro episode coverage: 5.2%.

### Per-run selected scorer versus frozen source

| Run | Scored frames | New episodes | Selected @8 | Frozen @8 | Random expected @8 | Selected AP |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `T1_S164_I36_1` | 1487 | 0 | 0 | 0 | 0.00 | — |
| `T1_S148_I108_2` | 3776 | 24 | 8 | 8 | 0.35 | 79.2% |
| `T1_S478_I118_1` | 2927 | 11 | 7 | 7 | 0.69 | 97.7% |
| `T1_S555_I117_1` | 3776 | 8 | 5 | 5 | 0.62 | 97.9% |
| `T2_S262_I52_1` | 1302 | 0 | 0 | 0 | 0.00 | — |

Run-bootstrap difference in macro episode coverage, Local selected − frozen DINO: +0.000 [+0.000, +0.000] (95% percentile; few runs).

Run-bootstrap difference in macro episode coverage, Selection − unselected local bank: +0.081 [-0.091, +0.333] (95% percentile; few runs).

### Visual-change and reference audit

Source continuation alarm: none. Synthetic run switch: 4/5 targets alerted; 0 alerted before the boundary. Alert delay after the boundary: median 96 frames (range 96–96).
Startup reference frames labeled defective in the offline audit: selected 0, time-spread 7. These labels were not available to the selector.

## Final evaluation

16 runs; 4 with new post-startup defect episodes.

| Scorer | Macro episode coverage @8 | Episodes found / total | Macro AP on defect runs | Normal reviews |
| --- | ---: | ---: | ---: | ---: |
| Handcrafted source | 48.2% | 22/90 | 66.4% | 105 |
| Frozen DINO source | 71.1% | 26/90 | 85.4% | 101 |
| Local all · kNN | 45.7% | 19/90 | 72.7% | 108 |
| Local selected · kNN | 71.1% | 26/90 | 81.5% | 101 |
| Local all · PCA | 45.7% | 19/90 | 67.7% | 108 |
| Local selected · PCA | 70.7% | 25/90 | 80.2% | 102 |
| Source + local rank | 70.7% | 25/90 | 83.7% | 101 |
| Source + local PCA rank | 71.1% | 26/90 | 83.9% | 101 |

The frozen DINO source exceeds the handcrafted source by **19.0 percentage
points in macro frame AP**, but wins on only two of the four defect-bearing
runs. The paired run differences are −8.1, −12.7, +25.4, and +71.3 points.
Enumerating all `4⁴ = 256` four-run bootstrap resamples with replacement gives
a descriptive 95% percentile interval of **−10.4 to +51.4 points** for the
mean difference. The few reused recordings and shared acquisition settings
make this interval unsuitable as a field-performance guarantee. The site
therefore shows the four paired run results alongside the macro figure.

### Fixed review budget, different queue rules

| Queue on selected scorer | Macro episode coverage @8 | Defect reviews | Normal reviews |
| --- | ---: | ---: | ---: |
| Top 8 adjacent allowed | 37.3% | 32 | 96 |
| Top 8, ≥16 frames apart | 71.1% | 27 | 101 |
| Top 6 + random 2 | 65.8% | 23 | 105 |
| Random 8, seed 42 | 9.4% | 5 | 123 |

100-seed random mean macro episode coverage: 9.7%.

### Per-run selected scorer versus frozen source

| Run | Scored frames | New episodes | Selected @8 | Frozen @8 | Random expected @8 | Selected AP |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `T1_S148_I108_1` | 2942 | 69 | 8 | 8 | 1.95 | 57.0% |
| `T1_S164_I192_1` | 700 | 0 | 0 | 0 | 0.00 | — |
| `T1_S164_I193_1` | 717 | 0 | 0 | 0 | 0.00 | — |
| `T1_S164_I199_1` | 892 | 0 | 0 | 0 | 0.00 | — |
| `T1_S174_I108_1` | 297 | 11 | 8 | 8 | 1.84 | 91.0% |
| `T1_S177_I108_1` | 3776 | 0 | 0 | 0 | 0.00 | — |
| `T1_S179_I35_1` | 1487 | 0 | 0 | 0 | 0.00 | — |
| `T1_S478_I118_2` | 2884 | 6 | 6 | 6 | 0.18 | 88.7% |
| `T2_S262_I45_1` | 1206 | 0 | 0 | 0 | 0.00 | — |
| `T2_S287_I184_1` | 1487 | 0 | 0 | 0 | 0.00 | — |
| `T2_S287_I185_1` | 857 | 4 | 4 | 4 | 0.65 | 89.4% |
| `T2_S303_I44_1` | 1488 | 0 | 0 | 0 | 0.00 | — |
| `T2_S466_I39_1` | 3776 | 0 | 0 | 0 | 0.00 | — |
| `T3_S165_I175_1` | 1487 | 0 | 0 | 0 | 0.00 | — |
| `T3_S165_I178_1` | 1488 | 0 | 0 | 0 | 0.00 | — |
| `T3_S165_I178_2` | 1487 | 0 | 0 | 0 | 0.00 | — |

Run-bootstrap difference in macro episode coverage, Local selected − frozen DINO: +0.000 [+0.000, +0.000] (95% percentile; few runs).

Run-bootstrap difference in macro episode coverage, Selection − unselected local bank: +0.254 [+0.000, +0.625] (95% percentile; few runs).

### Visual-change and reference audit

Source continuation alarm: none. Synthetic run switch: 15/16 targets alerted; 0 alerted before the boundary. Alert delay after the boundary: median 96 frames (range 96–288).
Startup reference frames labeled defective in the offline audit: selected 4, time-spread 21. These labels were not available to the selector.

## Interpretation

The development choice found the same 26 of 90 episodes as the frozen DINO source on the four defect-bearing final runs. Its macro episode coverage was 71.1% for both, while frozen-source macro frame AP was 85.4% versus 81.5% for the selected local bank. The local bank did not demonstrate a gain over keeping the source reference fixed. Selection improved the equal-capacity local bank relative to time-spread startup frames (45.7% to 71.1% macro episode coverage), but the four-run bootstrap interval includes zero. Treat it as an optional candidate, not an approved replacement.

The packaged interval replay therefore keeps the frozen source DINO reference active and uses the same 16-frame-spaced eight-review rule. This conservative deployment choice was made after seeing final results; it is not a new independent test of that choice.

Temporal spacing was the stronger tested change: 37.3% to 71.1% macro episode coverage for eight ranked reviews. It spread requests across events but did not reduce the workload: all 16 runs still requested eight reviews, including 101 normal-frame reviews out of 128. The 69-episode run can contribute at most eight discoveries, so macro coverage and pooled 26/90 answer different questions.

The change test concatenates separate recorded runs at a known boundary. It supports a visual-shift signal, not localization of a genuine within-line process change. The prototype shows observed score summaries and review requests; it neither knows defect truth before review nor updates the production reference automatically. A rule for when to request fewer than eight reviews, and a guarded feedback update, need a new development protocol and independent validation.
