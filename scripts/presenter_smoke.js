"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const durations = [24000, 31000, 32000, 25000, 26000, 38000, 38000, 26000];
const base = process.env.SITE_URL || "http://127.0.0.1:8879/";
const output = process.env.QA_OUTPUT || "/private/tmp/surfacetrace-presenter-final-20261116";

function fakeVoice() {
  window.__narrationCalls = [];
  Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: class {
    constructor(text) { this.text = text; }
  }});
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
    cancel() {}, getVoices() { return []; },
    speak(utterance) { window.__narrationCalls.push({ text: utterance.text, lang: utterance.lang }); }
  }});
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  const reports = [];
  try {
    for (const language of ["ko", "en"]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
      await context.addInitScript(fakeVoice);
      const page = await context.newPage();
      const errors = [], failedAssets = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("response", response => { if (response.status() >= 400) failedAssets.push(response.url()); });
      const file = language === "ko" ? "presenter.html" : "presenter-en.html";
      await page.goto(new URL(file, base).href);
      await page.waitForFunction(() => !!window.surfaceTracePresenter);
      const state = () => page.evaluate(() => window.surfaceTracePresenter.getState());
      const review = () => page.evaluate(() => window.surfaceTracePresenter.getReviewStatus());
      const scene = async index => {
        await page.locator(`.demo-steps [data-step="${index}"]`).click();
        assert.equal((await state()).scene, index);
        assert.equal(await page.locator(".demo-stage:not([hidden])").count(), 1);
      };
      const visibleText = await page.locator("body").textContent();
      assert(!/0\.4284|1,449|6,053|313\s*→\s*505/.test(visibleText));
      assert.equal(await page.locator(".data-split").count(), 0);
      assert.equal(await page.locator(".demo-steps button").count(), 8);
      assert.equal(await page.locator("#notesToggle, #speakerNotes, #speakerText, #tourNarration").count(), 0);
      assert.equal(await page.locator("#narrationToggle, .candidate-hold, .allocation-trial, .is-guided, .supplementary-results").count(), 0);
      assert(!/결함 검출률|defect detection rate|ADAPTIVE_BUDGET_RESULTS|26\s*→\s*50/.test(visibleText));
      assert(await page.evaluate(() => window.SURFACETRACE_PRESENTER_COPY[document.documentElement.lang].every(chapter => !("note" in chapter))));
      for (let index = 0; index < 8; index++) {
        await scene(index);
        if (index === 0) {
          assert.equal(await page.locator(".feedback-loop").count(), 0);
          assert.equal(await page.locator(".parallel-flow .pipeline-card").count(), 6);
          assert.equal(await page.locator(".parallel-flow > .reference-candidate-card").count(), 1);
          assert.equal(await page.locator(".reference-candidate-card img").getAttribute("src"), "./next-method/06.gif");
          assert.equal(await page.locator(".reference-candidate-card .candidate-checkpoints li").count(), 3);
          assert(await page.locator(".reference-candidate-card").evaluate(card => card.previousElementSibling.matches(".validation-connector") && card.previousElementSibling.previousElementSibling.matches(".reviewer-card")));
          if (language === "ko") assert.equal((await page.locator("#overviewTitle").innerText()).replace(/\s+/g," "), "현장 검수를 지원하는 AI 품질 관리 파이프라인");
        }
        if (index === 1) {
          assert.match(await page.locator('[data-scene="1"]').innerText(), /PCA/);
          assert.match(await page.locator('[data-scene="1"]').innerText(), /93,196/);
          await page.locator('[data-method="reference"]').click();
          assert.match(await page.locator('[data-method-panel="reference"]').innerText(), /7,392/);
        }
        if (index === 2) {
          const metrics = await page.locator(".detection-metrics").innerText();
          for (const number of ["0.884", "0.965", "66.4%", "85.4%"]) assert(metrics.includes(number));
          await page.waitForFunction(() => document.querySelector("#analysisOriginal").naturalWidth > 0 &&
            document.querySelector("#analysisOriginal").style.visibility !== "hidden");
          await page.locator("#compareRaw").click();
          assert(await page.locator("#analysisHeat").isHidden());
          await page.locator("#compareRaw").click();
          await page.locator('[data-photo="1"]').click();
          assert.equal((await state()).photo, 1);
        }
        if (index === 3) {
          const purpose = await page.locator(".independent-note").innerText();
          assert.match(purpose, language === "ko" ? /자동으로 정상 판정.*기존 결함 경보를 취소하지/ : /does not automatically label.*cancel existing defect alerts/);
          await page.locator("#shiftSlider").evaluate(element => { element.value = "4"; });
          await page.locator("#shiftSlider").dispatchEvent("input");
          assert.equal((await state()).shift, 4);
          assert.equal((await page.locator("#shiftStreak").innerText()).replace(/\s/g, ""), "3/3");
        }
        if (index === 4) {
          assert.equal(await page.locator(".review-coverage-row > div:first-child small").count(), 0);
          assert.match(await page.locator('[data-scene="4"] .reason-copy').innerText(), language === "ko" ? /같은 결함을 반복 검수하지/ : /same defect is not reviewed repeatedly/);
          assert.equal(await page.locator("#top8Track i").count(), 8);
          assert.equal(await page.locator("#spaced8Track i").count(), 8);
          assert.equal(await page.locator("#intervalPhotos .film-frame").count(), 8);
        }
        if (index === 5) {
          await page.locator("#reviewAction").click();
          await page.locator("#nextPhoto").click();
          await page.locator("#reviewAction").click();
          assert.equal((await review()).budget, 8);
          for (let i = 2; i < 8; i++) {
            await page.locator("#nextPhoto").click();
            await page.locator("#reviewAction").click();
          }
          assert.equal((await review()).count, 8);
          assert((await review()).complete);
          assert.equal(await page.locator("#reviewLog li").count(), 8);
          await page.locator("#caseSelect").selectOption("normal");
          await page.locator("#reviewAction").click();
          await page.locator("#nextPhoto").click();
          await page.locator("#reviewAction").click();
          assert((await review()).stopped);
          assert.equal((await review()).count, 2);
          assert.match(await page.locator(".efficiency-callout").innerText(), /56\.3%/);
        }
        if (index === 6) {
          assert.equal(await page.locator(".validation-flow li").count(), 3);
          await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
          const flow = await page.locator(".validation-flow").boundingBox();
          assert(flow.y >= 0 && flow.y + flow.height < 1080, "The validation flow must be visible on chapter entry");
          assert.match(await page.locator(".decision-conclusion").innerText(), language === "ko" ? /기존 기준 유지/ : /Current reference retained/);
          const numbers = await page.locator(".decision-visual").innerText();
          for (const value of ["1,050", "202", "153", "48", "40"]) assert(numbers.includes(value));
          assert.match(numbers, language === "ko" ? /서로 다른 신규 결함 사건 경보/ : /Alerts on distinct new defect episodes/);
        }
        if (index === 7) {
          assert.equal(await page.locator(".results-metric-grid article").count(), 2);
          assert.equal(await page.locator(".episode-result, [data-distribution], #distributionFigure, #distributionMobile").count(), 0);
          assert(!/22\s*→\s*26|Run 03|Run 04/.test(await page.locator('[data-scene="7"]').innerText()));
          assert.equal(await page.locator('[data-scene="7"] .demo-copy .small-note').count(), 0);
          assert.equal(await page.locator(".pipeline-closing h3").count(), 0);
          if (language === "ko") assert.equal(await page.locator(".pipeline-closing p").innerText(), "AI가 이상을 분석하고, 사람이 확인하며, 검수 결과를 바탕으로 검사 기준의 개선 가능성을 검증하는 품질 관리 파이프라인입니다.");
          assert.equal(await page.locator(".strength-card").count(), 2);
          assert.equal(await page.locator(".strength-subsection").count(), 2);
          assert.equal(await page.locator(".strength-validation-flow li").count(), 4);
          const first = await page.locator(".strength-card").nth(0).boundingBox();
          const second = await page.locator(".strength-card").nth(1).boundingBox();
          assert(Math.abs(first.y - second.y) < 1 && second.x > first.x + first.width, "Industrial strengths must be side by side on desktop");
          const strengths = await page.locator(".industrial-strengths").innerText();
          for (const value of ["DINOv2", "MMD", "128", "56", "56.3%", "26"]) assert(strengths.includes(value));
          assert.match(strengths, language === "ko" ? /공개 데이터의 정답.*오프라인 실험/ : /Offline experiment.*public dataset ground truth/);
          assert.match(await page.locator(".strength-outcome").innerText(), language === "ko" ? /후보 적용 보류 \/ 기존 기준 유지/ : /Candidate held \/ current reference retained/);
        }
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await page.waitForTimeout(250);
        await page.screenshot({ path: path.join(output, `${language}-${index+1}.png`), fullPage: true });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      for (let index = 0; index < 8; index++) {
        await scene(index);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${language} chapter ${index+1}: mobile overflow`);
        if (index === 7) {
          const first = await page.locator(".strength-card").nth(0).boundingBox();
          const second = await page.locator(".strength-card").nth(1).boundingBox();
          assert(second.y > first.y + first.height && Math.abs(first.x - second.x) < 1, "Industrial strengths must stack on mobile");
        }
      }
      await page.screenshot({ path: path.join(output, `${language}-mobile.png`), fullPage: true });
      assert.deepEqual(errors, []);
      assert.deepEqual(failedAssets, []);
      await context.close();

      const timed = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
      await timed.addInitScript(fakeVoice);
      const replay = await timed.newPage();
      const replayErrors = [];
      replay.on("pageerror", error => replayErrors.push(error.message));
      await replay.clock.install();
      await replay.goto(new URL(file, base).href);
      await replay.waitForFunction(() => !!window.surfaceTracePresenter);
      await replay.clock.pauseAt(await replay.evaluate(() => new Date()));
      assert.equal(await replay.locator("#narrationToggle").count(), 0);
      await replay.locator("#playTour").click();
      assert.equal(await replay.evaluate(() => window.__narrationCalls.length), 1);
      for (let i = 0; i < durations.length; i++) {
        if (i === 7) {
          await replay.clock.runFor(6500);
          const title = await replay.locator("#strengthsTitle").boundingBox();
          assert(title.y >= 0 && title.y + title.height < 1080, "The tour must show the industrial-strengths heading");
          assert.equal((await replay.evaluate(() => window.surfaceTracePresenter.getState())).resultsStep, 1);
          await replay.clock.runFor(durations[i] - 6500);
        } else await replay.clock.runFor(durations[i]);
        const current = await replay.evaluate(() => window.surfaceTracePresenter.getState());
        assert.equal(current.scene, Math.min(i+1, 7), `${language} replay timing after chapter ${i+1}`);
      }
      const final = await replay.evaluate(() => ({ state: window.surfaceTracePresenter.getState(),
        calls: window.__narrationCalls, duration: window.SURFACETRACE_PRESENTER_COPY.durationMs }));
      assert.equal(final.duration, 240000);
      assert.equal(final.state.playing, false);
      assert.equal(final.state.reviews.defect.records.filter(Boolean).length, 8);
      assert.equal(final.state.reviews.normal.records.filter(Boolean).length, 2);
      assert.equal(final.calls.length, 8);
      assert(final.calls.every(call => call.lang.startsWith(language)));
      assert(final.state.resultsClosing, "The replay must reveal its closing pipeline message");
      const closing = await replay.locator(".pipeline-closing").boundingBox();
      assert(closing.y >= 0 && closing.y + closing.height <= 1080, "Closing message must be visible when the replay finishes");
      assert.deepEqual(replayErrors, []);
      await timed.close();
      reports.push({ language, chapters: 8, reviewPaths: [8, 2], durationMs: final.duration,
        narrationChapters: final.calls.length, mobileOverflow: false, pageErrors: errors });
    }
    console.log(JSON.stringify({ status: "passed", reports, screenshots: output }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
