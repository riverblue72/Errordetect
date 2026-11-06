"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
let versionedAssetRefs = 0;
for (const page of fs.readdirSync(path.join(root, "docs")).filter(name => name.endsWith(".html"))) {
  const markup = fs.readFileSync(path.join(root, "docs", page), "utf8");
  assert(!/(?:href|src)="\.\/[a-zA-Z0-9-]+\.(?:css|js)"/.test(markup), `Unversioned asset in ${page}`);
  for (const match of markup.matchAll(/(?:href|src)="\.\/([a-zA-Z0-9-]+\.(?:css|js))\?v=([0-9a-f]{12})"/g)) {
    const asset = fs.readFileSync(path.join(root, "docs", match[1]), "utf8").replace(/\r\n/g, "\n");
    assert.equal(match[2], crypto.createHash("sha256").update(asset).digest("hex").slice(0, 12));
    versionedAssetRefs++;
  }
}
assert(versionedAssetRefs >= 10);
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
// The earlier Python experiment contains bare NaN values in unrelated recall fields.
const readEarlier = name => JSON.parse(fs.readFileSync(path.join(root, name), "utf8").replace(/\bNaN\b|-?\bInfinity\b/g, "null"));
const site = fs.readFileSync(path.join(root, "web", "landing.html"), "utf8");
const demo = fs.readFileSync(path.join(root, "web", "demo.html"), "utf8");
const demoScript = fs.readFileSync(path.join(root, "web", "demo.js"), "utf8");
const galleryScript = fs.readFileSync(path.join(root, "web", "ablation.js"), "utf8");
const inspector = fs.readFileSync(path.join(root, "web", "next-inspector.html"), "utf8");
const final = read("experiments/unsupervised/results/unlabeled_review_final.json");
const referenceFinal = read("experiments/unsupervised/results/reference_selection_final_verified.json");
const factorialFinal = read("experiments/unsupervised/results/reference_review_factorial_final.json");
const fullContinuation = read("experiments/unsupervised/results/source_continuation_full.json");
const changeControl = read("experiments/unsupervised/results/change_representation_audit.json");
const changeTrialDevelopment = read("experiments/unsupervised/results/change_limit_development.json");
const changeTrialFinal = read("experiments/unsupervised/results/change_limit_final.json");
const scoreDistribution = read("experiments/unsupervised/results/score_distribution_final.json");
const changeStability = read("experiments/unsupervised/results/change_stability_controls.json");
const earlier = readEarlier("experiments/unsupervised/results/tsfabrics.json");
const feedback = read("experiments/unsupervised/results/feedback_validation_final.json");
const siteCatalog = read("web/next-samples/catalog.json");
const classicCatalog = read("web/ablation/catalog.json");
const manifest = read("web/unlabeled-demo/manifest.json");
const evaluation = read("web/unlabeled-demo/evaluation.json");
const sequentialDevelopment = read("experiments/unsupervised/results/sequential_review_development.json");
const sequentialFinal = read("experiments/unsupervised/results/sequential_review_final.json");
const spacingDevelopment = read("experiments/unsupervised/results/review_spacing_development.json");
const spacingFinal = read("experiments/unsupervised/results/review_spacing_final.json");
const adaptiveFinal = read("experiments/unsupervised/results/adaptive_budget_final.json");
const routing = read("web/ablation/review-routing.json");
const scenarioFrames = read("web/scenario/manifest.json");
const changeFigure = read("web/ablation/change-figure.json");
const development = read("experiments/unsupervised/results/unlabeled_review_development.json");
const settingAudit = read("experiments/unsupervised/results/setting_disjoint_audit.json");
const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const percent = value => `${(value * 100).toFixed(1)}%`;

const distinct = settingAudit.different_setting_subset;
assert.deepEqual(settingAudit.repeated_setting_runs, ["T1_S148_I108_1", "T1_S478_I118_2"]);
assert.equal(distinct.runs.length, 14);
assert.equal(distinct.defect_runs.length, 2);
assert.equal(distinct.new_episodes, 15);
for (const group of [settingAudit.all_final, distinct]) {
  assert(site.includes(`<strong>${percent(group.methods.handcrafted_source.macro_ap)} → ${percent(group.methods.source_knn.macro_ap)}</strong>`));
  assert(site.includes(`<strong>${percent(group.reference.all.macro_ap)} → ${percent(group.reference.selected.macro_ap)}</strong>`));
}
assert(site.includes(`${distinct.review_episodes.top8} → ${distinct.review_episodes.spaced8} of ${distinct.new_episodes} episodes`));
assert(site.includes("SETTING_DISJOINT_RESULTS.md"));

