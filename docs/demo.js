"use strict";

const $ = id => document.getElementById(id);
const dataVersion = new URL(document.currentScript.src).searchParams.get("v");
const dataPath = path => dataVersion ? `${path}?v=${dataVersion}` : path;
const svgNS = "http://www.w3.org/2000/svg";
const SCENE = Object.freeze({ context: 0, feature: 1, shift: 2, scores: 3, review: 4, decision: 5 });
const state = { manifest: null, evaluation: null, featureCases: [], featureIndex: 0, featureTimer: null, shiftIndex: 0, shiftTimer: null, decisionTimers: [], decisionPhase: 3, scene: 0, reviewIndex: 0, revealed: false, playing: false, timer: null };
const shiftFrames = [1, 32, 64, 96, 192];

function renderFeature(index) {
  state.featureIndex = index % state.featureCases.length;
  const { sample, classic, phase } = state.featureCases[state.featureIndex];
  const defect = sample.label === "Defect";
  const dinoAlert = sample.current.score >= sample.current.threshold;
  const verdict = alert => defect ? alert ? "Defect flagged" : "Defect missed" : alert ? "False alarm" : "Normal retained";
  $("demoFeatureContext").textContent = `${phase} · ${sample.label} · frame ${(sample.frame + 1).toLocaleString()}`;
  $("demoFeatureCounter").textContent = `${String(state.featureIndex + 1).padStart(2, "0")} / ${String(state.featureCases.length).padStart(2, "0")}`;
  $("demoClassicPhoto").src = sample.image;
  $("demoDinoPhoto").src = sample.image;
  $("demoClassicMap").src = `./ablation/${classic.overlay}`;
  $("demoDinoMap").src = sample.current.heatmap;
  $("demoClassicPhoto").alt = `${sample.label} textile photo, frame ${(sample.frame + 1).toLocaleString()}`;
  $("demoDinoPhoto").alt = `Same ${sample.label.toLowerCase()} textile photo, frame ${(sample.frame + 1).toLocaleString()}`;
  for (const [id, alert] of [["demoClassicVerdict", classic.alert], ["demoDinoVerdict", dinoAlert]]) {
    const node = $(id);
    node.textContent = verdict(alert);
    node.className = alert === defect ? "is-correct" : "is-error";
  }
}

function rotateFeatures() {
  clearTimeout(state.featureTimer);
  if (!state.playing || state.scene !== SCENE.feature) return;
  state.featureTimer = setTimeout(() => { renderFeature(state.featureIndex + 1); rotateFeatures(); }, 2050);
}

function svg(parent, tag, attributes, label) {
  const node = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (label) node.textContent = label;
  parent.append(node);
  return node;
}

function trace(parent, points, className) {
  svg(parent, "polyline", { points: points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" "), class: className, pathLength: 100 });
}

function drawChange({ window_ends: ends, window_scores: scores, limit, splice_boundary: boundary, alert }, frame) {
  const chart = $("demoChangeChart");
  chart.replaceChildren();
  const points = ends.map((end, index) => [end, scores[index]])
    .filter(([end]) => end >= boundary - 128 && end <= boundary + 192);
  const x = end => 19 + (end - points[0][0]) / (points.at(-1)[0] - points[0][0]) * 601;
  const y = score => 148 - score / (Math.max(...points.map(point => point[1]), limit) * 1.1) * 119;
  for (const level of [0, .5, 1]) svg(chart, "line", { x1: 19, x2: 620, y1: 148 - level * 119, y2: 148 - level * 119, class: "demo-chart-grid" });
  svg(chart, "line", { x1: 19, x2: 620, y1: y(limit), y2: y(limit), class: "demo-chart-limit" });
  svg(chart, "line", { x1: x(boundary), x2: x(boundary), y1: 25, y2: 148, class: "demo-chart-boundary" });
  const visible = points.filter(([end]) => end <= boundary + frame);
  trace(chart, visible.map(([end, score]) => [x(end), y(score)]), "demo-chart-line");
  if (frame >= 32) {
    const [end, score] = visible.at(-1);
    svg(chart, "circle", { cx: x(end), cy: y(score), r: 5, class: "demo-chart-current" });
  }
  if (frame >= alert - boundary) {
    const [, score] = points.find(([end]) => end === alert);
    svg(chart, "circle", { cx: x(alert), cy: y(score), r: 6, class: "demo-chart-alert" });
    svg(chart, "text", { x: x(alert) + 10, y: y(score) - 10, class: "demo-alert-label" }, `ALERT · ${alert - boundary}`);
  }
  svg(chart, "text", { x: 19, y: 171 }, "Reference");
  svg(chart, "text", { x: x(boundary) + 6, y: 171 }, "New run");
  svg(chart, "text", { x: 615, y: 171, "text-anchor": "end" }, `Frame ${frame}`);
}

