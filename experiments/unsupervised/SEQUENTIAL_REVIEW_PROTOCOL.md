# Sequential review budget: prespecified audit

## Question

The frozen DINOv2 score plus 16-frame-spaced queue reaches the maximum number
of distinct episodes attainable with eight requests per defect-bearing final
run: 8/8, 8/8, 6/6, and 4/4. Yet 101 of 128 requests across all final runs
are on normal frames. The next useful question is whether review outcomes can
reduce that workload **without losing episodes**. This is a review-scheduling
experiment; it does not update the detector or its threshold.

## Fixed rules

Build the existing label-free, score-ranked `source_knn.spaced8` queue after
each completed interval. Request its first two photos. If both are confirmed
normal, stop for this interval. If either is defect or uncertain, continue
through all eight requests. A three-photo pilot is a prespecified workload /
sensitivity control; the original fixed-eight queue is the baseline. The
selection rule reads only outcomes of photos it has already requested.

Development uses the same five named development runs as
`UNLABELED_REVIEW_PROTOCOL.md`. The 16 remaining runs are evaluated with the
rules frozen above. No rule or threshold is selected from final outcomes.
Each run is capped at its previously evaluated first 4,096 frames; frame
identities, episode grouping, and ambiguous-label exclusions match the saved
unlabeled-review result. Published dataset labels replay the operator's
decision on requested photos only; the full labels are opened afterward for
the retrospective audit.

## Required comparison

Report per run and phase: requested photos, confirmed normal / defect /
uncertain, distinct new episodes found, and loss versus fixed eight. Aggregate
the number of review requests, normal requests, pooled episodes, and macro
episode coverage across defect-bearing runs. A smaller queue is useful only if
it preserves fixed-eight episode yield on **every** defect-bearing development
run; final results are reported regardless. Stopping after normal reviews is
a workload choice, not evidence that the interval contains no defects.

The final runs were previously inspected for other project questions, so this
is a fixed comparison on reused public data, not an untouched external test.
Any result remains a TSFabrics proxy and needs prospective field validation.
