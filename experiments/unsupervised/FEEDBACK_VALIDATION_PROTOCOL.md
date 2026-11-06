# Eight-review feedback validation

## Claim to test

The frozen DINOv2 patch reference and temporally spaced review queue are the
active method. This experiment tests whether **eight reviewed frames from a
completed interval** justify a run-local reference candidate that reduces
false alerts without losing defect detection on later frames. A candidate is
not promoted by the code. A lower false-alert count alone is insufficient if
it suppresses defects or fails on other runs.

## Time order and comparisons

Use the same fixed TSFabrics source reference and its disjoint 99.5th
percentile calibration as the unlabeled benchmark. For each of five development
and sixteen final target runs, inspect frames `[320,640)` for at most eight
reviews, leave `[640,704)` unused, and evaluate `[704,min(4096,run_length))`.
Exclude a run only if fewer than 128 later frames exist; report every
exclusion. Select review indices from image scores alone; reveal public labels
only for those selected frames as recorded operator decisions. No later
evaluation label may fit or screen a candidate. Only reviewed frames confirmed
normal enter the candidate. Defect and uncertain reviews do not.

Compare three equal-budget queues: eight highest source scores with 16-frame
spacing; six highest plus two random audit frames; and eight random frames.
For each, add patches from its confirmed normals to a **separate run-local**
copy of the source bank. The source bank and source threshold remain fixed.
Require at least two confirmed normals. A shadow guard blocks the candidate
if a reviewed defect previously above the source threshold falls below it.
Compare raw addition with a novelty gate inspired by
[Abbas et al. (2026)](https://arxiv.org/abs/2608.17775): use the median
patch-to-source distance among the reviewed normal frames as the gate, and
insert only sampled patches beyond it. This is a bounded DINOv2 adaptation,
not a reproduction of that PatchCore study. A guard passing on a few reviewed
frames is **not** evidence that later defects will be preserved.
For the primary queue, compare the gated result with a random subset of the
same reviewed-normal patches at exactly the same insertion count, separating
novelty selection from a smaller bank.
Also compare a capacity-matched bank augmented with the same number of
unreviewed random frames, without any label filtering. All methods see the
same later frames and use the same source score threshold.

The run boundary is a synthetic splice of recorded source and target streams;
the visual-change alarm must precede the review interval to make an update
eligible. It does not establish actual within-line change timing.

## Evaluation and decision

Report later defect-frame TP, normal-frame FP, new defect-episode detection,
frame AP/AUROC on runs with both classes, and later eight-review episode
yield. Report review decisions, guard pass/fail, and the number of normal
reviews. Include per-run results; summarize equal-weight run differences and
the number of runs helped versus harmed. The full source-only path is the
operational baseline. The guarded path is an offline counterfactual, not
production deployment.

Because this protocol was written after other TSFabrics experiments examined
some of the final runs, these runs are disjoint from the five development
runs **for this comparison** but are not an untouched external benchmark.
Evidence from a few positive runs cannot establish field sensitivity on
rubber belts. If fewer false alarms come with missed defects, or the gain is
not consistent across runs, keep the source reference and do not advertise
review-driven model improvement.

## Development decision locked before final evaluation

The primary eight-review candidate reduced false alerts from 11 to 0 on one
normal development run. On the two defect-bearing runs with a change alert,
the source had no false alerts, while naive candidate TP fell from 75 to 33
and from 169 to 113. Novelty gating retained only 35 and 113 TP, respectively,
with no false-alert benefit. A third defect run had no confirmed change before
review and is ineligible for an update. The reviewed-defect check did not
predict the later loss. **No candidate qualifies for promotion.** The final
phase will keep the frozen source active and report every shadow candidate as
a falsification check, without changing the rule after seeing final labels.
