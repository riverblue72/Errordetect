"use strict";
/* Reference operations for step 05 inside the field workspace. No new model metrics are fabricated. */
window.createSurfaceTraceReference = ({ getState, persist, navigate, notify, onDownload }) => {
  const data = window.SURFACETRACE_PRESENTER_DATA;
  const $ = id => document.getElementById(id);
  let run = 0, controller;
  const format = n => Number(n).toLocaleString("ko-KR");
  const time = value => new Date(value).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const node = (tag, text, cls) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; };
  function normals() {
    const c = data.cases[getState().caseId];
    return c.review.flatMap((photo, index) => getState().records[index]?.verdict === "normal" ? [{ photo, index }] : []);
  }
  function history(type, description, at = new Date().toISOString()) {
    getState().history ||= []; getState().history.push({ type, description, at }); getState().history = getState().history.slice(-500);
  }
  function cancel() {
    controller?.abort(); run++;
    const prep = getState().candidatePreparation;
    if (prep?.running) { prep.running = false; prep.error = "중단된 준비 작업을 다시 시작해 주세요."; }
  }
  function backToRecords() { cancel(); navigate("review-summary"); }
  const adapter = {
    preserveReference() { return { referenceId: "frozen-source", model: data.metadata.model, threshold: data.cases[getState().caseId].sourceThreshold, preserved: true }; },
    async normalInputs(signal) {
      return Promise.all(normals().map(async ({ photo, index }) => {
        const response = await fetch(photo.image, { signal, cache: "no-cache" });
        if (!response.ok) throw new Error("정상 확인 사진을 불러오지 못했습니다.");
        const image = new Image(), url = URL.createObjectURL(await response.blob());
        try { image.src = url; await image.decode(); } finally { URL.revokeObjectURL(url); }
        return { frame: photo.frame, image: photo.image, userConfirmedAt: getState().records[index].at, role: "candidate-normal-input" };
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
    if (getState().phase !== "reference-review" || getState().candidatePreparation?.running) return;
    controller?.abort(); controller = new AbortController(); const token = ++run, session = getState();
    getState().candidatePreparation = { stage: 0, running: true, error: null, completedAt: null, validationRequest: null };
    getState().exampleViewedAt = null; getState().referenceDecision = null;
    try {
      persist(); render();
      const baseline = adapter.preserveReference();
      await wait(1800, controller.signal); if (token !== run || session !== getState() || getState().phase !== "reference-review") return;
      history("candidate-baseline-preserved", "후보 검증 요청 준비 · 기존 검사 기준 보존");
      getState().candidatePreparation.stage = 1; persist(); render();
      const [inputs] = await Promise.all([adapter.normalInputs(controller.signal), wait(2100, controller.signal)]); if (token !== run || session !== getState() || getState().phase !== "reference-review") return;
      history("candidate-inputs-prepared", `정상 확인 사진 ${inputs.length}장 · 후보 검증 입력 목록 구성`);
      getState().candidatePreparation.stage = 2; persist(); render();
      await wait(1900, controller.signal); if (token !== run || session !== getState() || getState().phase !== "reference-review") return;
      const request = adapter.validationRequest(baseline, inputs);
      getState().candidatePreparation = { stage: 3, running: false, error: null, completedAt: new Date().toISOString(), validationRequest: request };
      history("followup-validation-queued", "후속 검증 요청 기록 · 실제 검증 실행 대기", request.requestedAt);
      persist(); render(); notify("정상 확인 사진을 포함한 후보 검증 요청을 기록했습니다.");
    } catch (error) {
      if (token !== run || session !== getState() || controller.signal.aborted) return;
      getState().candidatePreparation.running = false; getState().candidatePreparation.error = error.message || "요청을 준비하지 못했습니다.";
      try { persist(); } catch { /* Keep an error visible without overwriting a newer review. */ }
      render();
    }
  }
  function render() {
    const completed = getState().phase === "completed" && !!getState().referenceDecision;
    $("referenceWorkspace").hidden = completed; $("completedView").hidden = !completed;
    if (completed) {
      const hold = getState().referenceDecision.kind === "hold";
      $("completedDecision").textContent = hold ? "적용 보류 · 기존 기준 유지" : "추가 검증 요청 · 기존 기준 유지";
      $("completedDescription").textContent = hold ? "새 기준 후보의 적용을 보류하고 검수 기록과 검증 요청 정보를 보관합니다." : "추가 검증 요청을 기록했습니다. 검증이 끝날 때까지 기존 검사 기준을 유지합니다.";
      $("completedAt").textContent = time(getState().referenceDecision.at); return;
    }
    const selected = normals(), prep = getState().candidatePreparation, done = !!prep?.completedAt;
    $("candidateStatus").textContent = `정상 확인 ${selected.length}장을 검증 요청에 포함합니다. 적용 중인 검사 기준은 유지됩니다.`;
    $("normalPhotos").replaceChildren(...selected.map(({ photo }) => { const f = node("figure"), img = node("img"); img.src = photo.image; img.alt = "담당자가 정상으로 확인한 사진"; f.append(img, node("figcaption", `${format(photo.frame)}번째 사진`)); return f; }));
    $("referenceState").textContent = done ? "후속 검증 실행 대기" : prep?.running ? "후보 요청 준비 중" : "후보 검증 요청 준비";
    $("referencePreparation").hidden = done;
    $("repeatPreparation").hidden = !done;
    $("preparedRequest").hidden = !done || !!getState().exampleViewedAt;
    $("validationHistory").hidden = !done || !getState().exampleViewedAt;
    const stage = prep?.stage || 0;
    document.querySelectorAll("[data-reference-step]").forEach(e => {
      const step = Number(e.dataset.referenceStep);
      e.classList.toggle("is-active", done ? step === 3 && !getState().referenceDecision : !!prep?.running && step === stage);
      e.classList.toggle("is-done", done ? step < 3 || !!getState().referenceDecision : step < stage);
    });
    const titles = ["기존 검사 기준을 보존하고 있습니다.", "정상 확인 사진을 반영할 입력을 준비합니다.", "새 기준 후보의 이상 검출 검증을 준비하고 있습니다.", "검증 요청 준비 완료"];
    const descriptions = ["적용 중인 기준과 경보선을 보존합니다.", "확인된 정상 사진을 불러와 후보 검증 요청 목록에 포함합니다.", "정상 확인 사진의 입력 목록을 반영해 오경보·결함 탐지 후속 검증 요청을 구성합니다."];
    $("preparationTitle").textContent = prep?.error ? "요청 준비를 완료하지 못했습니다." : prep?.running ? titles[stage] : "새 기준 후보의 이상 검출 검증을 준비합니다.";
    $("preparationDescription").textContent = prep?.error || (prep?.running ? descriptions[stage] : "정상 확인 사진을 포함해 후보 검증에 필요한 입력 목록을 구성합니다.");
    $("preparationIcon").classList.toggle("is-processing", !!prep?.running);
    $("prepareCandidate").hidden = !!prep; $("retryPreparation").hidden = !prep?.error;
    const progress = prep ? [20, 48, 76, 100][stage] : 0;
    $("referenceProgress").setAttribute("aria-valuenow", progress); $("referenceProgress").firstElementChild.style.width = `${progress}%`;
    $("preparedRequestDescription").textContent = done ? `정상 입력 ${prep.validationRequest.normalInputs.length}장 · 기존 기준 보존 완료 · 오경보·결함 탐지 후속 검증 요청` : "";
    if (done && getState().exampleViewedAt) {
      const labels = ["정상 사진 오경보", "결함 사진 경보", "신규 결함 사건 경보"];
      $("validationMetrics").replaceChildren(...data.updateEvaluation.metrics.map((m, i) => { const row = node("tr"); row.append(node("td", labels[i]), node("td", format(m.before)), node("td", format(m.after))); return row; }));
    }
  }
  function showHistory() {
    if (getState().phase !== "reference-review" || !getState().candidatePreparation?.completedAt) return;
    getState().exampleViewedAt ||= new Date().toISOString(); history("validation-history-viewed", "이전 기준 후보의 검증 기록 열람");
    try { persist(); render(); } catch (error) { notify(error.message); }
  }
  function decide(kind) {
    if (getState().phase !== "reference-review" || !getState().exampleViewedAt || !getState().candidatePreparation?.completedAt || !["hold", "additional-validation"].includes(kind)) return;
    getState().referenceDecision = { kind, at: new Date().toISOString() };
    getState().candidatePreparation.validationRequest.status = kind === "hold" ? "on-hold" : "additional-validation-requested";
    history("reference-decision", `${kind === "hold" ? "적용 보류" : "추가 검증 요청"} · 기존 기준 유지`, getState().referenceDecision.at);
    try { navigate("completed"); notify("담당자의 결정을 기록했습니다."); } catch (error) { notify(error.message); }
  }
  $("prepareCandidate").addEventListener("click", prepare); $("repeatPreparation").addEventListener("click", prepare); $("retryPreparation").addEventListener("click", prepare);
  $("showValidation").addEventListener("click", showHistory);
  $("finishCandidate").addEventListener("click", () => decide("hold")); $("requestMoreValidation").addEventListener("click", () => decide("additional-validation"));
  ["backToRecords", "completedRecords"].forEach(id => $(id).addEventListener("click", backToRecords));
  $("completedDownload").addEventListener("click", onDownload);
  $("reopenReference").addEventListener("click", () => navigate("reference-review"));
  return Object.freeze({ render, cancel });
};
