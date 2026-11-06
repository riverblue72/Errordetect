# Reference choice × review spacing: four-cell result

All four queues use the same frozen DINOv2 features, target frames, 7,392-vector source bank capacity, and eight-review budget. Only the bank's source-frame selection and review spacing change. Public labels are read after each queue is fixed. This factorial is descriptive on previously studied textile runs.

## Development · five runs

New defect episodes in evaluated runs: **43**. Each cell uses eight review requests per run.

| Reference | Highest 8 | Highest 8, ≥16 frames apart |
| --- | ---: | ---: |
| All startup frames | **8/43** | **14/43** |
| Low-novelty selection | **11/43** | **20/43** |

| Reference + queue | Normal reviews | Defect reviews |
| --- | ---: | ---: |
| all + top8 | 23 | 17 |
| all + spaced8 | 23 | 17 |
| selected + top8 | 16 | 24 |
| selected + spaced8 | 16 | 24 |

## Extended evaluation · sixteen runs

New defect episodes in evaluated runs: **90**. Each cell uses eight review requests per run.

| Reference | Highest 8 | Highest 8, ≥16 frames apart |
| --- | ---: | ---: |
| All startup frames | **8/90** | **19/90** |
| Low-novelty selection | **15/90** | **26/90** |

| Reference + queue | Normal reviews | Defect reviews |
| --- | ---: | ---: |
| all + top8 | 104 | 24 |
| all + spaced8 | 108 | 20 |
| selected + top8 | 96 | 32 |
| selected + spaced8 | 101 | 27 |

## Final defect-bearing runs

| Run | Episodes | All + top | All + spaced | Selected + top | Selected + spaced |
| --- | ---: | ---: | ---: | ---: | ---: |
| `T1_S148_I108_1` | 69 | 3 | 8 | 3 | 8 |
| `T1_S174_I108_1` | 11 | 4 | 7 | 6 | 8 |
| `T1_S478_I118_2` | 6 | 0 | 0 | 5 | 6 |
| `T2_S287_I185_1` | 4 | 1 | 4 | 1 | 4 |

The two previously separate comparisons both end at the selected-reference, spaced-eight cell; they should not be read as two sequential transitions from their different starting cells. From the common all-startup/top-eight cell (8), selecting the reference adds 7 episodes, spacing adds 11, and the combined cell finds 26. In these aggregate counts the interaction is 0, though per-run effects vary. Review discovery is distinct from thresholded frame alerts; this audit does not change the active detector or its source-calibrated limit.
