# Run-boundary illustration

The twelve JPEGs are real TSFabrics frames from three separate production
scenarios. `source-4095.jpg` and `source-4096.jpg` are the last two
frames of the reference continuation shown in the landing-page chart.
`source-3136.jpg` is the final reference frame before the recorded replay's
experimental splice. All three belong to `T1_S174_I111_1`.
`target-001.jpg`, `target-064.jpg`, `target-128.jpg`, and `target-192.jpg` are
time-ordered frames from `T1_S164_I36_1`, the changed run in the landing chart.
`demo-001.jpg`, `demo-032.jpg`, `demo-064.jpg`, `demo-096.jpg`, and
`demo-192.jpg` follow `T1_S478_I118_2`, the changed run in the recorded
replay. Frame 32 is labeled defective; the others are normal. Its first three
post-boundary MMD windows end at frames 32, 64, and 96, exceed the alert limit,
and confirm an alert at 96. The window ending at frame 192 contains only
normal target frames 65–192 and still exceeds the limit (0.7695 versus
0.0639). The feature shift is visible beyond the early defect episode.
Display numbers are one-based; `manifest.json` records zero-based archive
indices and labels for provenance. The replay does not reveal these labels in
the visual-change scene.

The divider on the site marks the **experiment's switch between separate
recordings**. It is not an observed moment when a physical production line
changed. The landing-page example confirms its alert after the first 192
target frames; the recorded replay's separate run first alerts at frame 96.
Image labels audit assets and are not used by the change detector.

Regenerate the files with
`experiments/unsupervised/export_scenario_timeline.py` on the experiment server,
then copy `experiments/unsupervised/scenario_export/` into this directory.

Source: [TSFabrics](https://doi.org/10.6084/m9.figshare.29573381), CC BY 4.0.
