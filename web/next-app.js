"use strict";

const $ = id => document.getElementById(id);
const SVG_NS = "http://www.w3.org/2000/svg";
const state = { catalog: null, intervals: null, sample: null, filter: "all", reference: "current",
  reviewLists: new Map(), caseReviews: new Map() };
const format = value => Number(value).toLocaleString("en-US");

function visibleSamples() {
  const runOrder = Object.keys(state.catalog.streams);
  return state.catalog.samples
    .filter(sample => state.filter === "all" || sample.label.toLowerCase() === state.filter)
    .sort((a, b) => runOrder.indexOf(a.scenario) - runOrder.indexOf(b.scenario) || a.frame - b.frame);
}

function verdict(label, result) {
  const flagged = result.score >= result.threshold;
  if (label === "Normal") return flagged ? ["False alarm", true] : ["No alert", false];
  return flagged ? ["Flagged", false] : ["Missed", true];
}

function svgNode(name, attributes) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function drawChange(sample) {
  const stream = state.catalog.streams[sample.scenario];
  const chart = $("changeChart");
  chart.replaceChildren();
  const values = stream.change_scores;
  const ends = stream.change_ends;
  const nextIndex = ends.findIndex(end => end > sample.frame + 1);
  const markerIndex = nextIndex < 0 ? ends.length - 1 : Math.max(0, nextIndex - 1);
  const observed = values.slice(0, markerIndex + 1);
  const minX = ends[0], maxX = Math.max(minX + 1, ends[markerIndex]);
  const maxY = Math.max(...observed, stream.change_threshold * 1.8) * 1.08;
  const x = end => 12 + 396 * (end - minX) / (maxX - minX);
  const y = value => 85 - 70 * value / maxY;
  chart.append(svgNode("line", { x1: 12, y1: y(stream.change_threshold), x2: 408,
    y2: y(stream.change_threshold), class: "change-threshold" }));
  chart.append(svgNode("polyline", {
    points: observed.map((value, index) => `${x(ends[index]).toFixed(1)},${y(value).toFixed(1)}`).join(" "),
    class: "change-trace"
  }));
  chart.append(svgNode("line", { x1: x(ends[markerIndex]), y1: 12,
    x2: x(ends[markerIndex]), y2: 88, class: "change-cursor" }));
  chart.append(svgNode("circle", { cx: x(ends[markerIndex]), cy: y(values[markerIndex]),
    r: 5, class: "change-dot" }));
  const alerted = stream.first_alarm !== null && sample.frame + 1 >= stream.first_alarm;
  $("changeState").textContent = alerted ? "Change alert" : "No alert";
  $("changeState").classList.toggle("detected", alerted);
  $("changeNote").textContent = alerted
    ? `First alert at frame ${stream.first_alarm.toLocaleString()}.`
    : "No alert by this frame.";
  chart.setAttribute("aria-label", `Visual change score through this frame in ${stream.title}; ${$("changeState").textContent.toLowerCase()}`);
}

function renderResult() {
  const sample = state.sample;
  const result = sample[state.reference];
  const flagged = result.score >= result.threshold;
  $("frameHeat").src = result.heatmap;
  $("streamScore").textContent = result.score.toFixed(2);
  $("streamStatus").textContent = flagged ? "Review needed" : "Below threshold";
  $("streamStatus").className = "status " + (flagged ? "review" : "ok");
  $("modelState").textContent = {
    handcrafted: "Eight-feature baseline",
    current: "Selected source reference · active",
    candidate: "Selected new-run reference · trial",
  }[state.reference];
  for (const method of ["handcrafted", "current", "candidate"]) {
    const badge = $(`${method}Verdict`);
    const [text, error] = verdict(sample.label, sample[method]);
    badge.textContent = text;
    badge.classList.toggle("is-error", error);
  }
  const maximum = Math.max(.72, result.threshold * 1.4);
  $("streamMeterFill").style.width = Math.min(100, result.score / maximum * 100) + "%";
  $("streamThresholdMarker").style.left = result.threshold / maximum * 100 + "%";
  $("streamMeter").classList.toggle("review", flagged);
  $("streamMeter").setAttribute("aria-label",
    `Anomaly score ${result.score.toFixed(2)}; review threshold ${result.threshold.toFixed(2)}`);
  $("streamAssessment").textContent = sample.label === "Defect" && !flagged
    ? "Missed defect in this frame."
    : sample.label === "Normal" && flagged
      ? "False alarm on a labeled normal frame." : "";
  $("streamAssessment").classList.toggle("mismatch",
    (sample.label === "Defect" && !flagged) || (sample.label === "Normal" && flagged));
  document.querySelectorAll("[data-reference]").forEach(button =>
    button.setAttribute("aria-pressed", button.dataset.reference === state.reference ? "true" : "false"));
}

