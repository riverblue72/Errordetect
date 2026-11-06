# Current inference throughput on RTX 3090

The frozen DINOv2-S/14 plus 7,392-vector source patch bank was measured using
the unchanged image preprocessing and `PatchScorer` code. Each photo was read
and decoded from the TSFabrics ZIP, resized to **448×364 RGB**, encoded, and
given one frame score and one 26×32 patch map. The protocol and implementation
were committed as `13bad69` before timing. No feature cache or labels entered
the measured path.

| Execution | Distinct photos | Decode + encode + score | Result |
| --- | ---: | --- | ---: |
| Batch 8, block 1 | 512 | 4.849 s | 105.59 photos/s |
| Batch 8, block 2 | 512 | 4.860 s | 105.35 photos/s |
| Batch 8, block 3 | 512 | 4.854 s | 105.48 photos/s |
| **Batch 8, median of blocks** | **1,536 total** | — | **105.48 photos/s** |
| Batch 1, separate stream | 128 | 13.95 ms median/photo | 71.24 photos/s over the stream |

The batch-1 95th percentile was **14.52 ms/photo**. Median phase times were
**1.36 ms** for ZIP read and image decode, **11.59 ms** for preprocessing and
DINOv2 encoding, and **1.00 ms** for patch-bank scoring and map creation.
Across each batch-8 block, encoding took about 3.76 of 4.85 seconds; this is
the main measured cost. Peak CUDA memory *allocated by this process* after
warmup was about **297 MiB**; it is not total machine GPU usage.

The measurements used an **NVIDIA GeForce RTX 3090**, PyTorch 2.2.2+cu118,
and CUDA runtime 11.8. They exclude ZIP index construction, model loading,
reference selection/building, 16-photo warmup, camera capture, the separate
change detector, UI, database work, and export. The three throughput blocks
are disjoint but come from **one** textile run and one server; they do not
sample independent factory conditions. GPU synchronization was performed at
each measured phase boundary.

## Interpretation

The current code exceeded **100 photos/s only with batch size 8 on this RTX
3090 at the resized resolution**. Processing photos singly measured about 71
photos/s and 14 ms median latency. The meeting's roughly 100 photos/s figure
was an example from another line-scan project, not an agreed acceptance
criterion for this prototype. This result does **not** verify a factory PC,
RTX 3060, approximately 1,000×1,000 original image stream, camera transfer,
network restrictions, or continuous production operation. It is therefore
appropriate as a measured prototype throughput, not a production-speed claim.

The source code is [`benchmark_throughput.py`](benchmark_throughput.py), the
locked design is [`THROUGHPUT_PROTOCOL.md`](THROUGHPUT_PROTOCOL.md), and the
full machine-readable record is
[`results/throughput_rtx3090.json`](results/throughput_rtx3090.json).

```bash
python experiments/unsupervised/benchmark_throughput.py \
  --zip experiments/unsupervised/data/TSfabrics.zip \
  --cache experiments/unsupervised/features \
  --out experiments/unsupervised/results/throughput_rtx3090.json
```
