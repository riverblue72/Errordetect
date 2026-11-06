# Lower change-alert limit: fixed follow-up trial

## Question and development choice

The frozen DINOv2 global-feature MMD signal confirmed 4/5 known joins in
development and 15/16 in the extended set with its original source-calibrated
limit. On the missed development join `T1_S148_I108_2`, a read-only score
diagnostic checked multipliers `1, .95, .9, .85, .8, .75, .7` of that source
limit. The first multiplier that confirmed this join was **.75**, at new-run
frame 448. The original limit was 0.063927; the .75 limit is 0.047945. On the
previously audited 16,518-frame continuation of the same source recording,
two score windows exceeded .75 of the limit but neither was adjacent to
another exceedance; the existing three-window rule did not confirm an alert.

This uses a **known development join** to choose the multiplier. The
operational detector still reads no target labels, but the lowered limit is
no longer calibrated from source data alone. The source continuation and
development runs have already been examined in the project. The trial is a
method sensitivity check, not a new blind benchmark or a guarantee against
unannounced within-run changes.

## Locked comparison

- Keep source `T1_S174_I111_1`, its first 2,048 frames for MMD fitting,
  128-frame windows, 32-frame steps, the frozen DINOv2 global embedding,
  RBF bandwidth, and three consecutive over-limit windows unchanged.
- The only candidate change is `limit = 0.75 × original source limit`.
  Retain the original 1.0 rule as the paired control.
- Score the same source continuation `[2112,18630)`. For each of the five
  development and 16 extended recordings, join source frames `[2112,3136)`
  to at most 1,024 target frames. The join at frame 1,024 is known to the
  evaluator but hidden from the detector.
- Recompute the original limit's first alarm and require it to match the
  saved result for every recording before interpreting a new alarm. Cached
  global features may be used; otherwise encode only the target prefix with
  the same frozen DINOv2 implementation.
- Record each first alert, delay after the known join, alerts before the
  join, source-continuation over-limit windows and confirmed alerts. Do not
  use defect labels or tune the factor from extended-run outcomes.

Proceed to the extended phase only if the fixed candidate confirms **all
five** development joins, produces **no alert before any join**, and makes
**no confirmed alert** on the long source continuation. Report the entire
16-recording result regardless of outcome once that gate passes.

An extended result of 16/16 known joins with no source-continuation alert
would be a better result on this **synthetic boundary task**. It would not
validate within-run process change detection, general field alarm rates,
or rubber-belt performance. The same source recording supplies the sole
long-run negative control; a lowered limit should not replace the current
site claim without broader stable-run controls.

Reproduce with `change_limit_trial.py`, the existing TSFabrics ZIP and
feature cache, `source_continuation_full.json`, and saved
`unlabeled_review_{phase}.json` results. The candidate factor and protocol
are fixed before its extended results are computed.
