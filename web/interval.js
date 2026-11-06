const NS = "http://www.w3.org/2000/svg";

function element(name, attributes, parent) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  parent.append(node);
  return node;
}

function polyline(values, x, y) {
  return values.map((value, index) => `${x(index).toFixed(2)},${y(value).toFixed(2)}`).join(" ");
}

function drawScores(manifest) {
  const svg = document.getElementById("scoreChart");
  const scores = manifest.scores;
  const groups = [];
  for (let i = 0; i < scores.length; i += 8) groups.push(Math.max(...scores.slice(i, i + 8)));
  const left = 15, right = 746, top = 13, bottom = 141;
  const low = Math.min(...groups), high = Math.max(...groups);
  const x = i => left + i / Math.max(1, groups.length - 1) * (right - left);
  const y = value => bottom - (value - low) / Math.max(1e-8, high - low) * (bottom - top);
  for (const fraction of [0, .5, 1]) {
    const yy = bottom - fraction * (bottom - top);
    element("line", { x1: left, y1: yy, x2: right, y2: yy, class: fraction ? "grid" : "axis" }, svg);
  }
  element("polyline", { points: polyline(groups, x, y), class: "trace" }, svg);
  const [first, last] = manifest.evaluation_frames;
  element("text", { x: left, y: 161 }, svg).textContent = first.toLocaleString();
  element("text", { x: right, y: 161, "text-anchor": "end" }, svg).textContent = last.toLocaleString();
}

function drawChange(change) {
  const svg = document.getElementById("changeChart");
  const ends = change.window_ends, values = change.window_scores;
  const left = 12, right = 409, top = 13, bottom = 136;
  const high = Math.max(change.limit, ...values) * 1.11;
  const x = frame => left + (frame - ends[0]) / (ends.at(-1) - ends[0]) * (right - left);
  const y = value => bottom - value / high * (bottom - top);
  element("line", { x1: left, y1: bottom, x2: right, y2: bottom, class: "axis" }, svg);
  element("line", { x1: left, y1: y(change.limit), x2: right, y2: y(change.limit), class: "limit" }, svg);
  element("line", { x1: x(change.splice_boundary), y1: top, x2: x(change.splice_boundary), y2: bottom, class: "boundary" }, svg);
  element("polyline", { points: values.map((score, i) => `${x(ends[i]).toFixed(2)},${y(score).toFixed(2)}`).join(" "), class: "change-trace" }, svg);
  const alertIndex = ends.indexOf(change.alert);
  if (alertIndex >= 0) {
    element("circle", { cx: x(change.alert), cy: y(values[alertIndex]), r: 5, class: "alert-dot" }, svg);
    element("text", { x: Math.min(x(change.alert) + 9, 365), y: Math.max(y(values[alertIndex]) - 9, 13), class: "alert-label" }, svg).textContent = "Alert";
  }
  element("text", { x: left, y: 161 }, svg).textContent = "Reference";
  element("text", { x: x(change.splice_boundary) + 5, y: 161, class: "label" }, svg).textContent = "New run";
}

function updateProgress(checked, total) {
  const values = Object.values(checked);
  document.getElementById("reviewProgress").textContent = `${values.length} / ${total} checked`;
  document.getElementById("reviewProgressBar").style.width = `${100 * values.length / total}%`;
  document.getElementById("reviewCounts").textContent = values.length
    ? `${values.filter(v => v === "Defect").length} defect · ${values.filter(v => v === "Normal").length} normal`
    : "Awaiting review";
}

