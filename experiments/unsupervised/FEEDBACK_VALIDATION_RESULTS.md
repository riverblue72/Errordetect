# Eight-review feedback validation

Recorded operator decisions use public TSFabrics labels only on the eight selected review photos. Every later score is evaluated on chronologically disjoint frames. The frozen source is the active path; all update paths are offline counterfactuals. The final runs were inspected in earlier studies, so this locked new comparison is not an untouched external benchmark.

The later eight-review episode yield is a separate retrospective request from each method's later scores, not a label used to fit the candidate.

## Development

5 evaluated runs; 3 with later defect frames; 2 normal-only. 0 length-based exclusions.

TP / FP are defect / normal **frames flagged on later photos**, using the unchanged source threshold. A zero in the TP column on a normal run has no recall meaning. Episodes that began before the later test boundary are excluded from *new* episode counts, even if their later defect frames are flagged.

| Run | Change before review | Later defect frames | Frozen TP / FP | Raw addition TP / FP | Gated addition TP / FP | Same-size random TP / FP | Reviewed normal / defect |
| --- | :---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `T1_S164_I36_1` | yes | 0 | 0 / 11 | 0 / 0 | 0 / 0 | 0 / 0 | 8 / 0 |
| `T1_S148_I108_2` | no | 121 | 66 / 7 | 0 / 0 | 0 / 0 | 0 / 0 | 5 / 3 |
| `T1_S478_I118_1` | yes | 206 | 75 / 0 | 33 / 0 | 35 / 0 | 51 / 0 | 7 / 1 |
| `T1_S555_I117_1` | yes | 325 | 169 / 0 | 113 / 0 | 113 / 0 | 113 / 0 | 8 / 0 |
| `T2_S262_I52_1` | yes | 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 8 / 0 |

### Aggregates

| Path | Defect frames flagged / total | Normal frames flagged / total | Defect episodes flagged / total | Episodes found in eight later reviews / total | Macro AP on defect runs |
| --- | ---: | ---: | ---: | ---: | ---: |
| Frozen active | 310/652 | 18/10696 | 38/40 | 20/40 | 90.0% |
| Raw reviewed-normal addition | 146/652 | 0/10696 | 15/40 | 20/40 | 98.8% |
| Novelty-gated addition | 148/652 | 0/10696 | 15/40 | 20/40 | 98.8% |
| Equal-size random patch subset | 164/652 | 0/10696 | 16/40 | 20/40 | 98.8% |
| Reviewed-defect guard, raw | 212/652 | 7/10696 | 37/40 | 20/40 | 92.5% |

The reviewed-defect guard let 4 candidates pass its local check; 2 later lost defect frames under raw addition, and 2 under novelty gating. 3 of the passing cases had no previously detected defect among the eight reviewed frames. This is a diagnostic guard, not an approval rule.

### Defect-bearing runs

| Run | Source TP / episodes | Raw TP / episodes | Gated TP / episodes | Source AP / AUROC | Raw AP / AUROC |
| --- | ---: | ---: | ---: | ---: | ---: |
| `T1_S148_I108_2` | 66 / 22 | 0 / 0 | 0 / 0 | 79.5% / 98.9% | 98.5% / 99.9% |
| `T1_S478_I118_1` | 75 / 8 | 33 / 7 | 35 / 7 | 94.7% / 99.4% | 98.3% / 99.9% |
| `T1_S555_I117_1` | 169 / 8 | 113 / 8 | 113 / 8 | 95.7% / 99.5% | 99.7% / 100.0% |

### Review queue and capacity controls

| Queue or control | Later TP | Later FP | Later episodes | Confirmed normal / defect reviews |
| --- | ---: | ---: | ---: | ---: |
| Spaced high-score eight | 146 | 0 | 15 | 36 / 4 |
| High six + random two | 146 | 0 | 15 | 36 / 4 |
| Random eight | 300 | 14 | 38 | 39 / 1 |
| Unreviewed frames, capacity matched | 246 | 7 | 38 | n/a |

The unreviewed control uses the same number of frames as confirmed normals in the primary queue, without using their labels. All rows are offline candidates, not adopted detectors.

Raw addition lowered normal-frame alerts in 2/5 runs, but lost defect-frame detections in 3/3 defect-bearing runs. The remaining defect-bearing runs tied; no run gained a newly detected defect at the unchanged threshold.

## Final

15 evaluated runs; 3 with later defect frames; 12 normal-only. 1 length-based exclusion.

TP / FP are defect / normal **frames flagged on later photos**, using the unchanged source threshold. A zero in the TP column on a normal run has no recall meaning. Episodes that began before the later test boundary are excluded from *new* episode counts, even if their later defect frames are flagged.

