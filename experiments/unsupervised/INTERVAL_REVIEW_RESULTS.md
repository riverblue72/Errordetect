# Intervalized review: workload and stop-safety audit

The [protocol](INTERVAL_REVIEW_PROTOCOL.md) tests the frozen source DINOv2
score and 16-frame-spaced eight-photo queue on consecutive recorded-photo
blocks. It asks whether the existing early-stop rule remains informative when
a run is summarized in several shorter periods. The block size is **512
frames**, with a final remainder shorter than 256 merged backward. It is a
sensitivity analysis, not a factory shift length.

| Phase | Runs | Blocks (with defects) | New defect episodes | Fixed 8: requests, episodes found | 2 first: requests, episodes found | 1 first: requests, episodes found |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Development | 5 | 26 (18) | 43 | 208, 43/43 | 160, 43/43 | 152, 43/43 |
| Final | 16 | 53 (14) | 90 | 424, 59/90 | 190, 59/90 | 151, 59/90 |

The three-first control made 168 development and 229 final requests and found
the same 43/43 and 59/90 episodes, respectively. Every one of the 18
development and 14 final defect-bearing blocks had a confirmed defect in its
**first** ranked review photo. The two-first rule stopped in eight development
and 39 final blocks, none of which contained a confirmed defect photo anywhere
in that block. No stopped queue hid a defect among its unrequested photos.
These observations do **not** test the difficult case of a defect-bearing
block whose first one or two photos appear normal. They cannot establish that
one-first or two-first stopping is safe in field operation or that two is an
optimal pilot size. Retain the current two-first site behavior and the manual
route to more checks; audit some stopped periods independently during any
prospective trial.

The existing whole-run two-first comparison made **56 requests** and found
**26/90** new episodes across the same 16 runs. Splitting the runs into 53
blocks found **59/90** at **190 requests** with two-first: more distinct
episodes, but 3.39 times as many review requests. The improvement is mainly a
larger *total* review budget distributed over time, not a detector accuracy
gain or a matched-budget method comparison. The old 56-request outcome also
comes from an earlier scoring pass; this block study pairs methods on the
newly recomputed scores. A next comparison should hold the total review
budget fixed while varying block length or request allocation.

The whole-run queue matched the saved queue exactly on all five development
runs and 13 of 16 final runs. Two final differences retained the same eight
photos but changed their order; the third changed only the last photo. In one
normal-only run, the order of the first two photos was swapped. These
differences are recorded per run in the JSON. Repeating the original full-run
feature-extraction path reproduced the eighth-photo difference, so the block
result is presented as a new paired score calculation, not a bitwise replay
of the old result. All 16 final runs remain included.

The saved [development](results/interval_review_development.json) and
[final](results/interval_review_final.json) files list every block, queue,
requested photo, discovered episode ID, and whole-run reproduction check.
The code additionally checks that each run's new-episode count matches the
earlier benchmark. A local post-run audit confirmed that the blocks cover
every evaluated frame without gaps, each queue has eight photos, and every
pair is separated by at least 16 frames.
