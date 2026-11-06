# Confirmed-defect examples for later review ranking

## Question and fixed comparison

The reviewed-normal patch update had reduced later defect detection. We kept
the frozen DINOv2 detector and tested a narrower use of field judgment:
could a few **confirmed defect** photos improve which photos are requested for
review in a later interval? The time order, prototype rule, equal eight-photo
budget, 16-frame spacing, and 100-seed capacity control were written in
[`POSITIVE_FEEDBACK_PROTOCOL.md`](POSITIVE_FEEDBACK_PROTOCOL.md) before either
new outcome was measured. The committed pre-run implementation was `60e74e9`.

The first eight reviews came from frames `[320,640)`. Public labels for only
those requested photos stood in for operator decisions. The later evaluation
used frames `[704,min(4096,run_length))`; the 64-frame gap was unused. The
prototype used eight highest frozen-source-distance patches from each early
photo confirmed defective, without a defect mask. The new queue retained the
first six frozen-score requests and chose two more by positive-patch cosine
similarity. The detector, alert threshold, and anomaly map were unchanged.

## Results

| Phase | Runs with an early confirmed defect | Later new episodes in those runs | Frozen eight | Six frozen + two positive | Six frozen + two random, mean over 100 seeds |
| --- | ---: | ---: | ---: | ---: | ---: |
| Development | 2/5 | 32 | 15 | 15 | 11.13 |
| Final | 3/15 evaluable | 65 | 13 | 13 | 11.45 |

One of the sixteen final runs was excluded by the prior fixed minimum of 128
later frames. Twelve of the fifteen evaluable final runs had no confirmed
defect among their first eight reviews, so the positive-aware and control
queues fell back to the frozen baseline. Across **all fifteen** evaluable final
runs, the frozen and positive-aware queues each found **13/65** new episodes.
The 100-seed random means above sum the per-run means only for positive-eligible
runs; they are not measurements of detector recall.

| Positive-eligible run | Early confirmed defects | Later new episodes | Frozen → positive episodes found | Frozen → positive defect photos reviewed | Shared later requests | Random-control episodes, mean (range) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Development `T1_S148_I108_2` | 3 | 22 | 8 → 8 | 8 → 8 | 6/8 | 6.03 (6–7) |
| Development `T1_S478_I118_1` | 1 | 10 | 7 → 7 | 8 → 8 | 6/8 | 5.10 (5–7) |
| Final `T1_S148_I108_1` | 6 | 60 | 8 → 8 | 8 → 8 | 6/8 | 6.45 (6–8) |
| Final `T1_S478_I118_2` | 1 | 5 | 5 → 5 | 5 → 5 | 6/8 | 5.00 (5–5) |
| Final `T2_S287_I185_1` | 3 | 0 | 0 → 0 | 1 → 1 | 6/8 | 0.00 (0–0) |

The positive rule changed two later requests in every eligible run but won
**0**, tied **5**, and lost **0** on new episodes. It also changed neither the
number of reviewed defect photos nor the fixed detector's predictions. In
three eligible runs the baseline already chose eight defect photos out of
eight; one final run found all five available new episodes. These ceilings
limit what two reranked positions could add here. The run with zero later new
episodes cannot support an episode-gain claim.

## Decision and limits

**Do not add positive-prototype reranking to the pipeline or present it as an
improvement.** It did better than allocating two positions randomly in the
measured eligible runs, but it did not beat the existing eight highest-score,
time-spaced queue. The early confirmed-defect sample is small, and a photo
label does not tell us which patch contains the defect. No conclusion about
rubber-belt performance or general review efficiency follows from this test.

The operational path remains a frozen source detector with time-spaced,
limited review and a separate change signal. Confirmed judgments are recorded
and may support later research; they are not currently shown to improve the
detector or the review queue. A future update claim needs additional runs and
prospectively collected field judgments with disjoint later defects.

## Reproduction and artifacts

The implementation is [`positive_feedback.py`](positive_feedback.py). It
recomputed each positive-eligible run's original review queue and later frozen
baseline and aborted if either disagreed with the earlier validation. All
five positive-eligible runs passed those checks. Detailed photo indices and
the 100-seed control summaries are stored in
[`results/positive_feedback_development.json`](results/positive_feedback_development.json)
and [`results/positive_feedback_final.json`](results/positive_feedback_final.json).

Run with the existing TSFabrics archive and DINOv2 feature cache:

```bash
python experiments/unsupervised/positive_feedback.py \
  --zip experiments/unsupervised/data/TSfabrics.zip \
  --cache experiments/unsupervised/features \
  --prior experiments/unsupervised/results/feedback_validation_final.json \
  --phase final \
  --out experiments/unsupervised/results/positive_feedback_final.json
```
