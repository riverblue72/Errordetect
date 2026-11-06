# Full source-run continuation: result

The existing DINOv2 global-feature MMD detector and its source-calibrated
limit were held fixed. The first 2,048 frames of `T1_S174_I111_1` fitted the
detector. After a 64-frame gap, the entire remaining recorded scenario was
scored in order; no defect or cutline labels entered the detector.

| Measure | Observed |
| --- | ---: |
| Source recording | 18,630 frames |
| Continuous later interval | 16,518 frames, `[2112,18630)` |
| 128-frame score windows, step 32 | 513 |
| MMD alert limit | 0.063927 |
| Highest later window score | 0.049456 |
| Windows over limit | 0 / 513 |
| Three-window confirmed alerts | 0 |

The first 1,984 frames of this later interval reproduce the previously
reported no-alert source continuation. The longer result supports stability
on **this one recorded production scenario**, including much later frames;
it does not estimate the false-alert rate across production lines. TSFabrics
does not annotate the time of any within-scenario process-setting change, so
an alert in such a run could not automatically be scored as false, nor does
this audit establish accuracy for an unknown real change point. The separate
known-boundary test still detects 15 of 16 other recorded scenarios.

The fixed protocol is in [SOURCE_CONTINUATION_FULL_PROTOCOL.md](SOURCE_CONTINUATION_FULL_PROTOCOL.md).
The complete 513 window endpoints and scores are saved in
[`results/source_continuation_full.json`](results/source_continuation_full.json).
The [TSFabrics dataset paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC12992769/)
describes scenario-level texture, speed, and illumination conditions and
per-frame defect/cutline annotations. The lack of within-scenario
process-change timestamps is inferred from those released annotations and
the inspected ZIP; it is not a statement of known unchanged conditions.
