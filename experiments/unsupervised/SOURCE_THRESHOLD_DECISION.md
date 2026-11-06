# Source-calibrated alert limit: development decision

This decision was recorded after the five development runs completed and
before inspecting the 16-run follow-up audit. It is a **candidate for
evaluation**, not a deployment decision.

The selected DINOv2 bank and all image scores are fixed. Five limits are
quantiles of the same label-free source calibration frames `[512,2048)`.
Public labels in the development runs are used here to choose the **quantile
hyperparameter**. No target labels enter the source bank, source score
calibration, or run-time scoring. This distinction matters: hyperparameter
choice is retrospectively supervised, while operation within a new run is
label-free until a human review.

| Source quantile | Source continuation flags / 1,984 | Development defect frames flagged / 682 | Development normal frames flagged / 12,586 | New defect episodes flagged / 43 |
| ---: | ---: | ---: | ---: | ---: |
| 95.0% | 91 | 682 | 6,800 | 43 |
| 97.5% | 51 | 532 | 164 | 43 |
| 99.0% | 29 | 390 | 67 | 42 |
| **99.5% (current)** | **20** | **323** | **31** | **42** |
| 99.75% | 13 | 263 | 22 | 39 |

**Candidate: 97.5%.** In the development data it retained 532/682 defect
frames (78.0%) while flagging 164/12,586 normal frames (1.3%), and it
flagged at least one frame in all 43 new defect episodes. The current 99.5%
limit flagged 323/682 defect frames (47.4%), 31/12,586 normal frames (0.25%),
and 42/43 episodes. The 95% limit flagged 54.0% of normal frames and is not a
practical routine-alert candidate. We will inspect the fixed 97.5% candidate
on the separate 16-run audit without changing this choice based on those
results.

These are frame-level *review flags*, not automatic defect judgments. The
existing eight-frame review queue ranks scores and is unaffected by this
binary alert limit. Both per-run results and the source-continuation cost
must be checked before changing the site or active pipeline.
