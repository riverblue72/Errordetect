"use strict";

const sections = [...document.querySelectorAll("#baseline, #feedback, #next")];
const links = [...document.querySelectorAll('.main-nav a[href^="#"]')];

function updateSectionNavigation() {
  const readingLine = window.scrollY + Math.min(window.innerHeight * 0.3, 250);
  const current = [...sections].reverse().find(section => section.offsetTop <= readingLine);
  for (const link of links) {
    const active = current && link.hash === `#${current.id}`;
    link.classList.toggle("nav-current", Boolean(active));
    if (active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
}

window.addEventListener("scroll", updateSectionNavigation, { passive: true });
window.addEventListener("resize", updateSectionNavigation);
window.addEventListener("load", updateSectionNavigation);
updateSectionNavigation();
