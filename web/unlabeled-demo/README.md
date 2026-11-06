# Recorded interval replay

`manifest.json` contains only image-derived scores, change values, and the
eight label-free review requests from the frozen source DINO reference for
TSFabrics run `T1_S478_I118_2`.
`evaluation.json` contains published dataset labels and is fetched only when
a visitor checks a selected frame. It is never used to create the queue or
initial interval summary. The eight JPEGs are the recorded input frames;
transparent PNGs visualize the model's patch-distance map.
The interval page initially requests the first two ranked photos. A checked
defect or uncertain result exposes the remaining six; two normal checks end
that interval's review. This is a review-budget experiment, not a detector or
reference update.

Regenerate with `experiments/unsupervised/export_unlabeled_demo.py` using the
checked-in final-result JSON and TSFabrics ZIP. The script checks that the
packaged queue and MMD alert match the final evaluation before exporting.
Source: Ni et al., *TSFabrics*, Scientific Data (2026),
https://doi.org/10.1038/s41597-026-06748-9. Images: CC BY 4.0.
