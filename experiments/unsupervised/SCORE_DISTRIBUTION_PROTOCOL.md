# Full-run score-separation figure

## Question

Do defect frames rank above normal frames more clearly in the frozen DINOv2
plus selected-source method than in the handcrafted source baseline? The four
defect-bearing final TSFabrics recordings are the comparison units. The
existing 24 photographed examples are curated and cannot supply an unbiased
score distribution.

## Fixed export

`export_score_distribution.py` reconstructs the two scorers exactly as in
`unlabeled_review.py`: the same source recording, first 512 source frames,
selected DINOv2 patch bank, and handcrafted source bank. It scores every frame
from target index 320 through the same 4,096-frame cap in each defect-bearing
final recording. Ambiguous published labels are excluded only from the
evaluation chart. Neither scorer nor reference selection receives target
defect labels.

The exporter refuses to write if recomputed frame AP or AUROC differs from the
saved final comparison by more than 0.0005. This checks that the figure shows
the published methods and frame split. It does not turn the previously studied
final recordings into an independent test.

Raw scores have different units across the two methods. Within each recording
and method, rank **all** evaluated scores before reading labels and divide the
ranks into 20 fixed percentile bins, giving tied scores the same midrank.
After scoring, count normal and defect frames in each bin and normalize each
class by its own frame count. The figure
should show two overlaid class distributions for each method and let the viewer
switch among the four recordings. Always display each class count and that
recording's AP; keep the four-run AP chart beside it. Do not pool all frames
across recordings or infer a field alert rate from score-rank separation.

This is a comparison of **complete methods**. The handcrafted source bank uses
all 512 startup frames; the DINOv2 method also selects source frames. The
figure does not isolate DINOv2 representation quality from reference choice.
The 12 final recordings without defect frames remain relevant to the separate
normal-alert workload result and should not be silently counted as AP runs.

## Run on the authorized server

From `/home/hyunsu/hyunsu/surface-trace`, keep all paths inside this directory:

```bash
/home/hyunsu/miniconda3/envs/autodex_bodex/bin/python \
  experiments/unsupervised/export_score_distribution.py \
  --zip experiments/unsupervised/data/TSfabrics.zip \
  --cache experiments/unsupervised/features \
  --final experiments/unsupervised/results/unlabeled_review_final.json \
  --out experiments/unsupervised/results/score_distribution_final.json
```

Publish a chart only after the exporter succeeds on all four recordings and
the source archive, evaluated frame counts, and saved metrics agree.

After transferring the compact verified JSON, generate one side-by-side SVG
per recording. Each panel shows the fraction of its own class in each score
percentile bin, with a shared vertical scale for the two methods:

```text
python experiments/unsupervised/plot_score_distribution.py \
  --result experiments/unsupervised/results/score_distribution_final.json \
  --out-dir experiments/unsupervised/figures
python experiments/unsupervised/plot_score_distribution.py \
  --result experiments/unsupervised/results/score_distribution_final.json \
  --out-dir web/ablation
python experiments/unsupervised/plot_score_distribution.py \
  --result experiments/unsupervised/results/score_distribution_final.json \
  --out-dir experiments/unsupervised/figures --layout stacked
python experiments/unsupervised/plot_score_distribution.py \
  --result experiments/unsupervised/results/score_distribution_final.json \
  --out-dir web/ablation --layout stacked
```

The plotter checks all four runs, bin edges, class counts, and normalized
histograms before writing figures. The SVGs are presentation artifacts; the
JSON and fixed exporter remain the evidence for the measured values.
