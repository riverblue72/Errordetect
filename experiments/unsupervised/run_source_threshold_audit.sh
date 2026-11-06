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
  "$python" experiments/unsupervised/source_threshold_audit.py \
    --zip experiments/unsupervised/data/TSfabrics.zip \
    --cache experiments/unsupervised/features \
    --phase "$phase" \
    --out "experiments/unsupervised/results/source_threshold_${phase}.json"
done
