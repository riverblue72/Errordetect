"use strict";

const assert = require("assert");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || undefined,
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const base = process.env.SITE_URL || "http://127.0.0.1:8766/";
    await page.goto(base, { waitUntil: "networkidle" });
    assert((await page.title()).includes("SurfaceTrace"));
    assert.strictEqual(await page.locator(".hero-team").textContent(), "A project by ISM × RIKU");
    assert.strictEqual(await page.locator(".landing-page .footer-top span").textContent(), "ISM × RIKU");
    assert(!/rubber belt/i.test(await page.locator("body").innerText()));
    assert.strictEqual(await page.locator(".site-footer .footer-bottom p").first().textContent(), "© 2026 Hyunsu Go");
    assert.strictEqual(await page.locator('link[rel="icon"]').getAttribute("href"), "./favicon.svg");
    assert.strictEqual(await page.locator(".method-card").count(), 9);
    const landingDimensions = await page.locator(".hero-demo .base-photo").evaluate(img => [img.naturalWidth, img.naturalHeight]);
    assert(landingDimensions[0] > landingDimensions[1], "Landing photo is not landscape");
    assert.strictEqual(await page.locator(".method-play").count(), 0);
    const methodFrames = page.locator(".method-animation img");
    assert.strictEqual(await methodFrames.count(), 6);
    for (let i = 0; i < 6; i++) {
      assert((await methodFrames.nth(i).getAttribute("src")).endsWith(`0${i + 1}.gif`));
      assert(await methodFrames.nth(i).evaluate(img => img.complete && img.naturalWidth > 0));
    }
    assert.strictEqual(await page.locator(".method-animation svg[role='img']").count(), 3);
    assert.strictEqual(await page.locator('.method-card-copy p[lang="ko"]').count(), 9);
    assert.strictEqual(await page.locator('[data-step="08"] h3').textContent(), "Review and confirm");
    await page.getByRole("link", { name: /Try a real sample/ }).click();
    assert(page.url().includes("inspect.html?sample=1"));
    assert.strictEqual(await page.locator(".inspector-page .footer-top span").textContent(), "ISM × RIKU");
    assert(!/rubber belt/i.test(await page.locator("body").innerText()));
    assert.strictEqual(await page.locator(".site-footer .footer-bottom p").first().textContent(), "© 2026 Hyunsu Go");
    await page.waitForFunction(() => document.querySelector("#score").textContent !== "—", null, { timeout: 60000 });
    assert.strictEqual(await page.locator(".sample").count(), 64);
    assert.strictEqual(await page.locator('input[type="file"]').count(), 0);
    const score = Number(await page.locator("#score").textContent());
    assert(score > 2.5 && score < 4.5, `Unexpected sample score: ${score}`);
    assert.strictEqual(await page.locator("#thresholdMarker").isVisible(), true);
    assert(Math.abs(parseFloat(await page.locator("#thresholdMarker").evaluate(el => el.style.left)) - 66.67) < .1);
    assert.strictEqual(await page.locator("#threshold").textContent(), "Threshold 2.48");
    assert.strictEqual(await page.locator("#status").textContent(), "Review needed");
    const dimensions = await page.evaluate(async () => {
      const source = document.querySelector("#sourceImage");
      const heat = new Image();
      heat.src = document.querySelector("#heatmap").src;
      await heat.decode();
      return { source: [source.naturalWidth, source.naturalHeight], heat: [heat.naturalWidth, heat.naturalHeight] };
    });
    assert(dimensions.source[0] > dimensions.source[1], "Displayed photo is not landscape");
    assert(dimensions.heat[0] > dimensions.heat[1], "Heatmap is not landscape");
    await page.getByRole("button", { name: "Defect", exact: true }).click();
    assert.strictEqual(await page.locator(".sample:not([hidden])").count(), 8);
    assert.strictEqual(await page.locator("#samplePosition").textContent(), "01 / 08");
    await page.getByRole("button", { name: "Normal", exact: true }).click();
    assert.strictEqual(await page.locator(".sample:not([hidden])").count(), 56);
    assert.strictEqual(await page.locator("#samplePosition").textContent(), "01 / 56");
    await page.waitForFunction(() => document.querySelector("#datasetLabel").textContent === "Dataset label: Normal" && document.querySelector("#score").textContent !== "—", null, { timeout: 60000 });
    assert.deepStrictEqual(errors, []);
    if (process.env.SCREENSHOT_PATH) await page.screenshot({ path: process.env.SCREENSHOT_PATH, fullPage: true });
    console.log(JSON.stringify({ score, status: "Review needed", samples: 64, dimensions, pageErrors: errors }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
