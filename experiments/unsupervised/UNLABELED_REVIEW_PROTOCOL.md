# Unlabeled detection and limited review: locked comparison

## Field question

The partner described production-line images whose appearance changes with
material, speed, lighting, movement, and camera geometry. Process changes may
not reach the AI team, defect labels are rare, and frequent individual alerts
would burden operators. The tested output is therefore a **period summary**:
anomaly-score distribution and trend, a separate visual-change signal, and a
small ranked set of photos for review. It does not assign a defect type or
silently replace a reference model. The target-run scoring and review queue
use no defect labels. Public labels are opened only for retrospective audit.

The public proxy is [TSFabrics](https://www.nature.com/articles/s41597-026-06748-9),
22 continuous knitting-production scenarios with different fabric types,
speeds, and lighting. It includes legitimate cutlines and real defects, but
is not rubber and does not reproduce the partner's camera or 100-image/s
experience. It is appropriate for testing time order, reference contamination,
appearance change, and review yield. No generated defects are added.

## Split and scope

- Source: `T1_S174_I111_1`; first 512 frames fit the frozen reference, frames
  `[512,2048)` calibrate its score and the MMD change detector, and
  `[2112,4096)` are a source-continuation negative control.
- Development scenarios: `T1_S164_I36_1`, `T1_S148_I108_2`,
  `T1_S478_I118_1`, `T1_S555_I117_1`, `T2_S262_I52_1`.
- Final evaluation: **all other 16 scenarios** in the ZIP, including normal,
  defective, within-fabric, and cross-fabric runs. No run is omitted based on
  model performance. The method is selected on development runs only.
- Each target run uses frames `[0,256)` as an unlabeled local startup. After a
  64-frame gap, score `[320,min(4096,run_length))`. The 4,096-frame cap is
  fixed for memory and runtime; long-run results are explicitly prefix-only.
  The source baseline never uses target frames.
- Dataset CSV labels and masks are not consulted by feature extraction,
  reference selection, scoring, change alarms, or review ranking. They are
  consulted after the queue is fixed, for evaluation only. Disagreements
  between CSV and mask are excluded from scored metrics, and their counts are
  reported.

This split is fixed after examining the public dataset inventory and previous
project experiments. Some runs have already appeared in earlier experiments;
the final set is a run-disjoint test of **this locked comparison**, not a
preregistered or untouched benchmark. The test was chosen to include every
remaining run, avoiding selective reporting.

The split is recording-disjoint but not fully production-setting-disjoint:
two final defect recordings share texture, speed, and illumination settings
with development recordings. The post-hoc, different-setting sensitivity
check is reported in [SETTING_DISJOINT_RESULTS.md](SETTING_DISJOINT_RESULTS.md).

## Methods and ablations

All deep variants share the same frozen DINOv2-S/14 features and input resize.
The older eight-feature handcrafted scorer is a separate representation
baseline. Source DINO uses the existing selected source bank. Local variants
use the same 32-image capacity from unlabeled target startup:

| Variant | Reference choice | Score |
| --- | --- | --- |
| Handcrafted source | Existing source images | Eight-feature patch distance |
| Frozen DINO source | Existing source images | Patch nearest neighbor |
| Local all | 32 time-spread startup frames | Patch nearest neighbor or PCA residual |
| Local selected | 32 low-novelty frames across four appearance bins | Patch nearest neighbor or PCA residual |
| Optional fusion | Frozen and local score ranks, after development-only selection | Rank aggregation |

The all/selected pair isolates unlabeled reference selection at equal
capacity; patch/PCA pairs isolate the scorer; source/local contrast measures
run-specific reference adaptation. A local model is a **review ranking aid**,
not an approved binary production decision. No target threshold is fitted
from possibly defective unlabeled target frames.

For each evaluated run, request at most eight review photos. Compare random,
highest-score without spacing, highest-score with 16-frame separation, and a
six-high-score plus two random-audit queue. The random audit is kept separate
from model fitting. Review labels do not update the model in this experiment.
The proposed final queue is chosen on development runs, then fixed for all
final runs.

**Development selection, fixed before the final-phase command:** use
`local_selected_knn` and `spaced8` (16-frame minimum spacing). On the three
development runs with post-startup defects, its macro episode coverage at
eight reviews was 0.532, tied with `source_knn`; mean per-run AP was 0.916
versus 0.897. The same local score without spacing covered 0.258 of episodes.
The six-high-score plus two-random queue covered 0.360, so random audit is
reported as a workload/monitoring tradeoff rather than the main retrieval
queue. These figures are model-selection evidence, not final performance.

## Measures

Primary: unique defect episodes found in eight reviewed photos, with episodes
defined by positive frames separated by at most eight frames. Count only
episodes first appearing after frame 320; this avoids credit for a defect
continued from startup. Report per-run results and macro averages across runs
with post-startup defects. Also report how many reviews are normal, and the
mean/min/max random-queue yield over 100 predetermined seeds.

Secondary: frame AUROC/AP per defective run, reference contamination audited afterward, and
single-model feature/scoring latency on the RTX 3090. Do not use accuracy or
pooled AP as a primary result: defect prevalence varies sharply by run.

Change detection is evaluated separately. Concatenate a 1,024-frame source
continuation with each target prefix to create a **known synthetic run
boundary**. Report source-only false alarms and target alarm delay from that
boundary; distinguish normal-only targets from defect-bearing targets.
The boundary experiment tests whether different recorded runs are recognized,
not whether an unobserved change time inside a real line has been recovered.

The period summary may show only image-derived facts: frame count, anomaly
score quantiles and trend, change score/alert, ranked photos, model version,
and pending review decisions. Dataset truth, TP/FP, and episode recall belong
to the offline evaluation view, not the operational summary.

## Post-evaluation operating choice

The locked local-selected scorer tied the frozen source for episode coverage
on the final runs and had lower macro frame AP. The packaged interval replay
therefore keeps the frozen DINO source reference active and applies the same
spaced eight-review queue. This is a conservative decision made after the
final evaluation, not a second independent held-out validation. The selected
local bank remains an unapproved candidate for future change-specific tests.
