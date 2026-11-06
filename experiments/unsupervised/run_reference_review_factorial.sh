#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."
export TORCH_HOME="$PWD/.cache/torch"
export XDG_CACHE_HOME="$PWD/.cache/xdg"
export HF_HOME="$PWD/.cache/hf"
export TMPDIR="$PWD/.cache/tmp"
export PYTHONDONTWRITEBYTECODE=1
mkdir -p "$TMPDIR"

python="${PYTHON:-python3}"
"$python" -c 'import torch; assert torch.cuda.is_available(), "CUDA GPU required"'
for phase in development final; do
  "$python" experiments/unsupervised/reference_review_factorial.py \
    --zip experiments/unsupervised/data/TSfabrics.zip \
    --cache experiments/unsupervised/features \
    --reference "experiments/unsupervised/results/reference_selection_${phase}_verified.json" \
    --ranking "experiments/unsupervised/results/unlabeled_review_${phase}.json" \
    --phase "$phase" \
    --out "experiments/unsupervised/results/reference_review_factorial_${phase}.json"
done
