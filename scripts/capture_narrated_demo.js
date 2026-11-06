"use strict";

// Capture the recorded site replay at the durations fixed by the Korean audio.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "out", "narrated-demo");
const frameDir = path.join(output, "frames");
const plan = JSON.parse(fs.readFileSync(path.join(output, "plan.json"), "utf8"));
const base = process.env.SITE_URL || "http://127.0.0.1:8766/";
const segment = id => {
  const item = plan.segments.find(row => row.id === id);
  if (!item) throw new Error(`Missing narration scene: ${id}`);
  return item;
};
if (plan.fps !== 6 || plan.resolution.join("x") !== "1920x1080" || plan.segments.length !== 9) {
  throw new Error("Narration capture plan does not match the intended video format");
}
fs.mkdirSync(frameDir, { recursive: true });
if (fs.readdirSync(frameDir).some(name => /^frame-\d+\.jpg$/.test(name))) {
  throw new Error(`Capture frames already exist: ${frameDir}`);
}

const captureCSS = `
  .site-header,.site-footer,.demo-source,.demo-controls{display:none!important}
  .demo-main{width:min(1680px,calc(100% - 120px));padding:52px 0 0}
  .demo-intro{margin-bottom:24px}.demo-intro h1{font-size:66px}.demo-run{font-size:17px}
  .demo-steps button{font-size:16px;padding:14px 21px}
  .demo-stage{min-height:690px;grid-template-columns:minmax(0,.78fr) minmax(0,1.22fr)}
  .demo-copy{padding:65px}.demo-copy h2{font-size:55px}
  .demo-copy>p:not(.demo-kicker){font-size:19px}.demo-kicker{font-size:13px}
  .demo-callout strong{font-size:50px}
  .demo-callout span,.demo-visual-note,.shift-photos figcaption{font-size:15px}
  .demo-visual{padding:45px}
  .context-visual{grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:30px}
  .context-meeting figcaption{font-size:14px}
  .context-responses span,.context-responses strong{font-size:17px}
  .context-responses>div{padding:20px 0}
  .check-visual{padding:40px 60px}.demo-check-photo{max-height:380px}
  .demo-outcome{font-size:25px}.demo-cohort{padding:20px}
  .demo-cohort p,.demo-cohort small{font-size:14px}
  .demo-cohort-values{font-size:16px}.demo-cohort-values strong{font-size:28px}
  .demo-cohort-bars i,.demo-cohort-bars b{height:8px}
  .decision-visual{padding:55px}.decision-row>span{font-size:17px}
  .decision-row strong{font-size:27px}
  body{background:#f7f8f6}
  #narratedCaption{position:fixed;left:120px;right:120px;bottom:20px;min-height:88px;
    padding:18px 130px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;
    border-radius:12px;background:#263852;color:#f8fbff;font:500 23px/1.4 'Malgun Gothic',sans-serif;
    text-align:center;z-index:1000;box-shadow:0 10px 30px #15243920}
  #narratedCaption small{position:absolute;left:24px;top:14px;font:500 13px 'Segoe UI',sans-serif;
    letter-spacing:.08em;color:#9cd4d1}
  #narratedCaption em{position:absolute;right:24px;bottom:13px;font:normal 12px 'Segoe UI',sans-serif;
    color:#aabbd0}
`;

const intervalCSS = `
  .site-header,.site-footer,.interval-foot{display:none!important}
  .interval-main{width:1680px;padding:45px 0 700px}
  .interval-heading{margin-bottom:20px}.interval-heading h1{font-size:62px}
  .interval-heading p:last-child{font-size:18px}
  .interval-id strong{font-size:17px}.interval-grid{gap:22px}
  .interval-panel{padding:23px 30px}.interval-panel h2{font-size:30px}
  .interval-metrics{margin:18px 0}.interval-metrics strong{font-size:38px}
  .interval-metrics span,.interval-hint,.change-state span:last-child{font-size:15px}
  .interval-chart{max-height:155px;margin-top:8px}.change-state{margin:25px 0 17px}
  .change-state strong{font-size:39px}.request-panel{margin-top:20px}
  .request-progress{margin:16px 0 13px}.request-grid{grid-template-columns:repeat(2,minmax(0,1fr));max-width:1300px;margin-inline:auto}
  .request-image{aspect-ratio:16/8}.request-card-body{padding:11px 14px}
  #narratedCaption{position:fixed;left:120px;right:120px;bottom:20px;min-height:88px;
    padding:18px 130px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;
    border-radius:12px;background:#263852;color:#f8fbff;font:500 23px/1.4 'Malgun Gothic',sans-serif;
    text-align:center;z-index:1000;box-shadow:0 10px 30px #15243920}
  #narratedCaption small{position:absolute;left:24px;top:14px;font:500 13px 'Segoe UI',sans-serif;
    letter-spacing:.08em;color:#9cd4d1}
  #narratedCaption em{position:absolute;right:24px;bottom:13px;font:normal 12px 'Segoe UI',sans-serif;
    color:#aabbd0}
`;

const slideHTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;background:#f7f8f6;color:#25334d;font-family:'Segoe UI',Arial,sans-serif}
  main{width:1680px;margin:54px auto}header{display:flex;justify-content:space-between;align-items:end;margin-bottom:30px}
  .eyebrow{font-size:17px;letter-spacing:.12em;color:#60799a}.scope{font-size:18px;color:#697b99}
  h1{font-size:66px;line-height:1.06;letter-spacing:-.04em;margin:18px 0 0;font-weight:600}
  .chart-card{border:1px solid #dce2e8;border-radius:13px;background:#fff;padding:22px 28px 17px;
    box-shadow:0 24px 60px #24345517}
  .tabs{display:flex;gap:12px;margin-bottom:15px}.tabs span{display:inline-block;padding:10px 18px;
    border:1px solid #d4dbe8;border-radius:7px;color:#64738b;font-size:19px}
  .tabs span.active{background:#eae8ff;border-color:#8d81e6;color:#463cb0}
  #distributionImage{display:block;width:100%;height:636px;object-fit:contain;background:#f8f8f6;border-radius:6px}
  .note{margin-top:11px;color:#68758b;font-size:16px}
  #narratedCaption{position:fixed;left:120px;right:120px;bottom:20px;min-height:88px;
    padding:18px 130px;display:flex;align-items:center;justify-content:center;border-radius:12px;
    background:#263852;color:#f8fbff;font:500 23px/1.4 'Malgun Gothic',sans-serif;
    text-align:center;box-shadow:0 10px 30px #15243920}
  #narratedCaption small{position:absolute;left:24px;top:14px;font:500 13px 'Segoe UI',sans-serif;
    letter-spacing:.08em;color:#9cd4d1}
  #narratedCaption em{position:absolute;right:24px;bottom:13px;font:normal 12px 'Segoe UI',sans-serif;
    color:#aabbd0}
</style></head><body><main><header><div><div class="eyebrow">TSFABRICS · FULL RECORDED RUNS</div>
<h1>Look beyond selected photos.</h1></div><span class="scope">4-run macro AP · 66.4% → 85.4%</span></header>
<section class="chart-card"><div class="tabs"><span id="run03" class="active">Run 03</span>
<span id="run04">Run 04</span></div><img id="distributionImage" src="./ablation/score_distribution_run_03.svg"
alt="Full-run score distributions"><div class="note">Two improved examples from four evaluated defect runs · complete score distributions</div></section></main>
<div id="narratedCaption"><small id="captionNumber"></small><span id="captionText"></span>
<em>TSFabrics · CC BY 4.0</em></div></body></html>`;

const summaryHTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;background:#f7f8f6;color:#25334d;font-family:'Segoe UI',Arial,sans-serif}
  main{width:1680px;margin:54px auto}.eyebrow{font-size:17px;letter-spacing:.12em;color:#60799a}
  h1{font-size:66px;line-height:1.08;letter-spacing:-.04em;margin:18px 0 28px;font-weight:600}
  .trial{display:grid;grid-template-columns:1.25fr 1fr 1fr;gap:22px;align-items:center;
    background:#263852;color:#fff;border-radius:14px;padding:38px 42px;min-height:200px}
  .trial small,.metric small{display:block;font-size:15px;letter-spacing:.11em;text-transform:uppercase}
  .trial small{color:#a3d8d2}.trial strong{display:block;margin-top:12px;font-size:32px;font-weight:600}
  .trial p{font-size:19px;line-height:1.4;color:#cbd7e8;margin:8px 0 0}
  .trial .result{padding-left:28px;border-left:1px solid #657894}.trial .result strong{font-size:42px;color:#afe0d5}
  .trial .gate strong{font-size:34px;color:#fff}
  .metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:26px}
  .metric{background:#fff;border:1px solid #dce2e8;border-radius:14px;padding:32px 35px;min-height:304px;
    box-shadow:0 18px 55px #2434550e}.metric small{color:#60799a}.metric strong{display:block;margin:34px 0 13px;
    font-size:61px;font-weight:600;letter-spacing:-.04em;color:#356e78}.metric p{font-size:22px;line-height:1.35;margin:0}
  .metric span{display:block;margin-top:12px;font-size:17px;color:#6f7c8d}
  .reveal{opacity:.14;transition:opacity .45s ease}.reveal.is-visible{opacity:1}
  .foot{font-size:18px;color:#65748a;margin-top:22px}
  #narratedCaption{position:fixed;left:120px;right:120px;bottom:20px;min-height:88px;
    padding:18px 130px;display:flex;align-items:center;justify-content:center;border-radius:12px;
    background:#263852;color:#f8fbff;font:500 23px/1.4 'Malgun Gothic',sans-serif;
    text-align:center;box-shadow:0 10px 30px #15243920}
  #narratedCaption small{position:absolute;left:24px;top:14px;font:500 13px 'Segoe UI',sans-serif;
    letter-spacing:.08em;color:#9cd4d1}
  #narratedCaption em{position:absolute;right:24px;bottom:13px;font:normal 12px 'Segoe UI',sans-serif;
    color:#aabbd0}
</style></head><body><main><div class="eyebrow">TSFABRICS · RECORDED VALIDATION</div>
<h1>Verified gains. Controlled updates.</h1>
<section class="trial"><div><small>Candidate reference · 15 later runs</small>
<strong>Review → trial → validate</strong><p>Confirmed normal photos can inform a new reference.</p></div>
<div class="result reveal" id="trialResult"><small>Trial · normal alerts</small><strong>1,050 → 0</strong>
<p>Later evaluation frames</p></div><div class="result gate reveal" id="trialGate"><small>Update decision</small>
<strong>Keep frozen</strong><p>Defect-detection gate not met</p></div></section>
<div class="metrics" id="summaryMetrics"><div class="metric"><small>Frame anomaly ranking</small>
<strong>66.4 → 85.4%</strong><p>Macro average precision</p><span>Four defect runs</span></div>
<div class="metric"><small>Visual shift</small><strong>15 / 16</strong><p>Known run boundaries detected</p>
<span>Separate change signal</span></div><div class="metric"><small>Limited review</small>
<strong>15 → 26</strong><p>New defect episodes found</p><span>Same eight-check budget</span></div></div>
<p class="foot">Frozen reference remains active until an update passes both checks.</p></main>
<div id="narratedCaption"><small id="captionNumber"></small><span id="captionText"></span>
<em>TSFabrics · CC BY 4.0</em></div></body></html>`;

const questionsHTML = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;background:#f7f8f6;color:#25334d;font-family:'Malgun Gothic',sans-serif}
  main{width:1680px;margin:54px auto}.eyebrow{font:17px 'Segoe UI',sans-serif;letter-spacing:.12em;color:#60799a}
  h1{font-size:62px;line-height:1.12;letter-spacing:-.04em;margin:17px 0 10px;font-weight:600}
  .instruction{font-size:24px;color:#65748a;margin:0 0 30px}
  .questions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}
  .question{background:#fff;border:2px solid #dce2e8;border-radius:14px;padding:30px 34px;min-height:267px;
    box-shadow:0 18px 55px #2434550c;transition:border-color .35s ease,background .35s ease,transform .35s ease}
  .question.is-active{border-color:#75aaa4;background:#f2faf8;transform:translateY(-3px)}
  .question .number{display:inline-block;border-radius:50%;width:36px;height:36px;line-height:36px;
    background:#e7f1ef;color:#3c7470;text-align:center;font:600 17px/36px 'Segoe UI',sans-serif}
  .question h2{display:inline-block;margin:0 0 0 13px;font-size:29px;font-weight:600;vertical-align:middle}
  .question p{font-size:24px;line-height:1.48;margin:23px 0 0;word-break:keep-all}
  .foot{font-size:18px;color:#65748a;margin-top:22px}
  #narratedCaption{position:fixed;left:120px;right:120px;bottom:20px;min-height:88px;
    padding:18px 130px;display:flex;align-items:center;justify-content:center;border-radius:12px;
    background:#263852;color:#f8fbff;font:500 23px/1.4 'Malgun Gothic',sans-serif;
    text-align:center;box-shadow:0 10px 30px #15243920}
  #narratedCaption small{position:absolute;left:24px;top:14px;font:500 13px 'Segoe UI',sans-serif;
    letter-spacing:.08em;color:#9cd4d1}
  #narratedCaption em{position:absolute;right:24px;bottom:13px;font:normal 12px 'Segoe UI',sans-serif;
    color:#aabbd0}
</style></head><body><main><div class="eyebrow">ISM × RIKU · FEEDBACK REQUEST</div>
<h1>네 항목에 대한 의견을 부탁드립니다.</h1>
<p class="instruction">각 항목별 1–5점 · 점수의 이유 · 우선 보완할 점</p>
<div class="questions">
  <section class="question is-active"><span class="number">1</span><h2>구현·시연 수준</h2>
    <p>연속 사진 분석부터 검수·요약까지, 화면과 동작이 이해하고 검토하기 충분한가요?</p></section>
  <section class="question"><span class="number">2</span><h2>사용 데이터의 적절성</h2>
    <p>TSFabrics가 사전 검증용으로 적절한가요? 실제 벨트 적용 전 어떤 사진이 필요할까요?</p></section>
  <section class="question"><span class="number">3</span><h2>방법론의 타당성</h2>
    <p>이상·변화 감지, 검수 대상 선정, 구간 요약 중 우선 보완할 단계는 무엇인가요?</p></section>
  <section class="question"><span class="number">4</span><h2>실무 활용 가능성</h2>
    <p>현장에서 누가, 언제, 어떤 결과를 확인해야 실제 업무에 도움이 될까요?</p></section>
</div><p class="foot">영상의 수치는 공개 직물 데이터 실험 결과입니다.</p></main>
<div id="narratedCaption"><small id="captionNumber"></small><span id="captionText"></span>
<em>TSFabrics · CC BY 4.0</em></div></body></html>`;

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.CHROME_PATH || undefined });
  try {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const demo = await context.newPage();
    await demo.clock.install();
    await demo.goto(new URL("demo.html", base).href, { waitUntil: "networkidle" });
    await demo.waitForFunction(() => document.querySelector("#demoScoreChart polyline") !== null);
    await demo.addStyleTag({ content: captureCSS });
    await demo.evaluate(() => {
      const bar = document.createElement("div");
      bar.id = "narratedCaption";
      bar.innerHTML = '<small id="captionNumber"></small><span id="captionText"></span><em>TSFabrics · CC BY 4.0</em>';
      document.body.append(bar);
      state.featureCases = state.featureCases.slice(0, 2);
      document.querySelector('.demo-stage[data-scene="1"] .demo-callout span').textContent =
        'Macro frame AP · four defect runs';
    });
    const slide = await context.newPage();
    await slide.goto(new URL("index.html", base).href, { waitUntil: "domcontentloaded" });
    await slide.setContent(slideHTML, { waitUntil: "load" });
    await slide.locator("#distributionImage").evaluate(image => image.decode());
    const summary = await context.newPage();
    await summary.setContent(summaryHTML, { waitUntil: "load" });
    const questions = await context.newPage();
    await questions.setContent(questionsHTML, { waitUntil: "load" });
    const interval = await context.newPage();
    await interval.goto(new URL("interval.html", base).href, { waitUntil: "networkidle" });
    await interval.waitForFunction(() => document.querySelector("#frameCount").textContent !== "—");
    await interval.addStyleTag({ content: intervalCSS });
    await interval.evaluate(() => {
      const bar = document.createElement("div");
      bar.id = "narratedCaption";
      bar.innerHTML = '<small id="captionNumber"></small><span id="captionText"></span><em>TSFabrics · CC BY 4.0</em>';
      document.body.append(bar);
      document.querySelectorAll('.request-card img[loading="lazy"]').forEach(image => { image.loading = "eager"; });
    });
    await interval.locator('.request-card:not([hidden]) img:not([hidden])')
      .evaluateAll(images => Promise.all(images.map(image => image.decode())));

    let frame = 0;
    const caption = async (page, item, number, cue) => page.evaluate(({ label, text }) => {
      document.querySelector("#captionNumber").textContent = label;
      document.querySelector("#captionText").textContent = text;
    }, { label: `${String(number).padStart(2, "0")} / ${String(plan.segments.length).padStart(2, "0")}`,
      text: item.captions[cue].text });
    const capture = async (page, item, number, update = async () => {}) => {
      if (frame !== item.start_frame) throw new Error(`Frame boundary differs at ${item.id}`);
      let currentCue = -1;
      for (let local = 0; local < item.frames; local++) {
        const cue = item.captions.findLastIndex(row => local / item.frames >= row.at);
        if (cue !== currentCue) {
          currentCue = cue;
          await caption(page, item, number, cue);
        }
        await update(local, item.frames);
        if (page === demo) {
          await page.locator('.demo-stage:not([hidden]) img:not([hidden])')
            .evaluateAll(images => Promise.all(images.map(image => image.decode())));
        }
        await page.screenshot({ path: path.join(frameDir, `frame-${String(frame++).padStart(5, "0")}.jpg`),
          type: "jpeg", quality: 90, animations: "allow" });
        if (page === demo) await page.clock.runFor(1000 / plan.fps);
      }
      console.log(`${item.id}: ${item.frames} frames`);
    };
    const chapter = async index => {
      await demo.locator(`.demo-steps button[data-step="${index}"]`).click();
      if (await demo.locator('.demo-steps button[aria-current="step"]').getAttribute("data-step") !== String(index)) {
        throw new Error(`Chapter ${index} did not open`);
      }
    };

    await capture(demo, segment("feedback"), 1);

    await chapter(1);
    let featureCase = -1;
    await capture(demo, segment("features"), 2, async (local, length) => {
      const current = Math.min(1, Math.floor(local / length * 2));
      if (current !== featureCase) {
        featureCase = current;
        await demo.evaluate(index => renderFeature(index), current);
      }
    });

    await chapter(2);
    await demo.evaluate(() => clearTimeout(state.shiftTimer));
    let shiftIndex = -1;
    await capture(demo, segment("shift"), 3, async (local, length) => {
      const current = Math.min(4, Math.floor(local / length * 5));
      if (current !== shiftIndex) {
        shiftIndex = current;
        await demo.evaluate(index => renderShift(index), current);
      }
    });

    await chapter(3);
    await capture(demo, segment("spacing"), 4);

    await chapter(4);
    let review = -1;
    let revealed = false;
    await capture(demo, segment("review"), 5, async (local, length) => {
      const current = Math.min(7, Math.floor(local / length * 8));
      if (current !== review) {
        if (review >= 0 && revealed) await demo.locator("#demoReveal").click();
        review = current;
        revealed = false;
      }
      const progress = local / length * 8 - current;
      if (!revealed && progress > .38) {
        await demo.locator("#demoReveal").click();
        revealed = true;
      }
    });
    if (await demo.locator("#demoCheckCount").textContent() !== "6 vs 5") {
      throw new Error("Recorded eight-check result did not appear");
    }

    await capture(interval, segment("interval"), 6, async (local, length) => {
      if (local === Math.floor(length * .53)) {
        await interval.evaluate(() => window.scrollTo({ top: document.querySelector('.request-panel').offsetTop - 270 }));
      }
    });

    let shownRun = "03";
    await capture(slide, segment("distribution"), 7, async (local, length) => {
      const run = local < length * .45 ? "03" : "04";
      if (run === shownRun) return;
      shownRun = run;
      await slide.evaluate(next => {
        const image = document.querySelector("#distributionImage");
        image.src = `./ablation/score_distribution_run_${next}.svg`;
        document.querySelector("#run03").classList.toggle("active", next === "03");
        document.querySelector("#run04").classList.toggle("active", next === "04");
      }, run);
      await slide.locator("#distributionImage").evaluate(image => image.decode());
    });

    await capture(summary, segment("decision"), 8, async (local, length) => {
      const progress = local / length;
      await summary.evaluate(value => {
        document.querySelector("#trialResult").classList.toggle("is-visible", value >= .18);
        document.querySelector("#trialGate").classList.toggle("is-visible", value >= .43);
      }, progress);
    });
    await capture(questions, segment("questions"), 9, async (local, length) => {
      const active = Math.min(3, Math.floor(local / length * 4));
      await questions.evaluate(index => {
        document.querySelectorAll('.question').forEach((card, number) => {
          card.classList.toggle('is-active', index === number);
        });
      }, active);
    });
    if (frame !== plan.total_frames) throw new Error(`Captured ${frame}, expected ${plan.total_frames}`);
    console.log(JSON.stringify({ frames: frame, fps: plan.fps, duration: plan.duration_seconds,
      resolution: plan.resolution, directory: frameDir }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
