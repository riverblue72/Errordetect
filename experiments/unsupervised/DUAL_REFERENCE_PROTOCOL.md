# Dual source-reference trial

## Question

The equal-capacity, low-novelty source bank cuts normal-frame alerts but also
suppresses defect-frame alerts. Can a fixed combination of its score and the
all-startup bank's score recover useful defect ranking without restoring the
all-startup bank's large alert workload?

This is an offline trial of one prespecified combination, not a reference
update or a replacement for the active scorer. The two banks share the same
frozen DINOv2 features and 7,392-vector capacity. Computing both costs more
than the current single-bank path.

## Locked rule and split

- Reuse source `T1_S174_I111_1`, its first 512 frames for both banks, frames
  `[512,2048)` for source-only calibration, the five development runs and the
  remaining 16 final runs in `UNLABELED_REVIEW_PROTOCOL.md`.
- Evaluate target frames `[320,min(4096,length))`. Ambiguous CSV/mask frames
  are excluded from metrics. The target's first 256 frames and a 64-frame gap
  do not enter either source bank or threshold.
- For bank \(b\), divide each frame score by that bank's source-calibrated
  99.5th-percentile limit \(q_b\). The single trial score is
  \(s_{dual}=0.5(s_{selected}/q_{selected}+s_{all}/q_{all})\). Calibrate its
  own 99.5th-percentile limit on the same source calibration block.
- Request eight highest trial-score photos with a 16-frame minimum gap. No
  target labels enter the scores, limits, or queue. Open published labels only
  after all three methods' scores and queues have been fixed.
- Before interpreting the trial, reproduce the prior selected and all-bank
  frame AP and eight-review episode counts on every run within 0.05 percentage
  points and exact episode counts, respectively.

## Decision gate

On the **development** runs, continue to final evaluation only if the dual
score (1) does not lower macro frame AP across defect-bearing runs, (2) finds
at least as many new defect episodes in eight checks, and (3) generates no
more than twice as many normal-frame alerts as the selected bank. A failed
development gate rejects this fixed trial; do not tune its weight or limit
after inspecting those outcomes.

If development passes, report all 16 final runs, per-run AP and alert counts,
macro AP on defect runs, total normal and defect frames flagged, and new
episodes found with equal review budgets. Report the 14 different-setting
runs separately. Do not call a gain on these already studied public runs an
independent deployment validation. A second GPU scoring pass and a new source
threshold are costs of this candidate; throughput must be measured before
adoption.

Reproduce with `dual_reference_trial.py` and the existing TSFabrics ZIP and
feature cache. The active pipeline remains the selected single bank until a
candidate passes an independent later test.
