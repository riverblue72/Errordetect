(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const data = window.SURFACETRACE_PRESENTER_DATA;
  const comparisonPhotos = (data?.photoExamples ?? []).filter(photo => [1264, 1509].includes(photo.frame));
  const num = value => Number(value).toLocaleString("en-US");
  const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; };
  const freshReview = () => ({ index: 0, records: [], order: [], heat: false });
  const state = {
    view: "overview",
    scene: 0,
    playing: false,
    caseId: "defect",
    reviews: { defect: freshReview(), normal: freshReview() },
    photo: 0,
    method: "features",
    overview: "flow",
    compareRaw: false,
    shift: 0,
    resultsStep: 0,
    resultsClosing: false
  };
  let toastTimer;
  let tourTimer;
  const narrationEnabled = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  let activeNarration;

  function cancelNarration() {
    if (!activeNarration) return;
    try { window.speechSynthesis.cancel(); } catch { /* Captions remain available. */ }
    activeNarration = null;
  }

  function narrateChapter() {
    cancelNarration();
    if (!state.playing || !narrationEnabled) return;
    try {
      const utterance = new SpeechSynthesisUtterance(chapters[state.scene].narration);
      utterance.lang = "en-US";
      utterance.rate = 1.15;
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(item => item.lang.startsWith("en") && item.localService)
        || voices.find(item => item.lang.startsWith("en"));
      if (voice) utterance.voice = voice;
      utterance.onerror = () => { /* Browser audio availability never blocks the visual replay. */ };
      activeNarration = utterance;
      window.speechSynthesis.speak(utterance);
    } catch { activeNarration = null; }
  }

  const chapters = window.SURFACETRACE_PRESENTER_COPY.en;

  // Unchanged recorded review allocations, shared with the Korean presentation.
  const routingRuns = [
    {
      "run": "T1_S148_I108_1",
      "requests": 8
    },
    {
      "run": "T1_S164_I192_1",
      "requests": 2
    },
    {
      "run": "T1_S164_I193_1",
      "requests": 2
    },
    {
      "run": "T1_S164_I199_1",
      "requests": 2
    },
    {
      "run": "T1_S174_I108_1",
      "requests": 8
    },
    {
      "run": "T1_S177_I108_1",
      "requests": 2
    },
    {
      "run": "T1_S179_I35_1",
      "requests": 2
    },
    {
      "run": "T1_S478_I118_2",
      "requests": 8
    },
    {
      "run": "T2_S262_I45_1",
      "requests": 2
    },
    {
      "run": "T2_S287_I184_1",
      "requests": 2
    },
    {
      "run": "T2_S287_I185_1",
      "requests": 8
    },
    {
      "run": "T2_S303_I44_1",
      "requests": 2
    },
    {
      "run": "T2_S466_I39_1",
      "requests": 2
    },
    {
      "run": "T3_S165_I175_1",
      "requests": 2
    },
    {
      "run": "T3_S165_I178_1",
      "requests": 2
    },
    {
      "run": "T3_S165_I178_2",
      "requests": 2
    }
  ];

  function toast(message) {
    setText("toast", message);
    if (!$("toast")) return;
    $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("toast").hidden = true; }, 4200);
  }

  function fail(error) {
    stopTour();
    setText("error", `Could not load the demo data. ${error.message}`);
    if ($("error")) $("error").hidden = false;
    console.error(error);
  }

  const safely = action => event => {
    try { action(event); } catch (error) { fail(error); }
  };

  function bind(id, event, action) {
    const element = $(id);
    if (element) element.addEventListener(event, safely(action));
  }

  function imageSource(id, source, alt) {
    const element = $(id);
    if (!element) return;
    if (source) element.src = source;
    else element.removeAttribute("src");
    if (alt) element.alt = alt;
  }

  const photoRequests = new WeakMap();
  const decodedPhotos = new Map();

  function preloadPhoto(source) {
    if (decodedPhotos.has(source)) return decodedPhotos.get(source);
    const image = new Image();
    const loaded = new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Could not load the photo file."));
      image.src = source;
      if (image.complete && image.naturalWidth > 0) resolve();
    }).then(async () => {
      if (image.decode) await image.decode();
      return image;
    }).catch(error => {
      decodedPhotos.delete(source);
      throw error;
    });
    decodedPhotos.set(source, loaded);
    return loaded;
  }

  function displayPhotoGroup(entries) {
    const items = entries.map(([id, source, alt]) => ({ element: $(id), source, alt })).filter(item => item.element);
    if (!items.length) return;
    const anchor = items[0].element;
    const key = JSON.stringify(items.map(item => item.source || null));
    const previous = photoRequests.get(anchor);
    // A heatmap toggle or a review-result reveal uses the already decoded pair.
    if (previous?.key === key && !previous.failed) return;
    const request = { key, failed: false };
    photoRequests.set(anchor, request);
    const frames = [...new Set(items.map(item => item.element.closest(".photo-frame")).filter(Boolean))];
    frames.forEach(frame => { frame.setAttribute("aria-busy", "true"); delete frame.dataset.photoError; });
    items.forEach(item => { item.element.style.visibility = "hidden"; });

    Promise.all(items.filter(item => item.source).map(item => preloadPhoto(item.source))).then(async () => {
      if (photoRequests.get(anchor) !== request) return;
      items.forEach(({ element, source, alt }) => {
        element.alt = alt;
        if (source) element.src = source;
        else element.removeAttribute("src");
      });
      // Decode the displayed elements too: never show a new raw image with a stale overlay.
      await Promise.all(items.filter(item => item.source).map(({ element }) => element.decode ? element.decode() : Promise.resolve()));
      if (photoRequests.get(anchor) !== request) return;
      items.forEach(item => { item.element.style.visibility = ""; });
      frames.forEach(frame => frame.setAttribute("aria-busy", "false"));
    }).catch(() => {
      if (photoRequests.get(anchor) !== request) return;
      request.failed = true;
      frames.forEach(frame => {
        frame.setAttribute("aria-busy", "false");
        frame.dataset.photoError = "Could not load the photo.";
      });
      toast("Could not load the photo. Extract the entire ZIP, then try again.");
    });
  }

  function reviewStatus(caseId = state.caseId) {
    const c = data.cases[caseId], r = state.reviews[caseId];
    const count = r.records.filter(Boolean).length;
    const pilotDone = Boolean(r.records[0] && r.records[1]);
    const stopped = pilotDone && r.records.slice(0, 2).every(label => label === "normal");
    const expanded = pilotDone && !stopped;
    const budget = expanded ? c.maxReviews : c.pilotSize;
    return { c, r, count, pilotDone, stopped, expanded, budget,
      complete: stopped || (expanded && count === budget),
      revealed: Boolean(r.records[r.index]) };
  }

  function labelText(label) {
    return label === "normal" ? "Normal" : label === "defect" ? "Defect" : "Uncertain";
  }

  function selectPhoto(index, caseId = state.caseId) {
    const s = reviewStatus(caseId);
    if (index < 0 || index >= s.budget || !s.c.review[index]) {
      toast("Review the first two photos to determine whether more checks are requested.");
      return;
    }
    state.caseId = caseId;
    s.r.index = index;
    s.r.heat = false;
    if ($("caseSelect")) $("caseSelect").value = caseId;
    renderReview();
  }

  function updateTourControls(message) {
    setText("chapterProgress", `${String(state.scene + 1).padStart(2, "0")} / ${String(chapters.length).padStart(2, "0")}`);
    setText("sceneScope", chapters[state.scene].scope);
    setText("playTour", state.playing ? "Ⅱ Pause replay" : "▶ Play replay");
    if ($("playTour")) $("playTour").setAttribute("aria-pressed", String(state.playing));
    if ($("previousStep")) $("previousStep").disabled = state.scene === 0;
    if ($("nextStep")) $("nextStep").disabled = state.scene === chapters.length - 1;
    setText("tourStatus", message || (state.playing ? "Replaying recorded photos and results" : "← → Change step · Space Play/pause"));
    document.body.classList.toggle("is-playing", state.playing);
  }

  function showView(view) {
    const index = chapters.findIndex(chapter => chapter.view === view);
    if (index < 0) return;
    state.view = view;
    state.scene = index;
    document.title = `${chapters[index].label} · SurfaceTrace demo`;
    document.querySelectorAll("[data-scene]").forEach(panel => {
      const selected = Number(panel.dataset.scene) === index;
      panel.hidden = !selected;
      panel.setAttribute("aria-hidden", String(!selected));
    });
    document.querySelectorAll(".demo-steps [data-step]").forEach(button => {
      const selected = Number(button.dataset.step) === index;
      if (selected) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
    if (view === "overview") renderOverview();
    if (view === "data") renderMethod();
    if (view === "inspect") renderReview();
    if (view === "interval") renderInterval();
    if (view === "shift") renderShift();
    if (view === "compare") renderComparison();
    updateTourControls();
    if (state.playing) narrateChapter();
    const nav = document.querySelector(".demo-steps"), active = nav?.querySelector('[aria-current="step"]');
    if (nav && active && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = Math.max(0, active.offsetLeft - nav.offsetLeft - 16);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function showScene(index) {
    const chapter = chapters[Math.max(0, Math.min(chapters.length - 1, index))];
    showView(chapter.view);
  }

  function stopTour(message) {
    cancelNarration();
    clearTimeout(tourTimer);
    tourTimer = null;
    state.playing = false;
    updateTourControls(message);
  }

  function queueTourTick() {
    clearTimeout(tourTimer);
    if (!state.playing) return;
    tourTimer = setTimeout(() => {
      try { advanceTour(); } catch (error) { fail(error); }
    }, chapters[state.scene].delay);
  }

  function autoNextScene() {
    const next = state.scene + 1;
    if (next >= chapters.length) { stopTour("Replay complete · You can start again."); return; }
    if (next === 1) state.method = "features";
    if (next === 2) { state.photo = 0; state.compareRaw = false; }
    if (next === 3) state.shift = 0;
    if (next === chapters.length - 1) { state.resultsStep = 0; state.resultsClosing = false; }
    if (next === 5) {
      // Entering this chapter during a new tour replays both recorded review routes from their first photo.
      // Pausing and resuming inside this chapter does not reset the current review.
      state.reviews = { defect: freshReview(), normal: freshReview() };
      state.caseId = "defect";
      if ($("caseSelect")) $("caseSelect").value = "defect";
    }
    showScene(next);
  }

  function advanceTour() {
    if (!state.playing) return;
    if (state.scene === 0 && state.overview === "flow") {
      state.overview = "animation";
      renderOverview();
    } else if (state.scene === 1 && state.method === "features") {
      state.method = "reference";
      renderMethod();
    } else if (state.scene === 2 && state.photo + 1 < comparisonPhotos.length) {
      state.photo++;
      renderComparison();
    } else if (state.scene === 3 && state.shift + 1 < data.visualShift.photos.length) {
      state.shift++;
      renderShift();
    } else if (state.scene === 5) {
      const s = reviewStatus();
      if (!s.complete && !s.revealed) {
        revealReview();
      } else if (!s.complete) {
        const index = nextPhotoIndex(s);
        if (index >= 0) selectPhoto(index);
      } else if (state.caseId === "defect") {
        state.caseId = "normal";
        if ($("caseSelect")) $("caseSelect").value = "normal";
        renderReview();
        toast("Another case: two normal results end the review requests.");
      } else {
        autoNextScene();
      }
    } else if (state.scene === chapters.length - 1 && state.resultsStep < 2) {
      if (state.resultsStep === 0) {
        document.querySelector(".industrial-strengths")?.scrollIntoView({ block: "start", behavior: "instant" });
      }
      state.resultsStep++;
    } else if (state.scene === chapters.length - 1 && !state.resultsClosing) {
      state.resultsClosing = true;
      document.querySelector(".pipeline-closing")?.scrollIntoView({ block: "center", behavior: "instant" });
    } else if (state.scene === chapters.length - 1) {
      stopTour("Replay complete · You can start again.");
      return;
    } else {
      autoNextScene();
    }
    updateTourControls();
    queueTourTick();
  }

  function startTour() {
    if (state.scene === chapters.length - 1) resetTour();
    state.playing = true;
    narrateChapter();
    updateTourControls();
    queueTourTick();
  }

  function toggleTour() {
    if (state.playing) stopTour("Paused · Explore the photos or resume the replay.");
    else startTour();
  }

  function resetTour() {
    stopTour();
    state.caseId = "defect";
    state.reviews = { defect: freshReview(), normal: freshReview() };
    state.photo = 0;
    state.method = "features";
    state.overview = "flow";
    state.compareRaw = false;
    state.shift = 0;
    state.resultsStep = 0;
    state.resultsClosing = false;
    if ($("caseSelect")) $("caseSelect").value = state.caseId;
    renderOverview();
    renderMethod();
    renderReview();
    renderComparison();
    renderShift();
    renderInterval();
    showScene(0);
    updateTourControls("Ready to replay from the beginning.");
  }

  const manually = action => safely(event => {
    stopTour();
    action(event);
  });

  function bindManual(id, event, action) {
    const element = $(id);
    if (element) element.addEventListener(event, manually(action));
  }

  function makeFrame(item, index, s, interval = false) {
    const locked = index >= s.budget || !item;
    const recorded = s.r.records[index];
    const selected = !interval && index === s.r.index;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `film-frame${selected ? " selected" : ""}${locked ? " locked" : ""}${recorded ? ` ${recorded}` : ""}`;
    button.disabled = locked;
    button.setAttribute("aria-pressed", String(selected));
    const frame = item ? item.frame : s.c.queueFrames[index];
    const status = recorded ? `${labelText(recorded)} checked` : locked ? s.stopped ? "Not requested" : "Locked" : "Pending";
    button.setAttribute("aria-label", `Review candidate ${index + 1}, frame ${num(frame)}, ${status}`);
    if (item) {
      const image = document.createElement("img");
      image.className = "thumb-photo";
      image.src = item.image;
      image.alt = `Fabric photo, frame ${num(frame)}`;
      image.loading = "lazy";
      button.append(image);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "thumb-placeholder";
      placeholder.textContent = s.stopped ? "Not requested" : "Extra candidate";
      button.append(placeholder);
    }
    const meta = document.createElement("span");
    meta.className = "thumb-meta";
    const rank = document.createElement("b"), number = document.createElement("span");
    rank.textContent = String(index + 1).padStart(2, "0");
    number.textContent = num(frame);
    meta.append(rank, number);
    const result = document.createElement("span");
    result.className = "thumb-state";
    result.textContent = status;
    button.append(meta, result);
    button.addEventListener("click", manually(() => {
      selectPhoto(index, s.c.id);
      if (interval) showView("inspect");
    }));
    return button;
  }

  function renderFilmstrip() {
    const container = $("filmstrip");
    if (!container) return;
    const s = reviewStatus();
    container.replaceChildren();
    for (let index = 0; index < s.c.maxReviews; index++) {
      container.append(makeFrame(s.c.review[index], index, s));
    }
  }

  function renderLog(s) {
    const log = $("reviewLog");
    if (!log) return;
    log.replaceChildren();
    if (!s.r.order.length) {
      const empty = document.createElement("li");
      empty.className = "empty-log";
      empty.textContent = "No photos reviewed yet.";
      log.append(empty);
      return;
    }
    s.r.order.forEach(index => {
      const item = s.c.review[index], label = s.r.records[index];
      const row = document.createElement("li");
      row.className = label;
      const frame = document.createElement("b"), status = document.createElement("span");
      frame.textContent = `Frame ${num(item.frame)}`;
      status.textContent = `${labelText(label)} checked`;
      row.append(frame, status);
      log.append(row);
    });
  }

  function renderReview() {
    const s = reviewStatus(), { c, r } = s, item = c.review[r.index];
    if (!item) throw new Error("No record exists for the selected photo.");
    const threshold = c.sourceThreshold;
    const alarm = item.score >= threshold;
    setText("inspectFrame", `Frame ${num(item.frame)}`);
    setText("inspectRun", c.run);
    setText("inspectQueueLabel", `Review candidate ${r.index + 1}`);
    setText("inspectScore", item.score.toFixed(3));
    setText("inspectThreshold", threshold.toFixed(4));
    setText("inspectStatus", alarm ? "Anomaly alert" : "No photo alert");
    if ($("inspectStatus")) $("inspectStatus").className = `status-pill ${alarm ? "alert" : "normal"}`;
    if (!item.heatmap) r.heat = false;
    displayPhotoGroup([
      ["inspectOriginal", item.image, `${c.run} · Fabric photo, frame ${num(item.frame)}`],
      ["inspectHeat", item.heatmap, `DINOv2 anomaly heatmap for frame ${num(item.frame)}`]
    ]);
    if ($("inspectHeat")) $("inspectHeat").hidden = !r.heat || !item.heatmap;
    if ($("toggleHeat")) {
      $("toggleHeat").disabled = !item.heatmap;
      $("toggleHeat").setAttribute("aria-pressed", String(r.heat));
      $("toggleHeat").title = item.heatmap ? "Switch between the original photo and its recorded heatmap." : "This photo is shown as recorded; no matching heatmap is available.";
      const heatDot = document.createElement("span");
      heatDot.className = "heat-dot";
      heatDot.setAttribute("aria-hidden", "true");
      $("toggleHeat").replaceChildren(heatDot, document.createTextNode(!item.heatmap ? "Original photo" : r.heat ? "Show original" : "Show heatmap"));
    }
    if ($("scoreNeedle")) $("scoreNeedle").style.left = `${Math.min(item.score / 0.65, 1) * 100}%`;
    if ($("thresholdMarker")) $("thresholdMarker").style.left = `${threshold / 0.65 * 100}%`;
    if ($("scoreMeter")) $("scoreMeter").setAttribute("aria-label", `Anomaly score ${item.score.toFixed(3)}, alert limit ${threshold.toFixed(4)}. The score is not a defect probability.`);

    setText("reviewCount", String(s.count));
    setText("reviewBudget", String(s.budget));
    setText("reviewPhase", s.complete ? "Review complete" : s.expanded ? "Additional checks" : "First two checks");
    let route = "Start by reviewing the first two photos.";
    if (s.stopped) route = "Both normal → No further requests";
    else if (s.complete) route = "All eight checks completed";
    else if (s.expanded) route = "Defect in first two → Six more requested";
    else if (s.count) route = "First result recorded. Review the second photo.";
    setText("reviewRoute", route);
    if ($("reviewRoute")) $("reviewRoute").className = `route-message${s.stopped ? " stopped" : s.expanded ? " expanded" : ""}`;

    const label = r.records[r.index];
    setText("reviewOutcome", label ? `${labelText(label)} confirmed · Public label` : "Pending · Inspect the photo and anomaly map.");
    if ($("reviewOutcome")) $("reviewOutcome").className = `review-outcome ${label || "pending"}`;
    if ($("reviewAction")) {
      $("reviewAction").disabled = s.revealed;
      setText("reviewAction", s.revealed ? "Result recorded" : "Reveal review result");
    }
    if ($("previousPhoto")) $("previousPhoto").disabled = r.index === 0;
    const nextIndex = nextPhotoIndex(s);
    if ($("nextPhoto")) {
      $("nextPhoto").disabled = nextIndex === -1;
      setText("nextPhoto", s.complete ? "Review complete" : s.expanded && r.index === 1 ? "Review more →" : "Next photo →");
    }
    if ($("reviewSummary")) {
      $("reviewSummary").hidden = !s.complete;
      setText("reviewSummary", s.stopped
        ? "Two normal results ended the requests, leaving six candidates unrequested. This does not certify the whole interval as normal."
        : "Reviewed six defect photos and two normal photos, covering six distinct defect episodes in this run.");
    }
    setText("reviewProvenance", state.caseId === "defect"
      ? "Original demo photos and review order. Public dataset labels are replayed as the review results."
      : "An additional development case. The two photos follow the recorded ranking; unrequested photos are not displayed.");
    renderLog(s);
    renderFilmstrip();
  }

  function nextPhotoIndex(s = reviewStatus()) {
    if (s.complete) return -1;
    for (let offset = 1; offset < s.budget; offset++) {
      const index = (s.r.index + offset) % s.budget;
      if (s.c.review[index] && !s.r.records[index]) return index;
    }
    if (s.r.index + 1 < s.budget && s.c.review[s.r.index + 1]) return s.r.index + 1;
    return -1;
  }

  function revealReview() {
    const s = reviewStatus();
    if (s.revealed || s.r.index >= s.budget) return;
    s.r.records[s.r.index] = s.c.review[s.r.index].recordedLabel;
    s.r.order.push(s.r.index);
    renderReview();
    const after = reviewStatus();
    if (!s.pilotDone && after.expanded) toast("A defect in the first two checks opened six more photos.");
    else if (!s.pilotDone && after.stopped) toast("Both photos were normal, so no more checks were requested.");
  }

  function svg(parent, tag, attrs, text) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, String(value)));
    if (text !== undefined) element.textContent = text;
    parent.append(element);
    return element;
  }

  function line(parent, points, className) {
    return svg(parent, "polyline", { points: points.map(point => point.map(value => value.toFixed(2)).join(",")).join(" "), class: className });
  }

  function renderQueueTrack(id, frames, label) {
    const track = $(id), [first, last] = data.interval.evaluationFrames;
    if (!track) return;
    track.replaceChildren();
    const ordered = frames.slice().sort((a, b) => a - b);
    track.setAttribute("aria-label", `${label}: frames ${ordered.map(num).join(", ")}`);
    ordered.forEach((frame, index) => {
      const marker = document.createElement("i");
      marker.style.left = `${(frame - first) / (last - first) * 100}%`;
      const closeBefore = index > 0 && frame - ordered[index - 1] < 16;
      const closeAfter = index + 1 < ordered.length && ordered[index + 1] - frame < 16;
      marker.style.setProperty("--offset", `${closeBefore ? 5 : closeAfter ? -5 : 0}px`);
      marker.title = `Frame ${num(frame)}`;
      track.append(marker);
    });
  }

  function renderInterval() {
    const d = data.interval, chart = $("intervalChart"), [first, last] = d.evaluationFrames;
    if (!chart) return;
    chart.replaceChildren();
    chart.setAttribute("viewBox", "0 0 640 230");
    const values = d.chart.map(point => point.score), low = Math.min(...values), high = Math.max(...values);
    const pad = (high - low) * 0.12, bottom = Math.max(0, low - pad), top = high + pad;
    const x = frame => 36 + (frame - first) / (last - first) * 584;
    const y = score => 190 - (score - bottom) / (top - bottom) * 163;
    for (let index = 0; index < 4; index++) {
      const value = bottom + (top - bottom) * index / 3;
      svg(chart, "line", { x1: 36, x2: 620, y1: y(value), y2: y(value), class: "chart-grid" });
      svg(chart, "text", { x: 28, y: y(value) + 4, "text-anchor": "end" }, value.toFixed(2));
    }
    line(chart, d.chart.map(point => [x(point.frame), y(point.score)]), "chart-line");
    svg(chart, "line", { x1: 36, x2: 620, y1: y(d.sourceThreshold), y2: y(d.sourceThreshold), class: "chart-limit" });
    const s = reviewStatus("defect");
    data.cases.defect.review.forEach((item, index) => {
      const locked = index >= s.budget;
      const marker = svg(chart, "circle", {
        cx: x(item.frame), cy: y(item.score), r: index < 2 ? 6 : 4.5,
        class: `chart-dot${locked ? " conditional" : ""}`,
        tabindex: 0, role: "button", "aria-disabled": String(locked),
        "aria-label": `Candidate ${index + 1}, frame ${num(item.frame)}${locked ? ", available after the first two checks" : ", open in review"}`
      });
      svg(marker, "title", {}, `Candidate ${index + 1} · Frame ${num(item.frame)} · Score ${item.score.toFixed(3)}`);
      const open = () => { if (locked) toast("Review the first two photos to unlock additional candidates."); else { selectPhoto(index, "defect"); showView("inspect"); } };
      marker.addEventListener("click", manually(open));
      marker.addEventListener("keydown", manually(event => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); open(); } }));
      if (index < 2) svg(chart, "text", { x: x(item.frame) + 9, y: y(item.score) - 10, class: "chart-label" }, `First ${index + 1}`);
    });
    for (const frame of [first, 1000, 2000, last]) {
      svg(chart, "text", { x: x(frame), y: 220, "text-anchor": frame === first ? "start" : frame === last ? "end" : "middle" }, num(frame));
    }
    renderQueueTrack("top8Track", d.unspacedTopFrames, "Top eight scores");
    renderQueueTrack("spaced8Track", d.reviewFrames, "Eight time-spaced photos");
    const photos = $("intervalPhotos");
    if (photos) {
      photos.replaceChildren();
      s.c.review.forEach((item, index) => photos.append(makeFrame(item, index, s, true)));
    }
  }

  function renderShift() {
    const d = data.visualShift, photo = d.photos[state.shift];
    imageSource("shiftReference", d.referencePhoto.image, `Reference run ${d.referencePhoto.run}, frame ${num(d.referencePhoto.frame)}`);
    imageSource("shiftCurrent", photo.image, `New run ${d.targetRun}, frame ${num(photo.frame)}`);
    setText("shiftFrameLabel", `New run · Frame ${num(photo.frame)}`);
    if ($("shiftSlider")) $("shiftSlider").value = String(state.shift);
    if ($("shiftNext")) $("shiftNext").disabled = state.shift === d.photos.length - 1;
    const points = d.points.filter(point => point.targetFrame >= -128 && point.targetFrame <= 192);
    const visible = points.filter(point => point.targetFrame <= photo.frame);
    const last = visible.at(-1);
    let streak = 0;
    for (let index = visible.length - 1; index >= 0; index--) {
      if (visible[index].targetFrame <= 0 || !visible[index].above) break;
      streak++;
    }
    const alerted = photo.frame >= d.alertTargetFrame;
    setText("shiftValue", last ? last.score.toFixed(3) : "—");
    setText("shiftStreak", `${Math.min(streak, 3)} / 3`);
    setText("shiftStatus", alerted ? "Visual shift detected" : "Monitoring");
    if ($("shiftStatus")) $("shiftStatus").className = `status-pill ${alerted ? "alert" : ""}`;
    const chart = $("shiftChart");
    if (!chart) return;
    chart.replaceChildren();
    const x = frame => 32 + (frame + 128) / 320 * 500;
    const max = Math.max(...points.map(point => point.score), d.threshold) * 1.1;
    const y = value => 110 - value / max * 92;
    for (let index = 0; index < 3; index++) svg(chart, "line", { x1: 32, x2: 532, y1: 110 - index * 43, y2: 110 - index * 43, class: "chart-grid" });
    svg(chart, "line", { x1: 32, x2: 532, y1: y(d.threshold), y2: y(d.threshold), class: "chart-limit" });
    svg(chart, "text", { x: 532, y: y(d.threshold) - 6, "text-anchor": "end" }, `Shift limit ${d.threshold.toFixed(3)}`);
    svg(chart, "line", { x1: x(0), x2: x(0), y1: 15, y2: 110, class: "chart-boundary" });
    line(chart, visible.map(point => [x(point.targetFrame), y(point.score)]), "chart-line shift");
    if (last) svg(chart, "circle", { cx: x(last.targetFrame), cy: y(last.score), r: 5, class: "chart-shift-dot" });
    if (alerted) {
      const alert = points.find(point => point.targetFrame === d.alertTargetFrame);
      svg(chart, "circle", { cx: x(alert.targetFrame), cy: y(alert.score), r: 6, class: "chart-shift-dot" });
      svg(chart, "text", { x: x(alert.targetFrame) + 10, y: y(alert.score) - 9, class: "chart-shift-label" }, "Frame 96 · Shift detected");
    }
    svg(chart, "text", { x: 32, y: 134 }, "Reference run");
    svg(chart, "text", { x: x(0) + 5, y: 134 }, "New run begins");
    svg(chart, "text", { x: 532, y: 134, "text-anchor": "end" }, "Frame 192");
  }

  function renderOverview() {
    document.querySelectorAll("[data-overview]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.overview === state.overview)));
    document.querySelectorAll("[data-overview-panel]").forEach(panel => {
      panel.hidden = panel.dataset.overviewPanel !== state.overview;
    });
  }

  function setupReviewRouting() {
    if (routingRuns.length !== 16 || routingRuns.some(row => ![2, 8].includes(row.requests)) || routingRuns.reduce((sum, row) => sum + row.requests, 0) !== 56) {
      throw new Error("Review allocation differs from the original record.");
    }
    const routingPanel = $("reviewRouting");
    if (routingPanel) {
      routingPanel.replaceChildren();
      for (const row of routingRuns) {
        const bar = document.createElement("div");
        bar.className = "handoff-run";
        bar.setAttribute("role", "img");
        bar.setAttribute("aria-label", `${row.run}: ${row.requests} review requests`);
        bar.title = `${row.run} · ${row.requests} requests`;
        for (let slot = 7; slot >= 0; slot--) {
          const cell = document.createElement("i");
          cell.className = slot < 2 ? "is-first" : row.requests === 8 ? "is-extra" : "is-idle";
          bar.append(cell);
        }
        routingPanel.append(bar);
      }
      routingPanel.dataset.ready = "true";
    }
    // Native observers notice the panel after its initially hidden chapter is shown.
    for (const [panel, threshold] of [[routingPanel, 0.35], [$("reviewAllocation"), 0.45]]) {
      if (!panel) continue;
      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(entries => {
          if (entries.some(entry => entry.isIntersecting)) {
            panel.classList.add("is-revealed");
            observer.disconnect();
          }
        }, { threshold });
        observer.observe(panel);
      } else panel.classList.add("is-revealed");
    }
  }

  function renderMethod() {
    document.querySelectorAll("[data-method]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.method === state.method)));
    document.querySelectorAll("[data-method-panel]").forEach(panel => {
      panel.hidden = panel.dataset.methodPanel !== state.method;
    });
  }

  function renderComparison() {
    const photo = comparisonPhotos[state.photo];
    const alt = `${photo.run} · Frame ${num(photo.frame)} · Same fabric photo`;
    displayPhotoGroup([
      ["analysisOriginal", photo.image, alt],
      ["analysisClassicHeat", photo.classic.heatmap, `Handcrafted-feature heatmap for frame ${num(photo.frame)}`],
      ["analysisBase", photo.image, alt],
      ["analysisHeat", photo.dino.heatmap, `DINOv2 heatmap for frame ${num(photo.frame)}`]
    ]);
    for (const id of ["analysisClassicHeat", "analysisHeat"]) if ($(id)) $(id).hidden = state.compareRaw;
    setText("compareRaw", state.compareRaw ? "Compare heatmaps" : "Compare originals");
    if ($("compareRaw")) $("compareRaw").setAttribute("aria-pressed", String(state.compareRaw));
    const verdict = alert => photo.recordedLabel === "normal" ? alert ? "False alarm" : "No false alarm" : alert ? "Defect detected" : "Defect missed";
    for (const [method, valueId, statusId] of [[photo.classic, "classicValue", "classicStatus"], [photo.dino, "anomalyValue", "anomalyStatus"]]) {
      setText(valueId, method.score.toFixed(3));
      setText(statusId, verdict(method.alert));
      if ($(statusId)) $(statusId).className = `status-pill ${method.alert === (photo.recordedLabel === "defect") ? "normal" : "alert"}`;
    }
    setText("comparePhotoLabel", `Frame ${num(photo.frame)} · Public label: ${labelText(photo.recordedLabel)}`);
    document.querySelectorAll("[data-photo]").forEach(button => button.setAttribute("aria-pressed", String(Number(button.dataset.photo) === state.photo)));
  }

  function validateData() {
    if (!data || data.metadata.recordedReplay !== true) throw new Error("Recorded experiment data is missing.");
    if (data.cases.normal.review.length !== 2 || data.cases.defect.review.length !== 8) throw new Error("The number of review photos differs from the record.");
    if (!data.cases.normal.review.every(item => item.recordedLabel === "normal")) throw new Error("The two-check stopping case differs from the record.");
    if (data.cases.defect.review.slice(0, 2).every(item => item.recordedLabel === "normal")) throw new Error("The eight-check expansion case differs from the record.");
    Object.values(data.cases).forEach(c => c.review.forEach((item, index) => {
      if (item.rank !== index + 1 || item.frame !== c.queueFrames[index] || !item.image || !Number.isFinite(item.score)) throw new Error("Photo, rank and score do not match.");
    }));
    if (data.interval.chart.length !== 2884 || data.photoExamples.length !== 3 || comparisonPhotos.length !== 2 || data.visualShift.alertTargetFrame !== 96) throw new Error("The interval record does not match.");
    data.cases.defect.review.forEach(item => {
      const point = data.interval.chart[item.frame - data.interval.evaluationFrames[0]];
      if (!point || point.frame !== item.frame || Math.abs(point.score - item.score) > 0.00001) throw new Error("The photo and score chart do not match.");
    });
  }

  function main() {
    validateData();
    setupReviewRouting();
    document.querySelectorAll("[data-overview]").forEach(button => button.addEventListener("click", manually(() => {
      if (!["flow", "animation"].includes(button.dataset.overview)) return;
      state.overview = button.dataset.overview;
      renderOverview();
    })));
    document.querySelectorAll(".step-evidence").forEach(section => {
      section.addEventListener("click", () => stopTour());
      const details = section.matches("details") ? [section] : section.querySelectorAll("details");
      for (const detail of details) detail.addEventListener("toggle", () => { if (detail.open) stopTour(); });
    });
    document.querySelectorAll("[data-step]").forEach(button => button.addEventListener("click", manually(() => showScene(Number(button.dataset.step)))));
    document.querySelectorAll(".demo-steps [data-step]").forEach(button => button.addEventListener("keydown", manually(event => {
      const buttons = Array.from(document.querySelectorAll(".demo-steps [data-step]"));
      const index = buttons.indexOf(button);
      let next;
      if (event.key === "ArrowRight") next = buttons[Math.min(index + 1, buttons.length - 1)];
      else if (event.key === "ArrowLeft") next = buttons[Math.max(index - 1, 0)];
      else if (event.key === "Home") next = buttons[0];
      else if (event.key === "End") next = buttons.at(-1);
      if (next) { event.preventDefault(); showScene(Number(next.dataset.step)); next.focus(); }
    })));
    document.querySelectorAll("[data-method]").forEach(button => button.addEventListener("click", manually(() => {
      if (!["features", "reference"].includes(button.dataset.method)) return;
      state.method = button.dataset.method;
      renderMethod();
    })));
    document.querySelectorAll("[data-photo]").forEach(button => button.addEventListener("click", manually(() => {
      const index = Number(button.dataset.photo);
      if (!Number.isInteger(index) || index < 0 || index >= comparisonPhotos.length) return;
      state.photo = index;
      renderComparison();
    })));
    bindManual("previousStep", "click", () => showScene(state.scene - 1));
    bindManual("nextStep", "click", () => showScene(state.scene + 1));
    bind("playTour", "click", toggleTour);
    bindManual("startTour", "click", () => showScene(1));
    bindManual("resetTour", "click", resetTour);
    bindManual("caseSelect", "change", event => {
      if (!data.cases[event.target.value]) return;
      state.caseId = event.target.value;
      renderReview();
    });
    bindManual("resetCase", "click", () => { state.reviews[state.caseId] = freshReview(); renderReview(); toast("Review records for this case have been reset."); });
    bindManual("reviewAction", "click", revealReview);
    bindManual("nextPhoto", "click", () => { const index = nextPhotoIndex(); if (index >= 0) selectPhoto(index); });
    bindManual("previousPhoto", "click", () => selectPhoto(state.reviews[state.caseId].index - 1));
    bindManual("toggleHeat", "click", () => { state.reviews[state.caseId].heat = !state.reviews[state.caseId].heat; renderReview(); });
    bindManual("jumpInterval", "click", () => showView("interval"));
    bindManual("compareRaw", "click", () => { state.compareRaw = !state.compareRaw; renderComparison(); });
    bindManual("shiftSlider", "input", event => { state.shift = Math.max(0, Math.min(data.visualShift.photos.length - 1, Number(event.target.value))); renderShift(); });
    bindManual("shiftNext", "click", () => { state.shift = Math.min(state.shift + 1, data.visualShift.photos.length - 1); renderShift(); });
    bind("fullscreen", "click", async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
        else toast("Please use your browser’s full-screen control.");
      } catch { toast("Please use your browser’s full-screen control."); }
    });
    document.addEventListener("keydown", safely(event => {
      if (event.defaultPrevented || event.target.closest("input,select,textarea,button,a,summary,[contenteditable=true]")) return;
      if (event.key === "ArrowRight") { event.preventDefault(); stopTour(); showScene(state.scene + 1); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); stopTour(); showScene(state.scene - 1); }
      else if (event.code === "Space" || event.key === " ") { event.preventDefault(); toggleTour(); }
    }));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state.playing) stopTour("Replay paused because you switched to another tab.");
    });
    document.addEventListener("error", event => {
      if (event.target instanceof HTMLImageElement && event.target.getAttribute("src")) toast("Could not load the photo. Extract the entire ZIP before opening the demo.");
    }, true);
    const params = new URLSearchParams(location.search);
    if (params.get("case") === "normal") state.caseId = "normal";
    if ($("caseSelect")) $("caseSelect").value = state.caseId;
    renderOverview();
    renderMethod();
    renderReview();
    renderComparison();
    renderShift();
    renderInterval();
    const requestedView = params.get("view");
    showView(chapters.some(chapter => chapter.view === requestedView) ? requestedView : "overview");
    if (params.get("play") === "1") startTour();
    window.surfaceTracePresenter = Object.freeze({
      getState: () => JSON.parse(JSON.stringify(state)),
      getReviewStatus: () => { const s = reviewStatus(); return { count: s.count, budget: s.budget, stopped: s.stopped, expanded: s.expanded, complete: s.complete }; }
    });
  }

  try { main(); } catch (error) { fail(error); }
})();