function renderShift(index) {
  state.shiftIndex = index;
  const frame = shiftFrames[index];
  const image = $("demoShiftPhoto");
  image.src = `./scenario/demo-${String(frame).padStart(3, "0")}.jpg`;
  image.alt = `Frame ${frame} of the separate changed run`;
  image.classList.remove("is-advancing");
  void image.offsetWidth;
  image.classList.add("is-advancing");
  $("demoShiftFrame").textContent = `Changed run · frame ${frame}`;
  const { alert, splice_boundary: boundary, window_ends: ends, window_scores: scores, limit } = state.manifest.change;
  let streak = 0;
  for (let i = ends.length - 1; i >= 0; i--) {
    if (ends[i] > boundary + frame) continue;
    if (ends[i] <= boundary || scores[i] <= limit) break;
    streak++;
  }
  const alerted = frame >= alert - boundary;
  $("demoShiftCallout").textContent = alerted ? `Frame ${alert - boundary}` : `${Math.min(streak, 3)} / 3`;
  $("demoShiftCalloutLabel").textContent = alerted ? "First sustained change alert" : "Consecutive windows above the limit";
  drawChange(state.manifest.change, frame);
}

function rotateShift() {
  clearTimeout(state.shiftTimer);
  if (state.scene !== SCENE.shift || state.shiftIndex === shiftFrames.length - 1) return;
  state.shiftTimer = setTimeout(() => { renderShift(state.shiftIndex + 1); rotateShift(); }, 1000);
}

function drawScores(manifest) {
  const chart = $("demoScoreChart");
  chart.replaceChildren();
  const scores = manifest.scores;
  const low = Math.min(...scores), high = Math.max(...scores);
  const x = index => 18 + index / (scores.length - 1) * 602;
  const y = score => 162 - (score - low) / Math.max(1e-8, high - low) * 132;
  for (const level of [0, .5, 1]) svg(chart, "line", { x1: 18, x2: 620, y1: 162 - level * 132, y2: 162 - level * 132, class: "demo-chart-grid" });
  trace(chart, scores.map((score, index) => [x(index), y(score)]), "demo-chart-line");
  const [first, last] = manifest.evaluation_frames;
  for (const item of manifest.review) {
    const index = item.frame - first;
    if (index < 0 || index >= scores.length || Math.abs(scores[index] - item.score) > 1e-5) {
      throw new Error(`Review frame ${item.frame} does not match the recorded score trace.`);
    }
    svg(chart, "circle", { cx: x(index), cy: y(scores[index]), r: 4.5,
      class: item.rank > 2 ? "demo-score-marker is-conditional" : "demo-score-marker" });
  }
  svg(chart, "text", { x: 18, y: 192 }, first.toLocaleString());
  svg(chart, "text", { x: 620, y: 192, "text-anchor": "end" }, last.toLocaleString());
}

function drawQueueContrast(manifest) {
  const [first, last] = manifest.evaluation_frames;
  for (const [id, frames, label] of [
    ["demoTop8Track", manifest.top8_frames, "Top eight scores"],
    ["demoSpaced8Track", manifest.review.map(item => item.frame), "Time-spaced eight"],
  ]) {
    if (frames.length !== 8 || frames.some(frame => frame < first || frame > last)) {
      throw new Error(`Invalid ${label.toLowerCase()} in recorded run.`);
    }
    const track = $(id);
    const ordered = frames.slice().sort((a, b) => a - b);
    track.setAttribute("aria-label", `${label}: frames ${ordered.join(", ")}`);
    track.replaceChildren();
    ordered.forEach((frame, index) => {
      const marker = document.createElement("i");
      marker.style.left = `${((frame - first) / (last - first) * 100).toFixed(3)}%`;
      const closeBefore = index > 0 && frame - ordered[index - 1] < 16;
      const closeAfter = index + 1 < ordered.length && ordered[index + 1] - frame < 16;
      marker.style.setProperty("--offset", `${closeBefore ? 5 : closeAfter ? -5 : 0}px`);
      marker.style.setProperty("--order", index);
      marker.title = `Frame ${frame.toLocaleString()}`;
      track.append(marker);
    });
  }
}

