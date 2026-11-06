# Additional within-run change controls

The [fixed stability protocol](CHANGE_STABILITY_PROTOCOL.md) tested two more
4,096-frame TSFabrics recordings with no published defect labels. Each
recording was calibrated independently on its first 2,048 frames, then scored
on frames 2,112–4,095. A confirmed alert requires three consecutive
over-limit windows. This is a diagnostic reset, not the active source detector
running across an unannounced production switch.

| Recording | Current limit: windows over / longest streak / first alert | 0.75× trial: windows over / longest streak / first alert |
| --- | --- | --- |
| `T1_S177_I108_1` | 1 / 1 / none | 3 / 2 / none |
| `T2_S466_I39_1` | 29 / 6 / frame 3,264 | 59 / 59 / frame 2,304 |

Each continuation has 1,984 frames and 59 score windows. Both have zero
published defect and ambiguous labels. The second recording produced a
confirmed within-run change alert with either limit; lowering the limit moved
that alert earlier and increased the number of over-limit windows. A
defect-free label does not establish that its appearance or process stayed
constant, so this is an **unexplained within-run alert**, not a verified false
alarm. The two recordings do not justify promoting the lower limit. The active
limit remains unchanged.

[Representative control frames](figures/change_control_contact_sheet.jpg) show
the calibration segment of `T2_S466_I39_1`, its continuation, and the frame
where the current limit first confirmed the alert. The alert at window end
3,264 includes zero-based image index 3,263, which the sheet marks. These sparse
images provide a visual audit, but cannot identify whether an unrecorded
process adjustment or ordinary appearance variation caused the signal.
The sheet is reproducible with
[`inspect_change_control.py`](inspect_change_control.py).

The original source continuation's 16,518 later frames had no confirmed alert
under the current limit. That single source result therefore does not describe
within-run stability across other settings. The new control is also post-hoc;
an annotated within-run change benchmark is still needed to distinguish useful
shift alerts from nuisance alerts.

[Aggregate result and window scores](results/change_stability_controls.json)
