/* Separate reference-review workspace. Builds a real request manifest, never fabricates new model metrics. */
(() => {
  "use strict";
  const data = window.SURFACETRACE_PRESENTER_DATA;
  const KEY = "surfacetrace-field-demo-v1", $ = id => document.getElementById(id);
  let state, run = 0, controller, toastTimer, storageAvailable = true;
  const format = n => Number(n).toLocaleString("ko-KR");
  const time = value => new Date(value).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const node = (tag, text, cls) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; };
  function normals() {
    const c = data.cases[state.caseId];
    return c.review.flatMap((photo, index) => state.records[index]?.verdict === "normal" ? [{ photo, index }] : []);
  }
  function history(type, description, at = new Date().toISOString()) {
    state.history ||= []; state.history.push({ type, description, at }); state.history = state.history.slice(-500);
  }
  function persist() {
    try {
      const current = JSON.parse(localStorage.getItem(KEY));
      if (current && (current.caseId !== state.caseId || JSON.stringify(current.records) !== JSON.stringify(state.records))) throw new Error("conflict");
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (error) {
      if (error.message === "conflict") throw new Error("검수 기록이 다른 화면에서 변경되었습니다. 작업대로 돌아가 확인해 주세요.");
      storageAvailable = false;
      $("storageStatus").textContent = "브라우저 저장을 사용할 수 없습니다. 검토 기록을 다운로드해 보관하세요.";
    }
  }
  function toast(text) { clearTimeout(toastTimer); $("toast").textContent = text; $("toast").hidden = false; toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3000); }
  function backToRecords() { controller?.abort(); run++; if (!state || !Array.isArray(state.records)) { location.assign("./field-demo.html"); return; } state.phase = "review-summary"; try { persist(); } catch { /* Use the latest stored session on the review page. */ } location.assign("./field-demo.html"); }
  const adapter = {
    preserveReference() { return { referenceId: "frozen-source", model: data.metadata.model, threshold: data.cases[state.caseId].sourceThreshold, preserved: true }; },
    async normalInputs(signal) {
      return Promise.all(normals().map(async ({ photo, index }) => {
        const response = await fetch(photo.image, { signal, cache: "no-cache" });
        if (!response.ok) throw new Error("정상 확인 사진을 불러오지 못했습니다.");
        const image = new Image(), url = URL.createObjectURL(await response.blob());
        try { image.src = url; await image.decode(); } finally { URL.revokeObjectURL(url); }
        return { frame: photo.frame, image: photo.image, userConfirmedAt: state.records[index].at, role: "candidate-normal-input" };
      }));
    },
    validationRequest(baseline, inputs) {
      return { requestId: `reference-${Date.now()}`, status: "queued", baseline, normalInputs: inputs,
        checks: ["normal-photo-false-alerts", "defect-photo-alerts", "distinct-defect-episode-alerts"],
        requestedAt: new Date().toISOString(), requiresBackendExecution: true, liveValidationPerformed: false, metrics: null };
    }
  };
  function wait(ms, signal) { return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new DOMException("Cancelled", "AbortError")); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, ms);
    signal.addEventListener("abort", abort, { once: true }); if (signal.aborted) abort();
  }); }
  async function prepare() {
    if (state.candidatePreparation?.running) return;
    controller?.abort(); controller = new AbortController(); const token = ++run;
    state.candidatePreparation = { stage: 0, running: true, error: null, completedAt: null, validationRequest: null };
    state.exampleViewedAt = null; state.referenceDecision = null;
    try {
      persist(); render();
      const baseline = adapter.preserveReference();
      await wait(1800, controller.signal); if (token !== run) return;
      history("candidate-baseline-preserved", "후보 검증 요청 준비 · 기존 검사 기준 보존");
      state.candidatePreparation.stage = 1; persist(); render();
      const [inputs] = await Promise.all([adapter.normalInputs(controller.signal), wait(2100, controller.signal)]); if (token !== run) return;
      history("candidate-inputs-prepared", `정상 확인 사진 ${inputs.length}장 · 후보 검증 입력 목록 구성`);
      state.candidatePreparation.stage = 2; persist(); render();
      await wait(1900, controller.signal); if (token !== run) return;
      const request = adapter.validationRequest(baseline, inputs);
      state.candidatePreparation = { stage: 3, running: false, error: null, completedAt: new Date().toISOString(), validationRequest: request };
      history("followup-validation-queued", "후속 검증 요청 기록 · 실제 검증 실행 대기", request.requestedAt);
      persist(); render(); toast("정상 확인 사진을 포함한 후보 검증 요청을 기록했습니다.");
    } catch (error) {
      if (token !== run || controller.signal.aborted) return;
      state.candidatePreparation.running = false; state.candidatePreparation.error = error.message || "요청을 준비하지 못했습니다.";
      try { persist(); } catch { /* Keep an error visible without overwriting a newer review. */ }
      render();
    }
  }
  function render() {
    const completed = state.phase === "completed" && !!state.referenceDecision;
    $("referenceWorkspace").hidden = completed; $("completedView").hidden = !completed;
    if (completed) {
      const hold = state.referenceDecision.kind === "hold";
      $("completedDecision").textContent = hold ? "적용 보류 · 기존 기준 유지" : "추가 검증 요청 · 기존 기준 유지";
      $("completedDescription").textContent = hold ? "새 기준 후보의 적용을 보류하고 검수 기록과 검증 요청 정보를 보관합니다." : "추가 검증 요청을 기록했습니다. 검증이 끝날 때까지 기존 검사 기준을 유지합니다.";
      $("completedAt").textContent = time(state.referenceDecision.at); return;
    }
    const selected = normals(), prep = state.candidatePreparation, done = !!prep?.completedAt;
    $("candidateStatus").textContent = `정상 확인 ${selected.length}장을 검증 요청에 포함합니다. 적용 중인 검사 기준은 유지됩니다.`;
    $("normalPhotos").replaceChildren(...selected.map(({ photo }) => { const f = node("figure"), img = node("img"); img.src = photo.image; img.alt = "담당자가 정상으로 확인한 사진"; f.append(img, node("figcaption", `${format(photo.frame)}번째 사진`)); return f; }));
    $("referenceState").textContent = done ? "후속 검증 실행 대기" : prep?.running ? "후보 요청 준비 중" : "후보 검증 요청 준비";
    $("referencePreparation").hidden = done;
    $("preparedRequest").hidden = !done || !!state.exampleViewedAt;
    $("validationHistory").hidden = !done || !state.exampleViewedAt;
    const stage = prep?.stage || 0;
    document.querySelectorAll("[data-reference-step]").forEach(e => {
      const step = Number(e.dataset.referenceStep);
      e.classList.toggle("is-active", done ? step === 3 && !state.referenceDecision : !!prep?.running && step === stage);
      e.classList.toggle("is-done", done ? step < 3 || !!state.referenceDecision : step < stage);
    });
    const titles = ["기존 검사 기준을 보존하고 있습니다.", "정상 확인 사진을 반영할 입력을 준비합니다.", "후속 검증 요청 항목을 구성합니다.", "검증 요청 준비 완료"];
    const descriptions = ["적용 중인 기준과 경보선을 보존합니다.", "확인된 정상 사진을 불러와 후보 검증 요청 목록에 포함합니다.", "오경보와 결함 탐지를 함께 검토하도록 요청 내용을 기록합니다."];
    $("preparationTitle").textContent = prep?.error ? "요청 준비를 완료하지 못했습니다." : prep?.running ? titles[stage] : "새 기준 후보의 검증 요청을 준비합니다.";
    $("preparationDescription").textContent = prep?.error || (prep?.running ? descriptions[stage] : "정상 확인 사진을 포함해 후보 검증에 필요한 입력 목록을 구성합니다.");
    $("preparationIcon").classList.toggle("is-processing", !!prep?.running);
    $("prepareCandidate").hidden = !!prep; $("retryPreparation").hidden = !prep?.error;
    const progress = prep ? [20, 48, 76, 100][stage] : 0;
    $("referenceProgress").setAttribute("aria-valuenow", progress); $("referenceProgress").firstElementChild.style.width = `${progress}%`;
    $("preparedRequestDescription").textContent = done ? `정상 입력 ${prep.validationRequest.normalInputs.length}장 · 기존 기준 보존 완료 · 오경보·결함 탐지 후속 검증 요청` : "";
    if (done && state.exampleViewedAt) {
      const labels = ["정상 사진 오경보", "결함 사진 경보", "신규 결함 사건 경보"];
      $("validationMetrics").replaceChildren(...data.updateEvaluation.metrics.map((m, i) => { const row = node("tr"); row.append(node("td", labels[i]), node("td", format(m.before)), node("td", format(m.after))); return row; }));
    }
  }
  function showHistory() {
    if (!state.candidatePreparation?.completedAt) return;
    state.exampleViewedAt ||= new Date().toISOString(); history("validation-history-viewed", "이전 기준 후보의 검증 기록 열람");
    try { persist(); render(); } catch (error) { toast(error.message); }
  }
  function decide(kind) {
    if (!state.exampleViewedAt || !state.candidatePreparation?.completedAt || !["hold", "additional-validation"].includes(kind)) return;
    state.referenceDecision = { kind, at: new Date().toISOString() }; state.phase = "completed";
    state.candidatePreparation.validationRequest.status = kind === "hold" ? "on-hold" : "additional-validation-requested";
    history("reference-decision", `${kind === "hold" ? "적용 보류" : "추가 검증 요청"} · 기존 기준 유지`, state.referenceDecision.at);
    try { persist(); render(); window.scrollTo({ top: 0, behavior: "instant" }); toast("담당자의 결정을 기록했습니다."); } catch (error) { state.phase = "reference-review"; toast(error.message); }
  }
  function download() {
    const c = data.cases[state.caseId], budget = state.expanded ? c.maxReviews : c.pilotSize;
    const payload = { schemaVersion: 3, demo: true, run: c.run, phase: state.phase, requested: budget, reviewed: state.records.filter(Boolean).length, sourceFrameCount: c.frameCount, appearanceChange: state.candidateRequest?.appearanceChange || { run: c.run, acknowledgedAt: state.shiftAcknowledgedAt }, activeReference: "frozen-source", modelWeightsUpdated: false,
      candidateReviewRequest: state.candidateRequest, candidatePreparation: state.candidatePreparation,
      referenceDecision: state.referenceDecision, history: state.history,
      validationHistory: { source: data.updateEvaluation.source, scope: "previous independent validation record; not metrics for the current selected photos" },
      records: c.review.flatMap((photo, i) => i < budget && state.records[i] ? [{ frame: photo.frame, image: photo.image, recordedAiScore: photo.score, userReview: state.records[i], ...(state.truthRevealed ? { publishedDatasetLabel: photo.recordedLabel } : {}) }] : []) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })), a = node("a"); a.href = url; a.download = "surfacetrace-reference-review.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1200);
  }
  try {
    state = JSON.parse(localStorage.getItem(KEY) || "null");
    const c = data?.cases?.[state?.caseId];
    if (!c || !state.candidateRequested || !Array.isArray(state.records) || normals().length < 2) throw new Error("No candidate request");
    const budget = state.expanded ? c.maxReviews : c.pilotSize;
    if (state.records.slice(0, budget).filter(Boolean).length < budget || c.review.length < budget) throw new Error("Review incomplete");
    state.phase = state.referenceDecision ? "completed" : "reference-review";
    if (state.candidatePreparation?.running) {
      state.candidatePreparation.running = false;
      state.candidatePreparation.error = "새로고침으로 중단된 준비 작업을 다시 시작해 주세요.";
    }
    if (state.candidatePreparation?.completedAt && (!state.candidatePreparation.validationRequest || state.candidatePreparation.validationRequest.metrics !== null)) state.candidatePreparation = null;
    if (state.referenceDecision && !state.candidatePreparation?.completedAt) { state.referenceDecision = null; state.phase = "reference-review"; state.exampleViewedAt = null; }
    $("referenceWorkspace").hidden = false; render();
  } catch { $("referenceEmpty").hidden = false; }
  $("prepareCandidate").addEventListener("click", prepare); $("retryPreparation").addEventListener("click", prepare);
  $("showValidation").addEventListener("click", showHistory);
  $("finishCandidate").addEventListener("click", () => decide("hold")); $("requestMoreValidation").addEventListener("click", () => decide("additional-validation"));
  ["backToRecords", "referenceRecordsNav", "completedRecords"].forEach(id => $(id).addEventListener("click", backToRecords));
  $("completedDownload").addEventListener("click", download);
  $("reopenReference").addEventListener("click", () => { state.phase = "reference-review"; try { persist(); render(); } catch (error) { toast(error.message); } });
  window.surfaceTraceFieldDemo = Object.freeze({ getState: () => JSON.parse(JSON.stringify(state || null)), getStatus: () => ({ normalInputs: state?.records?.filter(r => r?.verdict === "normal").length || 0 }) });
})();
