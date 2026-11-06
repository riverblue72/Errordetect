"use strict";

// Capture the real recorded-run page for a 1920 x 1080 presentation GIF.
// Run against a local build served over HTTP. Frames stay under out/.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const base = process.env.SITE_URL || "http://127.0.0.1:8766/";
const frameDir = path.resolve("out/recorded-run-frames");
const fps = 4;

(async () => {
  fs.mkdirSync(frameDir, { recursive: true });
  for (const file of fs.readdirSync(frameDir)) if (/^frame-\d{4}\.png$/.test(file)) fs.unlinkSync(path.join(frameDir, file));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await page.clock.install();
    await page.goto(new URL("demo.html", base).href, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelector("#demoScoreChart polyline") !== null);
    await page.addStyleTag({ content: `
      .site-header,.site-footer,.demo-source,.demo-controls{display:none!important}
      .demo-main{width:min(1680px,calc(100% - 120px));padding:52px 0 0}
      .demo-intro{margin-bottom:24px}
      .demo-intro h1{font-size:66px}
      .demo-run{font-size:17px}
      .demo-steps button{font-size:16px;padding:14px 21px}
      .demo-stage{min-height:690px;grid-template-columns:minmax(0,.78fr) minmax(0,1.22fr)}
      .demo-copy{padding:65px}
      .demo-copy h2{font-size:55px}
      .demo-copy>p:not(.demo-kicker){font-size:19px}
      .demo-kicker{font-size:13px}
      .demo-callout strong{font-size:50px}
      .demo-callout span,.demo-visual-note,.shift-photos figcaption{font-size:15px}
      .demo-visual{padding:45px}
      .context-visual{grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:30px}
      .context-meeting figcaption{font-size:14px}
      .context-responses span,.context-responses strong{font-size:17px}
      .context-responses>div{padding:20px 0}
      .check-visual{padding:40px 60px}
      .demo-check-photo{max-height:380px}
      .demo-outcome{font-size:25px}
      .demo-cohort{padding:20px}
      .demo-cohort p,.demo-cohort small{font-size:14px}
      .demo-cohort-values{font-size:16px}
      .demo-cohort-values strong{font-size:28px}
      .demo-cohort-bars i,.demo-cohort-bars b{height:8px}
      .decision-visual{padding:55px}
      .decision-row>span{font-size:17px}
      .decision-row strong{font-size:27px}
      .demo-controls{margin-top:15px}
    ` });
    await page.evaluate(() => { document.querySelector("#demoPlay").textContent = "Recorded replay"; });
    let index = 0;
    const hold = async frames => {
      for (let i = 0; i < frames; i++) {
        // Fake-clock scene changes can outrun image loading; capture only decoded photos.
        await page.locator('.demo-stage:not([hidden]) img:not([hidden])')
          .evaluateAll(images => Promise.all(images.map(image => image.decode())));
        await page.screenshot({ path: path.join(frameDir, `frame-${String(index++).padStart(4, "0")}.png`), animations: "allow" });
        await page.clock.runFor(1000 / fps);
      }
    };
    const chapter = async step => {
      await page.locator(`.demo-steps button[data-step="${step}"]`).click();
      const expectedScope = step === 0 ? "FIELD FEEDBACK · DESIGN BRIEF"
        : step === 1 ? "THREE RUNS · EXAMPLES"
          : step === 5 ? "15 RUNS · UPDATE TEST" : "RUN · T1_S478_I118_2";
      if (await page.locator("#demoScope").textContent() !== expectedScope) {
        throw new Error(`Unexpected replay scope in chapter ${step + 1}`);
      }
      await page.evaluate(() => { document.querySelector("#demoPlay").textContent = "Recorded replay"; });
    };
    if (await page.locator("#demoScope").textContent() !== "FIELD FEEDBACK · DESIGN BRIEF") {
      throw new Error("Feedback context is missing its scope");
    }
    await hold(fps * 4);
    await chapter(1);
    for (let caseIndex = 0; caseIndex < 3; caseIndex++) {
      await page.evaluate(i => renderFeature(i), caseIndex);
      await page.locator("#demoClassicMap").evaluate(image => image.decode());
      await page.locator("#demoDinoMap").evaluate(image => image.decode());
      await hold(fps * 2);
    }
    await chapter(2); await hold(fps * 5);
    await chapter(3); await hold(fps * 5);
    await chapter(4);
    for (let reviewIndex = 0; reviewIndex < 8; reviewIndex++) {
      await page.locator("#demoReviewPhoto").evaluate(image => image.decode());
      await hold(2);
      await page.locator("#demoReveal").click();
      await page.waitForFunction(() => document.querySelector("#demoOutcome").textContent.includes("confirmed") || document.querySelector("#demoOutcome").textContent.startsWith("Uncertain"));
      if (reviewIndex === 1 && !(await page.locator("#demoRoute").textContent()).includes("six more checks opened")) {
        throw new Error("The recorded two-check decision did not open the remaining queue");
      }
      await hold(reviewIndex === 7 ? fps * 3 : 2);
      if (reviewIndex < 7) await page.locator("#demoReveal").click();
    }
    if (await page.locator("#demoCheckCount").textContent() !== "6 vs 5") {
      throw new Error("Recorded review comparison is missing after eight checks");
    }
    await chapter(5); await hold(fps * 5);
    const final = await page.evaluate(() => ({
      scene: document.querySelector('.demo-steps button[aria-current="step"]')?.dataset.step,
      width: innerWidth,
      height: innerHeight,
      error: document.querySelector("#demoError")?.textContent,
    }));
    if (final.scene !== "5" || final.width !== 1920 || final.height !== 1080 || final.error || index !== 142) {
      throw new Error(`Capture stopped in an unexpected state: ${JSON.stringify(final)}`);
    }
    console.log(JSON.stringify({ frames: index, fps, resolution: "1920x1080", directory: frameDir }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
