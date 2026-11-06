# Run-scoped reference after field review

This experiment addresses a failure of the earlier global patch-bank update.
Adding a few reviewed normal patches to one bank suppressed false alarms on a
normal-looking shift, but it also suppressed defects on a different run. The
updated candidate keeps the original reference frozen and constructs a
**separate reference for each confirmed visual change**. It is evaluated as a
shadow candidate; the original detector remains the active decision path.

## Operational sequence

1. Extract frozen DINOv2 ViT-S/14 patch and image features. The existing MMD
   detector signals a sustained change from the source run.
2. From the 512 frames **after** the confirmed alert, request 24 reviews: 12
   representative frames near the run's feature center and 12 high-anomaly
   frames, with at least eight frames between requests. The operator marks each
   as normal, defect, or uncertain. The public TSFabrics CSV replays these
   decisions only after the query has been fixed.
3. Use only confirmed normal frames to make a small, run-local patch bank.
   Confirmed defects and uncertain frames never enter it. Compute patch maps
   and anomaly scores against this bank. Keep the original bank unchanged.
4. Before considering a threshold from the next 128 unlabeled frames, request
   eight further reviews of their highest-scoring, time-spaced cases. A
   confirmed defect or uncertain decision blocks that calibration. Passing
   these eight checks is a screen, not proof that the other frames are normal.
5. Rank subsequent frames for review with a temporal spacing rule. Keep the
   original detector's alert decision until a candidate threshold has passed
   separate normal-only calibration and prospective defect checks. A visual
   change by itself never approves a new detection threshold.

The experiment also computes a PCA residual from the same reviewed normals as
an alternative score, and a global-bank union as an ablation. The PCA variant
uses one frozen DINOv2 layer and is **not** an official SubspaceAD reproduction.
The patch-bank and subspace choices are motivated by the published
[AnomalyDINO](https://openaccess.thecvf.com/content/WACV2025/html/Damm_AnomalyDINO_Boosting_Patch-Based_Few-Shot_Anomaly_Detection_with_DINOv2_WACV_2025_paper.html)
and [SubspaceAD](https://openaccess.thecvf.com/content/CVPR2026/html/Lendering_SubspaceAD_Training-Free_Few-Shot_Anomaly_Detection_via_Subspace_Modeling_CVPR_2026_paper.html)
approaches, respectively; this experiment is an adaptation to reviewed,
time-ordered production runs.

## Fixed comparison

The source is `T1_S174_I111_1`: first 512 frames for a label-free reference,
frames 512–2047 for the source threshold and change baseline. For each target
run, the first confirmed change alert defines time zero. The next 512 frames
form the review pool, the following 128 are a disjoint, unlabeled calibration
window, then a 64-frame gap precedes the evaluation interval. No later frame
can influence queries, reference vectors, or threshold calculations.

Methods see exactly the same evaluation frames. Comparisons are:

| Variant | Reference | Review cases | Threshold |
| --- | --- | --- | --- |
| Frozen baseline | Source bank | None | Source calibration |
| Frozen, target calibrated | Source bank | None | Unlabeled target calibration |
| Local patch bank | Confirmed normals in current run | Balanced, random, or high-score; 24 each | Unlabeled target calibration, diagnostic only |
| Local PCA residual | Confirmed normals in current run | Balanced; 24 | Unlabeled target calibration, diagnostic only |
| Global union ablation | Source plus current-run confirmed normals | Same 24 as local bank | Source calibration |

The target calibration is deliberately reported to expose a limitation: its
99.5th percentile is unsafe if even a few defects occur in 128 unlabeled
frames. It must **not** drive an operational automatic update. AUROC, average
precision, thresholded confusion counts, and defects among the 24 highest
ranked, time-spaced evaluation frames are reported separately. The priority
queue can be useful even without a validated binary threshold.

`T1_S164_I36_1` (normal) and `T1_S478_I118_2` (mixed) are development runs
already seen in the earlier experiment. `T1_S148_I108_1` and
`T1_S478_I118_1` are different, mixed runs. Their first evaluation was
interrupted by a protocol error: the review pool began at fixed frame 192 even
when the first alert was frame 224. The code now derives all windows from the
actual alert. Results on these two runs are informative but should not be
described as an untouched, preregistered holdout.
After that correction was fixed, `T1_S555_I117_1` was selected as an additional
independent run. Only its first 4,096 chronological frames are encoded and
evaluated, to bound memory and runtime. The run was not used to choose the
method or its constants.

CSV labels and masks are excluded from feature extraction and case selection.
They are used to replay review outcomes and to audit evaluation. Frames where
CSV and mask disagree are excluded from reported test metrics. The run-local
bank experiment does not establish rubber-belt accuracy.

## Observed result

The following counts use the source threshold for the frozen detector and the
unlabeled target-calibration threshold for the PCA candidate. **The latter is
a diagnostic ablation, not an approved operating threshold.** AP compares
score ranking on the same later frames and does not require a threshold.

| Run | Calibration defects / 128 | Frozen TP / defect, FP | PCA candidate TP / defect, FP | AP frozen → PCA | Eight-case calibration check |
| --- | ---: | ---: | ---: | ---: | --- |
| `T1_S164_I36_1` (normal) | 0 | —, 11 | —, 0 | — | No defect found; still unapproved |
| `T1_S478_I118_2` (mixed) | 0 | 33/82, 0 | 81/82, 56 | .898 → .758 | No defect found; still unapproved |
| `T1_S148_I108_1` (mixed) | 41 | 134/472, 5 | 15/472, 0 | .836 → .997 | Five defects found; blocked |
| `T1_S478_I118_1` (mixed) | 20 | 58/165, 0 | 1/165, 0 | .942 → .982 | Two defects found; blocked |
| `T1_S555_I117_1[:4096]` (mixed) | 0 | 169/325, 0 | 325/325, 15 | .957 → 1.000 | No defect found; still unapproved |

The added check caught both contaminated calibration windows before they could
be treated as normal-only. It did not solve calibration by itself: the clean
development run still had 56 false alarms with the PCA candidate. Therefore
the supported output is a **review-priority score and separate candidate
reference**, while the original alert decision stays active. Automated
promotion requires more verified normal calibration data and a prospective
guard on both false alarms and defect sensitivity.

The label-separated score distributions are in
[`results/condition_reference_distributions.png`](results/condition_reference_distributions.png).
Each panel uses its own score scale. The red line is the corresponding
threshold; on the contaminated runs it moves beyond much of the defect-score
distribution. Full per-frame scores, review selections, and metrics are in
[`results/condition_reference.json`](results/condition_reference.json).

## Reproduce

Run from the repository root with the existing project-local TSFabrics ZIP and
feature cache. The script encodes uncached target runs in RAM so it does not
write multi-gigabyte feature files.

```bash
/home/hyunsu/miniconda3/envs/autodex_bodex/bin/python \
  experiments/unsupervised/condition_reference.py \
  --zip experiments/unsupervised/data/TSfabrics.zip \
  --cache experiments/unsupervised/features \
  --out experiments/unsupervised/results/condition_reference.json
```

To recreate the figure:

```bash
python experiments/unsupervised/plot_condition_reference.py \
  experiments/unsupervised/results/condition_reference.json \
  experiments/unsupervised/results/condition_reference_distributions.png
```

The raw ZIP, pretrained weights, and cached features are not committed.