const defectRuns = Object.values(final.runs).filter(run => run.new_defect_episodes > 0);
assert.equal(defectRuns.length, 4);
const handcraftedAP = average(defectRuns.map(run => run.methods.handcrafted_source.average_precision));
const frozenAP = average(defectRuns.map(run => run.methods.source_knn.average_precision));
const handcraftedAUROC = average(defectRuns.map(run => run.methods.handcrafted_source.auroc));
const frozenAUROC = average(defectRuns.map(run => run.methods.source_knn.auroc));
const wins = defectRuns.filter(run => run.methods.source_knn.average_precision > run.methods.handcrafted_source.average_precision).length;
assert(site.includes(percent(handcraftedAP)) && site.includes(percent(frozenAP)));
assert(site.includes(`leads in ${wins} of ${defectRuns.length} runs`));
assert(site.includes("COMPLETE METHOD COMPARISON · 4 DEFECT RUNS"));
assert(site.includes("DINOv2 + selection") && demo.includes("DINOv2 + selection"));
assert(demo.includes("four defect runs · combined method leads in two"));
assert(site.includes(`Macro frame AUROC: ${handcraftedAUROC.toFixed(3)} → ${frozenAUROC.toFixed(3)}`));
const apRows = [...site.matchAll(/class="run-ap-row" data-run="([^"]+)" style="--classic:([\d.]+)%;--dino:([\d.]+)%"/g)];
assert.equal(apRows.length, defectRuns.length);
for (const [, name, classic, dino] of apRows) {
  const run = final.runs[name];
  assert(run && run.new_defect_episodes > 0, `Unexpected AP chart run: ${name}`);
  assert.equal(classic, (run.methods.handcrafted_source.average_precision * 100).toFixed(1));
  assert.equal(dino, (run.methods.source_knn.average_precision * 100).toFixed(1));
  const rowStart = site.indexOf(`class="run-ap-row" data-run="${name}"`);
  const rowEnd = site.indexOf('class="run-ap-row"', rowStart + 1);
  const row = site.slice(rowStart, rowEnd < 0 ? undefined : rowEnd);
  assert(row.includes(`<strong>${classic} <small>/</small> ${dino}</strong>`));
}
assert.equal(new Set(apRows.map(row => row[1])).size, defectRuns.length);
assert.equal(scoreDistribution.source, final.protocol.source);
assert.equal(scoreDistribution.evaluation_start, 320);
assert.deepEqual(Object.keys(scoreDistribution.runs), Object.keys(final.runs).filter(name => final.runs[name].new_defect_episodes > 0));
const scoreMethods = ["handcrafted_source", "source_knn"];
for (const [index, [name, distribution]] of Object.entries(scoreDistribution.runs).entries()) {
  const recorded = final.runs[name];
  for (const method of scoreMethods) {
    const result = distribution.methods[method];
    assert(Math.abs(result.average_precision - recorded.methods[method].average_precision) < 0.0005);
    assert(Math.abs(result.auroc - recorded.methods[method].auroc) < 0.0005);
    for (const [label, count] of [["normal", distribution.normal_frames], ["defect", distribution.defect_frames]]) {
      const histogram = result.classes[label];
      assert.equal(histogram.frames, count);
      assert.equal(histogram.fraction_by_bin.length, 20);
      assert(Math.abs(histogram.fraction_by_bin.reduce((sum, value) => sum + value, 0) - 1) < 1e-9);
    }
  }
  const number = String(index + 1).padStart(2, "0");
  for (const suffix of ["", "_mobile"]) {
    const filename = `score_distribution_run_${number}${suffix}.svg`;
    const figure = fs.readFileSync(path.join(root, "web", "ablation", filename));
    assert(figure.equals(fs.readFileSync(path.join(root, "docs", "ablation", filename))));
    assert(figure.equals(fs.readFileSync(path.join(root, "experiments", "unsupervised", "figures", filename))));
  }
  assert(site.includes(`data-score-run="${number}"`));
}
assert(site.includes('id="score-distribution"'));
assert(galleryScript.includes('score_distribution_run_${run}.svg'));
assert(galleryScript.includes('score_distribution_run_${run}_mobile.svg'));
assert.equal(siteCatalog.source, final.protocol.source);
assert.equal(siteCatalog.source, earlier.protocol.source);
const featuredMatch = galleryScript.match(/const featured = \[([^\]]+)\]/);
assert(featuredMatch, "Paired gallery has no featured-frame list");
const featured = featuredMatch[1].split(",").map(value => Number(value.trim()));
assert.equal(featured.length, 16);
assert.equal(new Set(featured).size, featured.length);
assert.equal(new Set(siteCatalog.samples.map(item => item.id)).size, siteCatalog.samples.length);
assert.equal(new Set(classicCatalog.map(item => item.id)).size, classicCatalog.length);
assert.equal(siteCatalog.samples.length, classicCatalog.length);
const illustrated = featured.map(id => {
  const sample = siteCatalog.samples.find(item => item.id === id);
  const classic = classicCatalog.find(item => item.id === id);
  assert(sample && classic, `Missing paired gallery case ${id}`);
  assert.equal(sample.scenario, classic.scenario);
  assert.equal(sample.frame, classic.frame);
  assert.equal(sample.label, classic.dataset_label);
  assert(siteCatalog.streams[sample.scenario]?.title, `Missing stream title for case ${id}`);
  assert.equal(sample.current.threshold, earlier.methods.mutual.threshold);
  assert.equal(classic.threshold, earlier.methods.classic_8_feature.threshold);
  assert.equal(classic.alert, classic.score >= classic.threshold);
  for (const asset of [sample.image, sample.current.heatmap, `./ablation/${classic.overlay}`]) {
    assert(asset.startsWith("./"), `Unexpected asset path for case ${id}: ${asset}`);
    assert(fs.existsSync(path.join(root, "web", asset.slice(2))), `Missing gallery asset: ${asset}`);
  }
  return sample;
});
assert.deepEqual(illustrated.slice(0, 3).map(sample => final.protocol.targets.includes(sample.scenario)), [false, true, false]);
const verdicts = new Set(illustrated.map(sample => {
  const classic = classicCatalog.find(item => item.id === sample.id);
  return `${sample.label}:${classic.alert}:${sample.current.score >= sample.current.threshold}`;
}));
assert.equal(verdicts.size, 8, "Gallery no longer shows every normal/defect outcome pair");
assert(demo.includes('id="demoScope">FIELD FEEDBACK · DESIGN BRIEF'));
assert(demo.includes('class="context-responses"'));
assert(demoScript.includes('15 RUNS · UPDATE TEST'));
const normalShift = "T1_S164_I36_1";
const selectedSource = earlier.methods.mutual.targets[normalShift].frozen;
const allSource = earlier.methods.all_unlabeled.targets[normalShift].frozen;
const selectedHoldout = earlier.methods.mutual.source_heldout;
const allHoldout = earlier.methods.all_unlabeled.source_heldout;
assert.equal(selectedSource.fp + selectedSource.tn, 975);
assert.equal(allSource.fp + allSource.tn, 975);
assert.equal(selectedSource.fp, 11);
assert.equal(allSource.fp, 971);
assert.equal(selectedHoldout.fp, 20);
assert.equal(allHoldout.fp, 7);
assert.equal(selectedHoldout.fp + selectedHoldout.tn, 1984);
assert.equal(allHoldout.fp + allHoldout.tn, 1984);
const referencePanel = site.match(/<article class="improvement improvement-adaptation"[\s\S]*?<\/article>/)?.[0];
assert(referencePanel?.includes("REFERENCE × REVIEW RULE · 16 RECORDED RUNS"));
assert(referencePanel.includes("sample-06-all.png"));
assert(referencePanel.includes("sample-06-current.png"));
assert(!referencePanel.includes("sample-06-candidate.png"));
assert(referencePanel.includes("DEVELOPMENT EXAMPLE · ONE NORMAL PHOTO"));
assert.deepEqual(referenceFinal.protocol.targets, final.protocol.targets);
assert.equal(referenceFinal.protocol.equal_bank_vectors, referenceFinal.source.bank_vectors);
const referenceRuns = Object.values(referenceFinal.runs);
assert.equal(referenceRuns.length, 16);
const referenceDefectRuns = referenceRuns.filter(run => run.methods.selected.defect_frames > 0);
const referenceAP = method => average(referenceDefectRuns.map(run => run.methods[method].average_precision));
const selectedAP = referenceAP("selected"), allAP = referenceAP("all");
const referenceWins = referenceDefectRuns.filter(run => run.methods.selected.average_precision > run.methods.all.average_precision).length;
const referenceSum = (method, field) => referenceRuns.reduce((value, run) => value + run.methods[method][field], 0);
const referenceCounts = {
  normal: referenceSum("selected", "normal_frames"), defect: referenceSum("selected", "defect_frames"),
  allFP: referenceSum("all", "fp"), selectedFP: referenceSum("selected", "fp"),
  allTP: referenceSum("all", "tp"), selectedTP: referenceSum("selected", "tp"),
  allReviews: referenceSum("all", "review_episodes"), selectedReviews: referenceSum("selected", "review_episodes"),
  episodes: referenceSum("selected", "new_episodes"),
};
assert.deepEqual(referenceCounts, { normal: 26088, defect: 883, allFP: 19153, selectedFP: 1449,
  allTP: 851, selectedTP: 313, allReviews: 19, selectedReviews: 26, episodes: 90 });
