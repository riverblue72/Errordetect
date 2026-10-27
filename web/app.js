"use strict";

// Browser-only version of the small hand-crafted reference model in model.py.
// It is a demo baseline, not PatchCore and not a calibrated failure probability.
const $ = id => document.getElementById(id);
let requestId = 0;
let samples = [];
let sampleButtons = [];
let currentSample = -1;
let currentFilter = "all";
const modelPromise = fetch("./normal_reference.json").then(response => {
  if (!response.ok) throw new Error("Could not load the reference model.");
  return response.json();
}).then(model => {
  model.bank = Float32Array.from(model.bank);
  model.center = Float32Array.from(model.center);
  model.scale = Float32Array.from(model.scale);
  model.normal_scores = Float32Array.from(model.normal_scores);
  return model;
});

async function infer(blob, model) {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, W, H);
  bitmap.close();
  const rgba = ctx.getImageData(0, 0, W, H).data;
  const raw = new Float32Array(W * H);
  for (let i = 0; i < raw.length; i++) {
    const at = i * 4;
    raw[i] = Math.round(.299 * rgba[at] + .587 * rgba[at + 1] + .114 * rgba[at + 2]) / 255;
  }
  const scores = nearestScores(makeFeatures(raw), model);
  const score = percentile(scores, .995);

  const heat = document.createElement("canvas"); heat.width = GRID_W; heat.height = GRID_H;
  const hctx = heat.getContext("2d");
  const pixels = hctx.createImageData(GRID_W, GRID_H);
  for (let i = 0; i < scores.length; i++) {
    const alpha = Math.max(0, Math.min(1, (scores[i] - model.threshold * .35) / Math.max(model.threshold * .9, .01)));
    pixels.data[i * 4] = 244;
    pixels.data[i * 4 + 1] = 64;
    pixels.data[i * 4 + 2] = 54;
    pixels.data[i * 4 + 3] = Math.round(alpha * 200);
  }
  hctx.putImageData(pixels, 0, 0);
  const landscape = document.createElement("canvas");
  landscape.width = GRID_H;
  landscape.height = GRID_W;
  const lctx = landscape.getContext("2d");
  lctx.translate(GRID_H, 0);
  lctx.rotate(Math.PI / 2);
  lctx.drawImage(heat, 0, 0);
  return {
    score, threshold: model.threshold,
    heatmap: landscape.toDataURL("image/png"),
  };
}

const setStatus = (label, type = "") => { $("status").textContent = label; $("status").className = "status " + type; };
const steps = list => { $("actions").replaceChildren(...list.map(value => { const li = document.createElement("li"); li.textContent = value; return li; })); };

async function analyze(blob, sample, thisRequest) {
  try {
    const model = await modelPromise;
    await new Promise(resolve => requestAnimationFrame(resolve));
    const result = await infer(blob, model);
    if (thisRequest !== requestId) return;
    $("heatmap").src = result.heatmap;
    $("score").textContent = result.score.toFixed(2);
    const meterMax = Math.max(result.threshold * 1.5, .01);
    $("threshold").textContent = "Threshold " + result.threshold.toFixed(2);
    $("thresholdMarker").style.left = Math.min(100, result.threshold / meterMax * 100) + "%";
    $("thresholdMarker").title = "Review threshold " + result.threshold.toFixed(2);
    $("thresholdMarker").hidden = false;
    $("meterFill").style.width = Math.min(100, result.score / meterMax * 100) + "%";
    $("scoreMeter").classList.toggle("review", result.score >= result.threshold);
    $("scoreMeter").setAttribute("aria-label", `Anomaly score ${result.score.toFixed(2)}; review threshold ${result.threshold.toFixed(2)}`);
    if (result.score >= result.threshold) {
      setStatus("Review needed", "review");
      $("assessment").textContent = sample.label === "Normal"
        ? "False alarm: this photo is labeled normal."
        : "";
      steps(["Inspect the highlighted area", "Record the inspection result"]);
    } else {
      setStatus("Within range", "ok");
      $("assessment").textContent = sample.label === "Defect"
        ? "Missed defect: the score is below the review threshold."
        : "";
      steps(sample.label === "Defect"
        ? ["Inspect the labeled defect", "Record the missed detection"]
        : ["Inspect the photo", "Record the inspection result"]);
    }
  } catch {
    if (thisRequest !== requestId) return;
    setStatus("Analysis failed", "unknown");
    $("assessment").textContent = "Choose another sample or reload the page.";
    steps([]);
  }
}

