# LUSITANOv2 box-hit geometry audit

## Question

The raw line-scan experiment reports whether the hottest patch, or any of the
top 1% of patch scores, has its center inside a labeled defect box. Five
overlapping tiles produce many more patch positions than the global letterbox.
How often would the same box-hit rule succeed if patch positions were selected
uniformly at random?

## Fixed analysis

- Use only the official `LUSITANOv2_labels.tar.zst` test annotations from
  [Zenodo](https://zenodo.org/records/22150068), MD5
  `8a55ba8b620315fe74c3db92a5e042f5`. Do not redistribute the annotations.
- Reconstruct exactly the global valid-patch and five-tile center coordinates
  defined in `run_lusitano.py` for a 4096 × 1024 image. A position inside any
  box counts as a hit. Overlap positions in separate tiles remain separate
  candidates, as in the model output.
- For each defect image, let `N` be patch positions, `B` the number of centers
  inside any box, and `K = ceil(0.01 N)`. The random hottest-patch hit chance is
  `B/N`. The random top-1%-any-hit chance is
  `1 - C(N-B,K)/C(N,K)`, sampling without replacement. Average each chance
  across all official test defect images. This is an exact combinatorial
  expectation, not a Monte Carlo draw.
- Compare both expectations with the **already saved** all-startup and selected
  DINOv2 box-hit results. Verify that the number of defect annotations matches
  the saved test anomaly count and that the excluded zero-byte TIFF has no
  annotation. Do not fit a model, change a threshold, or tune this audit to its
  outcome.

## Interpretation

The random-position baseline isolates the advantage conferred by box size,
image geometry, and the number of allowed patch positions. It does not model
the spatial correlation of learned heatmaps and is not a segmentation metric.
The global and tiled representations differ in resolution, so their observed
box-hit rates should be interpreted alongside image detection AP and recall,
not as proof that one complete pipeline is uniformly better.