assert.equal(referenceWins, 1);
assert.equal(referenceRuns.filter(run => run.methods.selected.fp < run.methods.all.fp).length, 15);
assert.equal(percent(allAP), "70.3%");
assert.equal(percent(selectedAP), "85.4%");
assert(referencePanel.includes(`Macro frame AP: ${percent(allAP)} → ${percent(selectedAP)}; selection leads in ${referenceWins} of 4 defect runs`));
assert.deepEqual(factorialFinal.protocol.targets, referenceFinal.protocol.targets);
const factorialRuns = Object.values(factorialFinal.runs);
assert.equal(factorialRuns.length, 16);
for (const reference of ["all", "selected"]) for (const queue of ["top8", "spaced8"]) {
  const count = factorialRuns.reduce((total, run) => total + run.methods[reference][queue].new_episodes, 0);
  assert(referencePanel.includes(`data-reference="${reference}" data-queue="${queue}">${count}</td>`));
}
for (const [metric, before, after, population] of [
  ["normal", referenceCounts.allFP, referenceCounts.selectedFP, `${referenceCounts.normal.toLocaleString("en-US")} normal frames`],
  ["defect", referenceCounts.allTP, referenceCounts.selectedTP, `${referenceCounts.defect} defect frames`],
]) {
  const start = referencePanel.indexOf(`class="reference-audit-row" data-metric="${metric}"`);
  assert(start >= 0, `Missing source-reference audit row: ${metric}`);
  const row = referencePanel.slice(start, referencePanel.indexOf("</small></div>", start) + 14);
  assert(row.includes(`${before.toLocaleString("en-US")} <i>→</i> ${after.toLocaleString("en-US")}`));
  assert(row.includes(`/ ${population}`));
  const widths = [...row.matchAll(/style="width:([\d.]+)%"/g)].map(match => Number(match[1]));
  assert.equal(widths.length, 2);
  assert(Math.abs(widths[0] - before / Math.max(before, after) * 100) < .06);
  assert(Math.abs(widths[1] - after / Math.max(before, after) * 100) < .06);
}
assert(referencePanel.includes("REFERENCE_SELECTION_RESULTS_VERIFIED.md"));
assert(inspector.includes("Frozen DINOv2") && inspector.includes("New-run trial"));
assert(!inspector.includes("trial update on the same photo"));

