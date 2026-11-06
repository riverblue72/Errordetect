(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const data = window.SURFACETRACE_PRESENTER_DATA;
  const comparisonPhotos = (data?.photoExamples ?? []).filter(photo => [1264, 1509].includes(photo.frame));
  const num = value => Number(value).toLocaleString("ko-KR");
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
    shift: 0
  };
  let toastTimer;
  let tourTimer;
  const chapters = [
    {view:"overview", label:"전체 흐름", scope:"OVERVIEW · 사진에서 기준 검증까지", delay:6000, note:"시간 순서의 사진을 입력으로 받습니다. 여기서 사진별 이상 분석과 구간 외관 변화 분석이 병렬로 진행됩니다. 한 장 안의 이상 위치와 여러 장에 걸친 전체 모습의 변화를 각각 살펴본 뒤, 구간 요약에서 확인할 사진을 제시합니다. 담당자는 우선 두 건을 확인하고, 필요하면 총 여덟 건까지 검수합니다. 판단 기록은 이후 기준 후보의 평가로 연결됩니다."},
    {view:"data", label:"데이터·기준", scope:"TSFABRICS · 22개 녹화 · 93,196장", delay:4000, note:"TSFabrics의 22개 녹화를 프로젝트에서 기준 구축 1개, 방법 비교 5개, 최종 평가 16개로 나눴습니다. DINOv2 ViT-S/14는 재학습하지 않습니다. 기준 녹화의 초기 512장 중 308장을 라벨 없이 선별해 사진당 24개, 총 7,392개 패치 특징을 저장합니다. 다음 1,536장의 점수로 경보선 0.47077을 보정했습니다."},
    {view:"compare", label:"이상 위치", scope:"PHOTO ANOMALY · 같은 사진의 두 방식 비교", delay:5000, note:"사진 한 장을 832개 패치로 표현해 기준과 차이가 큰 위치를 보여줍니다. 여기서는 원본 시연의 정상 사진에서 오경보가 줄어든 사례와 DINOv2가 찾은 결함 사례를 비교합니다. 수작업은 사람이 매번 판단한다는 뜻이 아니라 사람이 설계한 영상 특징을 쓰는 비교 알고리즘입니다."},
    {view:"shift", label:"외관 변화", scope:"VISUAL SHIFT · 두 녹화를 이어 붙인 별도 시험", delay:2200, note:"이 화면은 한 장의 결함 위치가 아니라 연속 사진의 전체 특징 분포가 기준과 달라졌는지 봅니다. 128장 묶음을 32장마다 비교하고 3회 연속 경보선을 넘으면 변화 신호를 냅니다. 서로 다른 두 녹화를 이어 붙인 시험에서 새 녹화의 96번째 사진 시점에 신호가 확인됩니다. 이 신호는 사진의 이상 경보를 취소하거나 결함을 정상으로 바꾸지 않습니다."},
    {view:"interval", label:"구간 요약", scope:"RECORDED INTERVAL · T1_S478_I118_2", delay:6000, note:"원본 시연의 321번째부터 3,204번째까지 2,884장 전체 점수를 표시합니다. 점수 상위 사진이 같은 사건에 몰리지 않도록 간격을 둡니다. 12프레임과16프레임 간격은 같은26개 신규 사건을 찾았고, 인접 검수 사진을 조금 더 떨어뜨리는16프레임을 유지했습니다. 모든 사진은 점수를 계산하며 검수 후보는 별도의 순위 기반 절차로 고릅니다."},
    {view:"inspect", label:"검수", scope:"LIMITED REVIEW · 우선 2건, 필요하면 8건", delay:3000, note:"원본 사례는 첫 두 건에서 결함을 확인해 총 여덟 건으로 확대하고, 추가 개발 사례는 정상 두 건으로 요청을 끝냅니다. 1·2·3건 우선 검수는 최종16개 녹화에서 각각44·56·68건을 요청해 같은26개 사건을 찾았습니다. 1건 규칙은 첫 사진이 정상인데 결함이 존재하는 어려운 구간의 검증 조건을 충족하지 못해 채택하지 않았습니다. 2건이 최적이거나 더 안전하다고 입증한 것은 아닙니다. 공개 정답을 재생하는 시연이며 종료가 전체 구간의 정상 보장은 아닙니다."},
    {view:"candidate", label:"후보 평가", scope:"SEPARATE VALIDATION · 검수 기반 후보의 후속 평가", delay:8000, note:"정상으로 확인한 특징을 추가해 기준 후보를 만들고 기존 기준과 비교합니다. 별도의 15개 녹화, 8건 고정 검수 실험에서는 정상 오경보가 1,050장에서 0장으로 줄었지만 결함 사진 탐지는 202장에서 153장, 신규 사건 탐지는 48건에서 40건으로 줄어 후보를 보류했습니다. 원본의 초기 512장으로 만든 후보 설명 그림을 함께 사용할 경우, 이 그림과 검수 기반 후보의 집계는 서로 다른 실험입니다."},
    {view:"results", label:"결과", scope:"RESULTS · 방법 비교와 처리 성능", delay:8000, note:"같은 128건 검수에서 수작업 특징은 신규 사건 22건과 결함 사진 23장을, DINOv2와 기준 선별은 사건 26건과 결함 사진 27장을 확인했습니다. 결함 포함 네 녹화의 평균 AP는 66.4%에서 85.4%로 바뀌었습니다. 아래 표는 DINOv2 안에서 기준 선별과 간격 적용을 각각 바꾼 별도 비교입니다. RTX 3090에서는 배치 8의 사진 읽기·전처리·특징 추출·점수 계산이 초당 105.48장이었고 단일 사진의 중앙 지연은 13.95ms였습니다. 카메라, 별도 변화 감지, 화면 처리 시간은 이 속도에서 제외했습니다."}
  ];

  // Exact rows from web/ablation/review-routing.json; inline for offline replay.
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
    setText("error", `시연 자료를 불러오지 못했습니다. ${error.message}`);
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
      image.onerror = () => reject(new Error("사진 파일을 불러오지 못했습니다."));
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
        frame.dataset.photoError = "사진을 불러오지 못했습니다.";
      });
      toast("사진을 불러오지 못했습니다. 압축을 모두 푼 뒤 다시 선택해 주세요.");
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
    return label === "normal" ? "정상" : label === "defect" ? "결함" : "판단 보류";
  }

  function selectPhoto(index, caseId = state.caseId) {
    const s = reviewStatus(caseId);
    if (index < 0 || index >= s.budget || !s.c.review[index]) {
      toast("처음 두 사진의 검수 결과를 확인하면 추가 요청 여부가 결정됩니다.");
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
    setText("speakerText", chapters[state.scene].note);
    setText("playTour", state.playing ? "Ⅱ 일시정지" : "▶ 자동 시연");
    if ($("playTour")) $("playTour").setAttribute("aria-pressed", String(state.playing));
    if ($("previousStep")) $("previousStep").disabled = state.scene === 0;
    if ($("nextStep")) $("nextStep").disabled = state.scene === chapters.length - 1;
    setText("tourStatus", message || (state.playing ? "저장된 사진·결과를 순서대로 재생 중" : "← → 단계 이동 · Space 재생/정지"));
    document.body.classList.toggle("is-playing", state.playing);
  }

  function showView(view) {
    const index = chapters.findIndex(chapter => chapter.view === view);
    if (index < 0) return;
    state.view = view;
    state.scene = index;
    document.title = `${chapters[index].label} · SurfaceTrace 시연`;
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
    const nav = document.querySelector(".demo-steps"), active = nav?.querySelector('[aria-current="step"]');
    if (nav && active && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = Math.max(0, active.offsetLeft - nav.offsetLeft - 16);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function showScene(index) {
    const chapter = chapters[Math.max(0, Math.min(chapters.length - 1, index))];
    showView(chapter.view);
  }

  function stopTour(message) {
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
    }, state.scene === 0 && state.overview === "animation" ? 12000 : chapters[state.scene].delay);
  }

  function autoNextScene() {
    const next = state.scene + 1;
    if (next >= chapters.length) { stopTour("시연 완료 · 처음부터 다시 볼 수 있습니다."); return; }
    if (next === 1) state.method = "features";
    if (next === 2) { state.photo = 0; state.compareRaw = false; }
    if (next === 3) state.shift = 0;
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
        toast("추가 사례: 정상 두 건이면 검수 요청이 어떻게 끝나는지 봅니다.");
      } else {
        autoNextScene();
      }
    } else if (state.scene === chapters.length - 1) {
      stopTour("시연 완료 · 처음부터 다시 볼 수 있습니다.");
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
    updateTourControls();
    queueTourTick();
  }

  function toggleTour() {
    if (state.playing) stopTour("일시정지 · 사진을 직접 조작하거나 이어서 재생할 수 있습니다.");
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
    if ($("caseSelect")) $("caseSelect").value = state.caseId;
    renderOverview();
    renderMethod();
    renderReview();
    renderComparison();
    renderShift();
    renderInterval();
    selectDistribution("03");
    showScene(0);
    updateTourControls("처음부터 시연할 준비가 되었습니다.");
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
    const status = recorded ? `${labelText(recorded)} 확인` : locked ? s.stopped ? "요청 안 함" : "추가 대기" : "확인 대기";
    button.setAttribute("aria-label", `검수 후보 ${index + 1}, ${num(frame)}번째 사진, ${status}`);
    if (item) {
      const image = document.createElement("img");
      image.className = "thumb-photo";
      image.src = item.image;
      image.alt = `${num(frame)}번째 직물 사진`;
      image.loading = "lazy";
      button.append(image);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "thumb-placeholder";
      placeholder.textContent = s.stopped ? "요청 안 함" : "추가 후보";
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
      empty.textContent = "아직 확인한 사진이 없습니다.";
      log.append(empty);
      return;
    }
    s.r.order.forEach(index => {
      const item = s.c.review[index], label = s.r.records[index];
      const row = document.createElement("li");
      row.className = label;
      const frame = document.createElement("b"), status = document.createElement("span");
      frame.textContent = `${num(item.frame)}번째`;
      status.textContent = `${labelText(label)} 확인`;
      row.append(frame, status);
      log.append(row);
    });
  }

  function renderReview() {
    const s = reviewStatus(), { c, r } = s, item = c.review[r.index];
    if (!item) throw new Error("선택한 사진의 기록이 없습니다.");
    const threshold = c.sourceThreshold;
    const alarm = item.score >= threshold;
    setText("inspectFrame", `${num(item.frame)}번째 사진`);
    setText("inspectRun", c.run);
    setText("inspectQueueLabel", `검수 후보 ${r.index + 1}`);
    setText("inspectScore", item.score.toFixed(3));
    setText("inspectThreshold", threshold.toFixed(3));
    setText("inspectStatus", alarm ? "사진 이상 경보" : "사진 경보 없음");
    if ($("inspectStatus")) $("inspectStatus").className = `status-pill ${alarm ? "alert" : "normal"}`;
    if (!item.heatmap) r.heat = false;
    displayPhotoGroup([
      ["inspectOriginal", item.image, `${c.run} · ${num(item.frame)}번째 직물 사진`],
      ["inspectHeat", item.heatmap, `${num(item.frame)}번째 사진의 DINOv2 이상 위치 히트맵`]
    ]);
    if ($("inspectHeat")) $("inspectHeat").hidden = !r.heat || !item.heatmap;
    if ($("toggleHeat")) {
      $("toggleHeat").disabled = !item.heatmap;
      $("toggleHeat").setAttribute("aria-pressed", String(r.heat));
      $("toggleHeat").title = item.heatmap ? "같은 사진의 원본과 저장된 히트맵을 전환합니다." : "이 사진은 원본 이미지로 확인합니다. 대응 히트맵이 없습니다.";
      const heatDot = document.createElement("span");
      heatDot.className = "heat-dot";
      heatDot.setAttribute("aria-hidden", "true");
      $("toggleHeat").replaceChildren(heatDot, document.createTextNode(!item.heatmap ? "원본 사진" : r.heat ? "원본 보기" : "이상 위치 보기"));
    }
    if ($("scoreNeedle")) $("scoreNeedle").style.left = `${Math.min(item.score / 0.65, 1) * 100}%`;
    if ($("thresholdMarker")) $("thresholdMarker").style.left = `${threshold / 0.65 * 100}%`;
    if ($("scoreMeter")) $("scoreMeter").setAttribute("aria-label", `이상 점수 ${item.score.toFixed(3)}, 경보선 ${threshold.toFixed(3)}. 결함 확률이 아닙니다.`);

    setText("reviewCount", String(s.count));
    setText("reviewBudget", String(s.budget));
    setText("reviewPhase", s.complete ? "검수 종료" : s.expanded ? "추가 확인" : "우선 확인");
    let route = "먼저 두 사진의 결과를 확인합니다.";
    if (s.stopped) route = "두 건 모두 정상 → 추가 요청 종료";
    else if (s.complete) route = "총 8건 확인 완료";
    else if (s.expanded) route = "처음 두 건에 결함 포함 → 추가 6건 요청";
    else if (s.count) route = "첫 결과를 기록했습니다. 나머지 한 건을 확인해 주세요.";
    setText("reviewRoute", route);
    if ($("reviewRoute")) $("reviewRoute").className = `route-message${s.stopped ? " stopped" : s.expanded ? " expanded" : ""}`;

    const label = r.records[r.index];
    setText("reviewOutcome", label ? `${labelText(label)}으로 확인됨 · 공개 정답` : "확인 전 · 사진과 이상 위치를 살펴보세요.");
    if ($("reviewOutcome")) $("reviewOutcome").className = `review-outcome ${label || "pending"}`;
    if ($("reviewAction")) {
      $("reviewAction").disabled = s.revealed;
      setText("reviewAction", s.revealed ? "결과 기록됨" : "검수 결과 확인");
    }
    if ($("previousPhoto")) $("previousPhoto").disabled = r.index === 0;
    const nextIndex = nextPhotoIndex(s);
    if ($("nextPhoto")) {
      $("nextPhoto").disabled = nextIndex === -1;
      setText("nextPhoto", s.complete ? "검수 완료" : s.expanded && r.index === 1 ? "추가 사진 확인 →" : "다음 사진 →");
    }
    if ($("reviewSummary")) {
      $("reviewSummary").hidden = !s.complete;
      setText("reviewSummary", s.stopped
        ? "정상 2건을 확인해 추가 6건을 요청하지 않았습니다. 전체 구간이 정상이라는 판정은 아닙니다."
        : "결함 사진 6장과 정상 사진 2장을 확인했습니다. 이 녹화에서는 서로 다른 결함 사건 6건을 확인했습니다.");
    }
    setText("reviewProvenance", state.caseId === "defect"
      ? "원본 시연의 사진·검수 순서입니다. 공개 데이터의 정답을 확인 결과로 재생합니다."
      : "추가 개발 사례입니다. 실제 순위의 두 사진을 확인하며, 요청하지 않은 사진은 넣지 않았습니다.");
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
    if (!s.pilotDone && after.expanded) toast("처음 두 건에 결함이 있어 추가 여섯 장을 열었습니다.");
    else if (!s.pilotDone && after.stopped) toast("두 건 모두 정상으로 확인되어 추가 요청을 종료했습니다.");
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
    track.setAttribute("aria-label", `${label}: ${ordered.map(num).join(", ")}번째 사진`);
    ordered.forEach((frame, index) => {
      const marker = document.createElement("i");
      marker.style.left = `${(frame - first) / (last - first) * 100}%`;
      const closeBefore = index > 0 && frame - ordered[index - 1] < 16;
      const closeAfter = index + 1 < ordered.length && ordered[index + 1] - frame < 16;
      marker.style.setProperty("--offset", `${closeBefore ? 5 : closeAfter ? -5 : 0}px`);
      marker.title = `${num(frame)}번째 사진`;
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
        "aria-label": `후보 ${index + 1}, ${num(item.frame)}번째 사진${locked ? ", 처음 두 건 확인 후 열림" : ", 사진 검사에서 열기"}`
      });
      svg(marker, "title", {}, `후보 ${index + 1} · ${num(item.frame)}번째 · 점수 ${item.score.toFixed(3)}`);
      const open = () => { if (locked) toast("처음 두 사진을 확인한 뒤 추가 후보를 열 수 있습니다."); else { selectPhoto(index, "defect"); showView("inspect"); } };
      marker.addEventListener("click", manually(open));
      marker.addEventListener("keydown", manually(event => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); open(); } }));
      if (index < 2) svg(chart, "text", { x: x(item.frame) + 9, y: y(item.score) - 10, class: "chart-label" }, `우선 ${index + 1}`);
    });
    for (const frame of [first, 1000, 2000, last]) {
      svg(chart, "text", { x: x(frame), y: 220, "text-anchor": frame === first ? "start" : frame === last ? "end" : "middle" }, num(frame));
    }
    renderQueueTrack("top8Track", d.unspacedTopFrames, "점수 상위 8장");
    renderQueueTrack("spaced8Track", d.reviewFrames, "시간 간격을 둔 8장");
    const photos = $("intervalPhotos");
    if (photos) {
      photos.replaceChildren();
      s.c.review.forEach((item, index) => photos.append(makeFrame(item, index, s, true)));
    }
  }

  function renderShift() {
    const d = data.visualShift, photo = d.photos[state.shift];
    imageSource("shiftReference", d.referencePhoto.image, `${d.referencePhoto.run} 기준 녹화의 ${num(d.referencePhoto.frame)}번째 사진`);
    imageSource("shiftCurrent", photo.image, `${d.targetRun} 새 녹화의 ${num(photo.frame)}번째 사진`);
    setText("shiftFrameLabel", `새 녹화 · ${num(photo.frame)}번째`);
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
    setText("shiftStatus", alerted ? "외관 변화 감지" : "관찰 중");
    if ($("shiftStatus")) $("shiftStatus").className = `status-pill ${alerted ? "alert" : ""}`;
    const chart = $("shiftChart");
    if (!chart) return;
    chart.replaceChildren();
    const x = frame => 32 + (frame + 128) / 320 * 500;
    const max = Math.max(...points.map(point => point.score), d.threshold) * 1.1;
    const y = value => 110 - value / max * 92;
    for (let index = 0; index < 3; index++) svg(chart, "line", { x1: 32, x2: 532, y1: 110 - index * 43, y2: 110 - index * 43, class: "chart-grid" });
    svg(chart, "line", { x1: 32, x2: 532, y1: y(d.threshold), y2: y(d.threshold), class: "chart-limit" });
    svg(chart, "text", { x: 532, y: y(d.threshold) - 6, "text-anchor": "end" }, `변화 경보선 ${d.threshold.toFixed(3)}`);
    svg(chart, "line", { x1: x(0), x2: x(0), y1: 15, y2: 110, class: "chart-boundary" });
    line(chart, visible.map(point => [x(point.targetFrame), y(point.score)]), "chart-line shift");
    if (last) svg(chart, "circle", { cx: x(last.targetFrame), cy: y(last.score), r: 5, class: "chart-shift-dot" });
    if (alerted) {
      const alert = points.find(point => point.targetFrame === d.alertTargetFrame);
      svg(chart, "circle", { cx: x(alert.targetFrame), cy: y(alert.score), r: 6, class: "chart-shift-dot" });
      svg(chart, "text", { x: x(alert.targetFrame) + 10, y: y(alert.score) - 9, class: "chart-shift-label" }, "96번째 · 변화 감지");
    }
    svg(chart, "text", { x: 32, y: 134 }, "기준 녹화");
    svg(chart, "text", { x: x(0) + 5, y: 134 }, "새 녹화 유입");
    svg(chart, "text", { x: 532, y: 134, "text-anchor": "end" }, "192번째");
  }

  function renderOverview() {
    document.querySelectorAll("[data-overview]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.overview === state.overview)));
    document.querySelectorAll("[data-overview-panel]").forEach(panel => {
      panel.hidden = panel.dataset.overviewPanel !== state.overview;
    });
  }

  function setupReviewRouting() {
    if (routingRuns.length !== 16 || routingRuns.some(row => ![2, 8].includes(row.requests)) || routingRuns.reduce((sum, row) => sum + row.requests, 0) !== 56) {
      throw new Error("검수 요청 배분이 원본 기록과 다릅니다.");
    }
    const routingPanel = $("reviewRouting");
    if (routingPanel) {
      routingPanel.replaceChildren();
      for (const row of routingRuns) {
        const bar = document.createElement("div");
        bar.className = "handoff-run";
        bar.setAttribute("role", "img");
        bar.setAttribute("aria-label", `${row.run}: ${row.requests}장 검수 요청`);
        bar.title = `${row.run} · ${row.requests}건 요청`;
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
    const alt = `${photo.run} · ${num(photo.frame)}번째 · 동일한 직물 사진`;
    displayPhotoGroup([
      ["analysisOriginal", photo.image, alt],
      ["analysisClassicHeat", photo.classic.heatmap, `${num(photo.frame)}번째 사진의 수작업 특징 히트맵`],
      ["analysisBase", photo.image, alt],
      ["analysisHeat", photo.dino.heatmap, `${num(photo.frame)}번째 사진의 DINOv2 히트맵`]
    ]);
    for (const id of ["analysisClassicHeat", "analysisHeat"]) if ($(id)) $(id).hidden = state.compareRaw;
    setText("compareRaw", state.compareRaw ? "히트맵 비교" : "원본 사진 비교");
    if ($("compareRaw")) $("compareRaw").setAttribute("aria-pressed", String(state.compareRaw));
    const verdict = alert => photo.recordedLabel === "normal" ? alert ? "정상 사진에 오경보" : "오경보 없음" : alert ? "결함 탐지" : "결함 누락";
    for (const [method, valueId, statusId] of [[photo.classic, "classicValue", "classicStatus"], [photo.dino, "anomalyValue", "anomalyStatus"]]) {
      setText(valueId, method.score.toFixed(3));
      setText(statusId, verdict(method.alert));
      if ($(statusId)) $(statusId).className = `status-pill ${method.alert === (photo.recordedLabel === "defect") ? "normal" : "alert"}`;
    }
    setText("comparePhotoLabel", `${num(photo.frame)}번째 사진 · 공개 정답: ${labelText(photo.recordedLabel)}`);
    document.querySelectorAll("[data-photo]").forEach(button => button.setAttribute("aria-pressed", String(Number(button.dataset.photo) === state.photo)));
  }

  function selectDistribution(run) {
    if (!["03", "04"].includes(run)) return;
    imageSource("distributionFigure", `./ablation/score_distribution_run_${run}.svg`, `원본 Run ${run}: 수작업 특징과 DINOv2의 정상·결함 사진 점수 분포`);
    if ($("distributionMobile")) $("distributionMobile").srcset = `./ablation/score_distribution_run_${run}_mobile.svg`;
    document.querySelectorAll("[data-distribution]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.distribution === run)));
  }

  function validateData() {
    if (!data || data.metadata.recordedReplay !== true) throw new Error("저장된 실험 자료가 없습니다.");
    if (data.cases.normal.review.length !== 2 || data.cases.defect.review.length !== 8) throw new Error("검수 사진 수가 기록과 다릅니다.");
    if (!data.cases.normal.review.every(item => item.recordedLabel === "normal")) throw new Error("2건 종료 사례의 기록이 다릅니다.");
    if (data.cases.defect.review.slice(0, 2).every(item => item.recordedLabel === "normal")) throw new Error("8건 확대 사례의 기록이 다릅니다.");
    Object.values(data.cases).forEach(c => c.review.forEach((item, index) => {
      if (item.rank !== index + 1 || item.frame !== c.queueFrames[index] || !item.image || !Number.isFinite(item.score)) throw new Error("사진·순위·점수의 대응이 일치하지 않습니다.");
    }));
    if (data.interval.chart.length !== 2884 || data.photoExamples.length !== 3 || comparisonPhotos.length !== 2 || data.visualShift.alertTargetFrame !== 96) throw new Error("구간 기록이 일치하지 않습니다.");
    data.cases.defect.review.forEach(item => {
      const point = data.interval.chart[item.frame - data.interval.evaluationFrames[0]];
      if (!point || point.frame !== item.frame || Math.abs(point.score - item.score) > 0.00001) throw new Error("사진과 점수 그래프가 일치하지 않습니다.");
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
    document.querySelectorAll("[data-distribution]").forEach(button => button.addEventListener("click", manually(() => selectDistribution(button.dataset.distribution))));
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
    bindManual("resetCase", "click", () => { state.reviews[state.caseId] = freshReview(); renderReview(); toast("이 사례의 확인 기록을 초기화했습니다."); });
    bindManual("reviewAction", "click", revealReview);
    bindManual("nextPhoto", "click", () => { const index = nextPhotoIndex(); if (index >= 0) selectPhoto(index); });
    bindManual("previousPhoto", "click", () => selectPhoto(state.reviews[state.caseId].index - 1));
    bindManual("toggleHeat", "click", () => { state.reviews[state.caseId].heat = !state.reviews[state.caseId].heat; renderReview(); });
    bindManual("jumpInterval", "click", () => showView("interval"));
    bindManual("compareRaw", "click", () => { state.compareRaw = !state.compareRaw; renderComparison(); });
    bindManual("shiftSlider", "input", event => { state.shift = Math.max(0, Math.min(data.visualShift.photos.length - 1, Number(event.target.value))); renderShift(); });
    bindManual("shiftNext", "click", () => { state.shift = Math.min(state.shift + 1, data.visualShift.photos.length - 1); renderShift(); });
    bind("notesToggle", "click", () => {
      const notes = $("speakerNotes");
      if (!notes) return;
      notes.hidden = !notes.hidden;
      $("notesToggle").setAttribute("aria-expanded", String(!notes.hidden));
    });
    bind("fullscreen", "click", async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
        else toast("브라우저의 전체 화면 기능을 사용해 주세요.");
      } catch { toast("브라우저의 전체 화면 기능을 사용해 주세요."); }
    });
    document.addEventListener("keydown", safely(event => {
      if (event.defaultPrevented || event.target.closest("input,select,textarea,button,a,summary,[contenteditable=true]")) return;
      if (event.key === "ArrowRight") { event.preventDefault(); stopTour(); showScene(state.scene + 1); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); stopTour(); showScene(state.scene - 1); }
      else if (event.code === "Space" || event.key === " ") { event.preventDefault(); toggleTour(); }
    }));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state.playing) stopTour("다른 화면으로 이동해 시연을 일시정지했습니다.");
    });
    document.addEventListener("error", event => {
      if (event.target instanceof HTMLImageElement && event.target.getAttribute("src")) toast("사진을 불러오지 못했습니다. 압축 파일을 모두 푼 뒤 열어 주세요.");
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
