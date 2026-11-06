# Sequential review budget: results

The queue and frozen DINOv2 scorer are identical to the prior unlabeled-review
benchmark. The primary rule requests the first two time-spaced, highest-score
photos. If both are confirmed normal, review ends for that interval; a defect
or uncertain result releases the other six requests. The three-photo pilot is
a prespecified control. Only requested review outcomes are used before the
stop decision. Full labels are used afterward to count missed episodes.

| Phase | Rule | Requests | Normal reviews | New episodes found | Macro coverage on defect runs | Runs losing episodes vs fixed eight |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Development, 5 runs | Fixed eight | 40 | 16 | 20 / 43 | 53.2% | — |
| Development, 5 runs | Two-photo pilot | **28** | **4** | 20 / 43 | 53.2% | 0 / 3 |
| Development, 5 runs | Three-photo pilot | 30 | 6 | 20 / 43 | 53.2% | 0 / 3 |
| Final, 16 runs | Fixed eight | 128 | 101 | 26 / 90 | 71.1% | — |
| Final, 16 runs | Two-photo pilot | **56** | **29** | 26 / 90 | 71.1% | 0 / 4 |
| Final, 16 runs | Three-photo pilot | 68 | 41 | 26 / 90 | 71.1% | 0 / 4 |

On the final runs, the two-photo rule reduced requests by 72/128 (56.3%) and
normal reviews by 72/101 (71.3%). All 12 normal-only runs stopped after two
normal reviews. Each of the four defect-bearing runs had a defect among its
first two reviews and continued to eight. The fixed-eight queue already found
the maximum number of distinct episodes reachable with eight requests in
each defect-bearing run: 8/8, 8/8, 6/6, and 4/4. The 26 found episodes are
out of 90 actual new episodes; the remaining episodes are beyond the eight
per-run review budget.

This is a workload result, not improved image detection or proof that two
normal reviews certify the rest of a run. A defect-bearing run whose first
two reviews are normal could lose later discoveries. The four final defect
runs are too few to estimate that risk reliably, and their public data were
seen in earlier project studies. The rule should remain a review-scheduling
candidate until a prospective run-disjoint test, ideally with periodic audit
reviews after a stop. It does not change the anomaly detector, threshold, or
reference.

The site replay lets a reviewer open the remaining six photos even after two
normal confirmations. That manual choice is outside the fixed 56-request
evaluation above; no measured workload or discovery gain is attributed to it.

Saved per-run outputs: [`results/sequential_review_development.json`](results/sequential_review_development.json)
and [`results/sequential_review_final.json`](results/sequential_review_final.json).
Reproduce with `sequential_review.py` and the downloaded TSFabrics ZIP; the
exact split and decision rule are in [`SEQUENTIAL_REVIEW_PROTOCOL.md`](SEQUENTIAL_REVIEW_PROTOCOL.md).
