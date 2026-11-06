"use strict";

const $ = id => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";
const state = { data: null, run: null, index: 0, reviewed: new Set(), revealed: false };
const number = value => Number(value).toLocaleString("en-US");

function svg(name, attributes, text) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}

function setStep(step) {
  document.querySelectorAll(".review-progress span").forEach((item, index) => {
    item.classList.toggle("is-active", index === step);
    item.classList.toggle("is-complete", index < step);
  });
}

function reset() {
  const source = state.data.runs[$("reviewRun").value];
  state.run = { ...source, query: [...source.query].sort((a, b) =>
    Number(b.flagged) - Number(a.flagged) || b.score - a.score) };
  state.index = 0;
  state.reviewed = new Set();
  state.revealed = false;
  $("reviewOverview").hidden = false;
  $("reviewWorkspace").hidden = true;
  $("reviewComparison").hidden = true;
  $("reviewBatch").hidden = true;
  document.querySelector(".review-frame-layout").hidden = false;
  $("reviewTrack").hidden = false;
  document.querySelector(".review-workspace-actions").hidden = false;
  $("reviewHeading").textContent = "Check the frame";
  setStep(0);
}

function renderTrack() {
  const track = $("reviewTrack");
  track.replaceChildren();
  state.run.query.forEach((item, index) => {
    const segment = document.createElement("button");
    segment.type = "button";
    segment.title = `Frame ${number(item.frame)}${state.reviewed.has(index) ? ` · ${item.label}` : ""}`;
    segment.setAttribute("aria-label", segment.title);
    segment.className = index === state.index ? "is-current" : state.reviewed.has(index) ?
      item.label === "Normal" ? "is-normal" : "is-defect" : "";
    segment.addEventListener("click", () => {
      state.index = index;
      renderFrame();
    });
    track.append(segment);
  });
}

function renderFrame() {
  const item = state.run.query[state.index];
  state.revealed = state.reviewed.has(state.index);
  $("reviewPhoto").src = `./review-frames/${$("reviewRun").value}-${String(item.frame).padStart(5, "0")}.jpg`;
  $("reviewPhoto").alt = `Production frame ${number(item.frame)}`;
  $("reviewFrameName").textContent = `Frame ${number(item.frame)}`;
  $("reviewScore").textContent = `Score ${item.score.toFixed(3)}`;
  $("reviewCounter").textContent = `${state.reviewed.size} / ${state.run.query.length} checked`;
  $("reviewDecisionOpen").hidden = state.revealed;
  $("reviewDecisionClosed").hidden = !state.revealed;
  if (state.revealed) {
    $("reviewLabel").textContent = item.label;
    $("reviewLabel").className = item.label.toLowerCase();
    $("reviewAction").textContent = item.ambiguous ?
      "Annotation conflict. Excluded from the candidate reference." :
      item.label === "Normal" && item.flagged ? "False alert. Added to the candidate reference." :
        item.label === "Normal" ? "Confirmed normal. No correction needed." :
        "Excluded from the normal reference.";
    $("nextReview").innerHTML = state.reviewed.size === state.run.query.length ?
      'Compare results <span aria-hidden="true">→</span>' : 'Next frame <span aria-hidden="true">→</span>';
  }
  renderTrack();
}

function showBatch() {
  const grid = $("reviewBatchGrid");
  grid.replaceChildren();
  let corrections = 0;
  let defects = 0;
  for (const item of state.run.query) {
    const corrected = item.label === "Normal" && item.flagged && !item.ambiguous;
    if (corrected) corrections++;
    if (item.label === "Defect") defects++;
    const card = document.createElement("article");
    card.className = `review-batch-card ${corrected ? "is-correction" : item.label === "Defect" ? "is-defect" : ""}`;
    const image = document.createElement("img");
    image.src = `./review-frames/${$("reviewRun").value}-${String(item.frame).padStart(5, "0")}.jpg`;
    image.alt = "";
    image.loading = "lazy";
    const text = document.createElement("div");
    const frame = document.createElement("span");
    frame.textContent = `Frame ${number(item.frame)}`;
    const outcome = document.createElement("strong");
    outcome.textContent = item.ambiguous ? "Exclude · label conflict" :
      corrected ? "Normal · correction" : item.label === "Defect" ?
        "Defect · exclude" : "Normal · no update";
    text.append(frame, outcome);
    card.append(image, text);
    grid.append(card);
  }
  $("reviewBatchCount").textContent = `${state.run.query.length} checked · ${corrections} corrections · ${defects} defects excluded`;
  $("reviewBatch").hidden = false;
  document.querySelector(".review-frame-layout").hidden = true;
  $("reviewTrack").hidden = true;
  document.querySelector(".review-workspace-actions").hidden = true;
  $("reviewHeading").textContent = "Selected frames";
  $("reviewBatch").scrollIntoView({ behavior: "smooth", block: "start" });
}

