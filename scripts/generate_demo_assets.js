"use strict";

// Capture genuine browser-model heatmaps for the landing-page walkthrough.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  try {
    const page = await browser.newPage();
    await page.goto(process.env.SITE_URL || "http://127.0.0.1:8766/inspect.html", { waitUntil: "networkidle" });
    const out = path.join(__dirname, "..", "web", "demo_assets");
    fs.mkdirSync(out, { recursive: true });
    for (const id of ["01", "04"]) {
      const url = await page.evaluate(async sample => {
        const blob = await (await fetch(`./samples/sample-${sample}.jpg`)).blob();
        return (await infer(blob, await modelPromise)).heatmap;
      }, id);
      fs.writeFileSync(path.join(out, `sample-${id}-heat.png`), Buffer.from(url.split(",")[1], "base64"));
      console.log(`Saved sample-${id}-heat.png`);
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
