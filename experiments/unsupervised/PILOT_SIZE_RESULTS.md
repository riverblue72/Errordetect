# One-photo review start: sensitivity result

The [comparison rule](PILOT_SIZE_PROTOCOL.md) and [audit code](pilot_size_sensitivity.py)
were committed before the one-photo outcomes were inspected. The audit reuses
the frozen DINOv2, 16-frame-spaced eight-photo queues from the
[sequential-review experiment](SEQUENTIAL_REVIEW_PROTOCOL.md). Only a requested
first photo's published label controls a stop; labels on the rest of the queue
are read afterward for the retrospective safety audit. No model, score, queue,
or threshold was refit.

| Phase | Runs (with new defects) | Fixed eight: requests, episodes | Two first: requests, episodes | One first: requests, episodes | Runs stopped after one |
| --- | ---: | ---: | ---: | ---: | ---: |
| Development | 5 (3) | 40, 20/43 | 28, 20/43 | 26, 20/43 | 2 |
| Final | 16 (4) | 128, 26/90 | 56, 26/90 | 44, 26/90 | 12 |

In all seven defect-bearing runs across both phases, the first queued photo
was already a confirmed defect. All fourteen runs stopped by the one-photo
rule had no eligible new defect episode in the full evaluated run, and none
hid a defect photo in the remaining seven-photo queue. Thus the one-photo
rule saved twelve more requests than two-first on the final runs, but its stop
decision was tested only on runs without new defects. The two-first rule was
also not challenged by a defect-bearing run that stopped after two normals.
Neither rule certifies a stopped interval as defect-free.

The prespecified adoption gate required at least one defect-bearing run that
stopped after a normal first photo without hiding a defect in its queue. That
condition was not met. **Keep the site's two-first rule** and do not present
two as an empirically optimal pilot size or as proven safer than one. For a
field trial, retain the manual `Review six more` route and sample some stopped
intervals for independent audit; measure missed episodes and review burden
before changing the default pilot size.

The final public runs were examined in earlier method studies, so the result
is a sensitivity check of a fixed queue, not a blind validation. Complete
per-run outputs: [development](results/pilot_size_development.json) and
[final](results/pilot_size_final.json).