function nextFrame() {
  if (state.reviewed.size === state.run.query.length) {
    showBatch();
    return;
  }
  let index = (state.index + 1) % state.run.query.length;
  while (state.reviewed.has(index)) index = (index + 1) % state.run.query.length;
  state.index = index;
  renderFrame();
}

function metricCard(value, label, note) {
  const card = document.createElement("div");
  card.className = "review-metric";
  const title = document.createElement("span");
  title.textContent = label;
  const amount = document.createElement("strong");
  amount.textContent = value;
  const detail = document.createElement("small");
  detail.textContent = note;
  card.append(title, amount, detail);
  return card;
}

function drawDistribution(chart, current, candidate) {
  chart.replaceChildren();
  if (current.length !== candidate.length || current.some((item, i) =>
    item.frame !== candidate[i].frame || item.label !== candidate[i].label)) {
    throw new Error("Evaluation frames do not match");
  }
  const groups = ["Normal", "Defect"].filter(label => current.some(frame => frame.label === label));
  const threshold = state.data.protocol.threshold;
  const mobile = matchMedia("(max-width: 600px)").matches;
  const max = Math.max(1.2, ...current.map(frame => frame.score / threshold),
    ...candidate.map(frame => frame.score / threshold));
  const bins = 34;
  const width = mobile ? 265 : 620;
  const left = mobile ? 56 : 96;
  const top = 24;
  const rowHeight = 104;
  const bottom = top + groups.length * rowHeight;
  chart.setAttribute("viewBox", `0 0 ${mobile ? 360 : 760} ${bottom + 42}`);
  const x = value => left + width * value / max;
  const limitX = x(1);
  chart.append(svg("line", { x1: limitX, y1: 16, x2: limitX, y2: bottom + 4,
    class: "review-alert-line" }));
  chart.append(svg("text", { x: limitX + 5, y: 16, class: "review-alert-label" }, "Alert limit"));
  for (const [row, label] of groups.entries()) {
    const yBottom = top + row * rowHeight + 72;
    chart.append(svg("line", { x1: left, y1: yBottom, x2: left + width, y2: yBottom,
      class: "review-axis" }));
    chart.append(svg("text", { x: mobile ? 2 : 12, y: yBottom - 31, class: "review-row-label" }, label));
    const pairs = [["current", current], ["reviewed", candidate]];
    const distributions = pairs.map(([key, frames]) => {
      const values = frames.filter(frame => frame.label === label).map(frame => frame.score / threshold);
      const counts = Array(bins).fill(0);
      values.forEach(value => counts[Math.min(bins - 1, Math.floor(value / max * bins))]++);
      return { key, counts: counts.map(count => count / values.length) };
    });
    const peak = Math.max(...distributions.flatMap(item => item.counts), .01);
    for (const { key, counts } of distributions) {
      const points = counts.map((count, i) =>
        `${x((i + .5) / bins * max).toFixed(1)},${(yBottom - count / peak * 67).toFixed(1)}`);
      chart.append(svg("polyline", { points: points.join(" "),
        class: `review-distribution ${key}` }));
    }
    if (!mobile) chart.append(svg("text", { x: left + width + 8, y: yBottom - 1,
      class: "review-count-label" }, `${number(current.filter(item => item.label === label).length)} frames`));
  }
  for (let tick = 0; tick <= Math.floor(max * 2); tick++) {
    const value = tick / 2;
    chart.append(svg("line", { x1: x(value), y1: bottom + 4, x2: x(value),
      y2: bottom + 10, class: "review-axis" }));
    chart.append(svg("text", { x: x(value), y: bottom + 27, "text-anchor": "middle",
      class: "review-tick" }, value.toFixed(1)));
  }
  chart.setAttribute("aria-label", `Current and reviewed candidate score distributions on ${number(current.length)} later TSFabrics frames, divided by dataset label; the fixed alert limit is a score ratio of 1`);
}

