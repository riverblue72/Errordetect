# Source-reference selection: extended audit protocol

## Question

The landing page shows one normal changed run where a label-free selected
source reference produces far fewer false alerts than an equal-capacity bank
sampled from every startup frame. Does that direction hold across the other
recorded production runs, or is it a favorable example?

## Locked comparison

- Source run: `T1_S174_I111_1`. Use frames `[0,512)` for both references.
  Select the low-novelty 60% within four appearance groups without labels,
  exactly as in `run_tsfabrics.py`. The control samples from all 512 frames.
  Fix both patch banks at the selected bank's vector count.
- Fit each bank's **own** 99.5th-percentile alert threshold on the same,
  disjoint source frames `[512,2048)`. Neither method sees target-run labels
  or target-run images when its bank or threshold is built.
- Development: the same five scenarios as the limited-review benchmark.
  Extended evaluation: every other 16 scenario in the TSFabrics archive.
  For each, ignore `[0,256)` as the target startup and `[256,320)` as a
  temporal gap; score `[320,min(4096,length))`. Keep the existing prefix cap.
- DINOv2-S/14 features, patch nearest-neighbor score, input processing, and
  review queue are identical between methods. The eight review requests are
  highest score with at least 16 frames between them. Published labels enter
  only after both score arrays and queues are fixed.
- The primary comparison is per-run frame average precision on defect runs.
  Secondary measures are macro AP across those runs, unique new defect
  episodes found in eight reviews, and normal/defect frame flags at each
  source-calibrated threshold. Report every run and source-continuation flags.
  Both AP and eight-review coverage isolate the reference choice at equal bank
  capacity. Thresholded counts include the effect of separately calibrating
  each bank and must be interpreted accordingly.

This is an **extended audit of an existing method**, not a new untouched
holdout: the source selection rule and some final scenarios have appeared in
earlier project analyses. Do not change the active detector or the site claim
until every scenario has been evaluated. If improvements vary by run, show
that heterogeneity alongside any aggregate rather than presenting the one
normal changed run as typical.

## Reproduce

On the authorized RTX 3090 server, from the repository root, run
`PYTHON="$PWD/.venv-dino-audit/bin/python" bash experiments/unsupervised/run_reference_selection_audit.sh`
when using the repository-local audit virtual environment. Without `PYTHON`,
the script uses `python3`. It uses repository-local model/temp caches and
checks NumPy, Pillow, PyTorch 2+, and CUDA before scoring. DINOv2's cached
attention implementation calls `scaled_dot_product_attention`, which is
absent from the server's system PyTorch 1.13.1; the pinned PyTorch 2.2.2 CUDA
11.8 environment is isolated under `.venv-dino-audit`. Scikit-learn is not
needed.
It writes `_verified` outputs so an older partial checkpoint is not accepted
without the expanded per-run reproduction checks.
The three commands it runs are:

```sh
python3 experiments/unsupervised/reference_selection_audit.py \
  --zip experiments/unsupervised/data/TSfabrics.zip \
  --cache experiments/unsupervised/features \
  --baseline experiments/unsupervised/results/unlabeled_review_development.json \
  --phase development \
  --out experiments/unsupervised/results/reference_selection_development_verified.json

python3 experiments/unsupervised/reference_selection_audit.py \
  --zip experiments/unsupervised/data/TSfabrics.zip \
  --cache experiments/unsupervised/features \
  --baseline experiments/unsupervised/results/unlabeled_review_final.json \
  --phase final \
  --out experiments/unsupervised/results/reference_selection_final_verified.json

python3 experiments/unsupervised/summarize_reference_selection.py \
  --development experiments/unsupervised/results/reference_selection_development_verified.json \
  --final experiments/unsupervised/results/reference_selection_final_verified.json \
  --out experiments/unsupervised/REFERENCE_SELECTION_RESULTS_VERIFIED.md
```

The script checks that its selected-reference AP, eight-review episode yield,
thresholded flag count, and score quantiles agree with the previously recorded
benchmark before accepting a newly scored run. A fresh encode under PyTorch
2.2.2 is permitted at most one extra or missing threshold flag, and only when
a score lies within 0.0005 of the fixed limit. That difference is recorded per
run and reported; AP, episode yield, and score quantiles retain their separate
reproduction checks. The report command rejects
incomplete checkpoints and lists every run, both source-continuation flag counts,
macro frame AP, eight-review episode coverage, per-run false alerts, and paired
run-bootstrap intervals for AP and coverage differences. It
does not promote a reference or select a threshold from final labels.
