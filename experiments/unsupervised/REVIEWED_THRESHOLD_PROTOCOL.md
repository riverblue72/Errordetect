# Reviewed-normal alert-limit audit

## Question

Can confirmed-normal review outcomes reduce false frame alerts after a visual
change **without changing the DINOv2 reference bank or score function**?
This is a shadow audit of an operational candidate, not a deployed update.

## Fixed protocol

- Use the same selected source bank, 99.5th-percentile source limit, five
  development runs, and sixteen extended-evaluation runs as the prior
  `feedback_validation` experiment. Its score-only, spaced-eight review queue
  is fixed in frames `[320,640)`. Evaluate only later frames `[704,4096)`;
  the 64-frame separation prevents direct reuse of adjacent reviewed frames.
- Reveal labels only for those eight prespecified review photos, as a replay
  of operator judgments. If fewer than two are confirmed normal, retain the
  frozen limit. Otherwise set a trial limit to the greater of the source
  limit and the highest confirmed-normal review score. No bank vectors or
  model weights change.
- A trial is eligible only if the earlier recorded visual-change alarm was
  confirmed before review, and every reviewed defect that crossed the source
  limit would also cross the trial limit. Otherwise retain the source limit.
  This review guard cannot certify that unreviewed defects are preserved.
- Report the shadow trial and the guarded effective choice on all later
  frames. Use later public labels only after thresholds have been fixed, for
  retrospective normal flags, defect flags, and new defect-episode detection.
  Keep AP and the eight-review queue fixed because this intervention changes
  only the binary alert limit.
- The five development runs decide whether this candidate merits a follow-up
  test: require **no loss of newly detected defect episodes** and at least
  **50% fewer normal-frame flags**, compared with the same frozen scorer and
  source limit. If either condition fails, do not adopt it. If both pass,
  audit all sixteen follow-up runs with this unchanged rule. The development
  and follow-up sets are not untouched external benchmarks because some runs
  appeared in earlier project studies.

The reviewed frames are high-score, temporally spaced cases, so their normal
scores are not an unbiased sample of the new run. Two normal reviews cannot
calibrate a reliable false-alarm rate. The study tests a concrete candidate
and its failure modes; it does not assume the guard makes threshold updates
safe in production.

## Reproduce

From the repository root on the authorized RTX 3090 server:

```sh
PYTHON="$PWD/.venv-dino-audit/bin/python" bash experiments/unsupervised/run_reviewed_threshold_audit.sh development
```

The runner keeps model and temporary caches inside the repository. Its phase
argument may be changed to `final` only after the development decision.