function updateReview() {
  const item = state.manifest.review[state.reviewIndex];
  $("demoReviewPhoto").src = item.image;
  $("demoReviewPhoto").alt = `Recorded textile frame ${item.frame}`;
  $("demoReviewHeat").src = item.heatmap;
  $("demoReviewHeat").hidden = !state.revealed;
  $("demoReviewRank").textContent = `#${String(item.rank).padStart(2, "0")}`;
  $("demoReviewFrame").textContent = `Frame ${item.frame.toLocaleString()}`;
  $("demoReviewScore").textContent = `Score ${item.score.toFixed(3)}`;
  const pilotDone = state.reviewIndex + Number(state.revealed) >= 2;
  const allDone = state.reviewIndex === state.manifest.review.length - 1 && state.revealed;
  $("demoCohort").hidden = !allDone;
  $("demoCheckCount").textContent = allDone
    ? `${state.evaluation.episodes_found} vs ${state.evaluation.top8_episodes_found}`
    : `${state.reviewIndex + Number(state.revealed)} / ${state.manifest.review.length}`;
  $("demoCheckLabel").textContent = allDone
    ? "New defect episodes · spaced vs top 8"
    : "Photos checked";
  const route = $("demoRoute");
  route.classList.toggle("is-expanded", pilotDone);
  route.textContent = allDone ? "Eight photos checked · recorded result"
    : pilotDone ? "Defect found in first two · six more checks opened" : "Two checks first";
  const dots = $("demoCheckDots");
  dots.replaceChildren();
  const [firstFrame, lastFrame] = state.manifest.evaluation_frames;
  $("demoReviewStart").textContent = `FRAME ${firstFrame.toLocaleString()}`;
  $("demoReviewEnd").textContent = `FRAME ${lastFrame.toLocaleString()}`;
  dots.setAttribute("aria-label", `${state.reviewIndex + Number(state.revealed)} of ${state.manifest.review.length} photos checked across frames ${firstFrame.toLocaleString()} to ${lastFrame.toLocaleString()}`);
  state.manifest.review.forEach((review, index) => {
    const dot = document.createElement("span");
    dot.className = index < state.reviewIndex || index === state.reviewIndex && state.revealed ? "is-done" : index === state.reviewIndex ? "is-current" : "";
    if (!pilotDone && index >= 2) dot.classList.add("is-conditional");
    dot.style.left = `${((review.frame - firstFrame) / (lastFrame - firstFrame) * 100).toFixed(3)}%`;
    const checked = index < state.reviewIndex || index === state.reviewIndex && state.revealed;
    if (checked) {
      const result = state.evaluation.review.find(row => row.frame === review.frame);
      dot.classList.add(result.dataset_label === "Defect" ? "is-defect" : "is-normal");
    }
    dot.title = `Check ${review.rank} · frame ${review.frame.toLocaleString()}`;
    dots.append(dot);
  });
  const outcome = $("demoOutcome");
  outcome.className = "demo-outcome";
  if (state.revealed) {
    const result = state.evaluation.review.find(row => row.frame === item.frame);
    const label = result.ambiguous ? "Uncertain" : result.dataset_label;
    outcome.textContent = label === "Defect" ? "Defect confirmed · exclude from reference" : label === "Normal" ? "Normal confirmed · eligible for trial reference" : "Uncertain · exclude from reference";
    outcome.classList.add(label === "Defect" ? "is-defect" : "is-normal");
    $("demoReveal").textContent = state.reviewIndex === state.manifest.review.length - 1 ? "View update decision →" : "Next photo →";
  } else {
    outcome.textContent = "Result hidden until checked";
    $("demoReveal").textContent = "Check this photo →";
  }
}

const decisionPhases = [
  ["First, fewer false alarms.", "A trial reference uses reviewed normal photos. It flags fewer normal photos on later test frames.", "1,050 → 0", "Normal frames flagged"],
  ["Check defect sensitivity.", "The same trial also flags fewer defect photos on those later frames.", "202 → 153", "Defect frames flagged"],
  ["Check distinct events.", "The total number of detected new defect episodes falls from 48 to 40.", "48 → 40", "New defect episodes found"],
  ["Hold the candidate.", "Reviewed normal photos can form a trial reference. On later frames, it removes normal alerts but also misses more defects, so the frozen reference remains active.", "Keep frozen", "No automatic reference update"],
];

