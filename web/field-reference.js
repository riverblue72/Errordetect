"use strict";
/* Reference operations for step 05 inside the field workspace. No new model metrics are fabricated. */
window.createSurfaceTraceReference = ({ getState, persist, navigate, notify, onDownload, onRender = () => {} }) => {
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
    const operation = getState().referenceOperation;
    if (operation?.running) { operation.running = false; operation.error = "작업이 중단되었습니다. 다시 시도해 주세요."; }
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
  async function operate(kind) {
    if (getState().phase !== "reference-review" || getState().referenceOperation?.running || getState().candidatePreparation?.running) return;
    controller?.abort(); controller = new AbortController(); const signal = controller.signal, token = ++run, session = getState();
    getState().referenceOperation = { kind, running: true, error: null, startedAt: new Date().toISOString(), completedAt: null };
    const operation = getState().referenceOperation;
    const timer = setInterval(() => { if (token === run) $("referenceOperationProgress").style.width = `${Math.min(95, (Date.now() - Date.parse(operation.startedAt)) / 60)}%`; }, 100);
    persist(); render();
    try {
      const [inputs] = await Promise.all([kind === "intake" ? adapter.normalInputs(signal) : Promise.resolve(null), wait(6000, signal)]);
      if (token !== run || session !== getState() || getState().phase !== "reference-review") return;
      operation.running = false; operation.completedAt = new Date().toISOString();
      if (kind === "intake") {
        operation.inputs = inputs; operation.activeReferenceChanged = false;
        history("normal-data-staged", `정상 확인 사진 ${inputs.length}장 · 기준 후보 입력 목록 저장`);
        getState().pages["reference-review"] = 1; persist(); render();
      } else commitDecision(kind === "save-change" ? "change" : "hold");
    } catch (error) {
      if (token !== run || session !== getState() || signal.aborted) return;
      operation.running = false; operation.error = error.message || "저장을 완료하지 못했습니다."; persist(); render();
    } finally { clearInterval(timer); }
  }
  function renderOperation() {
    const op = getState().referenceOperation, visible = getState().phase === "reference-review" && !!(op?.running || op?.error);
    $("referenceOperation").hidden = !visible; $("referenceWorkspace").classList.toggle("has-operation", visible);
    if (!visible) return;
    $("referenceOperationTitle").textContent = op.error ? "작업이 중단되었습니다." : op.kind === "intake" ? "정상 기준에 추가 중입니다." : op.kind === "save-change" ? "새로운 기준으로 저장 중입니다." : "기존 기준 유지 결정을 저장 중입니다.";
    $("referenceOperationDescription").textContent = op.error || (op.kind === "intake" ? "정상으로 확인한 사진을 새 기준 후보의 입력 목록에 추가합니다." : "AI 솔루션팀이 선택한 기준과 검토 기록을 저장합니다.");
    $("retryReferenceOperation").hidden = !op.error;
    $("referenceOperation").querySelector(".operation-spinner").hidden = !!op.error;
  }
  function render() {
    renderOperation();
    const completed = getState().phase === "completed" && !!getState().referenceDecision;
    $("referenceWorkspace").hidden = completed; $("completedView").hidden = !completed;
    if (completed) {
      const kind = getState().referenceDecision.kind;
      $("completedDecision").textContent = kind === "change" ? "새 기준 변경 요청 완료" : kind === "hold" ? "기존 기준 유지" : "추가 검증 요청 기록";
      $("completedReference").textContent = kind === "change" ? "새로운 기준 · 변경 요청" : "기존 기준";
      $("completedDescription").textContent = kind === "change" ? "변경 요청을 저장했습니다. 실제 분석에는 기존 기준이 적용됩니다." : kind === "hold" ? "기존 기준을 유지하는 선택을 저장했습니다. 검수 기록과 검증 요청 정보를 보관합니다." : "이전에 기록한 추가 검증 요청입니다. 현재 분석에는 기존 기준이 사용됩니다.";
      $("completedAt").textContent = time(getState().referenceDecision.at); onRender(); return;
    }
    const selected = normals(), prep = getState().candidatePreparation, done = !!prep?.completedAt;
    $("candidateStatus").textContent = `정상으로 확인된 사진 ${selected.length}장을 새 검사 기준 후보에 포함합니다.`;
    $("normalPhotos").replaceChildren(...selected.map(({ photo }) => { const f = node("figure"), img = node("img"); img.src = photo.image; img.alt = "담당자가 정상으로 확인한 사진"; f.append(img, node("figcaption", `${format(photo.frame)}번째 사진`)); return f; }));
    $("referenceState").textContent = done ? "검증 요청 등록됨" : prep?.running ? "검증 요청 중" : "기준 데이터 확인";
    $("referencePreparation").hidden = !prep?.running && !prep?.error;
    $("referenceConfirmation").hidden = !!prep?.running || !!prep?.error;
    $("referenceConfirmCount").textContent = `정상 확인 사진 ${selected.length}장`;
    $("referenceConfirmDescription").textContent = `확인한 사진 ${selected.length}장을 포함한 새 기준 후보의 검증을 요청합니다. 오경보와 실제 결함 탐지를 함께 확인합니다.`;
    $("repeatPreparation").hidden = !done;
    $("preparedRequest").hidden = !done || !!getState().exampleViewedAt;
    $("validationHistory").hidden = !done || !getState().exampleViewedAt;
    const stage = prep?.stage || 0;
    const titles = ["기존 검사 기준을 보존하고 있습니다.", "정상으로 확인된 사진을 검증 요청에 포함합니다.", "새 검사 기준의 적용 가능성을 검토합니다.", "검증 요청 준비 완료"];
    const descriptions = ["검토가 끝날 때까지 현재 검사 기준을 유지합니다.", "선택한 정상 사진을 검증 요청에 첨부합니다.", "오경보와 결함 탐지를 확인할 검증 요청을 등록합니다."];
    $("preparationTitle").textContent = done ? "검증 요청 준비가 완료되었습니다." : prep?.error ? "요청 준비를 완료하지 못했습니다." : prep?.running ? titles[stage] : "새 검사 기준의 적용 가능성을 검토합니다.";
    $("preparationDescription").textContent = prep?.error || (prep?.running ? descriptions[stage] : "정상 확인 사진을 포함해 후보 검증에 필요한 입력 목록을 구성합니다.");
    $("preparationIcon").classList.toggle("is-processing", !!prep?.running);
    $("prepareCandidate").hidden = !!prep; $("retryPreparation").hidden = !prep?.error;
    const progress = prep ? [20, 48, 76, 100][stage] : 0;
    $("referenceProgress").setAttribute("aria-valuenow", progress); $("referenceProgress").firstElementChild.style.width = `${progress}%`;
    $("preparedRequestDescription").textContent = done ? `정상 사진 ${prep.validationRequest.normalInputs.length}장이 포함되었습니다. 현재 검사 기준을 유지하며 검증 요청을 보관합니다.` : "";
    if (done && getState().exampleViewedAt) {
      const labels = ["정상 사진 오경보", "결함 사진 경보", "신규 결함 사건 경보"];
      $("validationMetrics").replaceChildren(...data.updateEvaluation.metrics.map((m, i) => { const row = node("tr"); row.append(node("td", labels[i]), node("td", format(m.before)), node("td", format(m.after))); return row; }));
    }
    onRender();
  }
  function showHistory() {
    if (getState().phase !== "reference-review" || !getState().candidatePreparation?.completedAt) return;
    getState().exampleViewedAt ||= new Date().toISOString(); history("validation-history-viewed", "이전 기준 후보의 검증 기록 열람");
    try { persist(); render(); } catch (error) { notify(error.message); }
  }
  function commitDecision(kind) {
    if (getState().phase !== "reference-review" || !getState().exampleViewedAt || !getState().candidatePreparation?.completedAt || !["hold", "change"].includes(kind)) return;
    getState().referenceDecision = { kind, team: "AI 솔루션팀", at: new Date().toISOString(), applied: false, status: kind === "change" ? "change-requested" : "kept" };
    getState().candidatePreparation.validationRequest.status = kind === "hold" ? "on-hold" : "change-requested";
    history("reference-decision", kind === "change" ? "AI 솔루션팀 · 새로운 기준으로 변경 요청 · 실제 분석에는 기존 기준 사용" : "AI 솔루션팀 · 기존 기준 유지 선택", getState().referenceDecision.at);
    try { navigate("completed"); notify("AI 솔루션팀의 결정을 기록했습니다."); } catch (error) { notify(error.message); }
  }
  function decide(kind) {
    if (getState().phase !== "reference-review" || !getState().exampleViewedAt || !getState().candidatePreparation?.completedAt || !["hold", "change"].includes(kind)) return;
    operate(kind === "change" ? "save-change" : "save-hold");
  }
  function showPage(index) {
    if (getState().phase !== "reference-review" || getState().candidatePreparation?.running) return;
    getState().pages["reference-review"] = index; persist(); onRender();
    const heading = $("referenceWorkspace").querySelectorAll("[data-page]")[index]?.querySelector("h2,h3");
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }
  $("referenceEntryContinue").addEventListener("click", () => operate("intake"));
  $("retryReferenceOperation").addEventListener("click", () => operate(getState().referenceOperation.kind));
  $("referenceConfirmBack").addEventListener("click", () => showPage(0));
  $("prepareCandidate").addEventListener("click", prepare); $("repeatPreparation").addEventListener("click", prepare); $("retryPreparation").addEventListener("click", prepare);
  $("showValidation").addEventListener("click", showHistory);
  $("finishCandidate").addEventListener("click", () => decide("hold")); $("changeReference").addEventListener("click", () => decide("change"));
  ["backToRecords", "completedRecords"].forEach(id => $(id).addEventListener("click", backToRecords));
  $("completedDownload").addEventListener("click", onDownload);
  $("reopenReference").addEventListener("click", () => navigate("reference-review"));
  return Object.freeze({ render, cancel, stageNormals: () => operate("intake") });
};
