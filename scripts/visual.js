"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const base = process.env.SITE_URL || "http://127.0.0.1:8766/";
  const out = path.join(__dirname, "..", "out", "visual");
  fs.mkdirSync(out, { recursive: true });
  try {
    for (const viewport of [
      { width: 1440, height: 900, label: "desktop" },
      { width: 768, height: 900, label: "tablet" },
      { width: 390, height: 844, label: "mobile" },
      { width: 320, height: 740, label: "compact" },
    ]) {
      const page = await browser.newPage({ viewport });
      for (const [name, suffix] of [["landing", ""], ["inspector", "inspect.html?sample=1"]]) {
        await page.goto(new URL(suffix, base).href, { waitUntil: "networkidle" });
        if (name === "landing") {
          await page.locator(".method-animation img").evaluateAll(images => Promise.all(images.map(image => image.decode())));
          await page.locator(".method-animation image").evaluateAll(async images => {
            const sources = [...new Set(images.map(image => image.getAttribute("href")))];
            await Promise.all(sources.map(async src => { const image = new Image(); image.src = src; await image.decode(); }));
          });
          // Freeze a completed phase for readable, repeatable workflow screenshots.
          await page.locator("#workflow").evaluate(section => {
            for (const animation of section.getAnimations({ subtree: true })) { animation.currentTime = 6300; animation.pause(); }
          });
        }
        if (name === "inspector") await page.waitForFunction(() => document.querySelector("#score").textContent !== "—");
        const audit = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          brokenImages: [...document.images].filter(img => img.loading !== "lazy" && img.complete && !img.naturalWidth).map(img => img.src),
          methodBackgrounds: [...new Set([...document.querySelectorAll(".method-animation")].map(el => getComputedStyle(el).backgroundColor))],
        }));
        await page.screenshot({ path: path.join(out, `${name}-${viewport.label}.png`), fullPage: true });
        if (name === "landing") {
          // Capture the full detection-to-review sequence for visual inspection.
          await page.locator("#workflow").screenshot({ path: path.join(out, `workflow-${viewport.label}.png`) });
          if (viewport.label === "desktop") {
            await page.emulateMedia({ reducedMotion: "reduce" });
            await page.locator("#workflow").screenshot({ path: path.join(out, "workflow-reduced-motion.png") });
            const running = await page.locator("#workflow").evaluate(section => section.getAnimations({ subtree: true }).length);
            if (running) throw new Error("Workflow animations must respect reduced-motion preferences");
            const staticFrames = await page.locator(".method-animation img").evaluateAll(images => images.every(image => image.currentSrc.endsWith("-poster.png")));
            if (!staticFrames) throw new Error("Original GIFs must use posters for reduced motion");
            await page.emulateMedia({ reducedMotion: "no-preference" });
          }
        }
        console.log(`${name} ${viewport.label} ${JSON.stringify(audit)}`);
        if (audit.overflow || audit.brokenImages.length) throw new Error(`${name} ${viewport.label}: layout or image failure`);
        if (name === "landing" && (audit.methodBackgrounds.length !== 1 || audit.methodBackgrounds[0] !== "rgb(255, 255, 255)")) throw new Error("All nine workflow illustration backgrounds must be white");
      }
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