function renderSamples() {
  const container = $("streamSamples");
  container.replaceChildren();
  const groups = new Map();
  for (const sample of visibleSamples()) {
    if (!groups.has(sample.scenario)) {
      const section = document.createElement("section");
      section.className = "stream-sample-group";
      const heading = document.createElement("h3");
      heading.textContent = state.catalog.streams[sample.scenario].title;
      const grid = document.createElement("div");
      grid.className = "stream-sample-grid";
      section.append(heading, grid);
      container.append(section);
      groups.set(sample.scenario, grid);
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stream-sample";
    button.setAttribute("aria-pressed", sample.id === state.sample?.id ? "true" : "false");
    button.setAttribute("aria-label",
      `Sample ${String(sample.id).padStart(2, "0")}, ${sample.label.toLowerCase()}, ${state.catalog.streams[sample.scenario].title}`);
    const image = document.createElement("img");
    image.src = sample.image;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    const info = document.createElement("span");
    info.innerHTML = `<span>SAMPLE ${String(sample.id).padStart(2, "0")}</span><small></small>`;
    info.querySelector("small").textContent = sample.label;
    button.append(image, info);
    button.addEventListener("click", () => selectSample(sample.id));
    groups.get(sample.scenario).append(button);
  }
}

function selectSample(id) {
  const sample = state.catalog.samples.find(item => item.id === id);
  if (!sample) return;
  state.sample = sample;
  $("frameImage").src = sample.image;
  $("frameId").textContent = `Sample ${String(sample.id).padStart(2, "0")}`;
  $("runName").textContent = state.catalog.streams[sample.scenario].title;
  $("frameName").textContent = `Frame ${(sample.frame + 1).toLocaleString()}`;
  $("frameTruth").textContent = `Dataset label: ${sample.label}`;
  const visible = visibleSamples();
  const position = visible.findIndex(item => item.id === id);
  $("framePosition").textContent =
    `${String(position + 1).padStart(2, "0")} / ${String(visible.length).padStart(2, "0")}`;
  $("prevFrame").disabled = position <= 0;
  $("nextFrame").disabled = position >= visible.length - 1;
  renderResult();
  drawChange(sample);
  renderSamples();
  const url = new URL(location.href);
  url.searchParams.set("sample", String(sample.id));
  history.replaceState(null, "", url);
}

function move(delta) {
  const visible = visibleSamples();
  const index = visible.findIndex(item => item.id === state.sample?.id);
  if (visible[index + delta]) selectSample(visible[index + delta].id);
}

function reviewItems(interval) {
  if (!state.reviewLists.has(interval.id)) {
    state.reviewLists.set(interval.id, interval.review_frames.map(item => ({
      id: `frame-${item.frame}`, frame: item.frame, name: `Frame ${format(item.frame)}`,
      image: item.image, decision: null,
    })));
  }
  return state.reviewLists.get(interval.id);
}

function selectedInterval() {
  return state.intervals.intervals.find(item => item.id === $("intervalSelect").value);
}

function renderReview(interval) {
  const items = reviewItems(interval);
  const grid = $("reviewFrames");
  grid.replaceChildren();
  for (const item of items) {
    const card = document.createElement("article");
    card.className = "review-frame";
    const image = document.createElement("img");
    image.src = item.image;
    image.alt = item.name;
    const caption = document.createElement("span");
    caption.textContent = item.name;
    const choices = document.createElement("div");
    choices.className = "review-choices";
    for (const [decision, label] of [["normal", "Use as normal"], ["exclude", "Exclude"]]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.setAttribute("aria-pressed", item.decision === decision ? "true" : "false");
      button.addEventListener("click", () => {
        item.decision = item.decision === decision ? null : decision;
        renderReview(interval);
      });
      choices.append(button);
    }
    card.append(image, caption, choices);
    grid.append(card);
  }
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "review-empty";
    empty.textContent = "No buffered photos are available for this run.";
    grid.append(empty);
  }
  $("reviewCount").textContent = items.length
    ? `${items.filter(item => item.decision).length} / ${items.length} reviewed` : "";
}

