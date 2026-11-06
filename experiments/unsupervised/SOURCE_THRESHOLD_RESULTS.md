# Source-only alert-limit sensitivity audit

The selected DINOv2 reference and source calibration frames are fixed. The 97.5% candidate was recorded in `SOURCE_THRESHOLD_DECISION.md` after development and before inspecting the follow-up result. Target labels are retrospective evaluation data only; the quantile hyperparameter was chosen from public development labels.

## Development · 5 runs

| Source quantile | Limit | Source continuation flags / 1,984 | Defect flags | Normal flags | New episodes flagged |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 95% | 0.2113 | 91 | 682/682 | 6800/12586 | 43/43 |
| 97.5% | 0.4284 | 51 | 532/682 | 164/12586 | 43/43 |
| 99% | 0.4595 | 29 | 390/682 | 67/12586 | 42/43 |
| 99.5% | 0.4708 | 20 | 323/682 | 31/12586 | 42/43 |
| 99.75% | 0.4809 | 13 | 263/682 | 22/12586 | 39/43 |

## Follow-up · 16 runs

| Source quantile | Limit | Source continuation flags / 1,984 | Defect flags | Normal flags | New episodes flagged |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 95% | 0.2113 | 91 | 878/883 | 18926/26088 | 90/90 |
| 97.5% | 0.4284 | 51 | 505/883 | 6053/26088 | 78/90 |
| 99% | 0.4595 | 29 | 361/883 | 2158/26088 | 72/90 |
| 99.5% | 0.4708 | 20 | 313/883 | 1449/26088 | 70/90 |
| 99.75% | 0.4809 | 13 | 261/883 | 1011/26088 | 63/90 |

## Run-level comparison of 97.5% candidate and current 99.5%

| Run | Defect flags · candidate/current | Normal flags · candidate/current | New episodes flagged · candidate/current |
| --- | ---: | ---: | ---: |
| `T1_S148_I108_1` | 318/185 | 87/7 | 57/49 of 69 |
| `T1_S164_I192_1` | 0/0 | 1/0 | 0/0 of 0 |
| `T1_S164_I193_1` | 0/0 | 0/0 | 0/0 of 0 |
| `T1_S164_I199_1` | 0/0 | 2/0 | 0/0 of 0 |
| `T1_S174_I108_1` | 54/35 | 20/9 | 11/11 of 11 |
| `T1_S177_I108_1` | 0/0 | 81/13 | 0/0 of 0 |
| `T1_S179_I35_1` | 0/0 | 53/24 | 0/0 of 0 |
| `T1_S478_I118_2` | 67/40 | 4/0 | 6/6 of 6 |
| `T2_S262_I45_1` | 0/0 | 1089/476 | 0/0 of 0 |
| `T2_S287_I184_1` | 0/0 | 418/39 | 0/0 of 0 |
| `T2_S287_I185_1` | 66/53 | 106/15 | 4/4 of 4 |
| `T2_S303_I44_1` | 0/0 | 1366/613 | 0/0 of 0 |
| `T2_S466_I39_1` | 0/0 | 862/23 | 0/0 of 0 |
| `T3_S165_I175_1` | 0/0 | 735/75 | 0/0 of 0 |
| `T3_S165_I178_1` | 0/0 | 686/74 | 0/0 of 0 |
| `T3_S165_I178_2` | 0/0 | 543/81 | 0/0 of 0 |

## Decision

**Do not adopt the predeclared 97.5% candidate.** It flags 313 → 505 of 883 defect frames and 70 → 78 of 90 new defect episodes, but also flags 1,449 → 6,053 of 26,088 normal frames (5.6% → 23.2%). The added review burden is too large for a routine frame alert. Keep the existing 99.5% source limit for the current prototype; neither limit is validated for automatic rejection. The current limit still misses many defect frames on these runs, so a fixed source-calibrated frame alert is not a solved endpoint.

The binary limit changes only whether a frame is flagged. Frame AP and the eight-frame rank-based review queue do not depend on it. A flagged episode means at least one eligible defect frame crossed the limit; it does not mean a person reviewed that episode. These public textile runs do not establish a rubber-belt operating limit.
