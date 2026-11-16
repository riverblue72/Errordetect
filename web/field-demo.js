/* Prepared TSFabrics photos and recorded scores. No live inference or model updates. */
(() => {
  "use strict";
  const data = window.SURFACETRACE_PRESENTER_DATA;
  const $ = id => document.getElementById(id);
  const KEY = "surfacetrace-field-demo-v1";
  const verdicts = { normal: "정상", defect: "결함 확인", hold: "판단 보류" };
  const format = value => Number(value).toLocaleString("ko-KR");
  // Original-limit results, not the lower candidate limit, for the normal-shift run.
  // Source: experiments/unsupervised/results/change_limit_development.json.
  const normalShift = Object.freeze({ run: "T1_S164_I36_1", window: 128, step: 32, requiredConsecutive: 3,
    threshold: 0.06392715334892274, alertTargetFrame: 96,
    points: [{ targetFrame: 32, score: 0.0710906982421875 }, { targetFrame: 64, score: 0.2531893849372864 }, { targetFrame: 96, score: 0.5444892644882202 }],
    source: "experiments/unsupervised/results/change_limit_development.json · runs.T1_S164_I36_1 · original_limit" });
  const fresh = () => ({ version: 2, caseId: null, receivedAt: null, records: [], active: 0,
    expanded: false, phase: "ready", truthRevealed: false, shiftAcknowledgedAt: null,
    candidateRequested: false, candidateRequest: null, exampleViewedAt: null,
    referenceDecision: null, baselineKept: false, history: [] });
  let state = fresh(), choice = null, toastTimer, pendingReceive = null, storageAvailable = true;

  function getShift() {
    if (state.caseId === "normal") return normalShift;
    const shift = data.visualShift;
    return { run: shift.targetRun, window: shift.window, step: shift.step,
      requiredConsecutive: shift.requiredConsecutive, threshold: shift.threshold, alertTargetFrame: shift.alertTargetFrame,
      points: shift.points.filter(point => [32, 64, 96].includes(point.targetFrame)),
      source: "web/presenter-data.js · visualShift · recorded joined-run experiment" };
  }
  const validTime = value => typeof value === "string" && Number.isFinite(Date.parse(value));
  const time = value => validTime(value) ? new Date(value).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "";
  function addHistory(type, description, at = new Date().toISOString()) {
    state.history.push({ type, description, at });
    state.history = state.history.slice(-500);
  }
  function referenceStatus() {
    if (state.referenceDecision?.kind === "hold") return "적용 보류 · 기존 기준 유지";
    if (state.referenceDecision?.kind === "additional-validation") return "추가 검증 요청 · 기존 기준 유지";
    return state.candidateRequested ? "후보 검토 요청 · 기존 기준 유지" : "기존 기준 유지";
  }

  function toast(message) {
    clearTimeout(toastTimer);
    $("toast").textContent = message;
    $("toast").hidden = false;
    toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3200);
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { storageAvailable = false; }
    $("storageStatus").textContent = storageAvailable ? "검수 기록은 이 브라우저에 저장됩니다." : "브라우저 저장을 사용할 수 없습니다. 기록을 내려받아 보관하세요.";
  }
  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!saved || ![1, 2].includes(saved.version) || !["defect", "normal"].includes(saved.caseId)) return;
      const c = data.cases[saved.caseId];
      const records = c.review.map((_, i) => {
        const r = saved.records?.[i];
        return r && Object.hasOwn(verdicts, r.verdict) && typeof r.note === "string" && typeof r.at === "string"
          ? { verdict: r.verdict, note: r.note.slice(0, 240), at: r.at } : null;
      });
      state = { ...fresh(), caseId: saved.caseId, receivedAt: typeof saved.receivedAt === "string" ? saved.receivedAt : null,
        records, active: Number.isInteger(saved.active) ? Math.max(0, Math.min(saved.active, c.review.length - 1)) : 0,
        expanded: !!saved.expanded || records.slice(0, 2).every(Boolean) && records.slice(0, 2).some(r => r.verdict !== "normal"),
        phase: saved.phase === "summary" ? "summary" : "review", truthRevealed: !!saved.truthRevealed,
        shiftAcknowledgedAt: validTime(saved.shiftAcknowledgedAt) ? saved.shiftAcknowledgedAt : null,
        candidateRequested: !!saved.candidateRequested, baselineKept: false,
        history: Array.isArray(saved.history) ? saved.history.filter(event => event && typeof event.type === "string" && typeof event.description === "string" && validTime(event.at)).slice(-500).map(event => ({ type: event.type.slice(0, 60), description: event.description.slice(0, 500), at: event.at })) : [] };
      const status = getStatus();
      state.candidateRequested = state.candidateRequested && status.complete && status.normals.length >= 2;
      if (state.candidateRequested) {
        state.candidateRequest = { photoFrames: status.normals.map(({ photo }) => photo.frame), requestedAt: validTime(saved.candidateRequest?.requestedAt) ? saved.candidateRequest.requestedAt : null };
        state.exampleViewedAt = validTime(saved.exampleViewedAt) ? saved.exampleViewedAt : null;
        if (state.exampleViewedAt && ["hold", "additional-validation"].includes(saved.referenceDecision?.kind) && validTime(saved.referenceDecision?.at)) {
          state.referenceDecision = { kind: saved.referenceDecision.kind, at: saved.referenceDecision.at };
          state.baselineKept = true;
        }
      }
      if (!status.complete) state.phase = "review";
      state.active = Math.min(state.active, status.available - 1);
    } catch { /* Invalid saved records never prevent a fresh demo. */ }
  }
  function getStatus() {
    if (!state.caseId) return { c: null, budget: 0, available: 0, reviewed: 0, complete: false, pending: false, normals: [] };
    const c = data.cases[state.caseId], budget = state.expanded ? c.maxReviews : c.pilotSize;
    const available = Math.min(c.review.length, budget);
    const reviewed = state.records.slice(0, available).filter(Boolean).length;
    return { c, budget, available, reviewed, complete: reviewed === available,
      pending: state.expanded && c.review.length < budget,
      normals: c.review.map((photo, index) => ({ photo, index })).filter(({ index }) => index < available && state.records[index]?.verdict === "normal") };
  }
  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function setImage(id, src) {
    const img = $(id);
    if (img.getAttribute("src") !== src) img.src = src;
  }
  function focusSection(id) {
    const element = $(id);
    element.tabIndex = -1;
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: "center", behavior: "instant" });
  }
  function receive(caseId) {
    state = { ...fresh(), caseId, records: Array(data.cases[caseId].review.length).fill(null), receivedAt: new Date().toISOString(), phase: "review" };
    $("scenario").value = caseId;
    addHistory("segment-received", `생산 구간 수신 · ${data.cases[caseId].run}`, state.receivedAt);
    addHistory("shift-detected", "저장된 MMD 외관 변화 신호 · 새 녹화 96번째 사진", state.receivedAt);
    choice = null;
    persist(); render(); focusSection("shiftTitle");
    toast("새 생산 구간의 외관 변화 알림과 우선 검수 후보가 준비됐습니다.");
  }
  function requestReceive() {
    const caseId = $("scenario").value;
    if (state.caseId && (state.records.some(Boolean) || state.shiftAcknowledgedAt)) {
      pendingReceive = caseId;
      $("resetDialog").showModal();
    } else receive(caseId);
  }
  function routeMessage(s) {
    if (!s.c) return "준비된 실제 직물 사진으로 시작합니다. ‘새 구간 받기’를 눌러주세요.";
    if (s.complete && s.pending) return "추가 확인이 필요합니다. 총 8장을 요청했으며, 이 시연 구간에는 두 장이 준비되어 있어 나머지 6장은 수신 대기 상태로 남습니다.";
    if (s.complete && !state.expanded) return "두 장을 모두 정상으로 확인해 추가 요청을 종료했습니다. 구간 전체가 정상이라는 판정은 아닙니다.";
    if (s.complete) return "요청한 여덟 장의 확인이 끝났습니다. 담당자의 판단과 메모가 검수 기록으로 남았습니다.";
    if (state.expanded) return "우선 확인 결과에 결함 또는 보류가 있어 총 8장으로 검수를 확대했습니다. 이미 요청한 사진은 계속 확인합니다.";
    return "새 구간의 검수 후보가 준비됐습니다. 먼저 두 장을 확인하고 다음 요청 여부를 결정하세요.";
  }
  function render() {
    const s = getStatus(), ready = !s.c, summary = state.phase === "summary";
    $("emptyState").hidden = !ready;
    $("workbench").hidden = ready || summary;
    $("summary").hidden = ready || !summary;
    $("receivedCount").textContent = ready ? "대기 중" : `${format(s.c.frameCount)}장`;
    $("requestCount").textContent = ready ? "—" : `${s.budget}장${s.pending ? " · 일부 대기" : ""}`;
    $("reviewedCount").textContent = `${s.reviewed}장`;
    $("announcement").textContent = routeMessage(s);
    $("shiftPanel").hidden = ready;
    $("activeReferenceStatus").replaceChildren(node("i"), node("span", referenceStatus()));
    $("activeReferenceStatus").dataset.status = state.referenceDecision?.kind || (state.candidateRequested ? "requested" : "current");
    const stage = ready ? "receive" : summary ? "candidate" : !state.shiftAcknowledgedAt ? "shift" : s.reviewed ? "decision" : "review";
    const stages = ["receive", "shift", "review", "decision", "candidate"];
    document.querySelectorAll("[data-stage]").forEach(element => {
      const active = element.dataset.stage === stage;
      if (active) element.setAttribute("aria-current", "step"); else element.removeAttribute("aria-current");
      element.classList.toggle("is-done", stages.indexOf(element.dataset.stage) < stages.indexOf(stage));
    });
    if (ready) return;
    renderShift();
    $("queueCount").textContent = `${s.available}장`;
    $("queueHint").textContent = state.expanded ? s.pending ? "추가 여섯 장의 사진을 기다리고 있습니다." : "추가 후보 여섯 장을 포함해 확인합니다." : s.complete ? "추가 여섯 장은 요청하지 않았습니다." : "처음 두 장의 확인 후 추가 요청이 결정됩니다.";
    renderQueue(s);
    if (summary) renderSummary(s); else renderPhoto(s);
  }
  function renderShift() {
    const shift = getShift();
    $("shiftRun").textContent = `${state.caseId === "defect" ? "시나리오 A" : "시나리오 B"} · ${shift.run}`;
    $("shiftScore").textContent = shift.points.at(-1).score.toFixed(4);
    $("shiftLimit").textContent = shift.threshold.toFixed(4);
    $("shiftPanel").classList.toggle("is-acknowledged", !!state.shiftAcknowledgedAt);
    $("shiftAcknowledgement").textContent = state.shiftAcknowledgedAt ? "담당자 확인 기록됨" : "담당자 미확인";
    $("acknowledgeShift").disabled = !!state.shiftAcknowledgedAt;
    $("acknowledgeShift").textContent = state.shiftAcknowledgedAt ? "외관 변화 알림 확인 완료 ✓" : "외관 변화 알림 확인·기록";
    $("shiftAcknowledgedAt").textContent = state.shiftAcknowledgedAt ? `${time(state.shiftAcknowledgedAt)} 기록` : "확인 이력을 남겨주세요.";
    const max = Math.max(...shift.points.map(point => point.score));
    $("shiftWindows").replaceChildren(...shift.points.map(point => {
      const bar = node("div", undefined, "shift-window");
      const track = node("div", undefined, "shift-bar-track"), fill = node("i");
      fill.style.height = `${Math.max(2, point.score / max * 100)}%`;
      track.append(fill);
      bar.append(node("span", `${point.targetFrame}번째`), track, node("strong", point.score.toFixed(4)));
      return bar;
    }));
  }
  function renderQueue(s) {
    const fragment = document.createDocumentFragment();
    s.c.review.forEach((photo, index) => {
      const locked = index >= s.available, record = state.records[index];
      const button = node("button", undefined, `queue-item${record ? " is-reviewed" : ""}`);
      button.type = "button"; button.disabled = locked; button.dataset.index = String(index);
      button.setAttribute("aria-pressed", String(index === state.active));
      button.setAttribute("aria-label", `후보 ${index + 1}, ${photo.frame}번째 사진, ${locked ? "추가 요청 전" : record ? verdicts[record.verdict] : "미확인"}`);
      const image = node("img"); image.src = photo.image; image.alt = "";
      const text = node("span"); text.append(node("strong", `후보 ${String(index + 1).padStart(2, "0")}`), node("small", locked ? "추가 요청 전" : `${photo.score.toFixed(4)} · ${record ? verdicts[record.verdict] : "미확인"}`));
      button.append(image, text, node("b", locked ? "·" : record ? "✓" : "→"));
      button.addEventListener("click", () => selectPhoto(index)); fragment.append(button);
    });
    $("photoQueue").replaceChildren(fragment);
  }
  function renderPhoto(s) {
    const photo = s.c.review[state.active], record = state.records[state.active];
    choice = record?.verdict || null;
    $("reviewNote").value = record?.note || "";
    $("photoRank").textContent = `REVIEW CANDIDATE ${String(state.active + 1).padStart(2, "0")}`;
    $("photoTitle").textContent = `${format(photo.frame)}번째 사진`;
    $("imageError").hidden = true;
    setImage("originalPhoto", photo.image);
    $("heatPhoto").hidden = true;
    if (photo.heatmap) setImage("heatPhoto", photo.heatmap);
    else $("heatPhoto").removeAttribute("src");
    $("toggleHeat").disabled = !photo.heatmap;
    $("toggleHeat").textContent = photo.heatmap ? "이상 영역 보기" : "히트맵 미제공";
    $("toggleHeat").setAttribute("aria-pressed", "false");
    $("viewLabel").textContent = "ORIGINAL";
    $("photoScore").textContent = photo.score.toFixed(4);
    $("threshold").textContent = s.c.sourceThreshold.toFixed(4);
    const alert = photo.score > s.c.sourceThreshold;
    $("scoreStatus").textContent = alert ? "경보선 초과" : "경보선 이하";
    $("scoreStatus").classList.toggle("is-low", !alert);
    $("photoPosition").textContent = `${state.active + 1} / ${s.available}`;
    $("previousPhoto").disabled = state.active === 0;
    $("nextPhoto").disabled = state.active + 1 >= s.available;
    $("showSummary").hidden = !s.complete;
    $("saveDecision").textContent = record ? "확인 결과 수정 →" : "확인 결과 저장 →";
    renderChoice();
  }
  function renderChoice() {
    document.querySelectorAll("[data-verdict]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.verdict === choice)));
    $("saveDecision").disabled = !choice;
    $("saveHint").textContent = choice ? `${verdicts[choice]}으로 기록합니다. 다음 미확인 사진으로 이어집니다.` : "판단을 하나 선택하면 저장할 수 있습니다.";
  }
  function selectPhoto(index) {
    const s = getStatus();
    if (!s.c || index < 0 || index >= s.available) return;
    state.active = index; choice = null; persist(); render();
  }
  function saveDecision() {
    const s = getStatus();
    if (!s.c || !Object.hasOwn(verdicts, choice) || state.phase !== "review") return;
    state.records[state.active] = { verdict: choice, note: $("reviewNote").value.trim().slice(0, 240), at: new Date().toISOString() };
    if (state.candidateRequested) addHistory("candidate-review-invalidated", "검수 결과 수정 · 이전 기준 후보 검토 요청과 담당자 결정을 해제했습니다.");
    state.candidateRequested = false; state.candidateRequest = null; state.exampleViewedAt = null;
    state.referenceDecision = null; state.baselineKept = false; state.truthRevealed = false;
    addHistory("photo-reviewed", `${s.c.review[state.active].frame}번째 사진 · ${verdicts[choice]}${state.records[state.active].note ? " · " + state.records[state.active].note : ""}`, state.records[state.active].at);
    const expand = !state.expanded && state.records.slice(0, 2).every(Boolean) && state.records.slice(0, 2).some(record => record.verdict !== "normal");
    if (expand) { state.expanded = true; addHistory("additional-reviews-requested", "우선 2장 중 결함 또는 보류 확인 · 추가 6장 요청"); }
    const after = getStatus();
    if (after.complete) {
      state.phase = "summary";
      addHistory(after.pending ? "additional-photos-pending" : "review-completed", after.pending ? "확인한 사진 기록 완료 · 추가 6장 수신 대기" : state.expanded ? "총 8장 검수 완료" : "정상 2장 확인 · 추가 검수 요청 종료");
    }
    else state.active = state.records.findIndex((record, i) => i < after.available && !record);
    choice = null; persist(); render();
    if (after.complete) focusSection("summaryTitle");
    else { focusSection("photoTitle"); if (expand) toast("확인 결과에 따라 검수 요청을 8장으로 확대했습니다."); }
  }
  function renderSummary(s) {
    const counts = { normal: 0, defect: 0, hold: 0 };
    state.records.slice(0, s.available).filter(Boolean).forEach(record => counts[record.verdict]++);
    for (const kind of Object.keys(counts)) $(kind + "Count").textContent = `${counts[kind]}장`;
    $("unrequestedCount").textContent = `${s.c.maxReviews - s.budget}장`;
    $("summaryTitle").textContent = s.pending ? "추가 검수 사진을 요청했습니다." : "확인 결과가 기록되었습니다.";
    $("summaryDescription").textContent = s.pending ? "확인한 두 장의 기록은 보관하고, 추가 사진의 수신을 기다립니다." : state.expanded ? "담당자가 요청된 여덟 장을 확인했습니다. 정상 확인 사진은 기준 후보 검토용 목록에 모을 수 있습니다." : "두 장을 정상으로 확인해 추가 요청을 종료했습니다. 남은 여섯 장을 정상으로 판정한 것은 아닙니다.";
    $("additionalRequestStatus").textContent = state.expanded ? s.pending ? "추가 6장 요청 · 사진 수신 대기" : "추가 6장 요청 · 총 8장 검수 완료" : "추가 요청 종료 · 2장 확인";
    $("shiftHistoryStatus").textContent = state.shiftAcknowledgedAt ? `${time(state.shiftAcknowledgedAt)} 확인·기록` : "미확인 · 위 알림에서 확인 가능";
    $("referenceDecisionStatus").textContent = referenceStatus();
    $("inspectionHistory").replaceChildren(...state.history.map(event => {
      const item = node("li"), date = node("time", time(event.at)); date.dateTime = event.at;
      item.append(date, node("span", event.description)); return item;
    }));
    const rows = document.createDocumentFragment();
    s.c.review.forEach((photo, index) => {
      const record = state.records[index];
      if (!record || index >= s.available) return;
      const row = node("tr"); row.append(node("td", `후보 ${String(index + 1).padStart(2, "0")}`));
      const imageCell = node("td"), image = node("img"); image.src = photo.image; image.alt = `${photo.frame}번째 사진`; imageCell.append(image, document.createTextNode(` ${format(photo.frame)}`));
      const decision = node("td"); decision.append(node("span", verdicts[record.verdict], `verdict-pill ${record.verdict}`));
      const truth = node("td", verdicts[photo.recordedLabel], "truth-column"); truth.hidden = !state.truthRevealed;
      row.append(imageCell, node("td", photo.score.toFixed(4)), decision, node("td", record.note || "—"), truth); rows.append(row);
    });
    $("recordRows").replaceChildren(rows);
    document.querySelectorAll(".truth-column").forEach(cell => { cell.hidden = !state.truthRevealed; });
    $("compareTruth").textContent = state.truthRevealed ? "공개 정답 표시 중" : "공개 정답과 비교하기";
    $("compareTruth").disabled = state.truthRevealed;
    if (state.truthRevealed) {
      const matches = s.c.review.filter((photo, index) => index < s.available && state.records[index]?.verdict === photo.recordedLabel).length;
      $("truthResult").textContent = `확인한 ${s.reviewed}장 중 ${matches}장 일치 · 사용자 판단과 공개 정답의 비교`;
    } else $("truthResult").textContent = "";
    $("openCandidate").disabled = s.normals.length < 2;
    $("openCandidate").textContent = state.candidateRequested ? "기준 후보 검토 내역 보기 →" : "기준 후보 검토 요청 →";
    $("candidateDescription").textContent = s.normals.length >= 2 ? `정상 확인 ${s.normals.length}장을 기준 후보 검증 요청 목록에 추가합니다. 기존 기준은 유지합니다.` : `정상 확인 ${s.normals.length}장 · 최소 2장 이상 확인해야 기준 후보 검토를 요청할 수 있습니다.`;
  }
  function candidateDialog() {
    const s = getStatus();
    if (!s.complete || s.normals.length < 2) return;
    if (!state.candidateRequested) {
      const at = new Date().toISOString();
      state.candidateRequested = true;
      state.candidateRequest = { photoFrames: s.normals.map(({ photo }) => photo.frame), requestedAt: at };
      addHistory("candidate-review-requested", `정상 확인 ${s.normals.length}장 · 기준 후보 검증 검토 요청 · 기존 기준 유지`, at);
      persist(); render();
    }
    $("normalPhotos").replaceChildren(...s.normals.map(({ photo }) => {
      const figure = node("figure"), image = node("img"); image.src = photo.image; image.alt = "담당자가 정상으로 확인한 사진";
      figure.append(image, node("figcaption", `${format(photo.frame)}번째 사진`)); return figure;
    }));
    $("candidateStatus").textContent = `정상 확인 사진 ${s.normals.length}장을 기준 후보 검증 요청 목록에 추가했습니다. 기존 기준은 유지합니다.`;
    $("showValidation").disabled = false;
    $("historicalValidation").hidden = !state.exampleViewedAt;
    if (state.exampleViewedAt) renderValidationExample();
    $("candidateDialog").showModal();
  }
  function renderValidationExample() {
    const labels = ["정상 오경보", "결함 사진 경보", "신규 결함 사건 경보"];
    const fragment = document.createDocumentFragment();
    data.updateEvaluation.metrics.forEach((metric, index) => {
      const row = node("div"), value = node("strong");
      value.append(document.createTextNode(`${format(metric.before)} → `), node("b", format(metric.after)), node("small", metric.unit));
      row.append(node("span", labels[index]), value); fragment.append(row);
    });
    $("validationMetrics").replaceChildren(fragment);
    $("historicalValidation").hidden = false;
    renderReferenceDecision();
  }
  function renderReferenceDecision() {
    $("finishCandidate").disabled = state.referenceDecision?.kind === "hold";
    $("requestMoreValidation").disabled = state.referenceDecision?.kind === "additional-validation";
    $("referenceDecisionMessage").textContent = state.referenceDecision ? `${time(state.referenceDecision.at)} · ${referenceStatus()} 기록됨` : "저장된 예시를 확인한 뒤 담당자의 결정을 기록하세요. 실제 모델과 기준 뱅크는 변경되지 않습니다.";
  }
  function decideReference(kind) {
    if (!["hold", "additional-validation"].includes(kind) || !state.candidateRequested || !state.exampleViewedAt || getStatus().normals.length < 2 || state.referenceDecision?.kind === kind) return;
    const at = new Date().toISOString();
    state.referenceDecision = { kind, at };
    state.baselineKept = true;
    addHistory("reference-decision", `${kind === "hold" ? "적용 보류 · 기존 기준 유지" : "추가 검증 요청 · 기존 기준 유지"} · 별도 저장된 검증 예시 검토`, at);
    persist(); render(); renderReferenceDecision();
    toast("담당자의 결정을 검수 이력에 저장했습니다. 기존 검사 기준은 유지합니다.");
  }
  function downloadRecord() {
    const s = getStatus(); if (!s.c) return;
    const payload = { schemaVersion: 2, demo: true, analysisMode: "recorded-dinov2-and-mmd", run: s.c.run,
      receivedAt: state.receivedAt, exportedAt: new Date().toISOString(), sourceFrameCount: s.c.frameCount,
      requested: s.budget, reviewed: s.reviewed, awaitingAdditionalPhotos: s.pending,
      activeReference: "frozen-source", modelWeightsUpdated: false,
      appearanceChange: { ...getShift(), acknowledgedAt: state.shiftAcknowledgedAt,
        scope: "recorded joined-run experiment; the recording boundary is reproduced offline" },
      candidateReviewRequest: state.candidateRequested ? { ...state.candidateRequest, status: "recorded-for-review", liveValidationPerformed: false } : null,
      validationExample: state.exampleViewedAt ? { viewedAt: state.exampleViewedAt, source: data.updateEvaluation.source,
        scope: "separate saved experiment, not a live evaluation of this review selection" } : null,
      referenceDecision: state.referenceDecision, history: state.history,
      records: s.c.review.flatMap((photo, index) => !state.records[index] || index >= s.available ? [] : [{ frame: photo.frame, rank: photo.rank,
        image: photo.image, recordedAiScore: photo.score, userReview: state.records[index],
        ...(state.truthRevealed ? { publishedDatasetLabel: photo.recordedLabel } : {}) }]) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = node("a"); link.href = url; link.download = `surfacetrace-review-${state.caseId}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); toast("담당자 검수 기록을 내려받았습니다.");
  }
  if (!data?.metadata?.recordedReplay || !data.cases?.defect || !data.cases?.normal) {
    $("announcement").textContent = "시연 데이터를 불러오지 못했습니다. 페이지를 새로고침해 주세요.";
    $("receive").disabled = $("receiveEmpty").disabled = true; return;
  }
  restore();
  if (state.caseId) $("scenario").value = state.caseId;
  $("receive").addEventListener("click", requestReceive);
  $("receiveEmpty").addEventListener("click", requestReceive);
  $("acknowledgeShift").addEventListener("click", () => {
    if (!state.caseId || state.shiftAcknowledgedAt) return;
    state.shiftAcknowledgedAt = new Date().toISOString();
    addHistory("shift-acknowledged", "외관 변화 알림 확인·기록 · 사진별 이상 경보 및 기존 기준 유지", state.shiftAcknowledgedAt);
    // Updating the alert panel does not reset the current photo choice or draft note.
    persist(); renderShift();
    if (state.phase === "summary") renderSummary(getStatus());
    else {
      document.querySelectorAll("[data-stage]").forEach(element => {
        element.removeAttribute("aria-current");
        element.classList.toggle("is-done", ["receive", "shift"].includes(element.dataset.stage));
      });
      document.querySelector(getStatus().reviewed ? '[data-stage="decision"]' : '[data-stage="review"]').setAttribute("aria-current", "step");
    }
    if (state.phase === "review") focusSection("photoTitle");
    toast("외관 변화 알림의 담당자 확인 이력을 남겼습니다.");
  });
  $("restart").addEventListener("click", () => { pendingReceive = null; $("resetDialog").showModal(); });
  $("cancelReset").addEventListener("click", () => $("resetDialog").close());
  $("confirmReset").addEventListener("click", () => {
    $("resetDialog").close();
    if (pendingReceive) receive(pendingReceive);
    else { state = fresh(); choice = null; persist(); render(); window.scrollTo({ top: 0, behavior: "instant" }); }
    pendingReceive = null;
  });
  document.querySelectorAll("[data-verdict]").forEach(button => button.addEventListener("click", () => { choice = button.dataset.verdict; renderChoice(); }));
  $("saveDecision").addEventListener("click", saveDecision);
  $("previousPhoto").addEventListener("click", () => selectPhoto(state.active - 1));
  $("nextPhoto").addEventListener("click", () => selectPhoto(state.active + 1));
  $("toggleHeat").addEventListener("click", () => {
    if (!getStatus().c?.review[state.active].heatmap) return;
    const visible = $("heatPhoto").hidden;
    $("heatPhoto").hidden = !visible;
    $("toggleHeat").setAttribute("aria-pressed", String(visible));
    $("toggleHeat").textContent = visible ? "원본 사진 보기" : "이상 영역 보기";
    $("viewLabel").textContent = visible ? "DINOv2 HEATMAP" : "ORIGINAL";
  });
  $("originalPhoto").addEventListener("error", () => { $("imageError").hidden = false; });
  $("heatPhoto").addEventListener("error", () => { $("heatPhoto").hidden = true; $("viewLabel").textContent = "ORIGINAL"; $("toggleHeat").setAttribute("aria-pressed", "false"); toast("히트맵을 불러오지 못해 원본을 표시합니다."); });
  $("showSummary").addEventListener("click", () => { if (!getStatus().complete) return; state.phase = "summary"; persist(); render(); focusSection("summaryTitle"); });
  $("editReviews").addEventListener("click", () => { state.phase = "review"; state.active = 0; persist(); render(); focusSection("photoTitle"); });
  $("compareTruth").addEventListener("click", () => { state.truthRevealed = true; persist(); renderSummary(getStatus()); });
  $("downloadRecord").addEventListener("click", downloadRecord);
  $("openCandidate").addEventListener("click", candidateDialog);
  $("closeCandidate").addEventListener("click", () => $("candidateDialog").close());
  $("closeCandidateFooter").addEventListener("click", () => $("candidateDialog").close());
  $("finishCandidate").addEventListener("click", () => decideReference("hold"));
  $("requestMoreValidation").addEventListener("click", () => decideReference("additional-validation"));
  $("showValidation").addEventListener("click", () => {
    if (!state.candidateRequested || getStatus().normals.length < 2) return;
    if (!state.exampleViewedAt) {
      state.exampleViewedAt = new Date().toISOString();
      addHistory("validation-example-viewed", "별도 저장된 후속 검증 실험 예시 확인 · 이번 검수 사진의 실시간 평가 아님", state.exampleViewedAt);
      persist();
    }
    renderValidationExample(); renderSummary(getStatus());
    $("historicalValidation").scrollIntoView({ block: "start", behavior: "instant" });
  });
  document.addEventListener("keydown", event => {
    if (state.phase !== "review" || document.querySelector("dialog[open]") || event.ctrlKey || event.metaKey || event.altKey || event.target.closest("textarea,input,select")) return;
    const verdict = { "1": "normal", "2": "defect", "3": "hold" }[event.key];
    if (verdict) { event.preventDefault(); choice = verdict; renderChoice(); }
  });
  render();
  window.surfaceTraceFieldDemo = Object.freeze({ getState: () => JSON.parse(JSON.stringify(state)),
    getStatus: () => { const { budget, available, reviewed, complete, pending } = getStatus(); return { budget, available, reviewed, complete, pending }; } });
})();