function renderSummary() {
  const interval = selectedInterval();
  if (!interval) return;
  $("intervalRange").textContent = `Frames ${format(interval.start)}–${format(interval.end)} · ${format(interval.current.count)} scored`;
  const alerted = interval.first_alarm !== null;
  const alertText = alerted
    ? `Change alert at frame ${format(interval.first_alarm)}${interval.first_alarm < interval.start ? " · before this evaluation interval" : ""}`
    : "No change alert";
  const summary = $("intervalSummary");
  summary.replaceChildren();
  const signal = document.createElement("div");
  signal.className = `interval-signal ${alerted ? "is-alert" : ""}`;
  const signalText = document.createElement("span");
  signalText.textContent = alertText;
  signal.append(signalText);
  if (alerted) {
    const jump = document.createElement("button");
    jump.type = "button";
    jump.textContent = "Review frames ↓";
    jump.addEventListener("click", () => $("candidateReview").scrollIntoView({ behavior: "smooth", block: "start" }));
    signal.append(jump);
  }
  const metrics = document.createElement("div");
  metrics.className = "interval-metrics";
  for (const [value, label] of [
    [format(interval.current.count), "Frames scored"],
    [format(interval.current.flagged), "Frames flagged"],
  ]) {
    const cell = document.createElement("div");
    const number = document.createElement("strong");
    number.textContent = value;
    const name = document.createElement("span");
    name.textContent = label;
    cell.append(number, name);
    metrics.append(cell);
  }
  summary.append(signal, metrics);
  const flagged = state.catalog.samples.filter(sample => sample.scenario === interval.scenario &&
    sample.frame + 1 >= interval.start && sample.frame + 1 <= interval.end &&
    sample.current.score >= sample.current.threshold).slice(0, 4);
  if (interval.current.flagged) {
    const section = document.createElement("section");
    section.className = "interval-examples";
    const title = document.createElement("h3");
    title.textContent = "Flagged photos to review";
    const note = document.createElement("p");
    const decided = flagged.filter(sample => state.caseReviews.has(sample.id)).length;
    const confirmed = flagged.filter(sample => state.caseReviews.get(sample.id) === "issue").length;
    const dismissed = flagged.filter(sample => state.caseReviews.get(sample.id) === "dismiss").length;
    const outcomes = decided ? ` · ${decided} reviewed (${confirmed} issue, ${dismissed} dismissed)` : " · 0 reviewed";
    note.textContent = flagged.length
      ? `${flagged.length} of ${format(interval.current.flagged)} flagged photos available${outcomes}`
      : `${format(interval.current.flagged)} flagged photos need review; previews are unavailable for this run.`;
    const grid = document.createElement("div");
    grid.className = "interval-example-grid";
    for (const sample of flagged) {
      const card = document.createElement("article");
      card.className = "interval-case";
      const image = document.createElement("img");
      image.src = sample.image;
      image.alt = `Frame ${format(sample.frame + 1)}`;
      const body = document.createElement("div");
      const caption = document.createElement("span");
      caption.textContent = `Frame ${format(sample.frame + 1)}`;
      const choices = document.createElement("div");
      choices.className = "case-choices";
      for (const [decision, label] of [["issue", "Issue"], ["dismiss", "Dismiss"]]) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.setAttribute("aria-pressed", state.caseReviews.get(sample.id) === decision ? "true" : "false");
        button.addEventListener("click", () => {
          if (state.caseReviews.get(sample.id) === decision) state.caseReviews.delete(sample.id);
          else state.caseReviews.set(sample.id, decision);
          renderSummary();
        });
        choices.append(button);
      }
      body.append(caption, choices);
      card.append(image, body);
      grid.append(card);
    }
    section.append(title, note);
    if (flagged.length) section.append(grid);
    summary.append(section);
  }
  $("candidateReview").hidden = !alerted;
  if (alerted) {
    $("candidateReviewNote").textContent = interval.review_frames.length
      ? `${interval.review_frames.length} buffered photos available. Mark suitable examples or exclude them.`
      : "Collect and review new-run photos before building a candidate reference.";
    renderReview(interval);
  }
}

