"use strict";

// Recalibrate and evaluate the static model with the actual Canvas pipeline.
// Requires Playwright and Chrome. The split is the fixed item-group manifest.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const here = path.resolve(__dirname, "..");
const data = process.env.KSDD_DATA_DIR || path.join(here, "data", "ksdd");
const manifest = fs.readFileSync(path.join(data, "manifest.csv"), "utf8").trim().split(/\r?\n/).slice(1)
  .map(line => { const [image, mask, item_group, split, is_anomaly] = line.split(","); return { image, item_group, split, is_anomaly: is_anomaly === "1" }; });
const validation = manifest.filter(row => row.split === "val" && !row.is_anomaly);
const test = manifest.filter(row => row.split === "test");
const percentile = (sorted, p) => {
  const i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
};

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  try {
    const page = await browser.newPage();
    await page.goto(process.env.SITE_URL || "http://127.0.0.1:8766/inspect.html", { waitUntil: "networkidle" });
    const all = [...validation, ...test];
    for (let i = 0; i < all.length; i++) {
      const base64 = fs.readFileSync(path.join(data, all[i].image)).toString("base64");
      all[i].score = await page.evaluate(async encoded => {
        const binary = atob(encoded);
        const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
        return (await infer(new Blob([bytes], { type: "image/jpeg" }), await modelPromise)).score;
      }, base64);
      if ((i + 1) % 16 === 0 || i + 1 === all.length) console.log(`Scored ${i + 1}/${all.length}`);
    }
    const normalScores = validation.map(row => row.score).sort((a, b) => a - b);
    const threshold = percentile(normalScores, .95);
    const positives = test.filter(row => row.is_anomaly);
    const negatives = test.filter(row => !row.is_anomaly);
    let wins = 0;
    for (const positive of positives) for (const negative of negatives) wins += Number(positive.score > negative.score) + .5 * Number(positive.score === negative.score);
    const metrics = {
      image_auroc: wins / (positives.length * negatives.length),
      defect_detected: positives.filter(row => row.score >= threshold).length,
      defect_total: positives.length,
      normal_false_alarms: negatives.filter(row => row.score >= threshold).length,
      normal_total: negatives.length,
    };
    const output = { normal_scores: normalScores, threshold, metrics, test_scores: test.map(({ image, is_anomaly, score }) => ({ image, is_anomaly, score })) };
    fs.writeFileSync(path.join(here, "model", "browser_calibration.json"), JSON.stringify(output, null, 2) + "\n");
    console.log(JSON.stringify({ threshold, metrics }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
