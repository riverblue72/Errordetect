"use strict";

const routingPanel = document.getElementById("reviewRouting");

if (routingPanel) {
  fetch("./ablation/review-routing.json")
    .then(response => {
      if (!response.ok) throw new Error("Review routing unavailable");
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data.runs) || data.runs.length !== 16 ||
          data.runs.some(row => ![2, 8].includes(row.requests))) throw new Error("Review routing does not match the final protocol");
      for (const row of data.runs) {
        const bar = document.createElement("div");
        bar.className = "handoff-run";
        bar.setAttribute("role", "img");
        bar.setAttribute("aria-label", `${row.run}: ${row.requests} photos requested`);
        bar.title = `${row.run} · ${row.requests} requests`;
        for (let slot = 7; slot >= 0; slot--) {
          const cell = document.createElement("i");
          cell.className = slot < 2 ? "is-first" : row.requests === 8 ? "is-extra" : "is-idle";
          bar.append(cell);
        }
        routingPanel.append(bar);
      }
      routingPanel.dataset.ready = "true";
      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(entries => {
          if (entries.some(entry => entry.isIntersecting)) {
            routingPanel.classList.add("is-revealed");
            observer.disconnect();
          }
        }, { threshold: .35 });
        observer.observe(routingPanel);
      }
    })
    .catch(error => console.error("Review routing:", error));
}

const allocationPanel = document.getElementById("reviewAllocation");
if (allocationPanel && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      allocationPanel.classList.add("is-revealed");
      observer.disconnect();
    }
  }, { threshold: .45 });
  observer.observe(allocationPanel);
}
