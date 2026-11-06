# Fixed-size interval review: safety audit

## Question and fixed comparison

The existing two-first result chooses one eight-photo queue from an entire
target recording (up to 3,776 evaluated frames). Every defect-bearing run had
a defect in its first queued photo. This did not challenge the early-stop
decision in a mixed run. A period summary would make separate decisions over
shorter consecutive intervals. This sensitivity experiment tests whether the
same stopping rule hides reachable defects under that segmentation.

Use the same frozen source DINOv2-S/14 patch bank, target recordings, cap at
4,096 frames, evaluation start at frame index 320, and episode definition as
`UNLABELED_REVIEW_PROTOCOL.md`. Recompute the source score for every evaluated
frame and compare its whole-run, 16-frame-spaced top-eight queue with the
saved `unlabeled_review_{phase}.json`. No target label, local
reference, target calibration, or change alarm enters ranking.

**Reproduction amendments before any final interval outcome was produced:**
the first attempted exact replay differed at the eighth queue photo of
`T2_S262_I45_1`; current scores of the two boundary candidates are
0.52003467 and 0.51999742. Repeating the original full-run feature-extraction
path produced the same new ordering. A second attempt differed at ranks five
and six of `T2_S466_I39_1`, with the same eight photos retained. Exact queue
identity cannot be a gate for this recalculation. Record, for every run, the
whole-run queue overlap and whether the first two photos match the saved
queue. Include **all** runs regardless of this descriptive check. The
interval comparison is internally paired on its newly computed scores and
must not be described as a bitwise replay of the earlier whole-run result.

Split each target evaluation prefix into adjacent 512-frame blocks starting at
zero-based index 320. Merge a final remainder shorter than 256 frames into
the preceding block. A run with fewer than 256 evaluated frames is excluded
and reported. Each completed block gets its own score-ranked, 16-frame-spaced
eight-photo queue. There is no carryover of a review outcome to the next
block. This 512-frame window is a diagnostic stress test, not a calibrated
factory shift or a proposed alert frequency.

Compare fixed eight, one-first, two-first, and three-first using each **same**
queue. A pilot stops if all of its initially requested photos are confirmed
normal; a defect or uncertain result opens all eight. The decision callback
reads only requested photo labels. After the queue is fixed, use public labels
to audit the whole block and the seven or six unrequested queue photos.

Report by development (five runs) and final (sixteen runs): total review
requests; unique new defect episodes found across all intervals of each run;
number of intervals containing a confirmed defect; stopped intervals that
contain a defect anywhere; stopped intervals with a defect in the remaining
fixed-eight queue; and episode losses relative to fixed eight. Use full-run
episode IDs so an episode spanning two adjacent blocks is counted at most
once. Do not select a new pilot size from the final outcomes.

If the two-first rule ever stops while a known defect remains among that
block's unrequested six photos, the site must not suggest that its current
whole-run workload result generalizes to shorter summaries. Document the
failure and revise the operational stop policy before promoting shorter
intervals. If no such event appears, this finite public-data test still does
not certify a stopped interval as defect-free; retain a manual and periodic
audit path. The public runs were previously inspected for other questions,
so this is not a blind prospective validation.