function openSummary(intervalId) {
  if (!state.intervals) return;
  const select = $("intervalSelect");
  select.value = intervalId || state.sample?.scenario || "reference";
  if (!select.value) select.value = "reference";
  renderSummary();
  $("intervalDialog").showModal();
}

$("streamOpacity").addEventListener("input", event => {
  $("frameHeat").style.opacity = event.target.value / 100;
});
$("prevFrame").addEventListener("click", () => move(-1));
$("nextFrame").addEventListener("click", () => move(1));
$("openSummary").addEventListener("click", () => openSummary());
$("closeSummary").addEventListener("click", () => $("intervalDialog").close());
$("intervalSelect").addEventListener("change", renderSummary);
$("intervalDialog").addEventListener("click", event => {
  if (event.target === $("intervalDialog")) $("intervalDialog").close();
});
$("exportSummary").addEventListener("click", () => {
  const interval = selectedInterval();
  const payload = {
    dataset: "TSFabrics",
    interval: interval.title,
    scenario: interval.scenario,
    frames: [interval.start, interval.end],
    inspected_frames: interval.current.count,
    flagged_frames: interval.current.flagged,
    visual_change_first_alarm: interval.first_alarm,
    generated_at: new Date().toISOString(),
    review_status: "draft",
    model_recomputed: false,
    inspection_reviews: state.catalog.samples
      .filter(sample => sample.scenario === interval.scenario && state.caseReviews.has(sample.id))
      .map(sample => ({ frame: sample.frame + 1, decision: state.caseReviews.get(sample.id) })),
    startup_selection: interval.first_alarm === null ? null : reviewItems(interval)
      .map(({ frame, decision }) => ({ frame, decision: decision ?? "pending" })),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2) + "\n"],
    { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `surface-trace-summary-${interval.id}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
document.querySelectorAll("[data-reference]").forEach(button =>
  button.addEventListener("click", () => {
    state.reference = button.dataset.reference;
    if (state.sample) renderResult();
  }));
document.querySelectorAll("[data-stream-filter]").forEach(button =>
  button.addEventListener("click", () => {
    state.filter = button.dataset.streamFilter;
    document.querySelectorAll("[data-stream-filter]").forEach(item =>
      item.setAttribute("aria-pressed", item === button ? "true" : "false"));
    selectSample(visibleSamples()[0].id);
  }));

Promise.all(["./next-samples/catalog.json", "./ablation/catalog.json", "./next-samples/intervals.json"].map(url =>
  fetch(url).then(response => {
    if (!response.ok) throw new Error(`Sample catalog unavailable: ${url}`);
    return response.json();
  })))
  .then(([catalog, classicCatalog, intervals]) => {
    const classicById = new Map(classicCatalog.map(record => [record.id, record]));
    for (const sample of catalog.samples) {
      const classic = classicById.get(sample.id);
      if (!classic || classic.scenario !== sample.scenario || classic.frame !== sample.frame || classic.dataset_label !== sample.label) {
        throw new Error(`Handcrafted comparison missing for sample ${sample.id}`);
      }
      sample.handcrafted = {
        score: classic.score,
        threshold: classic.threshold,
        heatmap: `./ablation/${classic.overlay}`,
      };
    }
    state.catalog = catalog;
    state.intervals = intervals;
    for (const interval of intervals.intervals) {
      const option = document.createElement("option");
      option.value = interval.id;
      option.textContent = interval.title;
      $("intervalSelect").append(option);
    }
    const requested = Number(new URLSearchParams(location.search).get("sample")) || 7;
    selectSample(catalog.samples.some(sample => sample.id === requested) ? requested : catalog.samples[0].id);
    if (new URLSearchParams(location.search).has("summary")) openSummary("T1_S164_I36_1");
  })
  .catch(() => {
    $("streamStatus").textContent = "Samples unavailable";
    $("streamAssessment").textContent = "Reload this page to try again.";
  });
