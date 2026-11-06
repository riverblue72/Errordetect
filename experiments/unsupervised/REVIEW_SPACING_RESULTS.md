# Review-spacing sensitivity: result

The frozen DINOv2 source scorer was rerun on the same five development and 16
extended-evaluation TSFabrics runs. For every run, the recomputed 16-frame
queue exactly matched the saved benchmark. Each rule selected eight photos
from the same later-frame scores; published labels were opened only after all
queues were fixed.

| Minimum gap | Development: episodes / 43 | Final: episodes / 90 | Final macro coverage | Final defect photos reviewed | Final normal photos reviewed |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 frame (top eight) | 11 | 15 | 41.8% | 32 | 96 |
| 4 frames | 16 | 24 | 58.6% | 32 | 96 |
| 8 frames | 18 | 25 | 64.8% | 30 | 98 |
| 12 frames | 20 | 26 | 71.1% | 27 | 101 |
| 16 frames (current) | 20 | 26 | 71.1% | 27 | 101 |

The 12- and 16-frame rules tied **on every defect-bearing run** in both
phases. Among the final four defect-bearing runs, the top-eight versus
16-frame result was 3→8, 6→8, 5→6, and 1→4 distinct new episodes. The
unspaced queue reviewed more photos carrying a defect label (32 versus 27)
but repeatedly sampled the same events, finding only 15 rather than 26
distinct episodes. Every run received eight requests under each fixed rule.

The separate two-first replay made 28 requests on development and 56 on
final runs for every tested gap. On this cohort it found the same episodes as
its corresponding eight-photo queue. This does not establish that stopping
after two normal reviews is safe on other runs.

## Decision and limits

Keep the current 16-frame gap. It ties the best development and final result,
fits the shortest evaluated run with all eight requests, and leaves slightly
more separation between neighboring checks than the tied 12-frame rule.
This is a robustness check for the **review queue**, not an improvement in
image scoring or an independently replicated gain. The final runs were used
in earlier project analyses. The eight-frame episode grouping and the
per-run cap of eight reviews affect the measured yield; neither proves a
factory-optimal physical time separation. A new production stream should set
spacing using frame rate, defect duration, review capacity, and independently
audited outcomes.

A feasibility probe before the full sweep showed that 32-frame greedy spacing
selects only seven photos in the shortest 617-frame run, so the equal-eight
comparison stops at 16 frames. The exact [protocol](REVIEW_SPACING_PROTOCOL.md),
[code](review_spacing_sensitivity.py), and per-run outputs
([development](results/review_spacing_development.json),
[final](results/review_spacing_final.json)) are saved in this repository.
