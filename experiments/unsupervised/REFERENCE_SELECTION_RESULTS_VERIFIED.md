# Source-reference selection: equal-capacity audit

The DINOv2 features, startup frames, patch-bank size, scorer, and review budget are fixed. Only the label-free source-reference selection changes. Each bank has its own source-calibrated threshold. Public labels are used only after scoring and review selection.

The 5 development and 16 extended-evaluation runs are separate for this comparison, but some runs appeared in earlier project studies. The extended evaluation is not an untouched external benchmark.

## Development · 5 recorded runs

Source continuation flags / 1984 frames (selected / all): 20 / 7.
Source-calibrated thresholds (selected / all): 0.4708 / 0.2034

| Measure | Selected / all-startup |
| --- | ---: |
| Macro frame AP · 3 defect runs | 89.7% / 78.7% |
| Macro new-episode coverage @8 · 3 episode-bearing runs | 53.2% / 46.5% |
| Defect frames flagged / 682 | 323 / 565 |
| Normal frames flagged / 12586 | 31 / 7296 |
| New episodes found in eight reviews / 43 | 20 / 14 |

Selected-reference AP wins / ties / losses: 1 / 0 / 2 defect runs.
Selected-reference normal-alert reductions / ties / increases: 5 / 0 / 0 runs.
Paired run-bootstrap AP difference (selected − all): +11.1 pp [-4.1, +40.2].
Paired run-bootstrap episode-coverage difference (selected − all): +6.7 pp [-9.1, +29.2].
Fresh-encode selected-reference alert-count differences from the saved benchmark: `T1_S478_I118_1` +1.

| Run | Defect frames | Frame AP · selected / all | Defect flags · selected / all | Normal flags · selected / all | Episodes @8 · selected / all |
| --- | ---: | ---: | ---: | ---: | ---: |
| `T1_S164_I36_1` | 0 | — / — | 0 / 0 | 22 / 1482 | 0 / 0 of 0 |
| `T1_S148_I108_2` | 131 | 78.7% / 38.5% | 72 / 14 | 9 / 27 | 8 / 1 of 24 |
| `T1_S478_I118_1` | 226 | 95.1% / 97.9% | 82 / 226 | 0 / 2368 | 7 / 8 of 11 |
| `T1_S555_I117_1` | 325 | 95.4% / 99.6% | 169 / 325 | 0 / 2117 | 5 / 5 of 8 |
| `T2_S262_I52_1` | 0 | — / — | 0 / 0 | 0 / 1302 | 0 / 0 of 0 |

## Final · 16 recorded runs

Source continuation flags / 1984 frames (selected / all): 20 / 7.
Source-calibrated thresholds (selected / all): 0.4708 / 0.2034

| Measure | Selected / all-startup |
| --- | ---: |
| Macro frame AP · 4 defect runs | 85.4% / 70.3% |
| Macro new-episode coverage @8 · 4 episode-bearing runs | 71.1% / 43.8% |
| Defect frames flagged / 883 | 313 / 851 |
| Normal frames flagged / 26088 | 1449 / 19153 |
| New episodes found in eight reviews / 90 | 26 / 19 |

Selected-reference AP wins / ties / losses: 1 / 0 / 3 defect runs.
Selected-reference normal-alert reductions / ties / increases: 15 / 0 / 1 runs.
Paired run-bootstrap AP difference (selected − all): +15.0 pp [-11.1, +61.1].
Paired run-bootstrap episode-coverage difference (selected − all): +27.3 pp [+0.0, +75.0].
Fresh-encode selected-reference alert-count differences from the saved benchmark: `T2_S303_I44_1` +1, `T3_S165_I178_2` -1.

| Run | Defect frames | Frame AP · selected / all | Defect flags · selected / all | Normal flags · selected / all | Episodes @8 · selected / all |
| --- | ---: | ---: | ---: | ---: | ---: |
| `T1_S148_I108_1` | 640 | 85.8% / 99.9% | 185 / 637 | 7 / 28 | 8 / 8 of 69 |
| `T1_S164_I192_1` | 0 | — / — | 0 / 0 | 0 / 547 | 0 / 0 of 0 |
| `T1_S164_I193_1` | 0 | — / — | 0 / 0 | 0 / 546 | 0 / 0 of 0 |
| `T1_S164_I199_1` | 0 | — / — | 0 / 0 | 0 / 811 | 0 / 0 of 0 |
| `T1_S174_I108_1` | 70 | 85.8% / 93.4% | 35 / 41 | 9 / 1 | 8 / 7 of 11 |
| `T1_S177_I108_1` | 0 | — / — | 0 / 0 | 13 / 46 | 0 / 0 of 0 |
| `T1_S179_I35_1` | 0 | — / — | 0 / 0 | 24 / 1468 | 0 / 0 of 0 |
| `T1_S478_I118_2` | 98 | 87.4% / 3.5% | 40 / 98 | 0 / 2505 | 6 / 0 of 6 |
| `T2_S262_I45_1` | 0 | — / — | 0 / 0 | 476 / 1206 | 0 / 0 of 0 |
| `T2_S287_I184_1` | 0 | — / — | 0 / 0 | 39 / 1487 | 0 / 0 of 0 |
| `T2_S287_I185_1` | 75 | 82.3% / 84.6% | 53 / 75 | 15 / 782 | 4 / 4 of 4 |
| `T2_S303_I44_1` | 0 | — / — | 0 / 0 | 613 / 1488 | 0 / 0 of 0 |
| `T2_S466_I39_1` | 0 | — / — | 0 / 0 | 23 / 3776 | 0 / 0 of 0 |
| `T3_S165_I175_1` | 0 | — / — | 0 / 0 | 75 / 1487 | 0 / 0 of 0 |
| `T3_S165_I178_1` | 0 | — / — | 0 / 0 | 74 / 1488 | 0 / 0 of 0 |
| `T3_S165_I178_2` | 0 | — / — | 0 / 0 | 81 / 1487 | 0 / 0 of 0 |

Thresholded flag counts depend on each bank's separate source calibration. AP and eight-review episode coverage compare the reference representations without choosing a target threshold. Per-run results should be read alongside the macro figures before changing the site or active reference. Paired run-bootstrap intervals reflect the few recorded runs, not field uncertainty.
