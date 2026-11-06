#!/usr/bin/env bash
set -euo pipefail

phase="${1:?pass development or final}"
if [[ "$phase" != development && "$phase" != final ]]; then
  echo "invalid phase: $phase" >&2
  exit 2
fi

cd "$(dirname "$0")/../.."
export TORCH_HOME="$PWD/.cache/torch"
export XDG_CACHE_HOME="$PWD/.cache/xdg"
export HF_HOME="$PWD/.cache/hf"
export TMPDIR="$PWD/.cache/tmp"
export PYTHONDONTWRITEBYTECODE=1
mkdir -p "$TMPDIR"

python="${PYTHON:-python3}"
"$python" -c 'import torch; assert torch.cuda.is_available(), "CUDA GPU required"'
"$python" experiments/unsupervised/reviewed_threshold_audit.py \
  --zip experiments/unsupervised/data/TSfabrics.zip \
  --cache experiments/unsupervised/features \
  --baseline "experiments/unsupervised/results/feedback_validation_${phase}.json" \
  --out "experiments/unsupervised/results/reviewed_threshold_${phase}.json"
