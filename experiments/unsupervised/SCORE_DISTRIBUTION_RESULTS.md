# Full-run score separation

The [fixed exporter](SCORE_DISTRIBUTION_PROTOCOL.md) recomputed every evaluated
frame in the four final defect-bearing TSFabrics recordings. For both frozen
methods, recomputed frame AP and AUROC matched the saved final comparison within
0.0005 before the class-conditional distributions were written.

| Recording | Normal frames | Defect frames | Handcrafted AP | DINOv2 + selection AP | Handcrafted AUROC | DINOv2 + selection AUROC |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Run 01 · `T1_S148_I108_1` | 2,302 | 640 | 93.9% | 85.8% | 0.980 | 0.968 |
| Run 02 · `T1_S174_I108_1` | 227 | 70 | 98.5% | 85.8% | 0.995 | 0.955 |
| Run 03 · `T1_S478_I118_2` | 2,786 | 98 | 62.0% | 87.4% | 0.973 | 0.987 |
| Run 04 · `T2_S287_I185_1` | 782 | 75 | 11.1% | 82.3% | 0.587 | 0.952 |

The macro frame AP is 66.4% for the handcrafted source method and 85.4% for
DINOv2 with selected source frames. The latter ranks defect frames more clearly
on Runs 03 and 04; the handcrafted method leads on Runs 01 and 02. Thus the
macro improvement does not mean a win on every recorded condition.

The figures use all scored frames after the startup and gap, not the curated
photo examples. Each method's horizontal axis is its score percentile within
that recording. Normal and defect histograms are each divided by their own
class count; published labels enter only after scoring. Ambiguous frames are
excluded from the labeled comparison. These already studied final recordings
make this a descriptive audit of the published comparison, not a new blind
benchmark.

[Run 01](figures/score_distribution_run_01.svg) ·
[Run 02](figures/score_distribution_run_02.svg) ·
[Run 03](figures/score_distribution_run_03.svg) ·
[Run 04](figures/score_distribution_run_04.svg) ·
[Aggregate JSON](results/score_distribution_final.json)
