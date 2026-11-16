/* Field workflow: real user decisions; images, DINOv2 scores and MMD results are recorded fixtures. */
(() => {
  "use strict";
  const data = window.SURFACETRACE_PRESENTER_DATA;
  const $ = id => document.getElementById(id);
  const KEY = "surfacetrace-field-demo-v1";
  const verdicts = { normal: "정상", defect: "결함 확인", hold: "판단 보류" };
  const PHASES = ["ready", "receiving", "analyzing", "change-alert", "reviewing", "review-summary", "reference-review", "completed"];
  const transitions = {
    ready: ["receiving", "review-summary"], receiving: ["analyzing", "ready"],
    analyzing: ["receiving", "change-alert", "ready"], "change-alert": ["reviewing", "review-summary", "ready"],
    reviewing: ["review-summary", "ready"], "review-summary": ["reviewing", "reference-review", "ready"],
    "reference-review": ["completed", "review-summary", "ready"], completed: ["review-summary", "ready"]
  };
  const caseNames = { defect: "외관 변화 및 결함 확인", normal: "외관 변화 및 정상 확인" };
  const format = value => Number(value).toLocaleString("ko-KR");
  const validTime = value => typeof value === "string" && Number.isFinite(Date.parse(value));
  const time = value => validTime(value) ? new Date(value).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "";
  // Original (not lowered) limit, from change_limit_development.json, runs.T1_S164_I36_1.
  const normalShift = { run: "T1_S164_I36_1", window: 128, step: 32, requiredConsecutive: 3,
    threshold: 0.06392715334892274, alertTargetFrame: 96,
    points: [{ targetFrame: 32, score: 0.0710906982421875 }, { targetFrame: 64, score: 0.2531893849372864 }, { targetFrame: 96, score: 0.5444892644882202 }],
    source: "experiments/unsupervised/results/change_limit_development.json · original_limit" };
  const fresh = () => ({ version: 3, phase: "ready", caseId: null, receivedAt: null, records: [], drafts: [], active: 0,
    expanded: false, reviewGate: null, editing: false, loadingStep: 0, pipelineReady: false, loadingError: null,
    shiftAcknowledgedAt: null, truthRevealed: false, candidateRequested: false, candidateRequest: null,
    exampleViewedAt: null, referenceDecision: null, history: [] });
  let state = fresh(), job = 0, pipelineController, photoController, photoJob = 0, heatJob = 0;
  let photoReady = false, photoFailed = false, heatBusy = false, toastTimer, resetCase = null, storageAvailable = true;
  const assets = new Map();

  // Data access has no view dependencies. Replace these fixture methods with backend calls later.
  const adapter = {
    async asset(source, signal, reload = false) {
      if (!reload && assets.has(source)) return assets.get(source);
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) controller.abort();
      const timeout = setTimeout(() => controller.abort(), 9000);
      let url;
      try {
        const response = await fetch(source, { signal: controller.signal, cache: "no-cache" });
        if (!response.ok) throw new Error("Image response unavailable");
        const blob = await response.blob();
        if (controller.signal.aborted) throw new DOMException("Cancelled", "AbortError");
        url = URL.createObjectURL(blob);
        const image = new Image(); image.src = url;
        await image.decode();
        if (!image.naturalWidth || controller.signal.aborted) throw new Error("Image unavailable");
        const previous = assets.get(source);
        if (previous) URL.revokeObjectURL(previous);
        assets.set(source, url); return url;
      } catch (error) {
        if (url) URL.revokeObjectURL(url);
        if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
        throw new Error("사진 파일을 불러오지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.");
      } finally { clearTimeout(timeout); signal?.removeEventListener("abort", abort); }
    },
    async receiveProduction(caseId, signal) {
      const c = data.cases[caseId];
      await Promise.all(c.review.slice(0, 2).map(photo => adapter.asset(photo.image, signal)));
      return { frameCount: c.frameCount, run: c.run };
    },
    async savedAnalysis(caseId) {
      const c = data.cases[caseId];
      if (!c.review.every(photo => Number.isFinite(photo.score) && photo.image) || !Number.isFinite(c.sourceThreshold)) throw new Error("저장된 분석 결과를 확인할 수 없습니다.");
      return { photos: c.review, threshold: c.sourceThreshold };
    },
    async savedShift(caseId) { return getShift(caseId); },
    async requestReference(frames) { return { photoFrames: [...frames], requestedAt: new Date().toISOString(), liveValidationPerformed: false }; },
    async savedValidation() { return data.updateEvaluation; }
  };
  function getShift(caseId = state.caseId) {
    if (caseId === "normal") return normalShift;
    const s = data.visualShift;
    return { run: s.targetRun, window: s.window, step: s.step, requiredConsecutive: s.requiredConsecutive,
      threshold: s.threshold, alertTargetFrame: s.alertTargetFrame,
      points: s.points.filter(point => [32, 64, 96].includes(point.targetFrame)),
      source: "web/presenter-data.js · visualShift · recorded joined-run experiment" };
  }
  function status() {
    if (!state.caseId) return { c: null, budget: 0, available: 0, reviewed: 0, pending: false, complete: false, normals: [] };
    const c = data.cases[state.caseId], budget = state.expanded ? c.maxReviews : c.pilotSize;
    const available = Math.min(budget, c.review.length), reviewed = state.records.slice(0, available).filter(Boolean).length;
    return { c, budget, available, reviewed, pending: budget > available,
      complete: reviewed === budget && available === budget,
      normals: c.review.flatMap((photo, index) => index < available && state.records[index]?.verdict === "normal" ? [{ photo, index }] : []) };
  }
  function history(type, description, at = new Date().toISOString()) {
    state.history.push({ type, description, at }); state.history = state.history.slice(-500);
  }
  function historyOnce(type, description) { if (!state.history.some(event => event.type === type)) history(type, description); }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { storageAvailable = false; }
    $("storageStatus").textContent = storageAvailable ? "검수 기록은 이 브라우저에 저장됩니다." : "브라우저 저장을 사용할 수 없습니다. JSON 기록을 내려받아 보관하세요.";
  }
  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!saved || ![1, 2, 3].includes(saved.version) || !["defect", "normal"].includes(saved.caseId)) return;
      const c = data.cases[saved.caseId];
      const record = r => r && Object.hasOwn(verdicts, r.verdict) && typeof r.note === "string" && validTime(r.at)
        ? { verdict: r.verdict, note: r.note.slice(0, 240), at: r.at } : null;
      state = { ...fresh(), caseId: saved.caseId, receivedAt: validTime(saved.receivedAt) ? saved.receivedAt : null,
        records: c.review.map((_, i) => record(saved.records?.[i])),
        drafts: c.review.map((_, i) => {
          const d = saved.drafts?.[i]; return d && (d.verdict === null || Object.hasOwn(verdicts, d.verdict)) && typeof d.note === "string" ? { verdict: d.verdict, note: d.note.slice(0, 240) } : null;
        }),
        expanded: !!saved.expanded, active: Number.isInteger(saved.active) ? Math.max(0, Math.min(saved.active, c.review.length - 1)) : 0,
        shiftAcknowledgedAt: validTime(saved.shiftAcknowledgedAt) ? saved.shiftAcknowledgedAt : null,
        truthRevealed: !!saved.truthRevealed,
        history: Array.isArray(saved.history) ? saved.history.filter(e => e && typeof e.type === "string" && typeof e.description === "string" && validTime(e.at)).slice(-500).map(e => ({ type: e.type.slice(0, 60), description: e.description.slice(0, 500), at: e.at })) : [] };
      if (state.records.slice(2).some(Boolean)) state.expanded = true;
      const s = status();
      state.active = Math.min(state.active, s.available - 1);
      state.candidateRequested = !!saved.candidateRequested && s.complete && s.normals.length >= 2;
      if (state.candidateRequested) {
        state.candidateRequest = { photoFrames: s.normals.map(({ photo }) => photo.frame), requestedAt: validTime(saved.candidateRequest?.requestedAt) ? saved.candidateRequest.requestedAt : null, liveValidationPerformed: false };
        state.exampleViewedAt = validTime(saved.exampleViewedAt) ? saved.exampleViewedAt : null;
        if (state.exampleViewedAt && ["hold", "additional-validation"].includes(saved.referenceDecision?.kind) && validTime(saved.referenceDecision?.at)) state.referenceDecision = { kind: saved.referenceDecision.kind, at: saved.referenceDecision.at };
      }
      if (saved.version === 3 && PHASES.includes(saved.phase)) {
        state.phase = saved.phase;
        state.loadingStep = Math.max(0, Math.min(3, Number(saved.loadingStep) || 0));
        state.pipelineReady = !!saved.pipelineReady;
        state.loadingError = typeof saved.loadingError === "string" ? saved.loadingError.slice(0, 240) : null;
        if (state.pipelineReady && ["receiving", "analyzing"].includes(state.phase)) state.phase = "analyzing";
        state.reviewGate = ["expand", "stop", "waiting"].includes(saved.reviewGate) ? saved.reviewGate : null;
        state.editing = !!saved.editing;
      } else state.phase = state.referenceDecision ? "completed" : s.complete || s.pending && s.reviewed === s.available ? "review-summary" : state.shiftAcknowledgedAt ? "reviewing" : "change-alert";
      if (state.phase === "completed" && !state.referenceDecision) state.phase = "review-summary";
      if (state.phase === "reference-review" && !state.candidateRequested) state.phase = "review-summary";
      if (["reviewing", "review-summary", "reference-review"].includes(state.phase) && !state.shiftAcknowledgedAt) state.phase = "change-alert";
      if (state.phase === "reviewing" && !state.expanded && state.records.slice(0, 2).every(Boolean) && !state.editing) state.reviewGate = state.records.slice(0, 2).some(r => r.verdict !== "normal") ? "expand" : "stop";
    } catch { state = fresh(); }
  }
  function node(tag, text, cls) { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; }
  function toast(text) { clearTimeout(toastTimer); $("toast").textContent = text; $("toast").hidden = false; toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3000); }
  function busy() { return ["receiving", "analyzing"].includes(state.phase); }
  function focusView() {
    window.scrollTo({ top: 0, behavior: "instant" });
    const heading = document.querySelector('[data-view]:not([hidden]) h2');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }
  function transition(phase, focus = true) {
    if (phase !== state.phase && !transitions[state.phase]?.includes(phase)) throw new Error(`Invalid workflow transition: ${state.phase} → ${phase}`);
    state.phase = phase; persist(); render(); if (focus) focusView();
  }
  function cancelJobs() { job++; pipelineController?.abort(); photoJob++; photoController?.abort(); heatJob++; }
  function reset(caseId = null) {
    cancelJobs(); state = fresh(); photoReady = false; photoFailed = false; heatBusy = false;
    persist(); render(); focusView(); if (caseId) startReceiving(caseId);
  }
  function requestReceive(caseId) {
    if (!Object.hasOwn(caseNames, caseId) || busy()) return;
    if (state.records.some(Boolean) || state.shiftAcknowledgedAt || state.candidateRequested) {
      resetCase = caseId; $("resetTitle").textContent = "새 생산 구간을 받을까요?";
      $("resetDescription").textContent = "현재 작업대의 기록을 초기화하고 새 구간을 받습니다. 필요한 기록은 먼저 다운로드해 주세요.";
      $("resetDialog").showModal();
    } else reset(caseId);
  }
  function wait(ms, signal) {
    return new Promise((resolve, reject) => {
      const abort = () => { clearTimeout(timer); reject(new DOMException("Cancelled", "AbortError")); };
      const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, ms);
      signal?.addEventListener("abort", abort, { once: true }); if (signal?.aborted) abort();
    });
  }
  async function pipeline() {
    pipelineController?.abort(); const controller = new AbortController(); pipelineController = controller;
    const token = ++job, caseId = state.caseId;
    const current = () => token === job && !controller.signal.aborted && state.caseId === caseId;
    state.loadingError = null; state.pipelineReady = false; state.loadingStep = 0;
    if (state.phase !== "receiving") transition("receiving"); else { persist(); render(); }
    try {
      await Promise.all([adapter.receiveProduction(caseId, controller.signal), wait(1000, controller.signal)]);
      if (!current()) return;
      state.receivedAt ||= new Date().toISOString(); historyOnce("segment-received", `생산 구간 수신 · ${data.cases[caseId].run}`);
      state.loadingStep = 1; transition("analyzing");
      await Promise.all([adapter.savedAnalysis(caseId), wait(1100, controller.signal)]);
      if (!current()) return;
      historyOnce("analysis-loaded", "저장된 DINOv2 이상 분석 결과 준비");
      state.loadingStep = 2; persist(); renderLoading();
      await Promise.all([adapter.savedShift(caseId), wait(1100, controller.signal)]);
      if (!current()) return;
      historyOnce("shift-loaded", "저장된 MMD 외관 변화 신호 확인 · 새 녹화 96번째 사진");
      state.loadingStep = 3; state.pipelineReady = true; persist(); render();
    } catch (error) {
      if (!current()) return;
      state.loadingError = error.message || "준비된 데이터를 불러오지 못했습니다.";
      persist(); renderLoading();
    }
  }
  function startReceiving(caseId) {
    state = { ...fresh(), caseId, phase: "receiving", records: Array(data.cases[caseId].review.length).fill(null), drafts: Array(data.cases[caseId].review.length).fill(null) };
    persist(); render(); focusView(); pipeline();
  }

  function render() {
    const s = status();
    const view = busy() ? "loading" : state.phase;
    document.querySelectorAll("[data-view]").forEach(e => { e.hidden = e.dataset.view !== view; });
    $("dashboardNav").disabled = busy(); $("recordsNav").disabled = busy() || !s.reviewed;
    $("dashboardNav").toggleAttribute("aria-current", state.phase === "ready");
    $("recordsNav").toggleAttribute("aria-current", ["review-summary", "reference-review", "completed"].includes(state.phase));
    const labels = { ready: "생산 구간 수신 대기", receiving: "생산 데이터 수신 중", analyzing: state.pipelineReady ? "검수 후보 준비 완료" : "AI 분석 결과 준비 중", "change-alert": "새로운 외관 변화 알림", reviewing: state.reviewGate === "waiting" ? "추가 사진 수신 대기" : "담당자 검수 진행 중", "review-summary": "검수 기록 확인", "reference-review": "검사 기준 후보 검토", completed: "담당자 결정 기록 완료" };
    $("productionStatus").textContent = labels[state.phase];
    $("activityDot").className = busy() && !state.pipelineReady && !state.loadingError ? "is-busy" : state.phase === "change-alert" ? "is-alert" : "";
    $("segmentName").textContent = s.c ? `시나리오 ${state.caseId === "defect" ? "A" : "B"} · ${format(s.c.frameCount)}장` : "진행 중인 작업 없음";
    $("pendingBadge").textContent = state.reviewGate === "expand" ? "추가 6장 요청 대기" : state.reviewGate === "waiting" ? "추가 사진 수신 대기" : `검수 대기 ${Math.max(0, s.available - s.reviewed)}장`;
    $("referenceBadge").hidden = !state.referenceDecision;
    $("referenceBadge").textContent = state.referenceDecision?.kind === "hold" ? "후보 적용 보류" : "추가 검증 요청";
    $("referenceBadge").className = `pill ${state.referenceDecision?.kind === "hold" ? "purple" : "amber"}`;
    const stage = state.phase === "ready" || busy() ? "data" : state.phase === "change-alert" ? "change" : state.phase === "reviewing" ? "review" : state.phase === "review-summary" ? "records" : "reference";
    const steps = ["data", "change", "review", "records", "reference"];
    document.querySelectorAll("[data-step]").forEach(e => { if (e.dataset.step === stage) e.setAttribute("aria-current", "step"); else e.removeAttribute("aria-current"); e.classList.toggle("is-done", steps.indexOf(e.dataset.step) < steps.indexOf(stage)); });
    $("resumeCard").hidden = !s.reviewed;
    document.querySelectorAll("[data-receive]").forEach(button => { button.disabled = busy(); });
    if (busy()) renderLoading();
    if (state.phase === "change-alert") renderChange();
    if (state.phase === "reviewing") renderReview();
    if (state.phase === "review-summary") renderSummary();
    if (state.phase === "reference-review") renderReference();
    if (state.phase === "completed") renderCompleted();
  }
  function signalBars(id, shift) {
    const max = Math.max(...shift.points.map(point => point.score));
    $(id).replaceChildren(...shift.points.map(point => {
      const bar = node("div", undefined, "signal-bar"), track = node("div"), fill = node("i");
      fill.style.height = `${point.score / max * 100}%`; track.append(fill);
      bar.append(track, node("span", `${point.targetFrame}번째 사진`), node("small", point.score.toFixed(4))); return bar;
    }));
  }
  function renderLoading() {
    const titles = ["생산 데이터 수신 중", "AI 분석 결과 준비 중", "외관 변화 확인 중", "검수 후보 준비 완료"];
    const messages = ["생산 이미지 데이터를 불러오고 있습니다.", "저장된 AI 이상 분석 결과를 불러오고 있습니다.", "생산 구간의 외관 변화 신호를 확인하고 있습니다.", "검수할 사진 2장이 준비되었습니다."];
    const percent = [20, 48, 76, 100][state.loadingStep];
    $("loadingTitle").textContent = titles[state.loadingStep]; $("loadingMessage").textContent = messages[state.loadingStep];
    $("loadingSegment").textContent = `시나리오 ${state.caseId === "defect" ? "A" : "B"} · ${format(status().c.frameCount)}장 구간`;
    $("loadingPercent").textContent = `${percent}%`; $("loadingProgress").setAttribute("aria-valuenow", percent); $("loadingProgress").firstElementChild.style.width = `${percent}%`;
    $("loadingVisual").dataset.step = String(state.loadingStep);
    document.querySelectorAll("[data-load-step]").forEach(e => { const step = Number(e.dataset.loadStep); e.classList.toggle("is-active", step === state.loadingStep && !state.pipelineReady && !state.loadingError); e.classList.toggle("is-done", step < state.loadingStep || state.pipelineReady); });
    if (state.loadingStep === 2) signalBars("loadingShiftBars", getShift());
    $("loadingError").hidden = !state.loadingError; $("loadingErrorMessage").textContent = state.loadingError || "";
    $("startReviewFlow").hidden = !state.pipelineReady || !!state.loadingError;
  }
  function renderChange() {
    const shift = getShift(); signalBars("shiftBars", shift);
    $("shiftScore").textContent = shift.points.at(-1).score.toFixed(4);
    $("shiftLimit").textContent = `경보선 ${shift.threshold.toFixed(4)} · 연속 3개 창에서 초과`;
    $("shiftSource").textContent = `${shift.run} · 기존 기준 녹화와 새 녹화를 이어 붙인 저장된 전환 실험입니다. ${shift.source}`;
    $("shiftAcknowledgedAt").textContent = state.shiftAcknowledgedAt ? `${time(state.shiftAcknowledgedAt)} 확인 기록됨` : "확인 결과는 검수 이력에 저장됩니다.";
  }
  function draft() { return state.drafts[state.active] || (state.records[state.active] ? { verdict: state.records[state.active].verdict, note: state.records[state.active].note } : { verdict: null, note: "" }); }
  function renderReview() {
    const s = status(), gate = state.reviewGate;
    $("reviewGate").hidden = !gate; $("reviewWorkspace").hidden = !!gate;
    if (gate) {
      const content = gate === "expand" ? ["!", "추가 확인 필요", "추가 검수가 필요합니다.", "우선 확인 결과에서 이상이 확인되어 나머지 6장의 검수를 요청합니다.", "담당자의 결함 확인 또는 판단 보류에 따라 검수를 확대합니다.", "추가 6장 확인하기 →"] : gate === "stop" ? ["✓", "우선 검수 완료", "우선 검수가 완료되었습니다.", "두 장 모두 정상으로 확인되어 추가 6장의 검수 요청을 종료했습니다.", "구간 전체를 정상이라고 확정한 것은 아닙니다.", "검수 결과 확인하기 →"] : ["⌁", "추가 사진 수신 대기", "추가 사진 수신 대기", "추가 6장의 검수를 요청했습니다. 이 시나리오에는 첫 두 장만 준비되어 있어 나머지 사진은 수신 대기로 남습니다.", "준비되지 않은 사진의 판정이나 분석 결과를 생성하지 않습니다.", "현재 검수 기록 확인하기 →"];
      $("reviewGate").dataset.kind = gate;
      ["gateSymbol", "gateBadge", "gateTitle", "gateDescription", "gateCaution", "gateAction"].forEach((id, i) => { $(id).textContent = content[i]; });
      $("gateCount").textContent = `${s.reviewed} / ${s.budget}장`; return;
    }
    $("reviewProgress").textContent = `검수 진행 ${s.reviewed} / ${s.budget}`;
    $("reviewProgressFill").style.width = `${s.reviewed / s.budget * 100}%`;
    $("reviewStageBadge").textContent = state.expanded ? "추가 검수 · 총 8장" : "우선 검수 2장";
    $("queueCount").textContent = `${s.budget}장 요청`;
    $("queueHint").textContent = state.expanded ? "추가 요청된 후보를 포함해 확인합니다." : "먼저 두 장을 확인한 뒤 추가 요청 여부를 결정합니다.";
    $("photoQueue").replaceChildren(...s.c.review.map((photo, index) => {
      const record = state.records[index], locked = index >= s.available, button = node("button", undefined, `queue-item${record ? " is-reviewed" : ""}${state.expanded && index > 1 ? " is-new" : ""}`);
      button.type = "button"; button.disabled = locked; button.dataset.index = String(index); button.setAttribute("aria-pressed", String(index === state.active));
      button.setAttribute("aria-label", `우선순위 ${index + 1}, ${locked ? "추가 요청 전" : record ? verdicts[record.verdict] : "대기"}`);
      const image = node("img"); image.src = photo.image; image.alt = "";
      const text = node("span"); text.append(node("strong", `후보 ${String(index + 1).padStart(2, "0")}`), node("small", `${photo.score.toFixed(4)} · ${locked ? "추가 요청 전" : record ? "확인 완료" : "대기"}`));
      button.append(image, text, node("b", record ? "✓" : "→")); button.addEventListener("click", () => selectPhoto(index)); return button;
    }));
    const photo = s.c.review[state.active], d = draft();
    $("photoRank").textContent = `REVIEW CANDIDATE ${String(state.active + 1).padStart(2, "0")}`;
    $("photoTitle").textContent = `${format(photo.frame)}번째 사진`;
    $("photoScore").textContent = photo.score.toFixed(4); $("threshold").textContent = s.c.sourceThreshold.toFixed(4);
    const alert = photo.score > s.c.sourceThreshold;
    $("scoreStatus").textContent = alert ? "경보선 초과" : "경보선 이하"; $("scoreStatus").className = `pill ${alert ? "amber" : "green"}`;
    $("reviewNote").value = d.note; $("photoPosition").textContent = `${state.active + 1} / ${s.available}`;
    $("previousPhoto").disabled = state.active === 0; $("nextPhoto").disabled = state.active >= s.available - 1;
    $("recentReviews").replaceChildren(...state.records.flatMap((record, index) => {
      if (!record || index >= s.available) return [];
      const item = node("li", `후보 ${index + 1} · ${verdicts[record.verdict]}`); if (record.note) item.append(node("small", record.note)); return [item];
    }));
    if (!s.reviewed) $("recentReviews").append(node("li", "아직 저장한 확인 기록이 없습니다."));
    $("saveDecision").textContent = state.records[state.active] ? "확인 결과 수정 →" : "확인 결과 저장 →";
    loadPhoto(); renderChoice();
  }
  async function loadPhoto(retry = false) {
    photoController?.abort(); photoController = new AbortController();
    const token = ++photoJob, photo = status().c.review[state.active]; heatJob++; heatBusy = false; photoReady = false; photoFailed = false;
    $("photoLoading").hidden = false; $("photoError").hidden = true; $("heatError").hidden = true;
    $("originalPhoto").hidden = true; $("heatPhoto").hidden = true; $("viewLabel").textContent = "ORIGINAL";
    $("toggleHeat").setAttribute("aria-pressed", "false"); $("toggleHeat").textContent = photo.heatmap ? "이상 영역 표시" : "히트맵 미제공"; $("toggleHeat").disabled = true; renderChoice();
    try {
      const url = await adapter.asset(photo.image, photoController.signal, retry);
      if (token !== photoJob || state.phase !== "reviewing" || state.reviewGate) return;
      $("originalPhoto").src = url; $("originalPhoto").hidden = false; photoReady = true;
      $("photoLoading").hidden = true; $("toggleHeat").disabled = !photo.heatmap; renderChoice();
    } catch (error) {
      if (token !== photoJob || state.phase !== "reviewing") return;
      photoFailed = true; $("photoLoading").hidden = true; $("photoError").hidden = false; renderChoice();
    }
  }
  async function toggleHeat(retry = false) {
    const photo = status().c?.review[state.active];
    if (!photo?.heatmap || !photoReady || heatBusy || state.phase !== "reviewing") return;
    if (!retry && !$("heatPhoto").hidden) { $("heatPhoto").hidden = true; $("toggleHeat").textContent = "이상 영역 표시"; $("toggleHeat").setAttribute("aria-pressed", "false"); $("viewLabel").textContent = "ORIGINAL"; return; }
    const token = ++heatJob, imageToken = photoJob; heatBusy = true; $("toggleHeat").disabled = true; $("toggleHeat").textContent = "히트맵 불러오는 중";
    try {
      const url = await adapter.asset(photo.heatmap, photoController.signal, retry);
      if (token !== heatJob || imageToken !== photoJob) return;
      $("heatPhoto").src = url; $("heatPhoto").hidden = false; $("heatError").hidden = true;
      $("toggleHeat").textContent = "원본 사진 보기"; $("toggleHeat").setAttribute("aria-pressed", "true"); $("viewLabel").textContent = "DINOv2 HEATMAP";
    } catch { if (token === heatJob && imageToken === photoJob) { $("heatError").hidden = false; $("toggleHeat").textContent = "이상 영역 표시"; } }
    finally { if (token === heatJob && imageToken === photoJob) { heatBusy = false; $("toggleHeat").disabled = false; } }
  }
  function renderChoice() {
    const d = draft(); document.querySelectorAll("[data-verdict]").forEach(button => { button.setAttribute("aria-pressed", String(button.dataset.verdict === d.verdict)); });
    $("saveDecision").disabled = !d.verdict || !photoReady || photoFailed;
    $("saveHint").textContent = photoFailed ? "사진을 다시 불러온 뒤 판단을 저장해 주세요." : !photoReady ? "사진을 불러오고 있습니다." : d.verdict ? `${verdicts[d.verdict]}으로 저장합니다.` : "담당자의 판단을 선택해 주세요.";
  }
  function choose(verdict) {
    if (state.phase !== "reviewing" || state.reviewGate || !Object.hasOwn(verdicts, verdict)) return;
    state.drafts[state.active] = { ...draft(), verdict }; persist(); renderChoice();
  }
  function selectPhoto(index) {
    if (state.phase !== "reviewing" || state.reviewGate || index < 0 || index >= status().available) return;
    state.active = index; persist(); renderReview();
  }
  function invalidateReference() {
    if (state.candidateRequested) history("candidate-review-invalidated", "검수 결과 수정으로 이전 기준 후보 검토 요청과 담당자 결정을 해제했습니다.");
    state.candidateRequested = false; state.candidateRequest = null; state.exampleViewedAt = null; state.referenceDecision = null; state.truthRevealed = false;
  }
  function saveDecision() {
    const s = status(), d = draft();
    if (state.phase !== "reviewing" || state.reviewGate || !photoReady || !Object.hasOwn(verdicts, d.verdict)) return;
    const record = { verdict: d.verdict, note: d.note.trim().slice(0, 240), at: new Date().toISOString() };
    invalidateReference(); state.records[state.active] = record; state.drafts[state.active] = null;
    history("photo-reviewed", `${s.c.review[state.active].frame}번째 사진 · ${verdicts[record.verdict]}${record.note ? " · " + record.note : ""}`, record.at);
    toast(`후보 ${state.active + 1}의 ${verdicts[record.verdict]} 판정을 저장했습니다.`);
    const after = status();
    if (!state.expanded && state.records.slice(0, 2).every(Boolean)) {
      const needsMore = state.records.slice(0, 2).some(r => r.verdict !== "normal");
      if (state.editing && !needsMore) { state.editing = false; state.reviewGate = null; transition("review-summary"); return; }
      state.reviewGate = needsMore ? "expand" : "stop";
      history(needsMore ? "expansion-needed" : "pilot-review-completed", needsMore ? "우선 2장 중 결함 또는 판단 보류 · 추가 검수 필요" : "정상 2장 확인 · 추가 6장 요청 종료");
      persist(); render(); focusView(); return;
    }
    if (after.complete) { state.editing = false; state.reviewGate = null; history("review-completed", `총 ${after.reviewed}장 검수 완료`); transition("review-summary"); return; }
    state.active = state.records.findIndex((record, index) => index < after.available && !record);
    if (state.active < 0) { state.reviewGate = "waiting"; persist(); render(); focusView(); }
    else { persist(); render(); }
  }
  function gateAction() {
    if (state.phase !== "reviewing") return;
    if (state.reviewGate === "expand") {
      state.expanded = true; state.editing = false;
      history("additional-reviews-requested", "담당자 확인 · 추가 6장 검수 요청");
      const s = status();
      if (s.pending) { state.reviewGate = "waiting"; history("additional-photos-pending", "준비된 추가 사진 없음 · 추가 6장 수신 대기"); }
      else { state.reviewGate = null; state.active = state.records.findIndex((r, i) => i < s.available && !r); }
      persist(); render(); focusView();
    } else if (["stop", "waiting"].includes(state.reviewGate)) transition("review-summary");
  }
  function normalPhotos(id, normals) {
    $(id).replaceChildren(...normals.map(({ photo }) => { const f = node("figure"), image = node("img"); image.src = photo.image; image.alt = "담당자가 정상으로 확인한 사진"; f.append(image, node("figcaption", `${format(photo.frame)}번째 사진`)); return f; }));
    if (!normals.length) $(id).append(node("span", "아직 정상으로 확인한 사진이 없습니다.", "empty-normal"));
  }
  function referenceLabel() { return state.referenceDecision?.kind === "hold" ? "적용 보류 · 기존 기준 유지" : state.referenceDecision ? "추가 검증 요청 · 기존 기준 유지" : state.candidateRequested ? "기준 후보 검토 요청됨" : "기존 기준 적용 중"; }
  function renderSummary() {
    const s = status(), counts = { normal: 0, defect: 0, hold: 0 };
    state.records.slice(0, s.available).filter(Boolean).forEach(r => counts[r.verdict]++);
    $("summaryTitle").textContent = s.pending ? "검수 기록을 보관하고 추가 사진을 기다립니다." : !s.complete ? "진행 중인 검수 기록" : "검수 결과가 기록되었습니다.";
    $("continueReview").hidden = s.complete && state.reviewGate !== "expand";
    $("summaryDescription").textContent = !s.complete && !s.pending ? `확인한 ${s.reviewed}장의 기록을 저장했습니다. 남은 사진의 검수를 이어갈 수 있습니다.` : s.pending ? "추가 6장의 사진 수신 전까지 확인한 두 장의 기록을 보관합니다." : state.expanded ? "요청한 사진의 확인이 끝났습니다. 결과를 확인하고 정상 데이터를 다음 기준 검토에 활용하세요." : "두 장 모두 정상으로 확인되어 추가 요청을 종료했습니다. 구간 전체를 정상으로 확정한 것은 아닙니다.";
    $("summarySegment").textContent = `시나리오 ${state.caseId === "defect" ? "A" : "B"} · ${format(s.c.frameCount)}장`;
    $("shiftHistoryStatus").textContent = state.shiftAcknowledgedAt ? `${time(state.shiftAcknowledgedAt)} 확인` : "확인 기록 없음";
    $("summaryRequested").textContent = `${s.budget}장 요청 / ${s.reviewed}장 확인`;
    $("additionalRequestStatus").textContent = s.pending ? "추가 6장 수신 대기" : state.reviewGate === "expand" ? "추가 6장 확인 대기" : !s.complete ? "검수 진행 중" : state.expanded ? "추가 6장 요청·확인 완료" : "추가 6장 요청 종료";
    for (const kind of Object.keys(counts)) $(kind + "Count").textContent = `${counts[kind]}장`;
    $("unrequestedCount").textContent = `${s.c.maxReviews - s.budget}장`;
    $("recordRows").replaceChildren(...s.c.review.flatMap((photo, index) => {
      const record = state.records[index]; if (!record || index >= s.available) return [];
      const row = node("tr"), imageCell = node("td"), image = node("img"); image.src = photo.image; image.alt = `${photo.frame}번째 사진`;
      imageCell.append(image, document.createTextNode(format(photo.frame)));
      const decision = node("td"); decision.append(node("span", verdicts[record.verdict], `verdict-pill ${record.verdict}`));
      const truth = node("td", verdicts[photo.recordedLabel], "truth-column"); truth.hidden = !state.truthRevealed;
      const editCell = node("td"), button = node("button", "수정", "text-button"); button.type = "button"; button.dataset.edit = index; button.setAttribute("aria-label", `후보 ${index + 1} 판정 수정`); button.addEventListener("click", () => editPhoto(index)); editCell.append(button);
      row.append(node("td", `후보 ${String(index + 1).padStart(2, "0")}`), imageCell, node("td", photo.score.toFixed(4)), decision, node("td", record.note || "—"), truth, editCell); return [row];
    }));
    document.querySelectorAll(".truth-column").forEach(e => { e.hidden = !state.truthRevealed; });
    $("compareTruth").disabled = state.truthRevealed;
    $("truthResult").textContent = state.truthRevealed ? `확인한 ${s.reviewed}장 중 ${s.c.review.filter((p, i) => i < s.available && state.records[i]?.verdict === p.recordedLabel).length}장 일치 · 공개 정답과 사용자 판단 비교` : "";
    $("referenceDecisionStatus").textContent = referenceLabel();
    normalPhotos("normalSummaryPhotos", s.normals);
    $("candidateDescription").textContent = s.normals.length >= 2 && s.complete ? `정상 확인 ${s.normals.length}장을 기준 후보 검증 요청 목록에 추가할 수 있습니다. 기존 검사 기준은 유지됩니다.` : `정상 확인 ${s.normals.length}장 · 검수를 마치고 정상 사진이 2장 이상이면 검토를 요청할 수 있습니다.`;
    $("openCandidate").disabled = !s.complete || s.normals.length < 2;
    $("openCandidate").textContent = state.candidateRequested ? "검사 기준 후보 검토 내역 보기 →" : "새 검사 기준 후보 검토 요청 →";
    $("inspectionHistory").replaceChildren(...state.history.map(event => { const item = node("li"), stamp = node("time", time(event.at)); stamp.dateTime = event.at; item.append(stamp, node("span", event.description)); return item; }));
  }
  function editPhoto(index) {
    if (!["review-summary"].includes(state.phase) || !state.records[index]) return;
    state.active = index; state.editing = true; state.reviewGate = null; transition("reviewing");
  }
  let referenceBusy = false;
  async function requestReference() {
    const s = status(); if (state.phase !== "review-summary" || !s.complete || s.normals.length < 2 || referenceBusy) return;
    const token = job;
    referenceBusy = true; $("openCandidate").disabled = true;
    try {
      if (!state.candidateRequested) {
        const request = await adapter.requestReference(s.normals.map(({ photo }) => photo.frame));
        if (token !== job || state.phase !== "review-summary") return;
        state.candidateRequest = request; state.candidateRequested = true;
        history("candidate-review-requested", `정상 확인 ${s.normals.length}장 · 기준 후보 검증 검토 요청 · 기존 기준 보존`, state.candidateRequest.requestedAt);
      }
      transition("reference-review");
    } finally { referenceBusy = false; }
  }
  function renderReference() {
    const s = status(); normalPhotos("normalPhotos", s.normals);
    $("candidateStatus").textContent = `정상 확인 ${s.normals.length}장을 검증 요청 목록에 저장했습니다. 실시간 후보 학습이나 성능 재계산은 수행하지 않습니다.`;
    $("validationIntro").hidden = !!state.exampleViewedAt; $("historicalValidation").hidden = !state.exampleViewedAt;
    if (state.exampleViewedAt) renderValidation();
  }
  function renderValidation() {
    const labels = ["정상 사진 오경보", "결함 사진 경보", "신규 결함 사건 경보"];
    $("validationMetrics").replaceChildren(...data.updateEvaluation.metrics.map((metric, i) => { const row = node("tr"); row.append(node("td", labels[i]), node("td", format(metric.before)), node("td", format(metric.after))); return row; }));
  }
  async function showValidation() {
    if (state.phase !== "reference-review" || referenceBusy) return;
    const token = job;
    referenceBusy = true; $("showValidation").disabled = true; $("showValidation").textContent = "저장된 예시 불러오는 중";
    try { await adapter.savedValidation(); if (token !== job || state.phase !== "reference-review") return;
      if (!state.exampleViewedAt) { state.exampleViewedAt = new Date().toISOString(); history("validation-example-viewed", "별도 저장된 후속 검증 예시 확인 · 이번 검수 사진의 실시간 평가 아님", state.exampleViewedAt); }
      persist(); renderReference();
    } finally { referenceBusy = false; $("showValidation").disabled = false; $("showValidation").textContent = "저장된 검증 예시 확인 →"; }
  }
  function decideReference(kind) {
    if (state.phase !== "reference-review" || !state.exampleViewedAt || !["hold", "additional-validation"].includes(kind) || referenceBusy) return;
    state.referenceDecision = { kind, at: new Date().toISOString() };
    history("reference-decision", `${kind === "hold" ? "적용 보류 · 기존 기준 유지" : "추가 검증 요청 · 기존 기준 유지"} · 별도 저장된 검증 예시 검토`, state.referenceDecision.at);
    transition("completed"); toast("담당자의 결정을 저장했습니다.");
  }
  function renderCompleted() {
    $("completedView").dataset.decision = state.referenceDecision.kind;
    $("completedDecision").textContent = referenceLabel();
    $("completedDescription").textContent = state.referenceDecision.kind === "hold" ? "결함 탐지 감소를 확인해 이번 후보의 적용을 보류했습니다. 정상 확인 사진과 검수 기록은 다음 검토를 위해 보관합니다." : "추가 검증 요청을 기록했습니다. 후속 검증이 끝나기 전까지 기존 검사 기준을 유지합니다.";
    $("completedAt").textContent = time(state.referenceDecision.at);
  }
  function goRecords() {
    if (!status().reviewed || busy()) return;
    if (state.phase === "reviewing") { state.editing = false; }
    transition("review-summary");
  }
  function downloadRecord() {
    const s = status(); if (!s.c || !s.reviewed) return;
    const payload = { schemaVersion: 3, demo: true, phase: state.phase, analysisMode: "recorded-dinov2-and-mmd", run: s.c.run,
      receivedAt: state.receivedAt, exportedAt: new Date().toISOString(), sourceFrameCount: s.c.frameCount, requested: s.budget, reviewed: s.reviewed,
      awaitingAdditionalPhotos: s.pending, activeReference: "frozen-source", modelWeightsUpdated: false,
      appearanceChange: { ...getShift(), acknowledgedAt: state.shiftAcknowledgedAt, scope: "recorded joined-run experiment" },
      candidateReviewRequest: state.candidateRequested ? state.candidateRequest : null,
      validationExample: state.exampleViewedAt ? { viewedAt: state.exampleViewedAt, source: data.updateEvaluation.source, scope: "separate saved experiment, not a live evaluation of this review selection" } : null,
      referenceDecision: state.referenceDecision, history: state.history,
      records: s.c.review.flatMap((photo, i) => i < s.available && state.records[i] ? [{ frame: photo.frame, rank: photo.rank, image: photo.image, recordedAiScore: photo.score, userReview: state.records[i], ...(state.truthRevealed ? { publishedDatasetLabel: photo.recordedLabel } : {}) }] : []) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const a = node("a"); a.href = url; a.download = `surfacetrace-review-${state.caseId}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500); toast("검수 기록을 내려받았습니다.");
  }

  if (!data?.metadata?.recordedReplay || !data.cases?.normal || !data.cases?.defect || !data.visualShift) { $("productionStatus").textContent = "저장된 시연 데이터를 불러오지 못했습니다. 새로고침해 주세요."; document.querySelectorAll("[data-receive]").forEach(e => { e.disabled = true; }); return; }
  document.querySelectorAll("[data-receive]").forEach(button => button.addEventListener("click", () => requestReceive(button.dataset.receive)));
  $("restart").addEventListener("click", () => { resetCase = null; $("resetTitle").textContent = "시연을 초기화할까요?"; $("resetDescription").textContent = "현재 작업대의 기록을 초기화합니다. 필요한 기록은 먼저 다운로드해 주세요."; $("resetDialog").showModal(); });
  $("cancelReset").addEventListener("click", () => $("resetDialog").close());
  $("confirmReset").addEventListener("click", () => { $("resetDialog").close(); const next = resetCase; resetCase = null; reset(next); });
  $("dashboardNav").addEventListener("click", () => { if (!busy()) transition("ready"); });
  $("newSegment").addEventListener("click", () => transition("ready"));
  ["recordsNav", "resumeRecords", "completedRecords", "backToRecords"].forEach(id => $(id).addEventListener("click", goRecords));
  $("retryLoading").addEventListener("click", () => { if (state.loadingError && busy()) pipeline(); });
  $("startReviewFlow").addEventListener("click", () => { if (state.pipelineReady && busy()) transition("change-alert"); });
  $("acknowledgeShift").addEventListener("click", () => {
    if (state.phase !== "change-alert") return;
    if (!state.shiftAcknowledgedAt) { state.shiftAcknowledgedAt = new Date().toISOString(); history("shift-acknowledged", "외관 변화 알림 확인 · 사진별 이상 경보와 기존 기준 유지", state.shiftAcknowledgedAt); }
    transition(status().complete ? "review-summary" : "reviewing"); toast("변화 알림 확인 이력을 저장했습니다.");
  });
  $("gateAction").addEventListener("click", gateAction);
  document.querySelectorAll("[data-verdict]").forEach(button => button.addEventListener("click", () => choose(button.dataset.verdict)));
  $("reviewNote").addEventListener("input", () => { if (state.phase !== "reviewing" || state.reviewGate) return; state.drafts[state.active] = { ...draft(), note: $("reviewNote").value.slice(0, 240) }; persist(); });
  $("saveDecision").addEventListener("click", saveDecision);
  $("previousPhoto").addEventListener("click", () => selectPhoto(state.active - 1)); $("nextPhoto").addEventListener("click", () => selectPhoto(state.active + 1));
  $("toggleHeat").addEventListener("click", () => toggleHeat()); $("retryHeat").addEventListener("click", () => toggleHeat(true)); $("retryPhoto").addEventListener("click", () => loadPhoto(true));
  $("originalPhoto").addEventListener("error", () => { if (state.phase === "reviewing" && !$("originalPhoto").hidden) { photoReady = false; photoFailed = true; $("photoError").hidden = false; renderChoice(); } });
  $("compareTruth").addEventListener("click", () => { state.truthRevealed = true; persist(); renderSummary(); });
  ["downloadRecord", "completedDownload"].forEach(id => $(id).addEventListener("click", downloadRecord));
  $("continueReview").addEventListener("click", () => {
    if (state.phase !== "review-summary") return;
    if (!state.reviewGate) { const next = state.records.findIndex((record, index) => index < status().available && !record); if (next >= 0) state.active = next; }
    transition("reviewing");
  });
  $("openCandidate").addEventListener("click", requestReference); $("showValidation").addEventListener("click", showValidation);
  $("finishCandidate").addEventListener("click", () => decideReference("hold")); $("requestMoreValidation").addEventListener("click", () => decideReference("additional-validation"));
  document.addEventListener("keydown", event => { if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest("textarea,input,select") || document.querySelector("dialog[open]")) return; const v = { "1": "normal", "2": "defect", "3": "hold" }[event.key]; if (v && state.phase === "reviewing" && !state.reviewGate) { event.preventDefault(); choose(v); } });
  restore(); render();
  if (busy() && !state.pipelineReady && !state.loadingError) pipeline();
  window.surfaceTraceFieldDemo = Object.freeze({ getState: () => JSON.parse(JSON.stringify(state)), getStatus: () => { const { budget, available, reviewed, pending, complete } = status(); return { budget, available, reviewed, pending, complete }; } });
})();