function clearDecisionTimers() {
  state.decisionTimers.forEach(clearTimeout);
  state.decisionTimers = [];
}

function renderDecision(phase) {
  state.decisionPhase = phase;
  const [title, explanation, value, label] = decisionPhases[phase];
  $("decisionTitle").textContent = title;
  $("decisionExplanation").textContent = explanation;
  $("decisionValue").textContent = value;
  $("decisionLabel").textContent = label;
  $("decisionCallout").classList.toggle("demo-hold", phase === 3);
  $("decisionCallout").classList.toggle("demo-risk", phase === 1 || phase === 2);
  document.querySelectorAll(".decision-row").forEach(row => {
    const index = Number(row.dataset.decisionStage);
    const pending = phase < 3 && index > phase;
    row.classList.toggle("is-pending", pending);
    row.classList.toggle("is-focus", phase < 3 && index === phase);
    if (pending) row.setAttribute("aria-hidden", "true");
    else row.removeAttribute("aria-hidden");
  });
}

function startDecision() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    renderDecision(3);
    return;
  }
  renderDecision(0);
  for (const [phase, delay] of [[1, 1400], [2, 2700], [3, 4000]]) {
    state.decisionTimers.push(setTimeout(() => {
      if (state.scene === SCENE.decision) renderDecision(phase);
    }, delay));
  }
}

