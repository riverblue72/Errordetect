"use strict";

// Shared, deterministic reference-model math for the explorer and labeling worker.
const W = 256, H = 640, B = 8, GRID_W = W / B, GRID_H = H / B;

function percentile(values, p) {
  const sorted = Array.from(values).sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lo = Math.floor(index), hi = Math.ceil(index);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo);
}

function morphPass(input, horizontal, maximum) {
  const output = new Float32Array(input.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let value = maximum ? -Infinity : Infinity;
      for (let offset = -3; offset <= 3; offset++) {
        const xx = horizontal ? Math.max(0, Math.min(W - 1, x + offset)) : x;
        const yy = horizontal ? y : Math.max(0, Math.min(H - 1, y + offset));
        const v = input[yy * W + xx];
        value = maximum ? Math.max(value, v) : Math.min(value, v);
      }
      output[y * W + x] = value;
    }
  }
  return output;
}

function makeFeatures(raw) {
  const rawSorted = Float32Array.from(raw).sort();
  const median = (rawSorted[rawSorted.length / 2 - 1] + rawSorted[rawSorted.length / 2]) / 2;
  let meanRaw = 0;
  for (const v of raw) meanRaw += v;
  meanRaw /= raw.length;
  let variance = 0;
  for (const v of raw) variance += (v - meanRaw) ** 2;
  const spread = Math.sqrt(variance / raw.length);
  const gray = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) gray[i] = Math.max(-4, Math.min(4, (raw[i] - median) / Math.max(spread, .06)));

  const dilated = morphPass(morphPass(raw, true, true), false, true);
  const closed = morphPass(morphPass(dilated, true, false), false, false);
  const dark = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) dark[i] = Math.max(0, closed[i] - raw[i]);

  const features = new Float32Array(GRID_W * GRID_H * 8);
  for (let by = 0; by < GRID_H; by++) {
    for (let bx = 0; bx < GRID_W; bx++) {
      const intensity = [], gaps = [];
      let sum = 0, sumSq = 0, darkSum = 0, gxSum = 0, gySum = 0;
      for (let dy = 0; dy < B; dy++) {
        const y = by * B + dy;
        for (let dx = 0; dx < B; dx++) {
          const x = bx * B + dx, i = y * W + x, v = gray[i];
          intensity.push(v); gaps.push(dark[i]);
          sum += v; sumSq += v * v; darkSum += dark[i];
          gxSum += x ? Math.abs(v - gray[i - 1]) : 0;
          gySum += y ? Math.abs(v - gray[i - W]) : 0;
        }
      }
      intensity.sort((a, b) => a - b);
      gaps.sort((a, b) => a - b);
      const quantile = (arr, p) => {
        const index = 63 * p, lo = Math.floor(index), hi = Math.ceil(index);
        return arr[lo] + (arr[hi] - arr[lo]) * (index - lo);
      };
      const mean = sum / 64, at = (by * GRID_W + bx) * 8;
      features[at] = mean;
      features[at + 1] = Math.sqrt(Math.max(0, sumSq / 64 - mean * mean));
      features[at + 2] = quantile(intensity, .10);
      features[at + 3] = quantile(intensity, .90);
      features[at + 4] = darkSum / 64;
      features[at + 5] = quantile(gaps, .95);
      features[at + 6] = gxSum / 64;
      features[at + 7] = gySum / 64;
    }
  }
  return features;
}

function nearestScores(features, model) {
  const scores = new Float32Array(GRID_W * GRID_H);
  const q = new Float32Array(8);
  for (let patch = 0; patch < scores.length; patch++) {
    const at = patch * 8;
    for (let k = 0; k < 8; k++) q[k] = (features[at + k] - model.center[k]) / model.scale[k];
    let best = Infinity;
    for (let row = 0; row < model.bank_rows; row++) {
      const bankAt = row * 8;
      let d = 0;
      for (let k = 0; k < 8; k++) {
        const delta = q[k] - model.bank[bankAt + k];
        d += delta * delta;
      }
      if (d < best) best = d;
    }
    scores[patch] = Math.sqrt(best);
  }
  return scores;
}

