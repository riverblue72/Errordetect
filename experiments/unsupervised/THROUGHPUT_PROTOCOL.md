# RTX 3090 recurring-inference benchmark

## Question

Measure the current, unmodified TSFabrics DINOv2-S/14 + frozen patch-bank
scoring path from compressed image bytes through image scores and patch maps.
The company meeting described a past line-scan case requiring roughly 100
images/s, but did not set a verified target for this project. This benchmark
reports only what the current 3090 server and 448×364 input achieve; it does
not establish performance on a factory PC, RTX 3060, full-resolution camera
stream, or disconnected installation.

## Fixed setup

- Dataset: TSFabrics ZIP, target run `T1_S148_I108_2`; labels and masks are
  never read by the measurement loop.
- Model: unchanged `core.DINOFeatures` frozen DINOv2-S/14, current RGB resize
  and normalization, and unchanged `core.PatchScorer` with the selected frozen
  source bank built from `T1_S174_I111_1` startup frames.
- Warm the model and scorer with 16 frames before timing. Exclude ZIP index
  construction, model load, reference construction, and warmup from recurring
  inference timing. Report those exclusions.
- Streaming latency: 128 distinct frames `[2240,2368)` with batch size 1;
  synchronize the GPU after each photo. Report median and 95th percentile of
  decode, DINOv2 encoding, scoring, and total wall time.
- Batched throughput: three successive, disjoint 512-frame blocks
  `[704,1216)`, `[1216,1728)`, `[1728,2240)` with batch size 8. Read each
  image directly from the ZIP, encode, and score before reading the next batch.
  Synchronize the GPU at phase boundaries. Report each block's frames/s and
  median frames/s; preserve all three measurements.
- Compute one image score and patch map per input. Do not silently replace the
  scorer with feature-cache reads. Record hardware, software versions, bank
  size, peak GPU memory, and the exact frame ranges.

This is a single-server throughput measurement under one data source and
batching scheme. It is not an operating-point or detector-accuracy result.
If a measured speed is above the historical 100 images/s anecdote, describe
it only as **3090 throughput at the resized resolution**, without claiming
that the factory requirement has been met.
