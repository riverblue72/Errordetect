# Visual-change representation check

The [fixed comparison](CHANGE_REPRESENTATION_PROTOCOL.md) holds the recorded
scenarios, 1,024-frame target prefixes, 1,024-frame source prelude, MMD
implementation, 128-frame windows, 32-frame step, source-only 99th-percentile
limit, and three-window confirmation rule constant. Only the image-level
representation changes: frozen DINOv2 global features versus a 32-bin square-root
grayscale intensity histogram. Neither detector uses defect or cutline labels.

| Evaluation | Frozen DINOv2 | Brightness histogram |
| --- | ---: | ---: |
| Known joins, five development runs | 4 / 5 alerted | 5 / 5 alerted |
| Known joins, sixteen extended runs | 15 / 16 alerted | 16 / 16 alerted |
| Median delay after known join, extended alerted runs | 96 frames | 128 frames |
| Later 16,518 frames of the same source recording: windows above own source-calibrated limit | 0 / 513 | 336 / 513 |
| First confirmed alert on that same recording | None | Frame 6,432 |

The histogram catches the one extended join missed by DINOv2
(`T1_S177_I108_1`, at new-run frame 128) and the one development join missed
by DINOv2 (`T1_S148_I108_2`, at new-run frame 160). Its first 1,984 later
source frames have no over-limit windows, like DINOv2; the long continuation
reveals the later activation. All 21 target joins and the full source
continuation are retained in the [machine-readable result](results/change_representation_audit.json).

**Decision.** Keep DINOv2 global features as the current visual-change signal
for the site replay. On this recorded source scenario they are substantially
more stable over time, and on alerted extended joins their median alarm is
earlier. The histogram is more sensitive to the known joins, so this result
does not establish that DINOv2 is uniformly superior or that a fused signal
would improve deployment. No threshold or detector was changed after seeing
these outcomes.

The 336 over-limit histogram windows are **within one recording**, not 336
independent false alarms. TSFabrics does not provide annotated within-scenario
process-change times; some later visual shift may be real. This audit compares
recorded-run separability and continuity, not recognition of an independently
annotated unknown process change. Wider recordings with verified stable and
changed intervals are required before estimating field alarm rates or choosing
a simpler replacement. The earlier extended runs were previously inspected by
the project, so this is a descriptive control rather than a new blind test.

For reproducibility, run `change_representation_audit.py` as specified in the
protocol. The DINOv2 source-continuation control is independently detailed in
[SOURCE_CONTINUATION_FULL_RESULTS.md](SOURCE_CONTINUATION_FULL_RESULTS.md).
