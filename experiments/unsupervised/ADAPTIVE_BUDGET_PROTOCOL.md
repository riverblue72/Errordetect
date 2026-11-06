# Review-feedback allocation under a fixed total budget

## Question

The current whole-run queue allows eight reviews per recorded run and finds
26/90 new defect episodes on the sixteen final TSFabrics runs. It already
reaches the maximum possible distinct episodes *within each fixed eight-photo
queue*. A 512-frame summary creates more opportunities but also more review
requests. This test asks whether decisions on a few requested photos can
redistribute the **same total review budget** across completed runs, while
retaining an independent check of initially quiet runs.

## Frozen inputs and information order

Reuse the five development and sixteen final runs, the frozen source DINOv2
scores, 16-frame spacing, 4,096-frame cap, episode grouping, and saved
512-frame block queues from `INTERVAL_REVIEW_PROTOCOL.md`. The block audit
recorded three small whole-run queue ordering differences from the older
scoring pass. For each run, use the *current recalculated* whole-run eight
when recorded, otherwise its identical saved queue. Use the saved seeded
random-eight queue only to choose an independent audit photo. All candidate
streams and first-two photos are fixed **without labels**. Public dataset
labels are revealed only when a photo is requested, to replay the inspection
decision; all remaining labels enter retrospective evaluation afterward.

All runs in a phase form one completed reporting batch. Total review cap is
`8 × number of runs`: 40 development and 128 final. This is a batch-level
allocation experiment, not a claim that independent production runs arrive
simultaneously or that a real operator can inspect the entire batch instantly.

## Compared schedules

1. **Fixed eight per run:** current recalculated whole-run, score-ranked,
   16-frame-spaced queue. This is the matched total-budget baseline.
2. **Two-first, unspent budget:** request the first two of that queue for
   every run. If both are confirmed normal, stop; if either is defect or
   uncertain, request the other six. This reproduces the site's scheduling
   idea and records its actual workload on the current score pass.
3. **Feedback allocation with audit:** request the same first two per run.
   For each run where both are normal, request one photo from the saved
   seeded-random queue, excluding duplicates and frames within 16 of the
   first two. A defect or uncertain outcome in any requested photo makes
   that run active. Allocate the remaining batch budget among active runs
   in round-robin name order, one request per active run per pass. Its
   candidate stream cycles through the 512-frame block queues by rank:
   first choice from each block in chronological order, then second choice
   from each, and so on. Skip already requested photos and any within 16
   frames of an earlier request. Stop at the cap or when all active streams
   are exhausted. Do not spend leftover requests on runs with only normal
   reviews. Report the actual used budget.
4. **Feedback allocation without audit:** same rule without the independent
   random photo. This control isolates its workload and discovery effect.

**Exploratory follow-up after both phases of the first allocator were read:**
the initial feedback allocator increased total discoveries but displaced
episodes previously found by fixed eight on two development runs. Add a
baseline-reserving allocator as a separate, explicitly post-hoc method. It
uses the same first two and a seeded-random audit photo for initially quiet
runs, chosen at least 16 frames away from *all eight* baseline photos. For
every active run, request the other six baseline photos first, in baseline
rank order across active runs. Only then spend any remaining batch budget on
the same round-robin, time-balanced block stream. If many audit photos reveal
defects and the global cap prevents completing all baseline queues, stop at
the cap and report losses; never silently exceed the cap. This refinement is
tested on data already seen in earlier comparisons and cannot serve as a
fresh confirmation of its benefit.

The random audit is deliberately separate from score ranking. One such photo
cannot certify that a quiet run is defect-free. The feedback rules change
only **which photos are requested**, not the anomaly model, threshold, or
reference. No defect-type pseudo-label or training update is made.

## Measures and decision

For each run and phase, report requests, normal/defect/uncertain reviews,
unique newly discovered defect episodes, and missed episodes relative to
fixed eight. Report phase totals and macro episode coverage over runs with
new defects. The budget comparison must use the same run set and at most
`8 × runs` requests; never compare a 512-frame per-block total to a
per-run budget as if they were equal.

Evaluate all schedules on development first, then the unchanged rules on all
sixteen final runs regardless of development outcome. Present the feedback
allocator as a candidate only if it finds more episodes than fixed eight on
development at no larger total request count, loses no development run, and
then loses no final defect-bearing run. The final public runs have appeared
in earlier studies, so even a positive result is an exploratory paired
TSFabrics comparison, not prospective field validation. Inspect the stopped
runs for hidden defects after the schedule is fixed and retain the manual
review path in any user-facing demonstration.
