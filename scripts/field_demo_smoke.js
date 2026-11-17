"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs/promises"), path = require("node:path");
const { chromium } = require("playwright");
const base = process.env.SITE_URL || "http://127.0.0.1:62309/";
const output = process.env.QA_OUTPUT || "/private/tmp/surfacetrace-paged-field-qa";
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await context.newPage(), errors = [];
  page.on("pageerror", e => errors.push(e.message));
  const state = () => page.evaluate(() => window.surfaceTraceFieldDemo.getState());
  const status = () => page.evaluate(() => window.surfaceTraceFieldDemo.getStatus());
  const phase = name => page.waitForFunction(v => window.surfaceTraceFieldDemo?.getState().phase === v, name);
  const index = async () => { const s = await state(); return s.pages[s.phase] || 0; };
  const go = async n => {
    for (let i = 0; i < 8 && await index() !== n; i++) await page.locator(await index() < n ? "#pageNext" : "#pagePrevious").click();
    assert.equal(await index(), n);
  };
  const fits = async label => {
    await page.waitForTimeout(230);
    const result = await page.evaluate(() => {
      const panels = [...document.querySelectorAll("[data-view]:not([hidden]) [data-page]:not([hidden])")].filter(e => e.getClientRects().length);
      return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
        panels: panels.map(e => ({ title: e.dataset.page, height: e.clientHeight, content: e.scrollHeight, width: e.clientWidth, contentWidth: e.scrollWidth })),
        pagerBottom: document.querySelector(".workspace-pagination").getBoundingClientRect().bottom };
    });
    assert.equal(result.panels.length, 1, label + " must show one page");
    assert(result.scrollWidth <= result.width + 1 && result.scrollHeight <= result.height + 1 && result.pagerBottom <= result.height, label + JSON.stringify(result));
    for (const p of result.panels) assert(p.content <= p.height + 2 && p.contentWidth <= p.width + 2, label + JSON.stringify(result));
    await page.mouse.wheel(0, 700); assert.equal(await page.evaluate(() => scrollY), 0, label + " must not scroll");
  };
  const capture = async name => { await page.locator("#toast").evaluate(e => { e.hidden = true; }); await page.screenshot({ path: path.join(output, name + ".png") }); };
  const receive = async () => {
    const start = Date.now(); await page.locator("[data-receive=defect]").click(); await phase("receiving"); await fits("receiving");
    await page.waitForFunction(() => window.surfaceTraceFieldDemo.getState().pipelineReady, null, { timeout: 20000 });
    assert(Date.now() - start >= 5500); await page.locator("#startReviewFlow").click(); await phase("change-alert");
  };
  const readyBatch = async () => {
    await page.waitForFunction(() => window.surfaceTraceFieldDemo.getState().phase === "reviewing" && !window.surfaceTraceFieldDemo.getState().reviewGate && document.querySelectorAll(".batch-card").length && [...document.querySelectorAll(".batch-card")].every(card => !card.querySelector("[data-batch-verdict]").disabled && !card.querySelector(".batch-heat").hidden));
  };
  const choose = async (index,verdict,note) => {
    const size = await page.evaluate(() => matchMedia("(max-width: 850px)").matches ? 4 : 8), target = Math.floor(index/size);
    while((await state()).batchPage < target)await page.locator("#batchNext").click();
    while((await state()).batchPage > target)await page.locator("#batchPrevious").click();
    await page.locator(`[data-batch-verdict=${verdict}][data-index="${index}"]`).click();
    if(note!==undefined){await page.locator(`[data-batch-note="${index}"]`).click();await page.locator("#reviewNote").fill(note);await page.locator("#saveBatchNote").click();}
  };
  const confirmShift = async verdict => { await go(1); await page.locator("#shiftPhotoLoading").waitFor({ state: "hidden" }); await page.locator("#shiftAiHeat").waitFor({ state: "visible" }); await go(2); await page.locator(`[data-shift-verdict=${verdict}]`).click(); await page.locator("#acknowledgeShift").click(); };
  const download = async id => { const waiting = page.waitForEvent("download"); await page.locator(id).click(); return JSON.parse(await fs.readFile(await (await waiting).path(), "utf8")); };
  const sizes = [{ width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 390, height: 667 }];
  const allPages = async (label, count) => { for (const size of [sizes[3],sizes[0],sizes[1],sizes[2]]) { await page.setViewportSize(size); for (let n = 0; n < count; n++) { await go(n); await fits(label + " " + size.width + "x" + size.height + " page " + n); } } await page.setViewportSize(sizes[0]);if((await state()).phase==="reviewing"&&!(await state()).reviewGate)await page.waitForFunction(()=>document.querySelectorAll(".batch-card:not([hidden])").length===Math.min(8,window.surfaceTraceFieldDemo.getStatus().available)); };
  const reset = async () => { await page.locator("#restart").click(); await page.locator("#confirmReset").click(); await phase("ready"); };
  try {
    await page.goto(new URL("field-demo.html", base).href); await phase("ready");
    for (const size of sizes) { await page.setViewportSize(size); await fits("ready"); assert(await page.locator("#serviceOverviewLink").isVisible());assert(await page.locator("#mainSiteLink").isVisible()); } await page.setViewportSize(sizes[0]);
    assert.equal(await page.locator("#serviceOverviewLink").getAttribute("href"),"./presenter.html");assert.equal(await page.locator("#mainSiteLink").getAttribute("href"),"./index.html");
    await capture("01-ready");
    const blockedMap = "**/scenario/demo-096-heat.png";
    await page.route(blockedMap, r => r.abort()); await receive(); assert.equal(await page.locator("#shiftScore").innerText(), "0.4274");
    await go(1); await page.locator("#shiftAiError").waitFor({ state: "visible" }); assert(await page.locator("#shiftCurrentPhoto").isVisible());
    assert(await page.locator("[data-shift-ai-zoom=heat]").isDisabled()); await page.unroute(blockedMap); await page.locator("#retryShiftAi").click(); await page.locator("#shiftAiHeat").waitFor({ state: "visible" });
    assert.equal(await page.locator("#shiftAiBase").getAttribute("src"), await page.locator("#shiftCurrentPhoto").getAttribute("src"));
    assert.match(await page.locator("#shiftCurrentCaption").innerText(), /96번째/); assert.match(await page.locator("#shiftAiScore").innerText(), /96번째.*0\.2974/);
    assert.equal(await page.locator("#shiftAiSelect").count(), 0, "Never substitute another review candidate for a shift frame");
    await page.locator("[data-shift-ai-zoom=heat]").click(); assert(await page.locator("#zoomHeat").isVisible()); await page.locator("#closePhotoDialog").click();
    await page.locator("[data-shift-frame='32']").click(); await page.locator("#shiftAiHeat").waitFor({ state: "visible" });
    assert.match(await page.locator("#shiftCurrentCaption").innerText(), /32번째/); assert.match(await page.locator("#shiftAiScore").innerText(), /32번째.*0\.3768/);
    await go(2); await page.locator("#shiftNote").fill("소재 외관 차이 확인"); await page.reload(); await phase("change-alert"); assert.equal(await index(), 2); assert.equal(await page.locator("#shiftNote").inputValue(), "소재 외관 차이 확인");
    await allPages("change", 3); await go(1); await capture("02-same-frame-comparison"); await page.setViewportSize(sizes[2]); await capture("mobile-same-frame"); await page.setViewportSize(sizes[0]);
    const blockedReviewHeat="**/unlabeled-demo/review-01-heat.png";await page.route(blockedReviewHeat,r=>r.abort());
    await confirmShift("changed"); await phase("reviewing");await page.locator('.batch-card-status>button:not([hidden])').first().waitFor({state:"visible"});
    assert(await page.locator('[data-batch-verdict=normal][data-index="0"]').isEnabled());await page.unroute(blockedReviewHeat);await page.locator('.batch-card-status>button:not([hidden])').first().click();await readyBatch();
    assert.equal(await page.locator(".batch-card").count(),2);assert.equal(await page.locator("#batchOriginal-0").getAttribute("src"),await page.locator("#batchBase-0").getAttribute("src"));
    await allPages("batch review", 1);await capture("03-batch-review-two");
    await choose(0,"defect","세로 줄 확인 <script>window.injected=true</script>");await choose(1,"hold");assert.equal((await status()).reviewed,0);await page.locator("#saveDecision").click();
    assert.equal((await state()).reviewGate,"expand");await fits("expand gate");await page.locator("#gateAction").click();await readyBatch();assert.equal((await status()).budget,8);
    await allPages("expanded batch",1);assert.equal(await page.locator(".batch-card:not([hidden])").count(),8);await capture("04-batch-review-eight");
    await page.setViewportSize(sizes[3]);await page.waitForFunction(()=>document.querySelectorAll(".batch-card:not([hidden])").length===4);assert.equal(await page.locator(".batch-card:not([hidden])").count(),4);await page.locator("#batchNext").click();await fits("mobile batch second group");await capture("mobile-batch-review");await page.setViewportSize(sizes[0]);await page.waitForFunction(()=>document.querySelectorAll(".batch-card:not([hidden])").length===8);
    for(const index of [2])await choose(index,"defect");await page.locator("#batchNormal").click();assert.equal((await status()).reviewed,2);assert.equal((await state()).records.filter(Boolean).length,2);await page.locator("#saveDecision").click();
    await phase("review-summary"); assert.equal(await page.locator("#normalCount").innerText(), "5장"); assert.equal(await page.evaluate(() => window.injected), undefined);
    await allPages("summary", 4); await go(1); assert.equal(await page.locator("#recordRows tr:not([hidden])").count(), 4); await page.locator("#recordNext").click(); assert.equal(await page.locator("#recordRows tr:not([hidden])").count(), 4);
    await go(0); const record = await download("#downloadRecord"); assert.equal(record.records.length, 8); assert.equal(record.activeReference, "frozen-source"); assert(record.appearanceChange.userReview.aiComparedFrames.includes(32)); assert(!record.records.some(r => "publishedDatasetLabel" in r));
    await page.reload(); await phase("review-summary"); assert.equal((await status()).reviewed, 8); await go(2); await capture("04-normal-data"); await page.locator("#openCandidate").click(); await phase("reference-review");
    assert.match(page.url(), /field-demo\.html/); await fits("reference data");
    assert.equal(await page.locator("[data-reference-step]").count(),0);assert.match(await page.locator("#candidateTitle").innerText(),/정상으로 확인된 데이터를 기준에 추가합니다/);
    assert.equal(await page.locator("#normalPhotos figure:not([hidden])").count(),5);assert.equal((await state()).candidatePreparation,null);await capture("05-reference-data");
    await page.locator("#referenceEntryContinue").click();assert.equal(await index(),1);assert.equal(await page.locator("#referenceConfirmTitle").innerText(),"새로운 기준 후보를 검증하겠습니까?");assert.equal((await state()).candidatePreparation,null);
    await page.locator("#referenceConfirmBack").click();assert.equal(await index(),0);await page.locator("#referenceEntryContinue").click();await capture("06-reference-confirm");await page.locator("#prepareCandidate").click();
    await page.waitForFunction(() => window.surfaceTraceFieldDemo.getState().candidatePreparation?.stage === 1); await page.reload(); await phase("reference-review"); await page.locator("#retryPreparation").click();
    await page.waitForFunction(() => !!window.surfaceTraceFieldDemo.getState().candidatePreparation?.completedAt, null, { timeout: 18000 }); assert.equal(await index(), 2);
    assert.equal((await state()).candidatePreparation.validationRequest.metrics, null); await page.locator("#showValidation").click(); assert.equal(await page.locator("#validationMetrics tr").count(), 3);
    await allPages("reference", 3); await go(2); await capture("05-reference-decision"); await page.locator("#finishCandidate").click(); await phase("completed");
    for (const size of sizes) { await page.setViewportSize(size); await fits("completed"); } await page.setViewportSize(sizes[0]);
    await page.reload(); await phase("completed"); const completed = await download("#completedDownload"); assert.equal(completed.candidatePreparation.validationRequest.status, "on-hold"); assert.equal(completed.modelWeightsUpdated, false);
    await page.locator("#reopenReference").click(); await phase("reference-review"); await page.locator("#requestMoreValidation").click(); await phase("completed"); assert.equal((await state()).referenceDecision.kind, "additional-validation");
    await page.locator("#completedRecords").click(); await phase("review-summary"); await go(1); if (await page.locator("#recordPrevious").isEnabled()) await page.locator("#recordPrevious").click(); await page.locator("[data-edit='0']").click(); await readyBatch();await choose(0,"normal","수정 메모");await page.locator("#saveDecision").click(); await phase("review-summary"); assert.equal((await state()).candidatePreparation, null);
    await reset();await receive();await confirmShift("unchanged");await readyBatch();await page.locator("#batchNormal").click();
    await page.locator('[data-batch-note="1"]').click();await page.locator("#reviewNote").fill("임시 메모");await page.locator("#saveBatchNote").click();await page.reload();await phase("reviewing");await readyBatch();assert.equal(await index(),0);assert.equal((await status()).reviewed,0);
    await page.locator('[data-batch-note="1"]').click();assert.equal(await page.locator("#reviewNote").inputValue(),"임시 메모");await page.locator("#closeBatchNote").click();await page.locator("#saveDecision").click();
    assert.equal((await state()).reviewGate, "stop"); await page.locator("#gateAction").click(); await phase("review-summary"); assert.equal((await status()).budget, 2); await go(1); await page.locator("#compareTruth").click(); assert.match(await page.locator("#truthResult").innerText(), /2장 중 0장/); assert((await state()).records.slice(0, 2).every(r => r.verdict === "normal"));
    await page.locator("#fieldFullscreen").click(); await page.waitForFunction(() => !!document.fullscreenElement); await page.locator("#fieldFullscreen").click(); await page.waitForFunction(() => !document.fullscreenElement);
    await go(0); await page.locator("#editShiftReview").click(); await phase("change-alert"); await confirmShift("hold"); await phase("review-summary"); assert.equal((await state()).shiftReview.verdict, "hold"); assert.equal((await status()).reviewed, 2);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ status: "passed", scrollFreePages: true, viewports: sizes, exactShiftFrameMaps: [32, 96], noCandidateSubstitution: true, actualFrozenInferenceAssets: true, reviewPaths: [2, 8], batchReview: true, noPerPhotoPageHopping: true, siteLinksRestored: true, referenceConfirmation: true, noProcedureDiagram: true, normalDataCount: 5, imageRetry: true, recordPaging: true, persistence: true, jsonExport: true, referencePreparation: true, newValidationMetricsFabricated: false, screenshots: output }));
  } catch (error) { await fs.writeFile(path.join(output,"failure-state.json"),JSON.stringify(await state())); await capture("failure"); throw error; } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
