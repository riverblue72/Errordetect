# Reviewed-normal alert-limit shadow audit

The DINOv2 source reference, scores, spaced-eight queue, and source limit stay fixed. The trial limit uses only confirmed normal reviews and is tested on disjoint later frames. `REVIEWED_THRESHOLD_PROTOCOL.md` records the rule and development success condition before the results. The later test begins at frame 704, after the review window and gap; its episode denominator differs from the earlier frame-320 ranking audit.

## Development · five runs

Evaluated runs: 5. Trial applied: 4. Normal-frame flags: 18 → 8 / 10,696. Defect-frame flags: 311 → 311 / 652. New episodes flagged: 39 → 39 / 40.

| Run | Confirmed normal/defect reviews | Trial limit | Applied? | Normal flags · frozen/effective | Defect flags · frozen/effective | New episodes flagged · frozen/effective |
| --- | ---: | ---: | --- | ---: | ---: | ---: |
| `T1_S164_I36_1` | 8/0 | 0.5031 | Yes | 11/1 | 0/0 | 0/0 of 0 |
| `T1_S148_I108_2` | 5/3 | 0.4966 | No | 7/7 | 66/66 | 22/22 of 22 |
| `T1_S478_I118_1` | 7/1 | 0.4708 | Yes | 0/0 | 76/76 | 9/9 of 10 |
| `T1_S555_I117_1` | 8/0 | 0.4708 | Yes | 0/0 | 169/169 | 8/8 of 8 |
| `T2_S262_I52_1` | 8/0 | 0.4708 | Yes | 0/0 | 0/0 | 0/0 of 0 |

## Follow-up · sixteen runs

Evaluated runs: 15. Trial applied: 14. Normal-frame flags: 1,049 → 48 / 20,273. Defect-frame flags: 202 → 156 / 642. New episodes flagged: 48 → 43 / 65.

| Run | Confirmed normal/defect reviews | Trial limit | Applied? | Normal flags · frozen/effective | Defect flags · frozen/effective | New episodes flagged · frozen/effective |
| --- | ---: | ---: | --- | ---: | ---: | ---: |
| `T1_S148_I108_1` | 2/6 | 0.4866 | Yes | 5/0 | 158/112 | 43/38 of 60 |
| `T1_S164_I192_1` | 8/0 | 0.4708 | Yes | 0/0 | 0/0 | 0/0 of 0 |
| `T1_S164_I193_1` | 8/0 | 0.4708 | Yes | 0/0 | 0/0 | 0/0 of 0 |
| `T1_S164_I199_1` | 8/0 | 0.4708 | Yes | 0/0 | 0/0 | 0/0 of 0 |
| `T1_S177_I108_1` | 8/0 | 0.4708 | No | 12/12 | 0/0 | 0/0 of 0 |
| `T1_S179_I35_1` | 8/0 | 0.5074 | Yes | 19/1 | 0/0 | 0/0 of 0 |
| `T1_S478_I118_2` | 7/1 | 0.4708 | Yes | 0/0 | 33/33 | 5/5 of 5 |
| `T2_S262_I45_1` | 8/0 | 0.5302 | Yes | 330/0 | 0/0 | 0/0 of 0 |
| `T2_S287_I184_1` | 8/0 | 0.5257 | Yes | 27/1 | 0/0 | 0/0 of 0 |
| `T2_S287_I185_1` | 5/3 | 0.4795 | Yes | 13/11 | 11/11 | 0/0 of 0 |
| `T2_S303_I44_1` | 8/0 | 0.5330 | Yes | 455/1 | 0/0 | 0/0 of 0 |
| `T2_S466_I39_1` | 8/0 | 0.4783 | Yes | 21/9 | 0/0 | 0/0 of 0 |
| `T3_S165_I175_1` | 8/0 | 0.5520 | Yes | 51/5 | 0/0 | 0/0 of 0 |
| `T3_S165_I178_1` | 8/0 | 0.5599 | Yes | 55/1 | 0/0 | 0/0 of 0 |
| `T3_S165_I178_2` | 8/0 | 0.5558 | Yes | 61/7 | 0/0 | 0/0 of 0 |

## Decision

**Reject the reviewed-normal alert-limit update.** It reduced normal flags from 1,049 to 48, but also reduced defect flags from 202 to 156 and newly flagged episodes from 48 to 43. Episode loss occurred in `T1_S148_I108_1`. The guard kept previously flagged *reviewed* defects above the trial limit; it could not protect later unreviewed defect frames. The source reference and source alert limit remain active.

The five development runs met the prespecified screen, but their normal-alert reduction came from one normal-only run. One of the sixteen follow-up runs was too short for the separated later test. All findings use public textile recordings, not rubber-belt photos.

Fresh feature encoding gave 1,049 frozen normal flags versus 1,050 in the saved feedback-validation result. The difference is one flag in each of 3 runs (`T2_S262_I45_1`, `T2_S303_I44_1`, `T3_S165_I178_2`); the scorer, source limit, run population, and review frames are unchanged.
