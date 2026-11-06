# Appearance-based representation routing · exploratory audit

The handcrafted source scorer ranks some near-source fabric runs better than
the frozen DINOv2 source scorer. We tested whether the *existing, label-free*
global-feature change signal could select one representation per target run.
This is a post-hoc audit: the final recordings and their labels had already
been inspected for other project decisions. The routing rule is not a new
independent benchmark or an active pipeline component.

## Rule and temporal order

Use only the target's unlabeled startup frames `[0,256)`. From the saved MMD
trace of the 1,024-frame source prelude joined to that target, take the median
of the five windows ending at target frames 128, 160, 192, 224, and 256.
Choose handcrafted patch distance when this median is at most twice the
original source-calibrated MMD limit (`2 × 0.063927 = 0.127854`); otherwise
choose frozen DINOv2 patch distance. Scored photos begin at target frame 320,
so routing uses no evaluated frame. Neither the MMD score nor this selection
reads a target defect label. The factor two was proposed after seeing the
recordings, however, and needs independent validation.

The two scorers and their time-spaced eight-photo queues were already saved;
we switched between those outputs without recomputing a model. The figures
below can be reproduced from `results/change_limit_{development,final}.json`
(`window_ends`, `window_scores`, `source_control.original_limit`) and
`results/unlabeled_review_{development,final}.json` (`methods.handcrafted_source`
and `methods.source_knn`).

| Phase | Routed to handcrafted | Macro frame AP, routed / DINOv2 | New episodes in eight reviews, routed / DINOv2 |
| --- | ---: | ---: | ---: |
| Development · 5 runs, 3 with defects | 1 | 93.6% / 89.7% | **19 / 20** of 43 |
| Final · 16 runs, 4 with defects | 3 | 90.6% / 85.4% | **26 / 26** of 90 |

The routed development run `T1_S148_I108_2` rose from 78.7% to 90.4% frame
AP but found **seven rather than eight** episodes. On the final set, the two
routed defect runs gained frame AP, but both methods found eight episodes in
each. The third routed final run had no labeled defects. The other final runs
kept DINOv2, including the two larger-shift defect runs.

**Decision:** keep the frozen DINOv2 scorer and spaced review queue. This
candidate adds a second detector and a routing decision without improving the
primary final review yield, while losing one development episode. The apparent
AP gain is an exploratory observation from four final defect runs. A future
test would need new recording-disjoint data, a fixed gate, and review yield as
its primary measure before changing the operational route.
