"use strict";

const gallery = document.querySelector(".ablation-gallery");

if (gallery) {
  const $ = id => document.getElementById(id);
  const panel = $("pairedCase");
  const intervalMs = 4500;
  let cases = [];
  let index = 0;
  let timer;
  let visible = false;
  let preloaded = false;

  const verdict = (label, alert) => {
    if (label === "Normal") return alert ? ["False alarm", "ablation-review"] : ["No false alarm", "ablation-clear"];
    return alert ? ["Flagged defect", "ablation-clear"] : ["Missed defect", "ablation-miss"];
  };

  function render(nextIndex) {
    if (!cases.length) return;
    index = (nextIndex + cases.length) % cases.length;
    const { sample, classic, stream } = cases[index];
    const photo = sample.image;
    $("pairedLabel").textContent = `${sample.label} · ${stream.replace(/\s*·\s*normal$/i, "")}`;
    $("pairedFrame").textContent = `Frame ${(sample.frame + 1).toLocaleString("en-US")}`;
    $("pairedCounter").textContent = `${String(index + 1).padStart(2, "0")} / ${cases.length}`;
    $("pairedClassicPhoto").src = photo;
    $("pairedSelectedPhoto").src = photo;
    $("pairedClassicPhoto").alt = `${sample.label} textile photo with the handcrafted anomaly heatmap`;
    $("pairedSelectedPhoto").alt = `Same ${sample.label.toLowerCase()} textile photo with the selected-reference anomaly heatmap`;
    $("pairedClassicMap").src = `./ablation/${classic.overlay}`;
    $("pairedSelectedMap").src = sample.current.heatmap;
    for (const [element, result] of [
      [$("pairedClassicResult"), verdict(sample.label, classic.alert)],
      [$("pairedSelectedResult"), verdict(sample.label, sample.current.score >= sample.current.threshold)],
    ]) {
      element.textContent = result[0];
      element.className = result[1];
    }
    panel.classList.remove("is-changing");
    void panel.offsetWidth;
    panel.classList.add("is-changing");
  }

  function schedule() {
    clearTimeout(timer);
    if (!visible || !cases.length || document.hidden || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timer = setTimeout(() => { render(index + 1); schedule(); }, intervalMs);
  }

  function preload() {
    if (preloaded || !cases.length) return;
    preloaded = true;
    for (const { sample, classic } of cases) {
      for (const src of [sample.image, sample.current.heatmap, `./ablation/${classic.overlay}`]) {
        const image = new Image();
        image.src = src;
      }
    }
  }

  $("pairedPrev").addEventListener("click", () => { render(index - 1); schedule(); });
  $("pairedNext").addEventListener("click", () => { render(index + 1); schedule(); });
  document.addEventListener("visibilitychange", schedule);

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible) preload();
      schedule();
    }, { threshold: 0.2 });
    observer.observe(gallery);
  } else {
    visible = true;
  }

  Promise.all([
    fetch("./next-samples/catalog.json").then(response => { if (!response.ok) throw Error("Sample catalog unavailable"); return response.json(); }),
    fetch("./ablation/catalog.json").then(response => { if (!response.ok) throw Error("Heatmap catalog unavailable"); return response.json(); }),
  ]).then(([sampleCatalog, classicCatalog]) => {
    const byId = new Map(classicCatalog.map(record => [record.id, record]));
    const featured = [6, 7, 4, 13, 17, 21, 18, 19, 20, 5, 3, 1, 10, 8, 2, 9];
    cases = sampleCatalog.samples
      .map(sample => ({ sample, classic: byId.get(sample.id), stream: sampleCatalog.streams[sample.scenario]?.title }))
      .filter(({ sample, classic, stream }) => featured.includes(sample.id) && classic && stream && classic.scenario === sample.scenario && classic.frame === sample.frame && classic.dataset_label === sample.label)
      .sort((a, b) => featured.indexOf(a.sample.id) - featured.indexOf(b.sample.id));
    if (cases.length) {
      render(0);
      gallery.dataset.ready = "true";
      if (visible) preload();
      schedule();
    }
  }).catch(error => console.error("Paired frame gallery:", error));
}

const scoreDistribution = document.getElementById("score-distribution");
if (scoreDistribution) {
  const figure = document.getElementById("scoreDistributionFigure");
  const mobile = document.getElementById("scoreDistributionMobile");
  const buttons = [...scoreDistribution.querySelectorAll("[data-score-run]")];
  for (const button of buttons) {
    button.addEventListener("click", () => {
      const run = button.dataset.scoreRun;
      mobile.srcset = `./ablation/score_distribution_run_${run}_mobile.svg`;
      figure.src = `./ablation/score_distribution_run_${run}.svg`;
      figure.alt = `Run ${run}: normal and defect frame score distributions for the handcrafted and DINOv2 plus selected-reference methods`;
      for (const option of buttons) {
        option.setAttribute("aria-pressed", String(option === button));
      }
    });
  }
}
