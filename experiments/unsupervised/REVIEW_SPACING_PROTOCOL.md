# Review-spacing sensitivity audit

## Question

The current queue requests eight highest-scoring photos at least 16 frames
apart. Does the discovery gain depend strongly on that particular spacing?
This audit changes only the minimum temporal separation. It does not change
the DINOv2 scorer, source reference, alert threshold, evaluated frames, or
eight-photo budget.

## Fixed comparison

- Use the original five development runs and 16 extended-evaluation runs in
  `unlabeled_review_{phase}.json`, with frames 0–255 reserved as startup,
  frames 256–319 unused, and later frames capped at 4,096.
- Recompute frozen-source DINOv2 scores. Rank by score with stable ties and
  greedily request eight photos with minimum separation **1, 4, 8, 12, or
  16 frames**. One frame means the unspaced top-eight rule. A pre-run
  feasibility check found that 32-frame spacing yields only seven requests
  in the shortest 617-frame final run, so larger gaps cannot isolate spacing
  while preserving the eight-photo budget across all runs.
- Check that the reconstructed 16-frame queue exactly matches the saved
  benchmark for every run before reporting any new result.
- Form every queue without labels. Published labels are read afterward to
  count confirmed defect and normal reviews and distinct new defect episodes.
  The original eight-frame episode grouping and startup exclusion are fixed.
- Also replay the existing two-first rule for each queue: stop after two
  confirmed normals; otherwise continue to eight. This is a workload
  sensitivity, not proof that an interval is defect-free.

Report per-run results, pooled episode discoveries out of all new episodes,
macro episode coverage over defect-bearing runs, normal reviews, and requests.
The development result may suggest a spacing candidate; the 16 final runs
are then inspected with the grid fixed above. These final runs appeared in
earlier project studies, so this is a **post-hoc robustness audit**, not a new
independent benchmark. Keep the current rule unless an alternative has a
clear development gain without losing an episode on any development run;
even then, report it as a candidate rather than a validated replacement.

The experiment writes only small JSON results. Uncached target features are
encoded in memory on the project server because the disk is nearly full.