const coverage = queue => average(defectRuns.map(run => run.methods.source_knn.queues[queue].new_episodes / run.new_defect_episodes));
const adjacent = coverage("top8"), spaced = coverage("spaced8");
assert.equal(percent(adjacent), "41.8%");
assert.equal(percent(spaced), "71.1%");
assert(spaced > adjacent);
const topEpisodes = defectRuns.reduce((total, run) => total + run.methods.source_knn.queues.top8.new_episodes, 0);
const spacedEpisodes = defectRuns.reduce((total, run) => total + run.methods.source_knn.queues.spaced8.new_episodes, 0);
assert(site.includes(`<small>Top 8</small><strong>${topEpisodes}</strong><i aria-hidden="true">→</i><small>Spaced 8</small><strong>${spacedEpisodes}</strong>`));
assert(defectRuns.every(run => run.methods.source_knn.queues.spaced8.new_episodes >
  run.methods.source_knn.queues.top8.new_episodes));
assert(demo.includes(`Top 8 <strong>${topEpisodes}</strong>`) && demo.includes(`Spaced 8 <strong>${spacedEpisodes}</strong>`));
assert(demo.includes(`Distinct new defect episodes found / ${referenceCounts.episodes}`));
assert(site.includes(`Of ${referenceCounts.episodes} new episodes · all four runs improved with the same eight checks per run.`));
assert(spacingDevelopment.complete && spacingFinal.complete);
assert.deepEqual(spacingFinal.protocol.spacing_frames, [1, 4, 8, 12, 16]);
assert.equal(Object.keys(spacingFinal.runs).length, Object.keys(final.runs).length);
for (const [runName, run] of Object.entries(spacingFinal.runs)) {
  assert.deepEqual(run.spacing["16"].fixed8.frames,
    final.runs[runName].methods.source_knn.queues.spaced8.frames);
}
for (const spacing of spacingFinal.protocol.spacing_frames) {
  const found = spacingFinal.summary[spacing].fixed8.episodes_found;
  const maxFound = spacingFinal.summary["16"].fixed8.episodes_found;
  const match = site.match(new RegExp(`class="spacing-row(?: is-current)?" data-spacing="${spacing}" data-episodes="(\\d+)" style="--extent:([\\d.]+)%"`));
  assert(match, `Missing spacing sensitivity bar: ${spacing}`);
  assert.equal(Number(match[1]), found);
  assert(Math.abs(Number(match[2]) - found / maxFound * 100) < .06);
  assert.equal(spacingFinal.summary[spacing].fixed8.requests, 128);
}
assert.equal(spacingDevelopment.summary["12"].fixed8.episodes_found, 20);
assert.equal(spacingDevelopment.summary["16"].fixed8.episodes_found, 20);
assert.equal(spacingFinal.summary["12"].fixed8.episodes_found, 26);
assert.equal(spacingFinal.summary["16"].fixed8.episodes_found, 26);
const coverageRows = [...site.matchAll(/class="review-coverage-row" data-run="([^"]+)" style="--top:([\d.]+)%;--spaced:([\d.]+)%"/g)];
assert.equal(coverageRows.length, defectRuns.length);
for (const [, name, topWidth, spacedWidth] of coverageRows) {
  const run = final.runs[name];
  assert(run && run.new_defect_episodes > 0, `Unexpected review chart run: ${name}`);
  const topCount = run.methods.source_knn.queues.top8.new_episodes;
  const spacedCount = run.methods.source_knn.queues.spaced8.new_episodes;
  assert(Math.abs(Number(topWidth) - topCount / run.new_defect_episodes * 100) < .06);
  assert(Math.abs(Number(spacedWidth) - spacedCount / run.new_defect_episodes * 100) < .06);
  const rowStart = site.indexOf(`class="review-coverage-row" data-run="${name}"`);
  const rowEnd = site.indexOf('class="review-coverage-row"', rowStart + 1);
  const row = site.slice(rowStart, rowEnd < 0 ? undefined : rowEnd);
  assert(row.includes(`${run.new_defect_episodes} episodes`));
  assert(row.includes(`<strong>${topCount} <small>→</small> ${spacedCount}</strong>`));
}
assert.equal(new Set(coverageRows.map(row => row[1])).size, defectRuns.length);
assert(defectRuns.every(run => run.methods.source_knn.queues.spaced8.new_episodes > run.methods.source_knn.queues.top8.new_episodes));
const changedRuns = Object.values(final.runs).filter(run => run.operational_summary.change_alert != null).length;
assert.equal(changedRuns, 15);
assert(site.includes(`${changedRuns} / ${Object.keys(final.runs).length}`));
assert.equal(final.protocol.source_continuation_alarm, null);
assert.equal(fullContinuation.source, final.protocol.source);
assert.deepEqual(fullContinuation.prior_test_frames, final.protocol.source_continuation);
assert.equal(fullContinuation.test_frames[0], fullContinuation.prior_test_frames[0]);
assert.equal(fullContinuation.test_frames[1], fullContinuation.source_frames);
assert.equal(fullContinuation.window_scores.length, fullContinuation.window_count);
assert.equal(fullContinuation.window_end_frames.length, fullContinuation.window_count);
assert(fullContinuation.window_end_frames.every((end, i, ends) => i === 0 || end - ends[i - 1] === 32));
assert.equal(fullContinuation.windows_above_limit,
  fullContinuation.window_scores.filter(score => score > fullContinuation.threshold).length);
