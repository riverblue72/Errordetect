# Review feedback under a fixed batch budget

The [protocol](ADAPTIVE_BUDGET_PROTOCOL.md) reuses frozen DINOv2 whole-run
queues and 512-frame block queues. A completed batch has at most eight
review requests per recorded run in total: **40** requests over five
development runs and **128** over sixteen final runs. Published TSFabrics
labels replay decisions **only on requested photos** before routing; all
labels are opened afterward for the episode audit. The detector, scores,
threshold, and reference never change.

| Phase | Method | Requests | Normal / defect reviews | New episodes found | Macro coverage on defect runs |
| --- | --- | ---: | ---: | ---: | ---: |
| Development, 5 runs | Fixed 8 per run | 40 | 16 / 24 | 20/43 | 53.2% |
| Development | 2 first, then stop or 8 | 28 | 4 / 24 | 20/43 | 53.2% |
| Development | First feedback allocator + random audit | 40 | 11 / 29 | 26/43 | 64.8% |
| Development | **Baseline-reserving allocator + random audit** | **40** | **8 / 32** | **28/43** | **72.0%** |
| Final, 16 runs | Fixed 8 per run | 128 | 101 / 27 | 26/90 | 71.1% |
| Final | 2 first, then stop or 8 | 56 | 29 / 27 | 26/90 | 71.1% |
| Final | First feedback allocator + random audit | 128 | 77 / 51 | 50/90 | 79.8% |
| Final | **Baseline-reserving allocator + random audit** | **128** | **77 / 51** | **50/90** | **79.8%** |

The first allocator spent remaining requests across active runs without
protecting the original eight photos. It found more episodes overall, but on
two development runs it missed an episode that fixed eight had found, even
where its total count for that run increased. It failed the prespecified
no-displaced-episode adoption condition.

The follow-up allocator was designed **after the first allocator's development
and final results were read**. For a run with a defect or uncertain result in
the initial two requests, it reserves the original eight-photo queue before
using remaining batch capacity for time-spread extra photos. Quiet runs get
one seeded-random audit photo. In this public sample, no audit photo
activated a quiet run and the shared budget was fully spent. Every baseline
episode ID remained in the follow-up result on every development and final
run. This is a **post-hoc exploratory comparison**, not independent
confirmation of the revised method.

### Where the additional discoveries came from

| Defect-bearing run | Fixed 8 found | Baseline-reserving found | Review requests |
| --- | ---: | ---: | ---: |
| Development `T1_S148_I108_2` | 8 | 12 | 8 → 12 |
| Development `T1_S478_I118_1` | 7 | 10 | 8 → 11 |
| Development `T1_S555_I117_1` | 5 | 6 | 8 → 11 |
| Final `T1_S148_I108_1` | 8 | 32 | 8 → 34 |
| Final `T1_S174_I108_1` | 8 | 8 | 8 → 8 |
| Final `T1_S478_I118_2` | 6 | 6 | 8 → 34 |
| Final `T2_S287_I185_1` | 4 | 4 | 8 → 16 |

The entire final gain of **24 episodes** arose in one long defect-bearing
run. Extra reviews in the other three defect runs did not find another new
episode. A better future allocator should limit low-yield extra requests,
but its rule needs to be chosen on separate data rather than tuned to this
observed run.

### Interpretation for the pipeline and demo

This is a measured gain in **distinct issues surfaced for human review at a
fixed total review budget**. It is not higher image-classification recall,
improved anomaly scores, or a model update from verified labels. The batch
must be complete before the allocation is planned; it is suitable for a
periodic review summary, not an immediate line-stop decision. The first
two and the one random audit were normal in every normal-only final run, so
the study does not measure the risk of a defect-bearing run being stopped.
One random audit cannot certify a quiet run. The public labels stand in for
operator decisions, which may differ in real use.

The site may show the result as an **exploratory feedback-allocation scene**:
start with the same 128 review tokens, protect eight checks for runs with an
early confirmed issue, give quiet runs one audit check, then move the
remaining tokens to time-separated photos in active runs. Show `26 → 50 / 90`
alongside `128 requests in both`, with a visible note that `+24` came from
one final run. Avoid describing this as detector retraining or validated
factory performance. The [development](results/adaptive_budget_development.json)
and [final](results/adaptive_budget_final.json) files contain every requested
frame, result count, and discovered episode ID.
