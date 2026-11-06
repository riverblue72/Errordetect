# Reference choice × review spacing: four-cell audit

## Question

The site separately shows two eight-review comparisons that both end at 26
discovered episodes. One changes the source reference; the other spaces
review requests. How do those changes combine, and what is the missing
all-startup/top-eight result?

## Fixed comparison

- Reuse the same 512 source startup frames, frozen DINOv2-S/14 features,
  selected and all-startup source banks, and **7,392 vectors per bank** as the
  verified reference-selection audit. No target image or label builds either
  bank. A binary alert limit is irrelevant because this compares ranking.
- Evaluate the same five development and sixteen extended runs from frame
  320 to at most 4,095. For each bank, fix two eight-request queues from the
  completed interval's scores: highest eight with no separation, and highest
  eight at least sixteen frames apart. Thus the four cells differ only in
  reference choice and queue spacing; review budget and input frames match.
- Fix all four queues **before** reading public labels. Count distinct new
  defect episodes found by the eight requested photos, normal review
  requests, and per-run results. An episode begins after more than eight
  frames without a labeled defect. Reproduce the three already reported
  cells exactly; the fourth is the new measurement.
- This is a descriptive factorial audit of previously studied public textile
  runs, not a new untouched benchmark or proof of rubber-belt performance.
  Show the episode denominator and all four final-run cells together. Do not
  add the two separate gains, because both comparisons lead to the same
  selected-reference, spaced-eight method.

## Reproduce

On the authorized RTX 3090 server, from the repository root:

```sh
PYTHON="$PWD/.venv-dino-audit/bin/python" bash experiments/unsupervised/run_reference_review_factorial.sh
```
