# Change-limit stability check across additional recordings

The 75% DINOv2 MMD alert-limit trial improved detection of known joins between
recordings, but its only long continuity control was the original source run.
This follow-up tests whether lowering the limit creates sustained alerts during
other recorded runs. It is a post-hoc stability check, not a new blind test or
an annotated within-run change benchmark. No published defect label does not
prove that a recording contains no genuine process or appearance change.

## Fixed protocol

- Controls: `T1_S177_I108_1` and `T2_S466_I39_1`. The saved final audit reports
  4,096 total frames and zero defect frames for each (3,776 frames were used
  in the earlier final evaluation). They are the two other defect-free final
  recordings with at least 4,096 total frames. Published labels select these
  recordings for the *audit*; the detector never receives them.
- Encode each run's first 4,096 frames with the same frozen DINOv2-S/14 global
  features and preprocessing as the current change experiment. A resumable
  feature cache records the encoder specification and each image's ZIP name,
  CRC, and size; reuse it only when those records match.
- Fit an independent `DriftDetector` on frames `[0,2048)` of each run, as for
  the original source. Skip `[2048,2112)`. Score the ordered continuation
  `[2112,4096)` with 128-frame windows and 32-frame steps.
- Compare each run's own calibrated limit and **0.75 × that limit**. Require three
  consecutive over-limit windows for an alert. Record thresholds, each window
  score, over-limit counts, longest streak, and first confirmed alert as an
  absolute frame number within its recording. Feature extraction resumes from
  the last flushed batch if interrupted.
- Do not change the 75% factor, run list, calibration length, windowing, or
  confirmation rule after seeing either control's scores. Report both runs.

Independent calibration is a **diagnostic reset** on each recording. The
active pipeline retains its original source reference; this test therefore
measures within-recording stability after a hypothetical accepted new
reference, not the active detector's behavior after an unannounced switch.
The active detector is expected to signal a sustained difference from its
source after a genuinely different run begins.

If the 75% limit adds any confirmed alert in either continuation, do not
promote it without an annotated explanation of that change. Call it an
unexplained within-run alert, not a verified false alarm. If it adds none,
retain its **trial** status: two additional recordings with 1,984 continuation
frames each still cannot establish a general field false-alert rate or validate
unannounced process changes.

Run `change_stability_controls.py` with the original TSFabrics archive, a
project-local feature-cache directory, and an output path. This check changes
no active site threshold.