function renderRequests(manifest) {
  const grid = document.getElementById("requestGrid");
  const checked = {};
  let evaluationPromise;
  let additionalRequested = false;
  const pilot = manifest.review.slice(0, 2);
  const overrideButton = document.getElementById("reviewOverride");
  function updateGate() {
    const decisions = pilot.map(item => checked[item.frame]).filter(Boolean);
    const pilotComplete = decisions.length === pilot.length;
    const needsReview = pilotComplete && decisions.some(value => value !== "Normal");
    const continueReview = needsReview || additionalRequested;
    const complete = pilotComplete && !continueReview;
    [...grid.children].forEach((card, index) => { card.hidden = index >= 2 && !continueReview; });
    overrideButton.hidden = !complete;
    document.getElementById("requestsTitle").textContent = continueReview ? "Continue through eight frames" : complete ? "Two checks complete" : "Start with two frames";
    document.getElementById("reviewGate").textContent = needsReview ? "A defect or uncertain result opened six more checks." : additionalRequested ? "Six additional frames opened for review." : complete ? "Both initial photos were confirmed normal." : "Highest scores, at least 16 frames apart.";
    updateProgress(checked, continueReview ? manifest.review.length : pilot.length);
  }
  overrideButton.addEventListener("click", () => {
    additionalRequested = true;
    updateGate();
  });
  for (const [index, item] of manifest.review.entries()) {
    const card = document.createElement("article");
    card.className = "request-card";
    card.hidden = index >= 2;
    const image = document.createElement("div");
    image.className = "request-image";
    const photo = document.createElement("img");
    photo.src = item.image;
    photo.alt = `Recorded textile frame ${item.frame}`;
    photo.loading = "lazy";
    const heat = document.createElement("img");
    heat.src = item.heatmap;
    heat.alt = "";
    heat.className = "heat";
    heat.hidden = true;
    image.append(photo, heat);
    const body = document.createElement("div");
    body.className = "request-card-body";
    const top = document.createElement("div");
    top.className = "request-card-top";
    const frame = document.createElement("strong");
    frame.textContent = `Frame ${item.frame.toLocaleString()}`;
    const rank = document.createElement("small");
    rank.textContent = `#${String(item.rank).padStart(2, "0")}`;
    top.append(frame, rank);
    const score = document.createElement("p");
    score.className = "request-score";
    score.textContent = `Anomaly score ${item.score.toFixed(3)}`;
    const actions = document.createElement("div");
    actions.className = "request-actions";
    const toggle = document.createElement("button");
    toggle.className = "heat-toggle";
    toggle.type = "button";
    toggle.textContent = "Show heatmap";
    toggle.setAttribute("aria-pressed", "false");
    toggle.addEventListener("click", () => {
      heat.hidden = !heat.hidden;
      toggle.textContent = heat.hidden ? "Show heatmap" : "Hide heatmap";
      toggle.setAttribute("aria-pressed", String(!heat.hidden));
    });
    const check = document.createElement("button");
    check.className = "check-button";
    check.type = "button";
    check.textContent = "Check result";
    check.addEventListener("click", async () => {
      check.disabled = true;
      try {
        evaluationPromise ||= fetch("./unlabeled-demo/evaluation.json").then(response => {
          if (!response.ok) throw new Error("Recorded review outcomes could not be loaded.");
          return response.json();
        });
        const evaluation = await evaluationPromise;
        if (evaluation.run !== manifest.run) throw new Error("Review outcomes do not match the run.");
        const result = evaluation.review.find(row => row.frame === item.frame);
        if (!result) throw new Error("This frame has no recorded result.");
        const status = result.ambiguous ? "Uncertain" : result.dataset_label;
        checked[item.frame] = status;
        const label = document.createElement("p");
        label.className = `request-result ${status.toLowerCase()}`;
        label.textContent = `Recorded result · ${status}`;
        body.append(label);
        check.textContent = "Checked";
        updateGate();
      } catch (error) {
        check.disabled = false;
        document.getElementById("intervalError").textContent = error.message;
        document.getElementById("intervalError").hidden = false;
      }
    });
    actions.append(toggle, check);
    body.append(top, score, actions);
    card.append(image, body);
    grid.append(card);
  }
  updateGate();
}

async function main() {
  try {
    const response = await fetch("./unlabeled-demo/manifest.json");
    if (!response.ok) throw new Error("Interval data could not be loaded.");
    const manifest = await response.json();
    document.getElementById("frameCount").textContent = manifest.frame_count.toLocaleString();
    document.getElementById("scoreMedian").textContent = manifest.score_quantiles.p50.toFixed(3);
    document.getElementById("scoreP99").textContent = manifest.score_quantiles.p99.toFixed(3);
    const targetFrame = manifest.change.alert - manifest.change.splice_boundary;
    document.getElementById("changeFrame").textContent = targetFrame > 0 ? `Frame ${targetFrame}` : "No alert";
    document.getElementById("changeTitle").textContent = targetFrame > 0 ? "New appearance detected" : "No sustained change";
    drawScores(manifest);
    drawChange(manifest.change);
    renderRequests(manifest);
  } catch (error) {
    const element = document.getElementById("intervalError");
    element.textContent = error.message;
    element.hidden = false;
  }
}

main();
