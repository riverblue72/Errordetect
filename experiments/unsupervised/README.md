# Unlabeled line-inspection experiment

The reviewed, run-scoped reference experiment and its safety limits are
documented in [CONDITION_REFERENCE.md](CONDITION_REFERENCE.md).
The subsequent normal-only calibration, interval review queue, and measured
shadow update are documented in [FEEDBACK_LOOP.md](FEEDBACK_LOOP.md).
The latest label-free ranking and limited-review benchmark is documented in
[UNLABELED_REVIEW_PROTOCOL.md](UNLABELED_REVIEW_PROTOCOL.md), with all-run
[results](UNLABELED_REVIEW_RESULTS.md). Its fixed-run site replay is generated
by `export_unlabeled_demo.py`.
The [full-run score-distribution audit](SCORE_DISTRIBUTION_RESULTS.md) compares
normal and defect score ranks across all evaluated frames in the four final
defect recordings. The exporter reproduced the saved AP and AUROC for both
methods before generating the figures; the curated photo gallery is not used
as a distribution sample.
The [additional change-stability controls](CHANGE_STABILITY_RESULTS.md) found
an unexplained within-run alert in one of two other defect-label-free
recordings under both the current limit and the lower-limit trial. The lower
limit remains inactive.
The subsequent fixed eight-review update test is documented in
[FEEDBACK_VALIDATION_PROTOCOL.md](FEEDBACK_VALIDATION_PROTOCOL.md) and
[FEEDBACK_VALIDATION_RESULTS.md](FEEDBACK_VALIDATION_RESULTS.md). On 15 eligible
final runs, adding reviewed-normal patches reduced normal-frame alerts from
1,050 to zero but also reduced defect-frame alerts from 202 to 153 and detected
new defect episodes from 48 to 40. The frozen reference remains active.
The separate completed-interval [score-fusion protocol](FUSION_REVIEW_PROTOCOL.md)
and [results](FUSION_REVIEW_RESULTS.md) test whether the older handcrafted
score complements frozen DINOv2 in the same eight-review queue. A 75/25 rank
mix gained on development runs but lost AP and two discovered episodes on the
sixteen final runs, so the frozen DINOv2 queue also remains active.
The [source-reference selection audit](REFERENCE_SELECTION_AUDIT.md) extends the
equal-capacity all-startup-versus-selected comparison to every recorded run;
the per-run [verified results](REFERENCE_SELECTION_RESULTS_VERIFIED.md) cover
five development and sixteen extended-evaluation runs. Selection reduced
normal-frame alerts in 15/16 extended runs and raised eight-review episode
yield from 19 to 26, while reducing defect-frame flags from 851 to 313 at
each bank's separately calibrated source threshold. The site presents both
the benefit and the detection tradeoff. The active scorer is unchanged.
The [four-cell reference × review-spacing audit](REFERENCE_REVIEW_FACTORIAL_RESULTS.md)
crosses both choices at equal bank size and eight-check budget: all/top 8,
all/spaced 19, selected/top 15, and selected/spaced 26 new episodes found out
of 90. The earlier two arrows start in different cells; the full table shows
how both choices combine from a common baseline.
The [review-spacing sensitivity audit](REVIEW_SPACING_RESULTS.md) reruns the
same frozen source score with minimum gaps of 1, 4, 8, 12, and 16 frames.
The 12- and 16-frame rules tied at 20/43 development and 26/90 final new
episodes; the existing 16-frame queue remains active.
The [full source-continuation audit](SOURCE_CONTINUATION_FULL_RESULTS.md) extends
the visual-change negative control from 1,984 to 16,518 later frames in the
same recorded scenario. None of its 513 score windows crosses the frozen MMD
limit. This is a one-run continuity check, not an estimated false-alert rate
or a test against annotated within-run process-change times.
The [visual-change representation control](CHANGE_REPRESENTATION_RESULTS.md)
uses the same MMD rule with a 32-bin grayscale histogram. It alerts on all
sixteen known extended run joins versus fifteen for DINOv2, but crosses its
own source-calibrated limit on 336/513 later windows of the same source
recording versus zero for DINOv2. DINOv2 remains the current change signal;
the result shows a sensitivity versus same-recording stability tradeoff.
The [fixed lower-limit trial](CHANGE_LIMIT_RESULTS.md) changes only the
DINOv2 MMD limit to 75% of its source value, chosen on a missed development
join. It alerts on 16/16 extended joins with the same 96-frame median delay
and no confirmed alert on the long source continuation, although two
isolated windows cross the lower limit. It is shown separately from the
current 15/16 source-calibrated result. An [additional continuity protocol](CHANGE_STABILITY_PROTOCOL.md)
tests the fixed factor after independently calibrating on two longer recordings
without defect labels. This diagnostic reset is not the active fixed-source
pipeline, and the lack of defect labels does not establish within-run stability.
The [completed stability check](CHANGE_STABILITY_RESULTS.md) found one
unexplained within-run alert under both limits, so the lower limit remains a trial.
The [source-alert limit audit](SOURCE_THRESHOLD_RESULTS.md) tested five
source-calibrated quantiles. A 97.5% candidate chosen on the five development
runs raised defect-frame flags from 313 to 505 on the 16 follow-up runs, but
also raised normal-frame flags from 1,449 to 6,053. It was not adopted. The
development-label choice of this candidate quantile is explicitly recorded in
[the decision note](SOURCE_THRESHOLD_DECISION.md); the current 99.5% limit and
rank-based eight-frame review queue remain unchanged.
The [reviewed-normal limit shadow audit](REVIEWED_THRESHOLD_RESULTS.md) tests a
second calibration option without changing the DINOv2 bank. It met the
prespecified five-run development screen, but in 15 eligible follow-up runs
normal flags fell from 1,049 to 48 while defect flags fell from 202 to 156
and newly flagged episodes from 48 to 43. The trial was rejected; even a
guard based on reviewed defects did not protect later unreviewed defects.
The [dual source-reference trial](DUAL_REFERENCE_RESULTS.md) combined the
selected and all-startup DINOv2 scores with a fixed source-calibrated rule.
It failed its development normal-alert gate after three of five runs
(31 → 1,979 normal alerts), so no final runs were tested and the active
single-bank scorer is unchanged.
An exploratory [appearance-based representation route](REPRESENTATION_ROUTING_AUDIT.md)
used only unlabeled startup MMD scores to choose handcrafted or DINOv2 patch
features per run. It raised macro frame AP but lost one development defect
episode and found no additional final episodes in the same eight reviews.
The active DINOv2 scorer remains unchanged.

