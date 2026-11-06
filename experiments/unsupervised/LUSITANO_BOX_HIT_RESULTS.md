# LUSITANOv2 localization metric audit

The [fixed protocol](LUSITANO_BOX_HIT_PROTOCOL.md) compares saved DINOv2 box-hit
results with an exact random-position control on the same official test boxes.
The official label archive matched its published MD5. All 1,248 test defect
images have a label file, containing 1,865 boxes in total. The excluded
zero-byte TIFF has none. No image or model output was rerun for this geometry
audit.

![Observed DINOv2 box-hit rates compared with exact random-position expectations, separately for a single hottest patch and any of the top 1%](figures/lusitano_box_hit_control.svg)

| Input | Patch positions | Top 1% positions | Random hottest | DINOv2 hottest, all startup | DINOv2 hottest, selected | Random any top 1% | DINOv2 any top 1%, all startup | DINOv2 any top 1%, selected |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Global letterbox | 333 | 4 | 9.0% | 62.4% | 67.5% | 26.3% | 74.8% | 76.5% |
| Five tiles | 6,845 | 69 | 9.3% | 72.4% | 74.9% | 75.2% | 94.5% | 94.8% |

The tiled model's 94.5% top-1%-any-hit rate exceeds its random-position
expectation by 19.3 percentage points. The global model's 74.8% exceeds its
own expectation by 48.6 points. Therefore, the raw 94.5% versus 74.8%
comparison exaggerates the localization advantage of tiling: the tiled rule
offers 69 chances to intersect a box, while the global rule offers only four.
This control is conditional on the published box geometry and does not model
spatially correlated heatmaps.

The **single hottest patch** is a more comparable localization check: chance
is about 9% for both inputs, while tiling improves the all-startup model from
62.4% to 72.4%. Tiling also gives at least one valid patch center inside a box
for all 1,248 defect images; the global letterbox does so for 1,084. This is
consistent with better spatial coverage of thin or edge-touching defects.

Detection moves in the opposite direction. On the same scored official test
images, the all-startup global input has image AP 97.8% and fixed-threshold
recall 45.2% (2 false alerts among 1,263 normal images). Five tiles yield AP
95.2% and recall 19.1% (3 false alerts). The saved mean evaluation times were
42 ms and 92 ms per image, respectively. These are test-set results with
almost half the images defective, so precision and alert workload do not
estimate field prevalence. The split is official, but a production-run- or
time-disjoint boundary has not been verified.

## Consequence for the pipeline

Keep the global input as the image-level detection baseline. A two-stage trial
could run tiles only after a global alert to sharpen the displayed location.
That is a **hypothesis**, not a validated improvement: the joint localization
rate on globally flagged defects, additional latency, and missed-defect rate
must be measured on the same images. Since these test results have already
been inspected, any trial on this official test set is exploratory; a new
untouched evaluation partition would be needed for a confirmatory claim.

Reproduce the audit after downloading only the official annotation archive
into the Git-ignored `experiments/unsupervised/data/lusitano-label-audit/`:

```text
python experiments/unsupervised/audit_lusitano_box_hit.py
python experiments/unsupervised/plot_lusitano_box_hit.py
```

Machine-readable result: [lusitano_box_hit_control.json](results/lusitano_box_hit_control.json).
Dataset: [Zenodo record](https://zenodo.org/records/22150068).
