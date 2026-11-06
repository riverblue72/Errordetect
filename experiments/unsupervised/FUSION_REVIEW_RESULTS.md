# Completed-interval score fusion: result

The frozen DINOv2 queue remains the chosen review method. A 75% DINOv2 / 25%
handcrafted percentile-rank combination looked promising on five development
runs but lost both frame ranking and limited-review coverage on the sixteen
remaining runs. No detector, alert threshold, reference bank, or change signal
was updated in this experiment.

## Same-run, same-budget comparison

Each method scored the same later frames and requested eight photos at least
sixteen frames apart. Macro AP averages the runs with defect frames; macro
episode coverage averages the runs with new post-startup defect episodes.
"Two-first requests" applies the existing rule: stop after two confirmed
normal photos, otherwise show all eight. Public labels are used only to audit
the queues after selection.

| Phase | Queue | Macro frame AP | Episodes in eight reviews | Macro episode coverage | Normal photos in eight reviews | Two-first requests | Normal two-first reviews |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Development · 5 runs | Frozen DINOv2 | 89.7% | 20/43 | 53.2% | 16 | 28 | 4 |
| Development · 5 runs | 75/25 rank mix | 96.6% | 21/43 | 57.3% | 16 | 28 | 4 |
| Final · 16 runs | Handcrafted | 66.4% | 22/90 | 48.2% | 105 | 50 | 29 |
| Final · 16 runs | Frozen DINOv2 | **85.4%** | **26/90** | **71.1%** | **101** | 56 | **29** |
| Final · 16 runs | 75/25 rank mix | 81.2% | 24/90 | 58.6% | 103 | 56 | 31 |
| Final · 16 runs | 50/50 rank mix | 79.2% | 24/90 | 58.6% | 103 | 56 | 31 |

The two-first rule found 26 episodes with frozen DINOv2 and 24 with either
mixed queue. It triggered the remaining six requests on all four defect-bearing
final runs for both frozen DINOv2 and the mixtures. The loss was caused by
**which eight photos were selected**, not by stopping after two reviews.

### Defect-bearing final runs

| Run | New episodes | Frozen AP | 75/25 AP | Frozen episodes @8 | 75/25 episodes @8 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `T1_S148_I108_1` | 69 | 85.8% | 88.9% | 8 | 8 |
| `T1_S174_I108_1` | 11 | 85.8% | 91.9% | 8 | 8 |
| `T1_S478_I118_2` | 6 | 87.4% | 98.3% | 6 | 6 |
| `T2_S287_I185_1` | 4 | **82.3%** | 45.8% | **4** | 2 |

The handcrafted scorer had only 11.1% AP on the last run. Its 25% weight
pulled two distinct defect episodes out of the eight-review queue. Gains on
the other runs did not compensate for this loss. The frozen queue was already
at the eight-review ceiling of 8, 8, 6, and 4 episodes on the four defect
runs, so this final set offers no room to improve episode count with the same
per-run budget.

## Audit and decision

The recomputed frozen DINOv2 and handcrafted queues selected the same eight
frame *sets* as the earlier benchmark on every run. Near-tied DINO scores
reordered a few frames on three normal-only runs; the largest frame-AP
difference from the earlier result was below 0.02 percentage points. This
does not alter review outcomes or the conclusion.

The prespecified 75/25 candidate failed the final criteria: macro AP fell by
4.2 percentage points, eight-review episode coverage fell by 12.5 points,
two additional normal photos entered the eight-review requests, and one
defect-bearing run lost two episodes. It also requires a second feature pass.
In the earlier uncached-run timing record, frozen DINOv2 encoding plus source
scoring averaged 9.7 ms/frame, while handcrafted extraction plus scoring
averaged 13.8 ms/frame on the RTX 3090 server. These are separate measured
paths, not a measured optimized combined throughput. The active detector and
review queue therefore remain frozen DINOv2.

This final set is run-disjoint for the fusion question but was inspected in
earlier project analyses. Treat the result as a falsification of this specific
mixture on TSFabrics, not as a general finding about score fusion or rubber
belts.

## Reproduce

Use the project-local TSFabrics ZIP and feature cache on the experiment server:

```bash
python3 fusion_review.py --zip data/TSfabrics.zip --cache features --phase development --out results/fusion_review_development.json
python3 fusion_review.py --zip data/TSfabrics.zip --cache features --phase final --out results/fusion_review_final.json
python3 audit_fusion_review.py --zip data/TSfabrics.zip --result results/fusion_review_development.json --baseline results/unlabeled_review_development.json
python3 audit_fusion_review.py --zip data/TSfabrics.zip --result results/fusion_review_final.json --baseline results/unlabeled_review_final.json
```

Protocol: [FUSION_REVIEW_PROTOCOL.md](FUSION_REVIEW_PROTOCOL.md). Saved per-run
results: [development](results/fusion_review_development.json) and
[final](results/fusion_review_final.json).
