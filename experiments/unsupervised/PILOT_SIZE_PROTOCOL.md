# One-photo versus two-photo review start

## Purpose

The current review schedule starts with the two highest-score, 16-frame-spaced
photos and asks for the remaining six if either is confirmed defect or
uncertain. This retrospective sensitivity test checks whether starting with
only the first photo would preserve the same new-defect-episode discovery and
reduce requests further. It does not change the detector, the queue, the
threshold, or the current site rule before the result is audited.

## Locked comparison

Reuse the exact frozen-source `spaced8` queues, time-ordered TSFabrics runs,
episode definition, and 4,096-frame cap from the prespecified
`SEQUENTIAL_REVIEW_PROTOCOL.md`: five development and sixteen final runs.
Use published labels only as decisions on photos actually requested by the
pilot. The one-photo rule stops after a confirmed normal first photo; a defect
or uncertain result opens the other seven. Compare with the saved two-photo
rule and fixed eight. Audit all eight queue labels afterward to count hidden
defects and new episodes in every stopped run. Report each run and the
aggregate number of requests, normal reviews, and new episodes found.

The one-photo rule should replace the current two-photo start only if it
preserves fixed-eight new-episode yield on every defect-bearing development
and final run, no stopped queue hides a known defect, **and** the test includes
at least one defect-bearing run that actually stops after a normal first
photo. Without that difficult case, zero losses only shows that obvious
high-score defects appear first on these few runs; keep the two-photo rule.
The final public runs were used in earlier studies and are not a blind field
test. Do not claim that either pilot certifies an interval as defect-free.
