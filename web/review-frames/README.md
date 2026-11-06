# Recorded review assets

`results.json` and the 48 JPEGs were exported by
`experiments/unsupervised/reviewed_update.py` from TSFabrics on the project's
GPU server. The JSON records the label-blind case query, published CSV labels
revealed afterward, frozen and candidate per-frame scores on separate later
frames, a seeded random-query control, and the cross-run defect guard.

The visible review sequence orders the already-selected cases by score for
presentation. It does not alter which frames enter the model update. The site
replays these recorded results and does not score newly uploaded images.

TSFabrics: Ni et al., Scientific Data (2026),
https://doi.org/10.1038/s41597-026-06748-9; dataset
https://doi.org/10.6084/m9.figshare.29573381, CC BY 4.0.
