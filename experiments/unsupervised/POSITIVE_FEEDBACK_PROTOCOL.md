# Confirmed-defect feedback for later review ranking

## Hypothesis and scope

The existing reviewed-normal reference update lowered normal alerts but also
suppressed later defects, so the frozen source detector remains active. This
separate experiment asks whether **confirmed defect photos from one completed
review interval** can help rank photos for the **next** review interval. It
does not change the anomaly score, threshold, patch reference, change detector,
or automatic accept/reject decision.

## Locked time order

Use the same TSFabrics source reference and run partition as
`feedback_validation.py`: five development runs and sixteen later evaluated
runs, including its length exclusion. In each target run, select eight review
photos by the frozen source score with at least 16 frames between them from
zero-based frames `[320,640)`. Reveal public labels only on those eight
photos. Leave `[640,704)` unused. Evaluate review requests on later frames
`[704,min(4096,run_length))`; require at least 128 later frames. No later label
may select a prototype, tune a score, or change a queue.

Only runs with at least one **confirmed defect** in the initial eight reviews
can form a positive prototype. For each such photo, take the eight patch
tokens with highest frozen-source patch distance. A frame label does not
locate its defect, so this is weak supervision and the patch choice may be
wrong. Do not use dataset masks. For each later photo, take its eight highest
source-distance patches and compute the maximum cosine similarity to all
positive prototypes. The similarity only ranks photos for review; it is not
a defect probability or a new detection threshold.

## Equal-budget comparison

All queues use the same later frames and eight review positions with a
minimum 16-frame separation:

1. **Frozen baseline:** eight highest frozen-source scores.
2. **Positive-aware:** six highest frozen-source scores, then two highest
   positive-similarity photos that satisfy spacing against the first six.
3. **Capacity control:** the same first six, then two random photos satisfying
   spacing. Report the mean and range over 100 prespecified seeds `0..99`.

If no defect was confirmed in the initial eight reviews, the positive-aware
queue and its capacity control are identical to the frozen baseline. This is
an operational outcome, not an exclusion. The eight initial and eight later
review requests are separate budgets; only the later eight are compared here.

## Audit and decision

After queues are fixed, use public labels to count later reviewed defect
photos and **new defect episodes**, where an episode's first defect frame
must be in the later interval. Report each run, the number of positive-eligible
runs, the total new episodes available, and wins/ties/losses versus baseline.
The prior experiment's frozen-score results are a consistency check; recompute
its later baseline queue on every positive-eligible run and fail if episode
counts differ.

Do not claim that operator feedback improves the detector, or even that it
improves review selection, unless the latter is supported across eligible
runs at equal budget. These final runs have been inspected in earlier project
work; this is a time-ordered follow-up analysis, not a blind external test or
a rubber-belt result. No outcome from this experiment changes the published
site until the comparison is checked.