assert.equal(fullContinuation.windows_above_limit, 0);
assert.equal(fullContinuation.first_confirmed_alert_frame, null);
const sourceLaterFrames = fullContinuation.test_frames[1] - fullContinuation.test_frames[0];
assert(site.includes(`No alert across ${sourceLaterFrames.toLocaleString("en-US")} later frames of the same reference recording.`));
assert(site.includes("/SOURCE_CONTINUATION_FULL_RESULTS.md"));
assert.equal(changeControl.protocol.source, final.protocol.source);
assert.deepEqual(changeControl.protocol.final, final.protocol.targets);
assert.equal(changeControl.source_histogram.window_count, fullContinuation.window_count);
assert.equal(changeControl.source_histogram.window_scores.length, fullContinuation.window_count);
assert.equal(changeControl.source_histogram.windows_above_limit,
  changeControl.source_histogram.window_scores.filter(score => score > changeControl.source_histogram.limit).length);
assert.equal(changeControl.source_dino.windows_above_limit, fullContinuation.windows_above_limit);
assert.equal(changeControl.source_dino.first_alert_frame, fullContinuation.first_confirmed_alert_frame);
const changeCounts = phase => {
  const rows = Object.values(changeControl.phases[phase]);
  assert(rows.every(row => row.histogram_alert == null || row.histogram_alert >= changeControl.protocol.source_prelude[1] - changeControl.protocol.source_prelude[0]));
  return {
    runs: rows.length,
    histogram: rows.filter(row => row.histogram_alert != null).length,
    dino: rows.filter(row => row.dino_alert != null).length,
  };
};
assert.deepEqual(changeCounts("development"), { runs: 5, histogram: 5, dino: 4 });
assert.deepEqual(changeCounts("final"), { runs: 16, histogram: 16, dino: 15 });
assert.equal(changeControl.source_histogram.windows_above_limit, 336);
assert.equal(changeControl.source_histogram.first_alert_frame, 6432);
for (const [phase, trial, expected] of [
  ["development", changeTrialDevelopment, [5, 4, 5]],
  ["final", changeTrialFinal, [16, 15, 16]],
]) {
  assert.equal(trial.protocol.factor, 0.75);
  assert.equal(trial.protocol.phase, phase);
  assert.deepEqual([trial.summary.runs, trial.summary.original_alerted, trial.summary.candidate_alerted], expected);
  assert.deepEqual(trial.summary.candidate_before_join, []);
  assert.equal(trial.source_control.windows, fullContinuation.window_count);
  assert.equal(trial.source_control.candidate_windows_over, 2);
  assert.equal(trial.source_control.candidate_first_alert, null);
  assert.equal(trial.source_control.candidate_limit, trial.source_control.original_limit * trial.protocol.factor);
  for (const [name, run] of Object.entries(trial.runs)) {
    assert.equal(run.original_alarm, changeControl.phases[phase][name].dino_alert);
    assert(run.candidate_alarm == null || run.candidate_alarm >= 1024);
  }
}
const changePanel = site.match(/<article class="improvement" id="change"[\s\S]*?<\/article>/)?.[0];
assert(changePanel?.includes("Brightness histogram</span><strong>16 / 16"));
assert(changePanel.includes("DINOv2 · current</span><strong>15 / 16"));
assert(changePanel.includes("DINOv2 · lower limit trial</span><strong>16 / 16"));
assert(changePanel.includes("336 / 513") && changePanel.includes("0 / 513") && changePanel.includes("2 / 513"));
assert(changePanel.includes("/CHANGE_REPRESENTATION_RESULTS.md"));
assert(changePanel.includes("/CHANGE_LIMIT_RESULTS.md"));
assert.equal(changeStability.protocol.factor, 0.75);
assert.equal(changeStability.protocol.consecutive, 3);
assert.equal(Object.keys(changeStability.runs).length, 2);
for (const control of Object.values(changeStability.runs)) {
  assert.equal(control.defect_labels, 0);
  assert.equal(control.ambiguous_labels, 0);
  assert.equal(control.window_scores.length, control.window_end_frames.length);
  for (const [limit, prefix] of [[control.original_limit, "original"], [control.trial_limit, "trial"]]) {
    let streak = 0;
    let firstAlert = null;
    for (let i = 0; i < control.window_scores.length; i++) {
      streak = control.window_scores[i] > limit ? streak + 1 : 0;
      if (streak === 3 && firstAlert == null) firstAlert = control.window_end_frames[i];
    }
    assert.equal(control[`${prefix}_first_alert`], firstAlert);
  }
}
assert.equal(Object.values(changeStability.runs).filter(run => run.original_first_alert != null && run.trial_first_alert != null).length, 1);
assert(changePanel.includes("unexplained within-run alert under both limits"));
assert(changePanel.includes("trial remains inactive"));
assert(changePanel.includes("/CHANGE_STABILITY_RESULTS.md"));

