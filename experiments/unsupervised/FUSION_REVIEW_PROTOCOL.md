# Score-only fusion for completed-interval review

## Question

The handcrafted scorer finds some defects that the frozen DINOv2 scorer misses.
Can a label-free combination improve the limited review queue while leaving
the active detector, its threshold, and the visual-change signal unchanged?
This experiment concerns review order **after an interval has ended**. It is
not an online anomaly score or an automatic reference update.

## Fixed comparison

Use the source reference, five development runs, and sixteen remaining final
runs in `UNLABELED_REVIEW_PROTOCOL.md`. For each target, score frames 321 onward
through at most frame 4096. The frozen source DINOv2 and eight-feature
handcrafted scores use the same methods as `unlabeled_review.py`. Check that
their eight selected frame *sets* reproduce the saved queues and that frame AP
agrees within 0.05 percentage points before interpreting fusion results.
Near-tied scores can change order slightly across PyTorch builds.

Each completed interval has four score-only rankings:

1. Frozen DINOv2 score.
2. Handcrafted score.
3. 75% DINOv2 percentile rank plus 25% handcrafted percentile rank.
4. Equal mean of the two percentile ranks.

Ranks use all images in the completed interval without labels. Every method
requests eight high-ranked photos at least sixteen frames apart. No model,
reference bank, threshold, review budget, or target image set is changed.
Published labels enter only after the queues have been fixed, to calculate
frame average precision (AP), AUROC, review outcomes, and distinct new defect
episodes found. An episode first seen before the evaluation window cannot earn
credit. Ambiguous CSV/mask disagreements are excluded from frame metrics.

The 75/25 rule is the **development choice**: it raised macro AP on the three
defect-bearing development runs from 89.7% (DINOv2) to 96.6%, and found 21
rather than 20 of 43 new episodes in eight reviews per run. The equal-weight
rule is retained as a sensitivity comparison, not reselected using final
results. The full final phase was launched only after this choice.

## Decision rule and limits

Compare per-run and macro AP, the first two review requests, eight-review
episode coverage per defect-bearing run, and normal review count. The frozen
DINOv2 queue already found 8, 8, 6, and 4 episodes on the four final defect
runs. With at most eight requests per run, it has reached the achievable
eight-review ceiling on these data. Thus the mixed queue cannot improve that
particular count. This ceiling was recognized while the final scoring process
was running, before its aggregate results were inspected; the earlier proposed
gate requiring an additional episode was impossible and was removed.

Treat the 75/25 queue as a useful *offline review candidate* only if final
macro frame AP improves by at least five percentage points, the first-two
checks still identify every defect-bearing run identified by frozen DINOv2,
no run loses an episode within eight reviews, and normal review requests do
not increase. Otherwise retain the frozen queue. The score and threshold used
for frame alerts stay frozen either way. Even a successful queue comparison
needs a measured throughput check before production use: the handcrafted
feature pass adds work over the DINOv2-only path, and the partner described a
roughly 100-frame/s example.

The final runs were examined in earlier project experiments. This is a
run-disjoint comparison for the new fusion question, not untouched external
validation. A gain here would motivate a later prospective test, not establish
field performance on rubber belts.
