/* Field workflow: real user decisions; images, DINOv2 scores and MMD results are recorded fixtures. */
(() => {
  "use strict";
  const data = window.SURFACETRACE_PRESENTER_DATA;
  const $ = id => document.getElementById(id);
  const KEY = "surfacetrace-field-demo-v1";
  const verdicts = { normal: "정상", defect: "결함 확인", hold: "판단 보류" };
  const shiftVerdicts = { changed: "변화 확인", unchanged: "변화 없음", hold: "판단 보류" };
  const PHASES = ["ready", "receiving", "analyzing", "change-alert", "reviewing", "review-summary", "reference-review", "completed"];
  const transitions = {
    ready: ["receiving", "review-summary"], receiving: ["analyzing", "ready"],
    analyzing: ["receiving", "change-alert", "ready"], "change-alert": ["reviewing", "review-summary", "ready"],
    reviewing: ["review-summary", "ready"], "review-summary": ["change-alert", "reviewing", "reference-review", "ready"],
    "reference-review": ["completed", "review-summary", "ready"], completed: ["review-summary", "reference-review", "ready"]
  };
  const caseNames = { defect: "외관 변화 및 검수" };
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
    shiftAcknowledgedAt: null, shiftReview: null, shiftDraft: { verdict: null, note: "" }, shiftFrame: 96, shiftViewedFrames: [], shiftAiViewedFrames: [], pages: {}, recordPage: 0, historyPage: 0, batchPage: 0, afterShiftPhase: null, truthRevealed: false, candidateRequested: false, candidateRequest: null,
    exampleViewedAt: null, referenceDecision: null, history: [] });
  let state = fresh(), job = 0, pipelineController, photoController, photoJob = 0;
  const batchAssets = new Map();
  let toastTimer, resetCase = null, storageAvailable = true;
  let shiftController, shiftJob = 0, shiftPhotosReady = false, shiftAiController, shiftAiJob = 0, shiftAiReady = false;
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
      const validShift = r => r && Object.hasOwn(shiftVerdicts, r.verdict) && typeof r.note === "string";
      if (validShift(saved.shiftReview) && validTime(saved.shiftReview.at)) state.shiftReview = { ...saved.shiftReview, note: saved.shiftReview.note.slice(0, 240) };
      if (saved.shiftDraft && (saved.shiftDraft.verdict === null || Object.hasOwn(shiftVerdicts, saved.shiftDraft.verdict)) && typeof saved.shiftDraft.note === "string") state.shiftDraft = { verdict: saved.shiftDraft.verdict, note: saved.shiftDraft.note.slice(0, 240) };
      else if (state.shiftReview) state.shiftDraft = { verdict: state.shiftReview.verdict, note: state.shiftReview.note };
      const frames = shiftPhotos().map(p => p.frame);
      state.shiftFrame = frames.includes(saved.shiftFrame) ? saved.shiftFrame : frames.includes(96) ? 96 : frames[0];
      state.shiftViewedFrames = Array.isArray(saved.shiftViewedFrames) ? saved.shiftViewedFrames.filter(f => frames.includes(f)) : [];
      state.shiftAiViewedFrames = Array.isArray(saved.shiftAiViewedFrames) ? saved.shiftAiViewedFrames.filter(f => frames.includes(f)) : [];
      state.pages = saved.pages && typeof saved.pages === "object" ? Object.fromEntries(Object.entries(saved.pages).filter(([k,v]) => PHASES.includes(k) && Number.isInteger(v) && v >= 0 && v < 6)) : {};
      state.recordPage = Number.isInteger(saved.recordPage) ? Math.max(0,saved.recordPage) : 0;
      state.historyPage = Number.isInteger(saved.historyPage) ? Math.max(0,saved.historyPage) : 0;
      state.batchPage = Number.isInteger(saved.batchPage) ? Math.max(0,saved.batchPage) : 0;
      state.afterShiftPhase = saved.afterShiftPhase === "review-summary" ? "review-summary" : null;
      if (state.records.slice(2).some(Boolean)) state.expanded = true;
      const s = status();
      state.active = Math.min(state.active, s.available - 1);
      state.candidateRequested = !!saved.candidateRequested && s.complete && s.normals.length >= 2;
      state.candidatePreparation = saved.candidatePreparation && typeof saved.candidatePreparation === "object" ? saved.candidatePreparation : null;
      if (state.candidateRequested) {
        state.candidateRequest = { photoFrames: s.normals.map(({ photo }) => photo.frame), requestedAt: validTime(saved.candidateRequest?.requestedAt) ? saved.candidateRequest.requestedAt : null, liveValidationPerformed: false, appearanceChange: saved.candidateRequest?.appearanceChange || { ...getShift(), acknowledgedAt: state.shiftAcknowledgedAt, userReview: state.shiftReview } };
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
    const heading = visiblePages()[state.pages[state.phase] || 0]?.querySelector("h2,h3");
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }
  function transition(phase, focus = true) {
    if (phase !== state.phase && !transitions[state.phase]?.includes(phase)) throw new Error(`Invalid workflow transition: ${state.phase} → ${phase}`);
    if (state.phase === "reference-review" && phase !== "reference-review") referenceController?.cancel();
    if (state.phase !== phase) state.pages[phase] = phase === "reviewing" ? 0 : phase === "reference-review" && state.candidatePreparation?.completedAt ? 2 : 0;
    if (state.phase === "reviewing" && phase !== "reviewing") { photoJob++; photoController?.abort(); }
    state.phase = phase; persist(); render(); if (focus) focusView();
  }
  function cancelJobs() { shiftAiController?.abort(); shiftAiJob++; shiftAiReady = false; shiftController?.abort(); shiftJob++; shiftPhotosReady = false; referenceController?.cancel(); job++; pipelineController?.abort(); photoJob++; photoController?.abort(); batchAssets.clear(); }
  function reset(caseId = null) {
    cancelJobs(); state = fresh();
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
      await Promise.all([adapter.receiveProduction(caseId, controller.signal), wait(1800, controller.signal)]);
      if (!current()) return;
      state.receivedAt ||= new Date().toISOString(); historyOnce("segment-received", `생산 구간 수신 · ${data.cases[caseId].run}`);
      state.loadingStep = 1; transition("analyzing");
      await Promise.all([adapter.savedAnalysis(caseId), wait(2100, controller.signal)]);
      if (!current()) return;
      historyOnce("analysis-loaded", "저장된 DINOv2 이상 분석 결과 준비");
      state.loadingStep = 2; persist(); renderLoading();
      await Promise.all([adapter.savedShift(caseId), wait(1900, controller.signal)]);
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
    if (["reference-review", "completed"].includes(state.phase)) referenceController?.render();
    renderPages();
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
    $("shiftNote").value = state.shiftDraft.note;
    $("shiftTimeline").replaceChildren(...shiftPhotos().map(photo => {
      const button = node("button", `${format(photo.frame)}번째${photo.frame === 96 ? " · 변화 신호" : ""}`);
      button.type = "button"; button.dataset.shiftFrame = photo.frame; button.setAttribute("aria-pressed", String(photo.frame === state.shiftFrame));
      button.addEventListener("click", () => { state.shiftFrame = photo.frame; persist(); renderChange(); }); return button;
    }));
    renderShiftChoice(); loadShiftPhotos();
    $("shiftAcknowledgedAt").textContent = state.shiftAcknowledgedAt ? `${time(state.shiftAcknowledgedAt)} 확인 기록됨` : "확인 결과는 검수 이력에 저장됩니다.";
  }
  function shiftPhotos() {
    const photos = state.caseId === "normal" ? data.cases.normal.review.map(p => ({ frame: p.frame, image: p.image })) : data.visualShift.photos;
    const analyses = window.SURFACETRACE_SHIFT_ANALYSIS?.assets || [];
    return photos.map(p => ({ ...p, ...analyses.find(a => a.run === getShift().run && a.frame === p.frame) }));
  }
  function renderShiftChoice() {
    document.querySelectorAll("[data-shift-verdict]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.shiftVerdict === state.shiftDraft.verdict)));
    $("acknowledgeShift").disabled = !shiftPhotosReady || !state.shiftViewedFrames.length || !Object.hasOwn(shiftVerdicts, state.shiftDraft.verdict);
    $("acknowledgeShift").textContent = state.afterShiftPhase === "review-summary" ? "판단 저장하고 기록으로 돌아가기 →" : "판단 확정하고 검수 진행 →";
    $("shiftDecisionHint").textContent = !shiftPhotosReady ? "비교 사진을 불러온 뒤 판단을 확정할 수 있습니다." : !state.shiftDraft.verdict ? "사진을 비교한 뒤 외관 변화 여부를 선택해 주세요." : `${shiftVerdicts[state.shiftDraft.verdict]}으로 기록합니다. 사진별 결함 검수는 별도로 진행합니다.`;
    renderPages();
  }
  async function loadShiftPhotos(retry = false) {
    shiftController?.abort(); shiftController = new AbortController(); const token = ++shiftJob;
    const reference = data.visualShift.referencePhoto, photos = shiftPhotos();
    const current = photos.find(p => p.frame === state.shiftFrame) || photos[0]; state.shiftFrame = current.frame;
    shiftAiController?.abort(); shiftAiJob++; shiftAiReady = false;
    $("shiftAiBase").hidden = true; $("shiftAiHeat").hidden = true; $("shiftAiUnavailable").hidden = true;
    document.querySelectorAll("[data-shift-ai-zoom]").forEach(b => { b.disabled = true; });
    shiftPhotosReady = false; $("shiftPhotoLoading").hidden = false; $("shiftPhotoError").hidden = true;
    $("shiftReferencePhoto").hidden = true; $("shiftCurrentPhoto").hidden = true; renderShiftChoice();
    $("shiftReferenceCaption").textContent = `${reference.run} · ${format(reference.frame)}번째 사진`;
    $("shiftCurrentCaption").textContent = `${getShift().run} · ${format(current.frame)}번째 사진`;
    try {
      const [left, right] = await Promise.all([adapter.asset(reference.image, shiftController.signal, retry), adapter.asset(current.image, shiftController.signal, retry)]);
      if (token !== shiftJob || state.phase !== "change-alert") return;
      $("shiftReferencePhoto").src = left; $("shiftCurrentPhoto").src = right;
      await Promise.all([$("shiftReferencePhoto").decode(), $("shiftCurrentPhoto").decode()]);
      if (token !== shiftJob || state.phase !== "change-alert") return;
      $("shiftReferencePhoto").hidden = false; $("shiftCurrentPhoto").hidden = false;
      shiftPhotosReady = true; $("shiftPhotoLoading").hidden = true;
      $("shiftAiBase").src = right; $("shiftAiBase").hidden = false;
      persist(); renderShiftChoice(); loadShiftAi();
    } catch {
      if (token !== shiftJob || state.phase !== "change-alert") return;
      $("shiftPhotoLoading").hidden = true; $("shiftPhotoError").hidden = false; renderShiftChoice();
    }
  }
  async function loadShiftAi(retry = false) {
    shiftAiController?.abort(); shiftAiController = new AbortController(); const token = ++shiftAiJob;
    const photo = shiftPhotos().find(p => p.frame === state.shiftFrame); shiftAiReady = false;
    $("shiftAiHeat").hidden = true; $("shiftAiError").hidden = true; $("shiftAiUnavailable").hidden = true;
    document.querySelectorAll("[data-shift-ai-zoom]").forEach(b => { b.disabled = true; });
    $("shiftAiScore").textContent = Number.isFinite(photo?.score) ? `${format(photo.frame)}번째 · 이상 점수 ${photo.score.toFixed(4)}` : `${format(state.shiftFrame)}번째 사진`;
    $("shiftAiLoading").hidden = !photo?.heatmap;
    if (!photo?.heatmap) { $("shiftAiUnavailable").hidden = false; return; }
    try {
      const heat = await adapter.asset(photo.heatmap, shiftAiController.signal, retry);
      if (token !== shiftAiJob || state.phase !== "change-alert" || state.shiftFrame !== photo.frame) return;
      $("shiftAiHeat").src = heat; await $("shiftAiHeat").decode();
      if (token !== shiftAiJob || state.phase !== "change-alert" || state.shiftFrame !== photo.frame) return;
      $("shiftAiHeat").hidden = false; $("shiftAiLoading").hidden = true; shiftAiReady = true;
      document.querySelectorAll("[data-shift-ai-zoom]").forEach(b => { b.disabled = false; }); renderPages();
    } catch {
      if (token !== shiftAiJob || state.phase !== "change-alert") return;
      $("shiftAiLoading").hidden = true; $("shiftAiError").hidden = false;
    }
  }
  function draft(index = state.active) { return state.drafts[index] || (state.records[index] ? { verdict: state.records[index].verdict, note: state.records[index].note } : { verdict: null, note: "" }); }
  function batchPageSize() { return matchMedia("(max-width: 850px)").matches ? 4 : 8; }
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
    $("batchCards").classList.toggle("is-pilot", s.available <= 2);
    $("batchCards").replaceChildren(...s.c.review.slice(0,s.available).map((photo,index)=>{
      const card=node("article",undefined,"batch-card"); card.dataset.batchIndex=index;
      const head=node("div",undefined,"batch-card-heading"), title=node("div");
      title.append(node("strong",`${String(index+1).padStart(2,"0")} · ${format(photo.frame)}번째`),node("small",`이상 점수 ${photo.score.toFixed(4)}`));
      const note=node("button","메모","text-button"); note.type="button";note.dataset.batchNote=index;note.setAttribute("aria-label",`후보 ${index+1} 메모`);note.addEventListener("click",()=>openBatchNote(index)); head.append(title,note);
      const pair=node("div",undefined,"batch-photo-pair");
      for(const mode of ["original","heat"]){
        const button=node("button");button.type="button";button.disabled=true;button.dataset.batchZoom=mode;button.setAttribute("aria-label",`후보 ${index+1} ${mode==="heat"?"AI 표시":"원본"} 확대`);
        const image=node("img");image.id=`batch${mode==="heat"?"Base":"Original"}-${index}`;image.alt=`${photo.frame}번째 사진 ${mode==="heat"?"AI 표시 배경":"원본"}`;image.hidden=true;button.append(image);
        if(mode==="heat"){const heat=node("img",undefined,"batch-heat");heat.id=`batchHeat-${index}`;heat.alt="같은 사진의 AI 이상 영역";heat.hidden=true;button.append(heat);}
        button.append(node("span",mode==="heat"?"AI 표시":"원본","batch-photo-label"));button.addEventListener("click",()=>zoomBatch(index,mode));pair.append(button);
      }
      const options=node("div",undefined,"batch-options");options.setAttribute("role","group");options.setAttribute("aria-label",`후보 ${index+1} 담당자 판정`);
      for(const [verdict,label] of [["normal","정상"],["defect","결함"],["hold","보류"]]){const button=node("button",label);button.type="button";button.dataset.batchVerdict=verdict;button.dataset.index=index;button.setAttribute("aria-pressed","false");button.addEventListener("click",()=>chooseBatch(index,verdict));options.append(button);}
      const info=node("div",undefined,"batch-card-status");info.append(node("span","사진 준비 중…"));const retry=node("button","재시도","text-button");retry.type="button";retry.hidden=true;retry.addEventListener("click",()=>loadBatchPhoto(index,photoJob,true));info.append(retry);
      card.append(head,pair,options,info);return card;
    }));
    photoController?.abort();photoController=new AbortController();const token=++photoJob;batchAssets.clear();
    renderBatchChoice();renderBatchPages();
    s.c.review.slice(0,s.available).forEach((_,index)=>loadBatchPhoto(index,token));
  }
  async function loadBatchPhoto(index,token,retry=false){
    const photo=status().c.review[index], card=$("batchCards").children[index];
    batchAssets.set(index,{ready:false,heatReady:false,error:false});renderBatchChoice();
    try{
      const original=await adapter.asset(photo.image,photoController.signal,retry);
      if(token!==photoJob||state.phase!=="reviewing"||state.reviewGate)return;
      $(`batchOriginal-${index}`).src=original;$(`batchBase-${index}`).src=original;
      $(`batchOriginal-${index}`).hidden=false;$(`batchBase-${index}`).hidden=false;
      batchAssets.set(index,{ready:true,heatReady:false,error:false});card.querySelector('[data-batch-zoom="original"]').disabled=false;renderBatchChoice();
      if(!photo.heatmap){batchAssets.get(index).heatUnavailable=true;renderBatchChoice();return;}
      const heat=await adapter.asset(photo.heatmap,photoController.signal,retry);
      if(token!==photoJob||state.phase!=="reviewing"||state.reviewGate)return;
      $(`batchHeat-${index}`).src=heat;await $(`batchHeat-${index}`).decode();
      if(token!==photoJob||state.phase!=="reviewing"||state.reviewGate)return;
      $(`batchHeat-${index}`).hidden=false;batchAssets.get(index).heatReady=true;card.querySelector('[data-batch-zoom="heat"]').disabled=false;renderBatchChoice();
    }catch{
      if(token!==photoJob||state.phase!=="reviewing"||state.reviewGate)return;
      const asset=batchAssets.get(index)||{ready:false,heatReady:false};asset.error=true;batchAssets.set(index,asset);renderBatchChoice();
    }
  }
  function renderBatchChoice(){
    if(state.phase!=="reviewing"||state.reviewGate)return;
    const s=status();let chosen=0,ready=0;
    [...$("batchCards").children].forEach((card,index)=>{
      const d=draft(index),asset=batchAssets.get(index);if(d.verdict)chosen++;if(asset?.ready)ready++;
      card.querySelectorAll("[data-batch-verdict]").forEach(button=>{button.setAttribute("aria-pressed",String(button.dataset.batchVerdict===d.verdict));button.disabled=!asset?.ready;});
      card.classList.toggle("is-saved",!!state.records[index]&&!state.drafts[index]);
      const message=card.querySelector(".batch-card-status>span");
      message.textContent=asset?.error?(asset.ready?"AI 표시 재시도 가능":"사진 불러오기 실패"):!asset?.ready?"사진 준비 중…":state.records[index]&&!state.drafts[index]?`저장됨 · ${verdicts[d.verdict]}`:d.verdict?`${verdicts[d.verdict]} 선택${d.note?" · 메모 있음":""}`:"판정을 선택하세요";
      message.title=message.textContent;
      card.querySelector(".batch-card-status>button").hidden=!asset?.error;
      card.querySelector("[data-batch-note]").classList.toggle("has-note",!!d.note);
    });
    $("batchHint").textContent=`${s.available}장을 함께 확인하고 판정을 선택하세요. ${chosen} / ${s.available}장 선택`;
    $("saveDecision").disabled=chosen!==s.available||ready!==s.available;
    $("saveDecision").textContent=s.reviewed===s.available&&!state.drafts.some(Boolean)?"검수 결과 확인하기 →":`선택한 ${s.available}장 결과 한 번에 저장 →`;
    $("saveHint").textContent=ready!==s.available?"사진을 불러오는 중입니다.":chosen!==s.available?`남은 ${s.available-chosen}장의 판정을 선택하세요.`:"판정을 확인한 뒤 한 번에 저장하세요.";
    $("batchNormal").disabled=ready!==s.available||chosen===s.available;
  }
  function renderBatchPages(){
    if(state.phase!=="reviewing"||state.reviewGate)return;
    const size=batchPageSize(),cards=[...$("batchCards").children],count=Math.max(1,Math.ceil(cards.length/size));state.batchPage=Math.min(state.batchPage||0,count-1);
    cards.forEach((card,index)=>{card.hidden=Math.floor(index/size)!==state.batchPage;});
    document.querySelector(".batch-pagination").hidden=count===1;$("batchPrevious").disabled=state.batchPage===0;$("batchNext").disabled=state.batchPage===count-1;$("batchPagePosition").textContent=`${state.batchPage+1} / ${count}`;
  }
  function chooseBatch(index,verdict){
    if(state.phase!=="reviewing"||state.reviewGate||!batchAssets.get(index)?.ready||!Object.hasOwn(verdicts,verdict))return;
    state.drafts[index]={...draft(index),verdict};persist();renderBatchChoice();
  }
  function openBatchNote(index){
    if(state.phase!=="reviewing"||state.reviewGate)return;
    state.active=index;$("batchNoteTitle").textContent=`후보 ${index+1} · ${format(status().c.review[index].frame)}번째 사진 메모`;$("reviewNote").value=draft(index).note;$("batchNoteDialog").showModal();
  }
  function zoomBatch(index,mode){
    const asset=batchAssets.get(index);if(!asset?.ready||mode==="heat"&&!asset.heatReady)return;
    $("photoDialogTitle").textContent=`${format(status().c.review[index].frame)}번째 사진 · ${mode==="heat"?"AI 이상 영역":"원본"}`;$("zoomOriginal").src=$(`batchOriginal-${index}`).src;$("zoomHeat").hidden=mode!=="heat";if(mode==="heat")$("zoomHeat").src=$(`batchHeat-${index}`).src;$("photoDialog").showModal();
  }
  function invalidateReference() {
    if (state.candidateRequested) history("candidate-review-invalidated", "검수 결과 수정으로 이전 기준 후보 검토 요청과 담당자 결정을 해제했습니다.");
    state.candidateRequested = false; state.candidateRequest = null; state.exampleViewedAt = null; state.referenceDecision = null; state.candidatePreparation = null; state.truthRevealed = false;
  }
  function saveDecision(){
    const s=status();if(state.phase!=="reviewing"||state.reviewGate||s.c.review.slice(0,s.available).some((_,i)=>!batchAssets.get(i)?.ready||!Object.hasOwn(verdicts,draft(i).verdict)))return;
    const changes=[];
    for(let index=0;index<s.available;index++){
      const d=draft(index),old=state.records[index],note=d.note.trim().slice(0,240);
      if(!old||old.verdict!==d.verdict||old.note!==note)changes.push({index,record:{verdict:d.verdict,note,at:new Date().toISOString()}});
    }
    if(changes.length)invalidateReference();
    for(const {index,record} of changes){state.records[index]=record;history("photo-reviewed",`${s.c.review[index].frame}번째 사진 · ${verdicts[record.verdict]}${record.note?" · "+record.note:""}`,record.at);}
    state.drafts.fill(null);history("review-batch-saved",`담당자가 ${s.available}장의 판정을 한 번에 저장`);toast(`${s.available}장의 검수 결과를 저장했습니다.`);
    if(!state.expanded){
      const needsMore=state.records.slice(0,2).some(r=>r.verdict!=="normal");
      if(state.editing&&!needsMore){state.editing=false;state.reviewGate=null;transition("review-summary");return;}
      state.reviewGate=needsMore?"expand":"stop";history(needsMore?"expansion-needed":"pilot-review-completed",needsMore?"우선 2장 중 결함 또는 판단 보류 · 추가 검수 필요":"정상 2장 확인 · 추가 6장 요청 종료");persist();render();focusView();return;
    }
    if(status().complete){state.editing=false;state.reviewGate=null;history("review-completed",`총 ${s.available}장 검수 완료`);transition("review-summary");}
    else{state.reviewGate="waiting";persist();render();focusView();}
  }
  function gateAction() {
    if (state.phase !== "reviewing") return;
    if (state.reviewGate === "expand") {
      state.expanded = true; state.editing = false;
      history("additional-reviews-requested", "담당자 확인 · 추가 6장 검수 요청");
      const s = status();
      if (s.pending) { state.reviewGate = "waiting"; history("additional-photos-pending", "준비된 추가 사진 없음 · 추가 6장 수신 대기"); }
      else { state.reviewGate = null; state.pages.reviewing = 0; state.active = state.records.findIndex((r, i) => i < s.available && !r); }
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
    $("shiftHistoryStatus").textContent = state.shiftReview ? `${shiftVerdicts[state.shiftReview.verdict]} · ${time(state.shiftReview.at)}` : state.shiftAcknowledgedAt ? `${time(state.shiftAcknowledgedAt)} 알림 확인` : "확인 기록 없음";
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
      const noteCell=node("td"), noteText=node("span",record.note || "—","record-note");noteText.title=record.note;noteCell.append(noteText);
      row.append(node("td", `후보 ${String(index + 1).padStart(2, "0")}`), imageCell, node("td", photo.score.toFixed(4)), decision, noteCell, truth, editCell); return [row];
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
    renderListPages();
  }
  function editPhoto(index) {
    if (!["review-summary"].includes(state.phase) || !state.records[index]) return;
    state.active = index; state.batchPage = Math.floor(index/batchPageSize()); state.editing = true; state.reviewGate = null; transition("reviewing");
  }
  let referenceBusy = false;
  let referenceController;
  async function requestReference() {
    const s = status(); if (state.phase !== "review-summary" || !s.complete || s.normals.length < 2 || referenceBusy) return;
    const token = job;
    referenceBusy = true; $("openCandidate").disabled = true;
    try {
      if (!state.candidateRequested) {
        const request = await adapter.requestReference(s.normals.map(({ photo }) => photo.frame));
        if (token !== job || state.phase !== "review-summary") return;
        state.candidateRequest = { ...request, appearanceChange: { ...getShift(), acknowledgedAt: state.shiftAcknowledgedAt, userReview: state.shiftReview } }; state.candidateRequested = true;
        history("candidate-review-requested", `정상 확인 ${s.normals.length}장 · 기준 후보 검증 검토 요청 · 기존 기준 보존`, state.candidateRequest.requestedAt);
      }
      transition("reference-review");
    } finally { referenceBusy = false; }
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
      appearanceChange: { ...getShift(), acknowledgedAt: state.shiftAcknowledgedAt, userReview: state.shiftReview, scope: "recorded joined-run experiment" },
      candidateReviewRequest: state.candidateRequested ? state.candidateRequest : null,
      validationExample: state.exampleViewedAt ? { viewedAt: state.exampleViewedAt, source: data.updateEvaluation.source, scope: "separate saved experiment, not a live evaluation of this review selection" } : null,
      candidatePreparation: state.candidatePreparation || null,
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
  ["recordsNav", "resumeRecords"].forEach(id => $(id).addEventListener("click", goRecords));
  $("retryLoading").addEventListener("click", () => { if (state.loadingError && busy()) pipeline(); });
  $("startReviewFlow").addEventListener("click", () => { if (state.pipelineReady && busy()) transition("change-alert"); });
  $("acknowledgeShift").addEventListener("click", () => {
    if (state.phase !== "change-alert" || !shiftPhotosReady || !state.shiftViewedFrames.length || !Object.hasOwn(shiftVerdicts, state.shiftDraft.verdict)) return;
    const at = new Date().toISOString(); state.shiftAcknowledgedAt = at;
    state.shiftReview = { verdict: state.shiftDraft.verdict, note: state.shiftDraft.note.trim(), at, referenceRun: data.visualShift.sourceRun, referenceFrame: data.visualShift.referencePhoto.frame, targetRun: getShift().run, currentFrame: state.shiftFrame, comparedFrames: [...state.shiftViewedFrames], aiComparedFrames: [...state.shiftAiViewedFrames] };
    history("shift-reviewed", `외관 변화 담당자 판단 · ${shiftVerdicts[state.shiftReview.verdict]}${state.shiftReview.note ? " · " + state.shiftReview.note : ""} · 사진별 이상 경보와 기존 기준 유지`, at);
    const next = state.afterShiftPhase || (status().complete ? "review-summary" : "reviewing"); state.afterShiftPhase = null;
    transition(next); toast("사진 비교와 외관 변화 판단을 저장했습니다.");
  });
  document.querySelectorAll("[data-shift-verdict]").forEach(button => button.addEventListener("click", () => {
    if (state.phase !== "change-alert") return;
    state.shiftDraft.verdict = button.dataset.shiftVerdict; persist(); renderShiftChoice();
  }));
  $("shiftNote").addEventListener("input", () => { if (state.phase !== "change-alert") return; state.shiftDraft.note = $("shiftNote").value.slice(0, 240); persist(); });
  $("retryShiftPhotos").addEventListener("click", () => loadShiftPhotos(true));
  $("editShiftReview").addEventListener("click", () => { if (state.phase !== "review-summary") return; state.afterShiftPhase = "review-summary"; transition("change-alert"); });
  document.querySelectorAll("[data-shift-zoom]").forEach(button => button.addEventListener("click", () => {
    if (!shiftPhotosReady || state.phase !== "change-alert") return;
    const baseline = button.dataset.shiftZoom === "reference";
    $("photoDialogTitle").textContent = baseline ? $("shiftReferenceCaption").textContent : $("shiftCurrentCaption").textContent;
    $("zoomOriginal").src = $(baseline ? "shiftReferencePhoto" : "shiftCurrentPhoto").src; $("zoomHeat").hidden = true; $("photoDialog").showModal();
  }));
  $("retryShiftAi").addEventListener("click", () => loadShiftAi(true));
  document.querySelectorAll("[data-shift-ai-zoom]").forEach(button => button.addEventListener("click", () => {
    if (!shiftAiReady || state.phase !== "change-alert") return;
    const heat = button.dataset.shiftAiZoom === "heat";
    $("photoDialogTitle").textContent = `${format(state.shiftFrame)}번째 사진 · ${heat ? "AI 제시 영역" : "원본"}`;
    $("zoomOriginal").src = $("shiftCurrentPhoto").src; $("zoomHeat").hidden = !heat;
    if (heat) $("zoomHeat").src = $("shiftAiHeat").src;
    $("photoDialog").showModal();
  }));
  $("gateAction").addEventListener("click", gateAction);
  $("reviewNote").addEventListener("input",()=>{if(state.phase!=="reviewing"||state.reviewGate)return;state.drafts[state.active]={...draft(),note:$("reviewNote").value.slice(0,240)};persist();renderBatchChoice();});
  $("saveDecision").addEventListener("click",saveDecision);
  $("batchNormal").addEventListener("click",()=>{for(let i=0;i<status().available;i++)if(!draft(i).verdict)chooseBatch(i,"normal");});
  for(const [id,delta] of [["batchPrevious",-1],["batchNext",1]])$(id).addEventListener("click",()=>{state.batchPage+=delta;persist();renderBatchPages();});
  ["closeBatchNote","saveBatchNote"].forEach(id=>$(id).addEventListener("click",()=>{$("batchNoteDialog").close();persist();renderBatchChoice();}));
  $("closePhotoDialog").addEventListener("click", () => $("photoDialog").close());
  $("compareTruth").addEventListener("click", () => { state.truthRevealed = true; persist(); renderSummary(); });
  ["downloadRecord"].forEach(id => $(id).addEventListener("click", downloadRecord));
  $("continueReview").addEventListener("click", () => {
    if (state.phase !== "review-summary") return;
    if (!state.reviewGate) { const next = state.records.findIndex((record, index) => index < status().available && !record); if (next >= 0) state.active = next; }
    transition("reviewing");
  });
  $("openCandidate").addEventListener("click", requestReference);

  function visiblePages() {
    const view = document.querySelector("[data-view]:not([hidden])");
    if (!view) return [];
    const parent = state.phase === "reviewing" ? (state.reviewGate ? $("reviewGate") : $("reviewWorkspace").querySelector(".workbench")) : view;
    return [...parent.querySelectorAll(":scope > [data-page]")];
  }
  function renderPages() {
    const pages = visiblePages(); if (!pages.length) return;
    const index = state.reviewGate && state.phase === "reviewing" ? 0 : Math.min(state.pages[state.phase] || 0, pages.length - 1);
    state.pages[state.phase] = index;
    pages.forEach((page,i) => { page.hidden = i !== index; });
    paginateNormalPreviews();
    $("workspacePageTitle").textContent = pages[index].dataset.page;
    $("workspacePagePosition").textContent = `${index+1} / ${pages.length}`;
    const preparing = state.phase === "reference-review" && state.candidatePreparation?.running;
    $("pagePrevious").disabled = index === 0 || preparing;
    $("pageNext").disabled = index === pages.length-1 || preparing || state.phase === "reference-review" && index === 1 && !state.candidatePreparation?.completedAt || state.phase === "change-alert" && index === 1 && !shiftPhotosReady;
    if (state.phase === "change-alert" && index === 1 && shiftPhotosReady) {
      let changed = false;
      if (!state.shiftViewedFrames.includes(state.shiftFrame)) { state.shiftViewedFrames.push(state.shiftFrame); changed = true; }
      if (shiftAiReady && !state.shiftAiViewedFrames.includes(state.shiftFrame)) { state.shiftAiViewedFrames.push(state.shiftFrame); changed = true; }
      if (changed) persist();
    }
  }
  const normalPreviewPages = {};
  function paginateNormalPreviews() {
    for (const id of ["normalSummaryPhotos", "normalPhotos"]) {
      const parent = $(id), photos = [...parent.querySelectorAll("figure")], count = Math.max(1,Math.ceil(photos.length/4));
      normalPreviewPages[id] = Math.min(normalPreviewPages[id] || 0,count-1);
      photos.forEach((photo,i)=>{photo.hidden=Math.floor(i/4)!==normalPreviewPages[id];});
      let nav = $(id+"Paging");
      if(!nav){ nav=node("nav",undefined,"list-pagination normal-pagination");nav.id=id+"Paging";
        for(const delta of [-1,1]) {const b=node("button",delta<0?"← 이전 정상 사진":"다음 정상 사진 →","text-button");b.type="button";b.dataset.delta=delta;b.addEventListener("click",()=>{normalPreviewPages[id]+=delta;paginateNormalPreviews();});nav.append(b);}
        parent.after(nav);
      }
      nav.hidden = count===1; nav.firstElementChild.disabled=normalPreviewPages[id]===0;nav.lastElementChild.disabled=normalPreviewPages[id]===count-1;
    }
  }
  function movePage(delta) {
    if ($(delta > 0 ? "pageNext" : "pagePrevious").disabled) return;
    state.pages[state.phase] = (state.pages[state.phase] || 0) + delta; persist(); renderPages();
    const heading = visiblePages()[state.pages[state.phase]]?.querySelector("h2,h3");
    if (heading) { heading.tabIndex = -1; heading.focus({preventScroll:true}); }
  }
  function renderListPages() {
    const compact = matchMedia("(max-width: 650px)").matches;
    for (const [id,key,size,prefix] of [["recordRows","recordPage",compact ? 2 : 4,"record"],["inspectionHistory","historyPage",compact ? 3 : 6,"history"]]) {
      const rows = [...$(id).children], count = Math.max(1,Math.ceil(rows.length/size));
      if (!rows.length) { $(prefix+"Previous").disabled = true; $(prefix+"Next").disabled = true; $(prefix+"PagePosition").textContent = "1 / 1"; continue; }
      state[key] = Math.min(state[key] || 0,count-1);
      rows.forEach((row,i) => { row.hidden = Math.floor(i/size) !== state[key]; });
      $(prefix+"Previous").disabled = state[key]===0; $(prefix+"Next").disabled = state[key]===count-1;
      $(prefix+"PagePosition").textContent = `${state[key]+1} / ${count}`;
    }
  }
  let referenceCompletion;
  function referenceRendered() {
    const completed = state.candidatePreparation?.completedAt;
    if (state.phase === "reference-review") {
      if (state.candidatePreparation?.running) state.pages[state.phase] = 1;
      else if (completed && referenceCompletion !== completed) state.pages[state.phase] = 2;
    }
    referenceCompletion = completed; renderPages(); persist();
  }
  $("pagePrevious").addEventListener("click",()=>movePage(-1)); $("pageNext").addEventListener("click",()=>movePage(1));
  for (const [prefix,key] of [["record","recordPage"],["history","historyPage"]]) for (const [suffix,delta] of [["Previous",-1],["Next",1]]) $(prefix+suffix).addEventListener("click",()=>{state[key]+=delta;renderListPages();persist();});
  $("fieldFullscreen").addEventListener("click",async()=>{try { if(document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { toast("브라우저의 전체 화면 기능을 이용해 주세요."); }});
  document.querySelectorAll("[data-detail]").forEach((button,i)=>button.addEventListener("click",()=>document.querySelectorAll(".detail-dialog")[i].showModal()));
  document.querySelectorAll("[data-close-detail]").forEach(button=>button.addEventListener("click",()=>button.closest("dialog").close()));
  window.addEventListener("resize",()=>{renderPages();renderListPages();renderBatchPages();});
  document.addEventListener("keydown",e=>{if(e.ctrlKey||e.metaKey||e.altKey||e.target.closest("textarea,input,select")||document.querySelector("dialog[open]"))return;if(["ArrowLeft","ArrowRight"].includes(e.key)){e.preventDefault();movePage(e.key==="ArrowRight"?1:-1);}});
  restore();
  if (state.candidatePreparation?.running) {
    state.candidatePreparation.running = false;
    state.candidatePreparation.error = "새로고침으로 중단된 준비 작업을 다시 시작해 주세요.";
  }
  if (location.hash === "#reference") {
    if (state.candidateRequested && status().complete && status().normals.length >= 2) state.phase = state.referenceDecision ? "completed" : "reference-review";
    window.history.replaceState(null, "", location.pathname + location.search);
  }
  referenceController = window.createSurfaceTraceReference({ getState: () => state, persist, navigate: transition, notify: toast, onDownload: downloadRecord, onRender: referenceRendered });
  render();
  window.addEventListener("pageshow", event => { if (event.persisted) {
    referenceController?.cancel(); restore();
    if (state.candidatePreparation?.running) { state.candidatePreparation.running = false; state.candidatePreparation.error = "중단된 준비 작업을 다시 시작해 주세요."; }
    persist(); render();
  } });
  if (busy() && !state.pipelineReady && !state.loadingError) pipeline();
  window.surfaceTraceFieldDemo = Object.freeze({ getState: () => JSON.parse(JSON.stringify(state)), getStatus: () => { const { budget, available, reviewed, pending, complete } = status(); return { budget, available, reviewed, pending, complete }; } });
})();