function visibleIndices() {
  return samples.flatMap((sample, index) =>
    currentFilter === "all" || sample.label.toLowerCase() === currentFilter ? [index] : []);
}

function updateNavigation() {
  const visible = visibleIndices();
  const position = visible.indexOf(currentSample);
  $("samplePosition").textContent = `${String(position + 1).padStart(2, "0")} / ${String(visible.length).padStart(2, "0")}`;
  $("prevSample").disabled = position <= 0;
  $("nextSample").disabled = position < 0 || position >= visible.length - 1;
}

async function loadSample(index) {
  if (!samples[index]) return;
  const thisRequest = ++requestId;
  const sample = samples[index];
  currentSample = index;
  sampleButtons.forEach((button, i) => button.setAttribute("aria-pressed", i === index ? "true" : "false"));
  const source = $("sourceImage");
  source.onload = () => { $("imageWrap").style.aspectRatio = `${source.naturalWidth} / ${source.naturalHeight}`; };
  source.src = sample.display;
  $("imageWrap").hidden = false;
  $("sampleName").textContent = `Sample ${String(sample.id).padStart(2, "0")}`;
  $("datasetLabel").textContent = `Dataset label: ${sample.label}`;
  $("heatmap").removeAttribute("src");
  $("score").textContent = "—";
  $("meterFill").style.width = "0";
  $("thresholdMarker").hidden = true;
  $("scoreMeter").classList.remove("review");
  $("scoreMeter").setAttribute("aria-label", "Anomaly score and review threshold");
  $("assessment").textContent = "";
  steps([]);
  setStatus("Analyzing");
  updateNavigation();
  try {
    const response = await fetch(sample.model);
    if (!response.ok) throw new Error("Sample unavailable");
    const blob = await response.blob();
    if (thisRequest === requestId) await analyze(blob, sample, thisRequest);
  } catch {
    if (thisRequest !== requestId) return;
    setStatus("Sample unavailable", "unknown");
    $("assessment").textContent = "Choose another sample.";
  }
}

$("opacity").addEventListener("input", event => { $("heatmap").style.opacity = event.target.value / 100; });
$("prevSample").addEventListener("click", () => {
  const visible = visibleIndices();
  loadSample(visible[visible.indexOf(currentSample) - 1]);
});
$("nextSample").addEventListener("click", () => {
  const visible = visibleIndices();
  loadSample(visible[visible.indexOf(currentSample) + 1]);
});
document.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => {
  currentFilter = button.dataset.filter;
  document.querySelectorAll("[data-filter]").forEach(candidate =>
    candidate.setAttribute("aria-pressed", candidate === button ? "true" : "false"));
  sampleButtons.forEach((candidate, index) => {
    candidate.hidden = currentFilter !== "all" && samples[index].label.toLowerCase() !== currentFilter;
  });
  const visible = visibleIndices();
  if (!visible.includes(currentSample)) loadSample(visible[0]);
  else updateNavigation();
}));

fetch("./samples.json").then(response => {
  if (!response.ok) throw new Error("Sample catalog unavailable");
  return response.json();
}).then(catalog => {
  samples = catalog;
  sampleButtons = samples.map((sample, index) => {
    const name = `Sample ${String(sample.id).padStart(2, "0")}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sample";
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `${name}, dataset label: ${sample.label}`);
    const image = document.createElement("img");
    image.onload = () => image.classList.add("loaded");
    image.src = sample.display;
    image.alt = "";
    image.loading = "lazy";
    const meta = document.createElement("span");
    meta.className = "sample-meta";
    const label = document.createElement("span");
    label.className = "sample-name";
    label.textContent = name;
    const truth = document.createElement("span");
    truth.className = "sample-truth";
    truth.textContent = sample.label;
    meta.append(label, truth);
    button.append(image, meta);
    button.addEventListener("click", () => loadSample(index));
    $("samples").append(button);
    return button;
  });
  const selected = Number(new URLSearchParams(location.search).get("sample"));
  loadSample(Number.isInteger(selected) && selected >= 1 && selected <= samples.length ? selected - 1 : 0);
}).catch(() => {
  setStatus("Samples unavailable", "unknown");
  $("assessment").textContent = "Reload the page to try again.";
});
