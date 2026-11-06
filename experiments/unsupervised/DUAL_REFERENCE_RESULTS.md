# Dual source-reference trial: rejected at the development gate

The fixed trial in [DUAL_REFERENCE_PROTOCOL.md](DUAL_REFERENCE_PROTOCOL.md)
averaged source-limit-normalized scores from the selected and all-startup
DINOv2 banks. Both banks used the same frozen features and equal 7,392-vector
capacity; the blend had its own source-only 99.5th-percentile alert limit.
The score, limit, and eight-photo queue used no target labels. The prior
selected and all-bank AP and episode counts reproduced on every completed run.

The trial was stopped after **three of five development runs** because the
prespecified normal-alert gate had already become impossible to meet. The
first, all-normal changed run alone had 1,262 dual-bank alerts versus 22 with
the selected bank. The previously verified selected-bank audit has **31**
normal alerts across all five development runs, so the full gate allowed at
most **62** dual-bank alerts. The remaining two development runs and
all 16 final runs were **not evaluated** for this candidate.

| Completed development run | Defect frames | Selected AP → dual AP | Selected → dual normal alerts | Selected → dual episodes in 8 checks |
| --- | ---: | ---: | ---: | ---: |
| `T1_S164_I36_1` | 0 | n/a | 22 → **1,262** / 1,487 normal | 0 → 0 |
| `T1_S148_I108_2` | 131 | 78.7% → 74.1% | 9 → 27 | 8 → 7 |
| `T1_S478_I118_1` | 226 | 95.1% → 98.1% | 0 → 690 | 7 → 7 |

Across these **three completed runs only**, selected → dual normal alerts
were 31 → 1,979. Across the two defect-bearing runs, macro frame AP was
86.9% → 86.1%, and eight-review episode yield was 15 → 14. Dual-bank
defect-frame alerts rose 153 → 309, but this came with a 64-fold increase in
normal-frame alerts. These partial figures are diagnostic, not a five-run
development result or a final evaluation.

**Decision:** retain the selected single-bank scorer. A simple average of
source-normalized all-startup and selected scores does not preserve the
selected bank's stability under a changed normal appearance. No weight,
threshold, or other fusion rule was tuned after this failure. A dual-bank
deployment would also double reference scoring work; there is no reason to
measure its throughput until a better predefined rule passes the development
gate.

The checkpoint with the three completed runs is
[`results/dual_reference_development.json`](results/dual_reference_development.json).
Run `dual_reference_trial.py --phase development` with the existing archive,
feature cache, and `reference_selection_development_verified.json` to
reproduce it. The experiment was fixed in commit `47b96c1`; commit `de37bcd`
only corrected summary serialization when the first completed run contained
no defects.