function showScene(index) {
  clearTimeout(state.featureTimer);
  clearTimeout(state.shiftTimer);
  clearDecisionTimers();
  state.scene = index;
  $("demoScope").textContent = index === SCENE.context ? "FIELD FEEDBACK · DESIGN BRIEF"
    : index === SCENE.feature ? "THREE RUNS · EXAMPLES"
      : index === SCENE.decision ? "15 RUNS · UPDATE TEST" : `RUN · ${state.manifest.run}`;
  state.revealed = false;
  if (index === SCENE.review) state.reviewIndex = 0;
  document.querySelectorAll(".demo-stage").forEach((stage, i) => { stage.hidden = i !== index; });
  const chapters = $("demoChapters");
  const chapterButtons = [...chapters.querySelectorAll("button")];
  chapterButtons.forEach((button, i) => {
    if (i === index) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  });
  if (chapters.scrollWidth > chapters.clientWidth) {
    const active = chapterButtons[index];
    const left = active.getBoundingClientRect().left - chapters.getBoundingClientRect().left
      + chapters.scrollLeft - (chapters.clientWidth - active.clientWidth) / 2;
    chapters.scrollTo({ left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  if (index === SCENE.review) updateReview();
  if (index === SCENE.shift) {
    renderShift(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? shiftFrames.length - 1 : 0);
    rotateShift();
  }
  if (index === SCENE.decision) startDecision();
  $("demoStatus").textContent = ["Field feedback", "Patch features", "Visual shift", "Interval scores", "Recorded checks", "Separate validation"][index];
  if (!state.playing) $("demoPlay").textContent = index === SCENE.decision ? "Replay" : "Play replay";
  rotateFeatures();
}

function stop() {
  clearTimeout(state.timer);
  clearTimeout(state.featureTimer);
  clearTimeout(state.shiftTimer);
  clearDecisionTimers();
  if (state.scene === SCENE.decision && state.decisionPhase < 3) renderDecision(3);
  state.playing = false;
  document.body.classList.remove("is-playing");
  $("demoPlay").textContent = state.scene === SCENE.decision ? "Replay" : "Play replay";
}

async function revealReview() {
  if (!state.evaluation) {
    const response = await fetch(dataPath("./unlabeled-demo/evaluation.json"));
    if (!response.ok) throw new Error("Recorded review outcomes could not be loaded.");
    const data = await response.json();
    if (data.run !== state.manifest.run || data.review.length !== state.manifest.review.length ||
        !Number.isInteger(data.episodes_found) || !Number.isInteger(data.top8_episodes_found)) {
      throw new Error("Review outcomes do not match the recorded run.");
    }
    state.evaluation = data;
  }
  state.revealed = true;
  updateReview();
}

async function advance() {
  if (state.scene < SCENE.review) showScene(state.scene + 1);
  else if (state.scene === SCENE.review) {
    if (!state.revealed) await revealReview();
    else if (state.reviewIndex < state.manifest.review.length - 1) {
      state.reviewIndex++;
      state.revealed = false;
      updateReview();
    } else showScene(SCENE.decision);
  } else showScene(0);
}

function schedule() {
  if (!state.playing) return;
  if (state.scene === SCENE.decision) { state.timer = setTimeout(stop, 5200); return; }
  state.timer = setTimeout(async () => {
    try { await advance(); schedule(); }
    catch (error) { stop(); $("demoError").textContent = error.message; $("demoError").hidden = false; }
  }, state.scene === SCENE.review ? state.revealed ? state.reviewIndex === state.manifest.review.length - 1 ? 3500 : 1100 : 1400
    : state.scene === SCENE.context ? 4800 : state.scene === SCENE.feature ? 7000 : state.scene === SCENE.shift ? 6500 : 7000);
}

function startPlayback() {
  if (state.scene === SCENE.decision) showScene(SCENE.context);
  state.playing = true;
  document.body.classList.add("is-playing");
  $("demoPlay").textContent = "Pause replay";
  rotateFeatures();
  if (state.scene === SCENE.shift) rotateShift();
  schedule();
}

async function main() {
  try {
    const responses = await Promise.all(["./unlabeled-demo/manifest.json", "./next-samples/catalog.json", "./ablation/catalog.json"].map(path => fetch(dataPath(path))));
    if (responses.some(response => !response.ok)) throw new Error("Recorded comparison could not be loaded.");
    const [manifest, nextCatalog, classicCatalog] = await Promise.all(responses.map(response => response.json()));
    if (manifest.run !== "T1_S478_I118_2" || manifest.frame_count !== 2884 || manifest.review.length !== 8) throw new Error("Recorded run data do not match this replay.");
    state.manifest = manifest;
    for (const id of [6, 7, 4]) {
      const sample = nextCatalog.samples.find(item => item.id === id);
      const classic = classicCatalog.find(item => item.id === id);
      if (!sample || !classic || sample.scenario !== classic.scenario || sample.frame !== classic.frame || sample.label !== classic.dataset_label) throw new Error("Paired feature examples do not match.");
      state.featureCases.push({ sample, classic, phase: id === 7 ? "Final" : "Development" });
    }
    renderFeature(0);
    shiftFrames.forEach(frame => { const image = new Image(); image.src = `./scenario/demo-${String(frame).padStart(3, "0")}.jpg`; });
    drawScores(manifest);
    drawQueueContrast(manifest);
    showScene(SCENE.context);
    $("demoPlay").addEventListener("click", () => {
      if (state.playing) { stop(); return; }
      startPlayback();
    });
    $("demoNext").addEventListener("click", async () => { stop(); try { await advance(); } catch (error) { $("demoError").textContent = error.message; $("demoError").hidden = false; } });
    $("demoBack").addEventListener("click", () => {
      stop();
      if (state.scene === SCENE.review && state.reviewIndex > 0) { state.reviewIndex--; state.revealed = false; updateReview(); }
      else showScene(Math.max(0, state.scene - 1));
    });
    $("demoReveal").addEventListener("click", async () => { stop(); try { await advance(); } catch (error) { $("demoError").textContent = error.message; $("demoError").hidden = false; } });
    document.querySelectorAll(".demo-steps button").forEach(button => button.addEventListener("click", () => { stop(); showScene(Number(button.dataset.step)); }));
    document.addEventListener("keydown", event => {
      if (event.target.closest("button,a,input,select,textarea")) return;
      if (event.key === "ArrowRight") $("demoNext").click();
      if (event.key === "ArrowLeft") $("demoBack").click();
    });
    if (new URLSearchParams(location.search).get("play") === "1" &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      await Promise.all(["demoClassicPhoto", "demoClassicMap", "demoDinoMap"]
        .map(id => $(id).decode().catch(() => {})));
      startPlayback();
    }
  } catch (error) {
    $("demoError").textContent = error.message;
    $("demoError").hidden = false;
    document.querySelectorAll(".demo-controls button,.demo-steps button").forEach(button => { button.disabled = true; });
  }
}

main();