const selected = Object.values(feedback.runs).filter(run => run.status === "evaluated");
assert.equal(selected.length, 15);
const sum = (method, field) => selected.reduce((value, run) => value + method(run)[field], 0);
const frozen = run => run.source;
const candidate = run => run.strategies.spaced8.candidate;
const counts = {
  normal: sum(frozen, "normal_frames"), defect: sum(frozen, "defect_frames"),
  frozenFP: sum(frozen, "fp"), candidateFP: sum(candidate, "fp"),
  frozenTP: sum(frozen, "tp"), candidateTP: sum(candidate, "tp"),
  frozenEpisodes: sum(frozen, "detected_episodes"), candidateEpisodes: sum(candidate, "detected_episodes"),
};
assert.deepEqual(counts, { normal: 20273, defect: 642, frozenFP: 1050, candidateFP: 0,
  frozenTP: 202, candidateTP: 153, frozenEpisodes: 48, candidateEpisodes: 40 });
for (const [before, after] of [[counts.frozenFP, counts.candidateFP], [counts.frozenTP, counts.candidateTP], [counts.frozenEpisodes, counts.candidateEpisodes]]) {
  const change = `${before.toLocaleString("en-US")} <em>→</em> ${after.toLocaleString("en-US")}`;
  assert(demo.includes(change), `Demo missing validated pair: ${change}`);
  const phaseValue = `${before.toLocaleString("en-US")} → ${after.toLocaleString("en-US")}`;
  assert(demoScript.includes(phaseValue), `Demo reveal missing validated pair: ${phaseValue}`);
}
const demoDecisionRows = [...demo.matchAll(/<div class="decision-row"[^>]*><span>([^<]+)<\/span><strong>[^<]+<em>→<\/em>[^<]+<\/strong><div class="decision-track" aria-hidden="true"><i style="width:100%"><\/i><b style="width:([\d.]+)%"><\/b>/g)];
assert.equal(demoDecisionRows.length, 3);
for (const [label, before, after] of [
  ["Normal frames flagged", counts.frozenFP, counts.candidateFP],
  ["Defect frames flagged", counts.frozenTP, counts.candidateTP],
  ["New defect episodes found", counts.frozenEpisodes, counts.candidateEpisodes],
]) {
  const row = demoDecisionRows.find(([, rowLabel]) => rowLabel === label);
  assert(row, `Missing demo comparison: ${label}`);
  assert(Math.abs(Number(row[2]) - after / before * 100) < .06, `Incorrect demo candidate bar: ${label}`);
}
const decisionRows = [...site.matchAll(/<div class="decision-metric"><div><span>([^<]+)<\/span><strong>([\s\S]*?)<\/strong><\/div><div class="decision-pair"[^>]*><span><i style="width:100%"><\/i><\/span><span><i style="width:([\d.]+)%"><\/i><\/span><\/div><\/div>/g)];
assert.equal(decisionRows.length, 3);
for (const [label, before, after] of [
  ["Normal-frame alerts", counts.frozenFP, counts.candidateFP],
  ["Defect frames flagged", counts.frozenTP, counts.candidateTP],
  ["New defect episodes found", counts.frozenEpisodes, counts.candidateEpisodes],
]) {
  const row = decisionRows.find(([, rowLabel]) => rowLabel === label);
  assert(row, `Missing landing comparison: ${label}`);
  assert.equal(row[2], `${before.toLocaleString("en-US")} <i>→</i> ${after.toLocaleString("en-US")}`);
  assert(Math.abs(Number(row[3]) - after / before * 100) < .06, `Incorrect comparison bar: ${label}`);
}
assert(site.includes(`Same later frames · ${counts.normal.toLocaleString("en-US")} normal · ${counts.defect} defect`));

assert.equal(manifest.run, "T1_S478_I118_2");
assert.equal(manifest.frame_count, manifest.scores.length);
assert.deepEqual(manifest.evaluation_frames,
  [final.protocol.target_evaluation_start + 1, Math.min(final.protocol.target_cap, final.runs[manifest.run].frames)]);
assert.equal(manifest.evaluation_frames[1] - manifest.evaluation_frames[0] + 1, manifest.frame_count);
const orderedScores = [...manifest.scores].sort((a, b) => a - b);
const quantile = q => {
  const position = (orderedScores.length - 1) * q;
  const low = Math.floor(position), high = Math.ceil(position);
  return orderedScores[low] + (orderedScores[high] - orderedScores[low]) * (position - low);
};
const expectedQuantiles = final.runs[manifest.run].methods.source_knn.score_quantiles;
for (const [index, key] of ["p50", "p90", "p99"].entries()) {
  assert(Math.abs(quantile([0.5, 0.9, 0.99][index]) - expectedQuantiles[index]) < 2e-6,
    `Replay ${key} differs from the saved evaluation`);
  assert(Math.abs(manifest.score_quantiles[key] - expectedQuantiles[index]) < 2e-6,
    `Displayed replay ${key} differs from the saved evaluation`);
}
assert.equal(manifest.scores.filter(score => score >= earlier.methods.mutual.threshold).length,
  final.runs[manifest.run].methods.source_knn.source_threshold_exceedances);
