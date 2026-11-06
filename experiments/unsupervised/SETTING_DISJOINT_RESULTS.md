# Production-setting split check

The locked final comparison uses different recordings from development, but two final defect recordings share the same fabric texture, speed, and illumination settings as development recordings. The [TSFabrics authors' naming guide](https://github.com/yoyoulllll5/TSFabric#readme) defines a run as `T[texture]_S[speed]_I[illumination]_index`; a different final index is a different recording, not necessarily a different production setting.

| Shared setting | Development recording | Final recording |
| --- | --- | --- |
| `T1_S148_I108` | `T1_S148_I108_2` | `T1_S148_I108_1` |
| `T1_S478_I118` | `T1_S478_I118_1` | `T1_S478_I118_2` |

We removed those two final recordings and reaggregated the **saved predictions and review queues**, without fitting or changing any model. This leaves 14 final recordings, including two defect recordings and 15 new defect episodes. The subset is a sensitivity check on previously examined data, not a new independent test.

| Measure | All 16 final recordings | 14 recordings with different settings |
| --- | ---: | ---: |
| Handcrafted vs frozen DINOv2 + selected source, macro frame AP | 66.4% → 85.4% (4 defect runs) | 54.8% → 84.1% (2 defect runs) |
| All-startup vs selected source reference, macro frame AP | 70.3% → 85.4% | 89.0% → 84.1% |
| Normal frames flagged, all-startup → selected reference | 19,153 → 1,449 / 26,088 | 16,620 → 1,442 / 21,000 |
| Defect frames flagged, all-startup → selected reference | 851 → 313 / 883 | 116 → 88 / 145 |
| New episodes found, top 8 → 16-frame-spaced 8 | 15 → 26 / 90 | 7 → 12 / 15 |

The combined DINOv2 + selected-source method retains a higher mean AP than the handcrafted baseline in this subset, but wins only one of its two defect recordings. Reference selection still reduces normal-frame flags, while also reducing defect-frame flags. Its AP advantage across all four defect recordings does **not** hold in the different-setting subset: it is lower on both remaining defect recordings. Time-spaced review retains a higher episode yield at the same eight-photo budget.

The two-recording defect subset is too small for a stable generalization claim. A future validation should reserve entire `T_S_I` settings before model selection and, ultimately, test new partner camera and material conditions. The original 16-recording results remain the reported locked comparison; this check states how sensitive those results are to the split.

Reproduce: `python experiments/unsupervised/setting_disjoint_audit.py`. Machine-readable values: `results/setting_disjoint_audit.json`.