This directory is independent of the KolektorSDD browser prototype. Curated
TSFabrics outputs from this experiment appear on the published site; the site
does not run this model or accept new images. The target-domain method sees no
defect labels when choosing its reference bank, active review threshold, or change
threshold. Public labels are read only by the audit and evaluation code, except
for the separately tested 97.5% threshold hyperparameter chosen on development
runs and rejected after follow-up evaluation. The `oracle_normal`
comparison deliberately uses labels and is reported separately.

## TSFabrics: continuous production and change

### Data and protocol

The first executable protocol uses the published TSFabrics ZIP without
extracting all 93k JPEGs. It trains an unlabeled reference on the first 512
frames of `T1_S174_I111_1`, calibrates from frames 512–2047, and holds out
frames 2112–4095. Complete other production scenarios are test streams. An
adaptive candidate is built only from the first 512 target frames, calibrated
on 512–767, and evaluated starting at frame 832. The gaps reduce leakage from
adjacent frames of the same defect episode. Source and target labels are not
passed to the operational model. Scenario selection uses published acquisition
metadata and is fixed before scoring.

The downloaded ZIP contains 93,196 images across 22 scenarios. CSV image labels
and published defect masks disagree on 11 frames. Those frames are excluded
from scored test streams, and the discrepancy is reported in the audit. The
primary startup sequence happens to have zero labeled defects in its first
512 frames. A separate sensitivity experiment uses `T1_S148_I108_2` as source;
its first 512 frames contain 21 defects. This prevents presenting a clean
startup as evidence of robustness to unlabeled contamination.
The second source scenario was added after inspecting the primary experiment,
so it is a sensitivity analysis rather than a pre-registered independent test.

The method is a frozen DINOv2 ViT-S/14 patch extractor, a bounded
mutual-similarity ranking of unlabeled startup frames, and a k-nearest patch
bank. It is inspired by MuSc and AnomalyDINO but is **not** a reproduction of
either paper. Distribution change is scored separately by MMD on global
features. The candidate adaptation is an experiment, not an automatic quality
approval rule. Test AUROC/AP, calibrated false alarms, localization, cutline
errors, reference contamination, and latency are all reported.

The adaptation branch is evaluated as a shadow candidate. A drift alert alone
does not prove that adopting the candidate is safe: fewer false alarms can come
with lower defect recall. The code does not promote it automatically.

Dataset: <https://doi.org/10.6084/m9.figshare.29573381>.
Model code: <https://github.com/facebookresearch/dinov2>.

### LUSITANOv2: raw line-scan preprocessing

The second experiment loads native 4096×1024 RGB TIFFs from an active textile
production line. It compares aspect-preserving letterbox and five overlapping
1024×1024 tiles using the same frozen DINOv2-S/14 backbone and the same source
images. This tests whether the end-to-end preprocessing choice changes detection
and bounding-box localization.

The official validation split supplies 1,020 images: 507 normal and 3 defective
in each of a startup set and a disjoint calibration set, sampled with seed 42.
Validation labels construct this *simulated* 0.59% defect prevalence. The method
receives only image pixels. The official 2,512-image test split is held out for
evaluation. Two reference banks are compared for each input mode: all unlabeled
startup images and a label-free low-novelty selection. Thresholds are the 99.5th
percentile of the separate calibration scores. AUROC, average precision, recall,
false alarms, box hits, and full-image latency are reported. Test prevalence is
close to 50%, so test precision is not a field precision estimate.
The two banks use the same number of reference vectors so bank capacity does
not confound the selection comparison.

