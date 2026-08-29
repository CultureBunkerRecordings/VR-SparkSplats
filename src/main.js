import "./main.css";
import { collections } from "./collections.js";
import { mountVrViewer } from "./vr-viewer.js";

const app = document.getElementById("app");
let disposeCurrentView = () => {};

function renderShell(content, activeRoute) {
  app.innerHTML = `
    <header class="site-header">
      <a class="wordmark" href="#/" aria-label="Splatology home"><img src="/media/Logo.png" alt="" /></a>
      <nav class="site-nav" aria-label="Primary navigation">
        <a href="#/" ${activeRoute === "home" ? 'aria-current="page"' : ""}>Collections</a>
        <a class="vr-link" href="#/vr" ${activeRoute === "vr" ? 'aria-current="page"' : ""}>Enter VR</a>
      </nav>
    </header>
    <main>${content}</main>
  `;
}

function renderHome() {
  const cards = collections.map((collection, index) => `
    <a class="collection-card collection-card--${index % 3}" href="#/collections/${collection.id}">
      <span class="collection-card__number">${String(index + 1).padStart(2, "0")}</span>
      <span class="collection-card__art">
        <img src="${collection.thumbnail}" alt="" />
      </span>
      <span class="collection-card__content">
        <span class="collection-card__meta">${collection.works.length} works</span>
        <span class="collection-card__title">${collection.title}</span>
        <span class="collection-card__description">${collection.description}</span>
      </span>
    </a>`).join("");
  renderShell(`<section class="home-intro"><p class="eyebrow">Gaussian splat studies</p><h1>Collections</h1><p class="home-intro__copy">An archive of gaussian splats captured with my bespoke scanning system</p><video class="home-intro__video" controls preload="metadata" src="/media/Splat_Machine.mov">Your browser does not support embedded video.</video></section><section class="collection-index" aria-label="Collections">${cards}</section>`, "home");
}

function renderCollection(collection) {
  if (!collection) {
    renderShell(`<section class="empty-state"><p class="eyebrow">Not found</p><h1>This collection is not here.</h1><a class="text-action" href="#/">Return to collections <span aria-hidden="true">&#8594;</span></a></section>`, "home");
    return;
  }
  const works = collection.works.length ? collection.works.map((work) => `<article class="work-tile"><div class="work-frame"><iframe src="${work.src}" title="${work.title}" loading="lazy" allow="fullscreen; xr-spatial-tracking"></iframe></div><div class="work-caption"><h2>${work.title}</h2><button class="icon-button" type="button" data-expand-src="${work.src}" data-expand-title="${work.title}" aria-label="Expand ${work.title}">&#8599;</button></div></article>`).join("") : `<div class="gallery-empty"><p>No exported embeds have been added to this collection yet.</p></div>`;
  renderShell(`<section class="collection-heading"><a class="back-link" href="#/">&#8592; All collections</a><p class="eyebrow">Collection</p><h1>${collection.title}</h1><p>${collection.description}</p></section><section class="work-gallery" aria-label="${collection.title} works">${works}</section><dialog class="work-dialog"><div class="work-dialog__bar"><p class="eyebrow" data-dialog-title></p><button class="icon-button" type="button" data-close-dialog aria-label="Close expanded work">&#215;</button></div><iframe title="Expanded work" allow="fullscreen; xr-spatial-tracking"></iframe></dialog>`, "collections");
  const dialog = app.querySelector(".work-dialog");
  app.querySelectorAll("[data-expand-src]").forEach((button) => button.addEventListener("click", () => {
    dialog.querySelector("iframe").src = button.dataset.expandSrc;
    dialog.querySelector("[data-dialog-title]").textContent = button.dataset.expandTitle;
    dialog.showModal();
  }));
  app.querySelector("[data-close-dialog]")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => { dialog.querySelector("iframe").src = "about:blank"; });
}

function renderVr() {
  app.innerHTML = `<div class="vr-page"><a class="vr-back" href="#/" aria-label="Return to collections">&#8592; Collections</a><div id="vr-root"></div></div>`;
  disposeCurrentView = mountVrViewer(app.querySelector("#vr-root"));
}

function renderRoute() {
  disposeCurrentView();
  disposeCurrentView = () => {};
  const parts = window.location.hash.replace(/^#\/?/, "").split("/");
  if (parts[0] === "vr") renderVr();
  else if (parts[0] === "collections" && parts[1]) renderCollection(collections.find((collection) => collection.id === parts[1]));
  else renderHome();
}

window.addEventListener("hashchange", renderRoute);
if (!window.location.hash) window.location.hash = "#/";
renderRoute();