assert.deepEqual(manifest.review.map(item => item.frame), final.runs[manifest.run].methods.source_knn.queues.spaced8.frames);
assert.deepEqual(manifest.top8_frames, final.runs[manifest.run].methods.source_knn.queues.top8.frames);
assert.equal(evaluation.episodes_found, final.runs[manifest.run].methods.source_knn.queues.spaced8.new_episodes);
assert.equal(evaluation.top8_episodes_found, final.runs[manifest.run].methods.source_knn.queues.top8.new_episodes);
assert.deepEqual(evaluation.review.map(item => item.frame), manifest.review.map(item => item.frame));
assert(manifest.review.slice(0, 2).every(item => {
  const outcome = evaluation.review.find(row => row.frame === item.frame);
  return outcome && !outcome.ambiguous && outcome.dataset_label === "Defect";
}));
assert(demoScript.includes("Defect found in first two · six more checks opened"));
const timelines = [...site.matchAll(/class="review-timeline-track is-(top|spaced)" data-queue="(top8|spaced8)"[^>]*>(.*?)<\/div>/gs)];
assert.equal(timelines.length, 2, "Landing page needs both review timelines");
const [firstFrame, lastFrame] = manifest.evaluation_frames;
for (const [, style, queue, markup] of timelines) {
  assert.equal(style === "top" ? "top8" : "spaced8", queue);
  const markers = [...markup.matchAll(/data-frame="(\d+)" style="left:([\d.]+)%/g)];
  const expectedFrames = final.runs[manifest.run].methods.source_knn.queues[queue].frames.slice().sort((a, b) => a - b);
  assert.deepEqual(markers.map(match => Number(match[1])), expectedFrames);
  const expectedPositions = expectedFrames.map(frame =>
    Math.round((frame - firstFrame) / (lastFrame - firstFrame) * 1000) / 10);
  assert.deepEqual(markers.map(match => Number(match[2])), expectedPositions);
  const discovered = final.runs[manifest.run].methods.source_knn.queues[queue].new_episodes;
  assert(site.includes(`</div><strong>${discovered} found</strong></div>`));
}
assert.equal(manifest.change.alert - manifest.change.splice_boundary, 96);
const sceneFrame = (file, run, frame, label = "Normal") => {
  const entry = scenarioFrames.find(item => item.file === file);
  assert(entry, `Missing scenario provenance: ${file}`);
  assert.equal(entry.scenario, run);
  assert.equal(entry.display_frame, frame);
  assert.equal(entry.dataset_label, label);
  assert(fs.existsSync(path.join(root, "web", "scenario", file)));
};
const chartEnd = changeFigure.source_holdout_start + changeFigure.source_holdout.ends.at(-1);
sceneFrame(`source-${chartEnd - 1}.jpg`, changeFigure.source, chartEnd - 1);
sceneFrame(`source-${chartEnd}.jpg`, changeFigure.source, chartEnd);
assert(site.includes(`scenario/source-${chartEnd - 1}.jpg`));
assert(site.includes(`scenario/source-${chartEnd}.jpg`));
const spliceSourceEnd = final.protocol.source_continuation[0] + manifest.change.splice_boundary;
sceneFrame(`source-${spliceSourceEnd}.jpg`, manifest.source, spliceSourceEnd);
for (const [frame, label] of [[1, "Normal"], [32, "Defect"], [64, "Normal"], [96, "Normal"], [192, "Normal"]]) {
  sceneFrame(`demo-${String(frame).padStart(3, "0")}.jpg`, manifest.run, frame, label);
}
const shiftFrames = demoScript.match(/const shiftFrames = \[([^\]]+)\]/)?.[1].split(",").map(Number);
assert.deepEqual(shiftFrames, [1, 32, 64, 96, 192]);
for (const frame of [32, 64, 96, 192]) {
  const end = manifest.change.splice_boundary + frame;
  assert(manifest.change.window_scores[manifest.change.window_ends.indexOf(end)] > manifest.change.limit);
}
assert(demo.includes(`scenario/source-${spliceSourceEnd}.jpg`));
assert(demo.includes("scenario/demo-001.jpg"));
assert.equal(changeFigure.target_start.first_alarm, 192);
assert(Object.hasOwn(development.runs, changeFigure.target));
assert(!Object.hasOwn(final.runs, changeFigure.target));
assert(site.includes("16 FINAL RUNS · KNOWN SWITCH"));
assert(site.includes("Development example · alert at new-run frame 192."));
sceneFrame("target-192.jpg", changeFigure.target, changeFigure.target_start.first_alarm);
assert.notDeepEqual(manifest.review.map(item => item.frame), feedback.runs[manifest.run].strategies.spaced8.review_frames,
  "The demonstration and the separate update validation use different review queues");

for (const phase of [sequentialDevelopment, sequentialFinal]) {
  const fixed = phase.summary.methods.fixed8, pilot = phase.summary.methods.pilot2;
  assert.equal(pilot.episodes_found, fixed.episodes_found);
  assert.equal(pilot.runs_losing_episodes.length, 0);
  assert(pilot.requests < fixed.requests);
  assert(pilot.normal_reviews < fixed.normal_reviews);
  for (const run of Object.values(phase.runs)) {
    assert.deepEqual(run.pilot2.frames, run.fixed8.frames.slice(0, run.pilot2.requests));
    assert(run.pilot2.requests === 2 || run.pilot2.requests === 8);
  }
}
assert.equal(sequentialFinal.summary.methods.fixed8.requests, 128);
assert.equal(sequentialFinal.summary.methods.pilot2.requests, 56);
assert.deepEqual(routing.runs, Object.entries(sequentialFinal.runs)
  .map(([run, result]) => ({ run, requests: result.pilot2.requests })));
assert.equal(routing.runs.filter(run => run.requests === 2).length, 12);
assert.equal(routing.runs.filter(run => run.requests === 8).length, 4);
const defectRunsWithReview = Object.values(sequentialFinal.runs)
  .filter(run => run.total_new_episodes > 0);
assert.equal(defectRunsWithReview.length, 4);
assert(defectRunsWithReview.every(run => run.pilot2.requests === 8 && run.pilot2.uncertain_reviews === 0));
assert(site.includes("<strong>128</strong>") && site.includes("<strong>56</strong>"));
assert(site.includes("12 stopped at 2") && site.includes("4 continued to 8"));
assert(site.includes("All four defect runs opened six more checks. Both rules found 26 / 90 episodes."));

const fixedAllocation = adaptiveFinal.methods.fixed8;
const earlyStopAllocation = adaptiveFinal.methods.two_first;
const guidedAllocation = adaptiveFinal.methods.baseline_reserving_audit;
const quietRuns = Object.keys(earlyStopAllocation).filter(name => earlyStopAllocation[name].requests === 2);
const activeRuns = Object.keys(earlyStopAllocation).filter(name => !quietRuns.includes(name));
const sumRequests = (runs, method) => runs.reduce((sum, name) => sum + method[name].requests, 0);
const fixedQuiet = sumRequests(quietRuns, fixedAllocation);
const fixedActive = sumRequests(activeRuns, fixedAllocation);
const stoppedQuiet = sumRequests(quietRuns, earlyStopAllocation);
const stoppedActive = sumRequests(activeRuns, earlyStopAllocation);
const guidedQuiet = sumRequests(quietRuns, guidedAllocation);
const guidedActive = sumRequests(activeRuns, guidedAllocation);
const fixedFound = adaptiveFinal.summary.methods.fixed8.episodes_found;
const stoppedFound = adaptiveFinal.summary.methods.two_first.episodes_found;
const guidedFound = adaptiveFinal.summary.methods.baseline_reserving_audit.episodes_found;
const gains = activeRuns.map(name => guidedAllocation[name].found_episode_ids.length -
  fixedAllocation[name].found_episode_ids.length).filter(value => value > 0);
assert.deepEqual([quietRuns.length, activeRuns.length, fixedQuiet, fixedActive,
  stoppedQuiet, stoppedActive, guidedQuiet, guidedActive], [12, 4, 96, 32, 24, 32, 36, 92]);
assert.equal(adaptiveFinal.summary.budget, 128);
assert.equal(adaptiveFinal.summary.methods.two_first.requests, 56);
assert.equal(adaptiveFinal.summary.methods.baseline_reserving_audit.requests, 128);
assert.equal(stoppedFound, fixedFound);
assert.equal(guidedFound - fixedFound, 24);
assert.deepEqual(gains, [24]);
for (const name of activeRuns) {
  assert(fixedAllocation[name].found_episode_ids.every(id =>
    guidedAllocation[name].found_episode_ids.includes(id)));
}
const allocationStart = site.indexOf('class="allocation-panel" id="reviewAllocation"');
assert(allocationStart >= 0);
const allocationMarkup = site.slice(allocationStart, site.indexOf('</article>', allocationStart));
assert(allocationMarkup.includes(`style="width:${fixedQuiet / 128 * 100}%"`));
assert(allocationMarkup.includes(`style="width:${stoppedQuiet / 128 * 100}%"`));
assert(allocationMarkup.includes(`style="width:${(128 - 56) / 128 * 100}%"`));
assert(allocationMarkup.includes(`style="width:${guidedQuiet / 128 * 100}%"`));
assert(allocationMarkup.includes(`style="width:${guidedActive / 128 * 100}%"`));
assert(allocationMarkup.includes(`<strong>${fixedFound}</strong>`));
assert(allocationMarkup.includes(`<strong>${guidedFound}</strong>`));
assert(allocationMarkup.includes('Post-hoc exploratory replay'));
assert(allocationMarkup.includes('All 24 additional episodes came from one run.'));
assert(allocationMarkup.includes('ADAPTIVE_BUDGET_RESULTS.md'));

console.log(JSON.stringify({ handcraftedAP: percent(handcraftedAP), frozenAP: percent(frozenAP), wins,
  referenceCounts, referenceAP: [percent(allAP), percent(selectedAP)], referenceWins,
  adjacentCoverage: percent(adjacent), spacedCoverage: percent(spaced), changedRuns,
  feedbackRuns: selected.length, counts, replayFrames: manifest.frame_count, reviewRequests: manifest.review.length,
  sequentialRequests: [sequentialFinal.summary.methods.fixed8.requests, sequentialFinal.summary.methods.pilot2.requests],
  adaptiveEpisodes: [fixedFound, guidedFound] }));