An image audit found one zero-byte TIFF in the official test archive
(`20240724_225529_420.tif`). The archive checksum matches Zenodo, so this is
in the released archive. The unreadable frame is excluded and named in the
result JSON; the resulting scored test set has 2,511 images.

The full 17,596-image training archive is not required for this validation/test
experiment. The Zenodo record has an empty license field as of this experiment;
do not redistribute sample images or weights through the public site until the
rights are clarified. This benchmark is textile production, not rubber-belt
production, so it cannot establish field performance on the partner's process.

Dataset: <https://doi.org/10.5281/zenodo.22150068>.
Dataset paper: <https://doi.org/10.3390/electronics15194403>.

The [box-hit geometry audit](LUSITANO_BOX_HIT_RESULTS.md) uses only the official
test annotations to quantify how often the reported localization rule would
hit a box by chance. Tiling improves the single-hottest-patch box hit, but its
top-1%-any-hit metric benefits strongly from having 69 opportunities rather
than four. Global preprocessing remains better for image detection in this
experiment. A global-alert-plus-tiled-location trial is not yet validated.

## Reproduce on the server

Run from the repository root. Keep `TORCH_HOME`, `XDG_CACHE_HOME`, `HF_HOME`,
and `TMPDIR` inside this directory. The tested Python interpreter on the
server is `/home/hyunsu/miniconda3/envs/autodex_bodex/bin/python` with
PyTorch 2.4.1+cu121. No packages need to be installed globally.

```
python experiments/unsupervised/run_tsfabrics.py audit --zip experiments/unsupervised/data/TSfabrics.zip
python experiments/unsupervised/run_tsfabrics.py extract --zip experiments/unsupervised/data/TSfabrics.zip
python experiments/unsupervised/run_tsfabrics.py evaluate --zip experiments/unsupervised/data/TSfabrics.zip
python experiments/unsupervised/run_tsfabrics.py evaluate --zip experiments/unsupervised/data/TSfabrics.zip --source T1_S148_I108_2 --targets T1_S174_I111_1 T1_S164_I36_1 T1_S478_I118_2 --output experiments/unsupervised/results/tsfabrics_contaminated_source.json
python experiments/unsupervised/run_lusitano.py --mode both
python experiments/unsupervised/unlabeled_review.py --zip experiments/unsupervised/data/TSfabrics.zip --cache experiments/unsupervised/features --phase development --out experiments/unsupervised/results/unlabeled_review_development.json
python experiments/unsupervised/unlabeled_review.py --zip experiments/unsupervised/data/TSfabrics.zip --cache experiments/unsupervised/features --phase final --out experiments/unsupervised/results/unlabeled_review_final.json
python experiments/unsupervised/summarize_unlabeled_review.py experiments/unsupervised/results/unlabeled_review_development.json experiments/unsupervised/results/unlabeled_review_final.json experiments/unsupervised/UNLABELED_REVIEW_RESULTS.md
python experiments/unsupervised/sequential_review.py --zip experiments/unsupervised/data/TSfabrics.zip --result experiments/unsupervised/results/unlabeled_review_development.json --out experiments/unsupervised/results/sequential_review_development.json
python experiments/unsupervised/sequential_review.py --zip experiments/unsupervised/data/TSfabrics.zip --result experiments/unsupervised/results/unlabeled_review_final.json --out experiments/unsupervised/results/sequential_review_final.json
python experiments/unsupervised/export_unlabeled_demo.py --zip experiments/unsupervised/data/TSfabrics.zip --cache experiments/unsupervised/features --result experiments/unsupervised/results/unlabeled_review_final.json --out web/unlabeled-demo
python experiments/unsupervised/feedback_validation.py --zip experiments/unsupervised/data/TSfabrics.zip --cache experiments/unsupervised/features --phase development --out experiments/unsupervised/results/feedback_validation_development.json
python experiments/unsupervised/feedback_validation.py --zip experiments/unsupervised/data/TSfabrics.zip --cache experiments/unsupervised/features --phase final --out experiments/unsupervised/results/feedback_validation_final.json
python experiments/unsupervised/summarize_feedback_validation.py experiments/unsupervised/results/feedback_validation_development.json experiments/unsupervised/results/feedback_validation_final.json experiments/unsupervised/FEEDBACK_VALIDATION_RESULTS.md
python experiments/unsupervised/fusion_review.py --zip experiments/unsupervised/data/TSfabrics.zip --cache experiments/unsupervised/features --phase development --out experiments/unsupervised/results/fusion_review_development.json
python experiments/unsupervised/fusion_review.py --zip experiments/unsupervised/data/TSfabrics.zip --cache experiments/unsupervised/features --phase final --out experiments/unsupervised/results/fusion_review_final.json
python experiments/unsupervised/audit_fusion_review.py --zip experiments/unsupervised/data/TSfabrics.zip --result experiments/unsupervised/results/fusion_review_final.json --baseline experiments/unsupervised/results/unlabeled_review_final.json
```

The dataset checksum and archive inventory must be verified before using the
results. The ZIP remains outside Git. The first protocol focuses on one source
texture and three held-out conditions, so it does not establish performance on
rubber or all production products.
