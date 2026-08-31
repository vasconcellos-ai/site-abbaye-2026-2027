/*
  Navigation et pied de page partagés par toutes les pages du site.
  Pour ajouter une page au menu : ajoutez une ligne dans NAV ci-dessous.
  Pour ajouter un tournoi : ajoutez une ligne dans le tableau "dropdown" de
  l'entrée "Tournois".
*/

(function () {
  const ROOT = window.SITE_ROOT || "./";

  const NAV = [
    { key: "accueil", label: "Accueil", href: "index.html" },
    { key: "pointages", label: "Pointages Abbaye", href: "pointages-abbaye.html" },
    { key: "pointages-cantine", label: "Pointages Cantine", href: "pointages-cantine.html" },
    { key: "reglement", label: "Règlement Abbaye", href: "reglement-abbaye.html" },
    { key: "conseil", label: "Conseil de maison", href: "conseil-de-maison.html" },
    { key: "sah", label: "SAH", href: "sah.html" },
    { key: "cafe", label: "Café des Idées", href: "cafe-des-idees.html" },
    { key: "calendrier", label: "Calendrier des tournois", href: "calendrier.html" },
    {
      key: "tournois",
      label: "Tournois",
      dropdown: [
        { key: "football", label: "⚽ Football", href: "tournois/football/index.html" },
        { key: "basketball", label: "🏀 Basketball", href: "tournois/basketball/index.html" },
        { key: "billard", label: "🎱 Billard", href: "tournois/billard/index.html" },
        { key: "echecs", label: "♟️ Échecs", href: "tournois/echecs/index.html" },
        { key: "babyfoot", label: "⚽ Baby-foot", href: "tournois/babyfoot/index.html" },
        { key: "poker", label: "♠️ Poker", href: "tournois/poker/index.html" },
        { key: "jeuxvideo", label: "🎮 Jeux vidéo", href: "tournois/jeuxvideo/index.html" },
        { key: "flechettes", label: "🎯 Fléchettes", href: "tournois/flechettes/index.html" },
      ],
    },
  ];

  function renderHeader() {
    const host = document.getElementById("site-header");
    if (!host) return;
    const current = document.body.dataset.page || "";

    const linksHtml = NAV.map((item) => {
      if (item.dropdown) {
        const isActiveParent = item.dropdown.some((d) => d.key === current);
        const subLinks = item.dropdown
          .map((d) => `<a href="${ROOT}${d.href}">${d.label}</a>`)
          .join("");
        return `
          <li class="nav-dropdown">
            <a href="#" class="nav-link${isActiveParent ? " active" : ""}" onclick="return false;">${item.label} ▾</a>
            <div class="nav-dropdown-menu">${subLinks}</div>
          </li>`;
      }
      return `<li><a class="nav-link${item.key === current ? " active" : ""}" href="${ROOT}${item.href}">${item.label}</a></li>`;
    }).join("");

    host.innerHTML = `
      <div class="site-topbar">
        <div class="container" style="flex-direction:column; align-items:center; text-align:center; gap:1px;">
          <span style="font-weight:700;">Maison Abbaye</span>
          <span>Année scolaire 2026-2027</span>
        </div>
      </div>
      <nav class="site-nav">
        <div class="container">
          <a class="brand" href="${ROOT}index.html">
            <span class="crest"><img src="${ROOT}assets/img/crest-smf-vert-icon.png" alt="Blason Saint Martin de France"></span>
            Maison Abbaye
          </a>
          <button class="nav-toggle" aria-label="Ouvrir le menu">☰</button>
          <ul class="nav-links" id="navLinks">${linksHtml}</ul>
        </div>
      </nav>
    `;

    const toggle = host.querySelector(".nav-toggle");
    const links = host.querySelector("#navLinks");
    toggle.addEventListener("click", () => links.classList.toggle("open"));

    host.querySelectorAll(".nav-dropdown > a").forEach((a) => {
      a.addEventListener("click", () => {
        if (window.innerWidth <= 1180) {
          a.parentElement.classList.toggle("open");
        }
      });
    });
  }

  function renderFooter() {
    const host = document.getElementById("site-footer");
    if (!host) return;
    const tournoiLinks = NAV.find((n) => n.key === "tournois").dropdown
      .map((d) => `<li><a href="${ROOT}${d.href}">${d.label}</a></li>`)
      .join("");
    host.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div>
            <h4>Maison Abbaye</h4>
            <ul>
              <li>Espace de vie, de communication et de suivi des tournois pour les élèves demi-pensionnaires et leurs familles.</li>
            </ul>
          </div>
          <div>
            <h4>Navigation</h4>
            <ul>
              <li><a href="${ROOT}index.html">Accueil</a></li>
              <li><a href="${ROOT}pointages-abbaye.html">Pointages Abbaye</a></li>
              <li><a href="${ROOT}pointages-cantine.html">Pointages Cantine</a></li>
              <li><a href="${ROOT}reglement-abbaye.html">Règlement Abbaye</a></li>
              <li><a href="${ROOT}conseil-de-maison.html">Conseil de maison</a></li>
              <li><a href="${ROOT}sah.html">SAH</a></li>
              <li><a href="${ROOT}cafe-des-idees.html">Café des Idées</a></li>
              <li><a href="${ROOT}calendrier.html">Calendrier des tournois</a></li>
            </ul>
          </div>
          <div>
            <h4>Tournois 2026-2027</h4>
            <ul>${tournoiLinks}</ul>
          </div>
          <div>
            <h4>Suivez-nous sur les réseaux sociaux</h4>
            <ul>
              <li><a href="https://saintmartindefrance.fr" target="_blank" rel="noopener">🌐 Site officiel SMDF</a></li>
              <li><a href="https://www.facebook.com/saintmartindefrance" target="_blank" rel="noopener">📘 Facebook SMDF</a></li>
              <li><a href="https://www.instagram.com/saint.martin.de.france/" target="_blank" rel="noopener">📷 Instagram SMDF</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">© ${new Date().getFullYear()} Maison Abbaye — Année scolaire 2026-2027</div>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderHeader();
    renderFooter();
  });
})();
