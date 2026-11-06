# Paired TSFabrics heatmaps

The 24 transparent `sample-XX-classic.png` overlays come from the
handcrafted eight-feature pipeline re-run on the same held-out TSFabrics frames
used by the change-aware sample explorer. Their scores, source-calibrated
threshold, and frame identities are recorded in `catalog.json`. The DINOv2
selected-reference overlays are the matching `web/next-samples/*-current.png`
files. Both sets use the same rendering rule relative to each method's own
threshold; their raw scores have different units.

`sample-06-all.png` is the frozen DINOv2 pipeline using all startup frames at
the same reference-bank capacity as the selected-reference method. On the
landing page, it appears beside the selected-reference heatmap for the same
normal photo. Its score, threshold, and result are recorded under
`all_unlabeled` in `catalog.json`. The photo is from the development run
`T1_S164_I36_1`, so the displayed false-alert reduction is one case rather
than an all-run estimate. The separate run-local trial overlay remains in
`web/next-samples/sample-06-candidate.png` for the sample explorer and research
record; it is no longer a row in the landing comparison.

`change-figure.svg` and `change-figure-mobile.svg` show the development run
`T1_S164_I36_1` as an example, separate from the final-run 15/16 metric. They plot the last 16 consecutive
source windows and first 16 changed-run windows at equal x-axis intervals on
the same 0–1 score scale. The line crosses a marked run boundary, so it does
not imply one continuous production run. All 59 held-out source windows stay below the source-calibrated
limit (0.0639; maximum 0.0323). The first changed-run windows end at frames
128, 160, and 192 (0.9297, 0.9417, 0.9100); the third consecutive crossing
confirms the alert at frame 192. The chart continues through frame 608.
`change-figure.json` preserves the source trace and target values. Regenerate
it with `experiments/unsupervised/export_change_figure.py` on the experiment
server, then regenerate both SVGs with `scripts/generate_change_figure.py`.

The paired-frame gallery cycles through 16 curated frames from the 24 public-site
samples. It opens with a changed normal frame cleared by the selected reference, a
large-shift defect flagged only by the selected reference, and a related-run
defect flagged only by the handcrafted method, then continues through gains,
shared outcomes, and errors. These are curated examples, not a random test sample.

The four paired bars below the gallery show each defect-bearing final run's
frame average precision for the handcrafted source and frozen DINOv2 source.
They are rounded to one decimal place from
`experiments/unsupervised/results/unlabeled_review_final.json`. The site audit
checks that every run and bar width matches the saved result. Two runs favor
each method, so the macro AP difference should be read alongside these rows.

`review-routing.json` exports request counts from the final sequential-review
result. Each of its 16 rows is one recorded run: 12 stopped after the first two
checks and four requested six more. Regenerate with
`scripts/export_review_routing.py`; `scripts/audit_site_evidence.js` checks the
export against the saved experiment result.

The landing page's final paired bars compare the frozen reference and reviewed
candidate on the same later frames from 15 eligible runs. Each pair is scaled
to its own frozen count: 1,050/0 normal alerts, 202/153 flagged defect frames,
and 48/40 detected new defect episodes. The site audit checks the displayed
counts and candidate bar lengths against `feedback_validation_final.json`.

Regenerate the handcrafted overlays with
`experiments/unsupervised/export_ablation_comparison.py` on the experiment
machine, after the TSFabrics feature cache and site sample export are present.
The source images are TSFabrics (CC BY 4.0); retain the dataset credit in the
site footer.