function showComparison() {
  const run = state.run;
  const current = run.evaluations.current.metrics;
  const candidate = run.evaluations.reviewed.metrics;
  $("reviewWorkspace").hidden = true;
  $("reviewComparison").hidden = false;
  setStep(2);
  $("reviewSelectionCount").textContent = `${run.reviewed_verified_normal.length} corrections / ${run.query.length} checked`;
  const metrics = $("reviewMetrics");
  metrics.replaceChildren();
  metrics.append(metricCard(`${number(current.fp)} → ${number(candidate.fp)}`,
    "Normal frames flagged", `of ${number(current.tn + current.fp)} normal frames`));
  if (run.reviewed_verified_normal.length && run.evaluations.random) {
    metrics.append(metricCard(number(run.evaluations.random.metrics.fp),
      "Random review control", `${run.random_query_frames.length} checked · normal frames flagged`));
  }
  if (current.tp + current.fn) {
    metrics.append(metricCard(`${number(current.tp)} → ${number(candidate.tp)}`,
      "Defect frames flagged", `of ${number(current.tp + current.fn)} defect frames`));
    metrics.append(metricCard(`${current.auroc.toFixed(3)} → ${candidate.auroc.toFixed(3)}`,
      "Image AUROC", "Same later frames"));
  }
  drawDistribution($("reviewChart"), run.evaluations.current.frames,
    run.evaluations.reviewed.frames);
  const guard = run.defect_guard;
  $("reviewGuard").hidden = !guard;
  if (guard) {
    const guardCurrent = state.data.runs.T1_S478_I118_2.evaluations.current;
    const guardCandidate = guard.reviewed;
    $("guardMetric").textContent = `${guardCurrent.metrics.tp} → ${guardCandidate.metrics.tp} / ${guardCurrent.metrics.tp + guardCurrent.metrics.fn} defects flagged`;
    drawDistribution($("guardChart"), guardCurrent.frames, guardCandidate.frames);
  }
  $("reviewConclusion").textContent = guard && guard.reviewed.metrics.tp <
      state.data.runs.T1_S478_I118_2.evaluations.current.metrics.tp ?
    "Hold the candidate. Normal-run alerts fall, but defect detection fails on the separate run." :
    current.tp + current.fn && candidate.tp < current.tp ?
      "The candidate misses more labeled defects, so the current reference stays in use." :
      run.reviewed_verified_normal.length === 0 ?
        "No confirmed false alerts were selected. The current reference stays in use." :
        candidate.fp < current.fp ? "The candidate reduces alerts on labeled normal frames." :
          "The candidate does not improve alerts in this run. The current reference stays in use.";
  $("reviewComparison").scrollIntoView({ behavior: "smooth", block: "start" });
}

$("reviewRun").addEventListener("change", reset);
$("startReview").addEventListener("click", () => {
  $("reviewOverview").hidden = true;
  $("reviewWorkspace").hidden = false;
  setStep(1);
  renderFrame();
});
$("revealLabel").addEventListener("click", () => {
  state.reviewed.add(state.index);
  renderFrame();
});
$("nextReview").addEventListener("click", nextFrame);
$("finishReview").addEventListener("click", () => {
  state.run.query.forEach((_, index) => state.reviewed.add(index));
  $("reviewCounter").textContent = `${state.reviewed.size} / ${state.run.query.length} checked`;
  renderTrack();
  showBatch();
});
$("compareResults").addEventListener("click", showComparison);
fetch("./review-frames/results.json").then(response => {
  if (!response.ok) throw new Error("Review results unavailable");
  return response.json();
}).then(data => {
  state.data = data;
  reset();
}).catch(error => {
  $("startReview").disabled = true;
  $("reviewOverview").querySelector("p:last-child").textContent = "Recorded results are unavailable. Reload this page to try again.";
  console.error(error);
});