| Run | Change before review | Later defect frames | Frozen TP / FP | Raw addition TP / FP | Gated addition TP / FP | Same-size random TP / FP | Reviewed normal / defect |
| --- | :---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `T1_S148_I108_1` | yes | 549 | 158 / 5 | 142 / 0 | 142 / 0 | 143 / 0 | 2 / 6 |
| `T1_S164_I192_1` | yes | 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 8 / 0 |
| `T1_S164_I193_1` | yes | 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 8 / 0 |
| `T1_S164_I199_1` | yes | 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 8 / 0 |
| `T1_S174_I108_1` | — | — | — | — | — | — | excluded: 617 frames |
| `T1_S177_I108_1` | no | 0 | 0 / 12 | 0 / 0 | 0 / 0 | 0 / 0 | 8 / 0 |
| `T1_S179_I35_1` | yes | 0 | 0 / 19 | 0 / 0 | 0 / 0 | 0 / 0 | 8 / 0 |
| `T1_S478_I118_2` | yes | 82 | 33 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 7 / 1 |
| `T2_S262_I45_1` | yes | 0 | 0 / 331 | 0 / 0 | 0 / 0 | 0 / 0 | 8 / 0 |
| `T2_S287_I184_1` | yes | 0 | 0 / 27 | 0 / 0 | 0 / 0 | 0 / 0 | 8 / 0 |
| `T2_S287_I185_1` | yes | 11 | 11 / 13 | 11 / 0 | 11 / 0 | 11 / 0 | 5 / 3 |
| `T2_S303_I44_1` | yes | 0 | 0 / 454 | 0 / 0 | 0 / 0 | 0 / 0 | 8 / 0 |
| `T2_S466_I39_1` | yes | 0 | 0 / 21 | 0 / 0 | 0 / 0 | 0 / 0 | 8 / 0 |
| `T3_S165_I175_1` | yes | 0 | 0 / 51 | 0 / 0 | 0 / 0 | 0 / 0 | 8 / 0 |
| `T3_S165_I178_1` | yes | 0 | 0 / 55 | 0 / 0 | 0 / 0 | 0 / 0 | 8 / 0 |
| `T3_S165_I178_2` | yes | 0 | 0 / 62 | 0 / 0 | 0 / 0 | 0 / 0 | 8 / 0 |

Excluded solely by the prespecified minimum of 128 later frames: `T1_S174_I108_1` (617).

### Aggregates

| Path | Defect frames flagged / total | Normal frames flagged / total | Defect episodes flagged / total | Episodes found in eight later reviews / total | Macro AP on defect runs |
| --- | ---: | ---: | ---: | ---: | ---: |
| Frozen active | 202/642 | 1050/20273 | 48/65 | 13/65 | 90.9% |
| Raw reviewed-normal addition | 153/642 | 0/20273 | 40/65 | 13/65 | 85.9% |
| Novelty-gated addition | 153/642 | 0/20273 | 40/65 | 13/65 | 85.6% |
| Equal-size random patch subset | 154/642 | 0/20273 | 40/65 | 13/65 | 79.6% |
| Reviewed-defect guard, raw | 186/642 | 25/20273 | 45/65 | 13/65 | 95.8% |

The reviewed-defect guard let 12 candidates pass its local check; 1 later lost defect frames under raw addition, and 1 under novelty gating. 11 of the passing cases had no previously detected defect among the eight reviewed frames. This is a diagnostic guard, not an approval rule.

### Defect-bearing runs

| Run | Source TP / episodes | Raw TP / episodes | Gated TP / episodes | Source AP / AUROC | Raw AP / AUROC |
| --- | ---: | ---: | ---: | ---: | ---: |
| `T1_S148_I108_1` | 158 / 43 | 142 / 40 | 142 / 40 | 85.2% / 96.7% | 99.8% / 99.9% |
| `T1_S478_I118_2` | 33 / 5 | 0 / 0 | 0 / 0 | 88.9% / 98.8% | 58.0% / 97.8% |
| `T2_S287_I185_1` | 11 / 0 | 11 / 0 | 11 / 0 | 98.6% / 100.0% | 100.0% / 100.0% |

### Review queue and capacity controls

| Queue or control | Later TP | Later FP | Later episodes | Confirmed normal / defect reviews |
| --- | ---: | ---: | ---: | ---: |
| Spaced high-score eight | 153 | 0 | 40 | 110 / 10 |
| High six + random two | 153 | 0 | 40 | 112 / 8 |
| Random eight | 176 | 32 | 45 | 117 / 3 |
| Unreviewed frames, capacity matched | 174 | 58 | 47 | n/a |

The unreviewed control uses the same number of frames as confirmed normals in the primary queue, without using their labels. All rows are offline candidates, not adopted detectors.

Raw addition lowered normal-frame alerts in 11/15 runs, but lost defect-frame detections in 2/3 defect-bearing runs. The remaining defect-bearing runs tied; no run gained a newly detected defect at the unchanged threshold.

## Decision

Adding reviewed normal patches to a nearest-neighbor bank can only lower or preserve a query's nearest-neighbor distances. At an unchanged threshold it cannot create a newly detected defect. Its possible benefit is fewer normal false alerts, which must be weighed against suppressed true detections. Novelty gating and a few reviewed-defect checks do not establish safety unless the separate later evaluation also preserves defect detection. AP can improve even while fixed-threshold TP falls, so neither metric alone is an approval criterion.

The earlier two-run update demonstration is an illustrative shadow experiment. The full, fixed-budget comparison here is the basis for the current operating choice: retain the frozen source and use sparse review for triage and evidence collection; do not promote a candidate automatically. Production deployment still requires company images and prospectively reviewed defect and normal cases.
