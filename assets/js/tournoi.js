/*
  Moteur de tournoi partagé (poule + classement auto + phases éliminatoires).
  Utilisé par toutes les pages /tournois/<sport>/index.html.

  Chaque page définit avant d'inclure ce fichier :
    window.TOURNOI_CONFIG = {
      tournoi: "Football",   // doit correspondre EXACTEMENT à une option
                              // du champ "Tournoi" dans la base Airtable
      title: "Coupe du Monde de Foot",
      subtitle: "Phase de poule, classement et phases éliminatoires (2026-2027)",
      tag: "⚽ Football"
    };

  Les données sont stockées dans Airtable (voir assets/js/airtable-config.js)
  donc tous les visiteurs voient les mêmes résultats, sur n'importe quel
  appareil.
*/

(function () {
  const PHASES = [
    { id: "1/8 de finale", title: "🥊 1/8èmes de Finale" },
    { id: "1/4 de finale", title: "🥉 1/4 de Finale" },
    { id: "Demi-finale", title: "🥈 Demi-Finales" },
    { id: "Petite finale", title: "🥉 Petite finale (3e place)" },
    { id: "Finale", title: "🏆 Finale" },
    { id: "Consolation - Quarts", title: "🔁 Tournoi de consolation – Quarts", conso: true },
    { id: "Consolation - Demi-finale", title: "🔁 Tournoi de consolation – Demi-finales", conso: true },
    { id: "Consolation - Finale", title: "🔁 Tournoi de consolation – Finale", conso: true },
  ];
  const isConso = (p) => /^consolation/i.test(p || "");
  // Phases comptées dans le tableau "Phase de poule" et dans le classement
  const GROUP_PHASES = ["Poule", "Phase 2"];
  const isGroupPhase = (p) => GROUP_PHASES.includes(p);

  let isAdmin = false;
  let records = [];
  let groupFilter = ""; // filtre du tableau des rencontres ("" = tous les matchs)

  function cfg() {
    return window.TOURNOI_CONFIG;
  }

  function airtableCfg() {
    return window.AIRTABLE_CONFIG;
  }

  function setStatus(message, isError) {
    const el = document.getElementById("syncStatus");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("error", !!isError);
  }

  // ---------- Airtable REST helpers ----------

  async function airtableRequest(method, recordId, body) {
    const { token, baseId, tableId } = airtableCfg();
    if (!token || token === "COLLEZ_VOTRE_TOKEN_ICI") {
      throw new Error("Le token Airtable n'a pas encore été configuré dans assets/js/airtable-config.js");
    }
    const path = recordId ? `/${recordId}` : "";
    const res = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Airtable a répondu ${res.status} : ${text}`);
    }
    return res.json();
  }

  async function fetchRecords() {
    const { token, baseId, tableId } = airtableCfg();
    if (!token || token === "COLLEZ_VOTRE_TOKEN_ICI") {
      throw new Error("token-manquant");
    }
    const formula = encodeURIComponent(`{Tournoi}='${cfg().tournoi}'`);
    let all = [];
    let offset = null;
    do {
      const params = new URLSearchParams({ filterByFormula: `{Tournoi}='${cfg().tournoi}'`, pageSize: "100" });
      if (offset) params.set("offset", offset);
      const res = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Airtable a répondu ${res.status}`);
      const data = await res.json();
      all = all.concat(data.records);
      offset = data.offset;
    } while (offset);
    return all;
  }

  function matchLabel(fields) {
    const e1 = fields.Equipe1 || "?";
    const e2 = fields.Equipe2 || "?";
    return `${cfg().tournoi} · ${fields.Phase} · ${e1} vs ${e2}`;
  }

  async function createMatch(phase) {
    const today = new Date().toISOString().split("T")[0];
    const fields = {
      Tournoi: cfg().tournoi,
      Phase: phase,
      Date: today,
      Equipe1: "",
      Equipe2: "",
    };
    fields.Match = matchLabel(fields);
    await airtableRequest("POST", null, { fields });
  }

  async function updateMatch(recordId, field, value) {
    const rec = records.find((r) => r.id === recordId);
    const fields = {};
    if (field === "Score1" || field === "Score2") {
      fields[field] = value === "" ? null : parseInt(value, 10);
    } else {
      fields[field] = value;
    }
    if ((field === "Equipe1" || field === "Equipe2") && rec) {
      const merged = { ...rec.fields, ...fields };
      fields.Match = matchLabel(merged);
    }
    await airtableRequest("PATCH", recordId, { fields });
  }

  async function deleteMatch(recordId) {
    await airtableRequest("DELETE", recordId, null);
  }

  // ---------- Rendu ----------

  function renderHeaderText() {
    const legend = document.getElementById("pointsLegend");
    if (legend && cfg().points) {
      const p = cfg().points;
      legend.innerText = `V=${p.win}pts | N=${p.draw}pts | D=${p.loss}pt`;
    }
    document.getElementById("headerTitle").innerText = cfg().title;
    document.getElementById("headerSub").innerText = cfg().subtitle;
    document.getElementById("tabTag").innerText = cfg().tag;
  }

  // ---------- Aides d'affichage (mode lecture) ----------

  const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
  function fmtDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return `${JOURS[dt.getDay()]} ${d} ${MOIS[m - 1]}`;
  }
  // "Équipe F (KONG A SIOU / ZEKIRI)" -> nom d'équipe + joueurs sur 2 lignes
  function teamHtml(name, fallback) {
    const txt = (name || "").trim();
    if (!txt) return `<span class="m-team m-empty">${fallback}</span>`;
    const m = txt.match(/^(.*?)\s*\((.*)\)\s*$/);
    if (m) return `<span class="m-team">${escapeHtml(m[1])}</span><span class="m-players">${escapeHtml(m[2])}</span>`;
    return `<span class="m-team">${escapeHtml(txt)}</span>`;
  }
  function scoreHtml(f) {
    const has1 = Number.isInteger(f.Score1), has2 = Number.isInteger(f.Score2);
    if (!has1 && !has2) return `<span class="m-score m-pending">– : –</span>`;
    return `<span class="m-score">${has1 ? f.Score1 : "–"} : ${has2 ? f.Score2 : "–"}</span>`;
  }
  function metaHtml(f) {
    const bits = [];
    if (f.Heure) bits.push(escapeHtml(f.Heure));
    if (f["N° match"]) bits.push(`Match ${f["N° match"]}`);
    if (f.Groupe) bits.push(escapeHtml(f.Groupe));
    return bits.length ? `<span class="m-meta">${bits.join(" · ")}</span>` : "";
  }
  function sortMatches(a, b) {
    const fa = a.fields, fb = b.fields;
    return (fa.Date || "").localeCompare(fb.Date || "") || (fa.Heure || "").localeCompare(fb.Heure || "") || (fa.Ordre || 0) - (fb.Ordre || 0);
  }
  // Liste des catégories présentes (Masculin / Féminin) — vide si non renseignées
  function categories() {
    const set = [];
    records.forEach((r) => { const c = r.fields["Catégorie"]; if (c && !set.includes(c)) set.push(c); });
    return set.length > 1 ? set.sort((a, b) => (catClass(a) === "cat-masculin" ? -1 : 0) - (catClass(b) === "cat-masculin" ? -1 : 0) || a.localeCompare(b)) : [];
  }

  // Une ligne de match : lecture (texte) ou admin (champs modifiables)
  // Code couleur par catégorie : Masculin = vert, Féminin = rouge
  function catClass(cat) {
    const c = (cat || "").toLowerCase();
    if (c.startsWith("masc")) return "cat-masculin";
    if (c.startsWith("fém") || c.startsWith("fem")) return "cat-feminin";
    return "";
  }

  function matchRow(m, placeholder1, placeholder2) {
    const f = m.fields;
    const cc = isConso(f.Phase) ? "cat-conso" : catClass(f["Catégorie"]);
    if (!isAdmin) {
      return `
          <tr class="match-row ${cc}">
            <td class="c-date"><span class="m-date">${fmtDate(f.Date)}</span>${metaHtml(f)}</td>
            <td class="c-t1">${teamHtml(f.Equipe1, placeholder1)}</td>
            <td class="c-score">${scoreHtml(f)}</td>
            <td class="c-t2">${teamHtml(f.Equipe2, placeholder2)}</td>
            <td class="admin-only"></td>
          </tr>`;
    }
    const s1 = f.Score1 ?? "";
    const s2 = f.Score2 ?? "";
    return `
          <tr class="match-row is-edit ${cc}">
            <td class="c-date"><input type="date" value="${f.Date || ""}" onchange="Tournoi.updateField('${m.id}','Date',this.value)">${metaHtml(f)}</td>
            <td class="c-t1"><input type="text" value="${escapeAttr(f.Equipe1 || "")}" placeholder="${placeholder1}" onchange="Tournoi.updateField('${m.id}','Equipe1',this.value)"></td>
            <td class="c-score">
              <input type="number" min="0" value="${s1}" placeholder="0" onchange="Tournoi.updateField('${m.id}','Score1',this.value)">
              <span>x</span>
              <input type="number" min="0" value="${s2}" placeholder="0" onchange="Tournoi.updateField('${m.id}','Score2',this.value)">
            </td>
            <td class="c-t2"><input type="text" value="${escapeAttr(f.Equipe2 || "")}" placeholder="${placeholder2}" onchange="Tournoi.updateField('${m.id}','Equipe2',this.value)"></td>
            <td class="admin-only"><button class="btn btn-delete" onclick="Tournoi.remove('${m.id}')">✕</button></td>
          </tr>`;
  }
  function sectionRow(label) {
    return `<tr class="section-row ${catClass(label)}"><td colspan="5">${escapeHtml(label)}</td></tr>`;
  }

  function renderPouleTable() {
    const tbody = document.getElementById("pouleTableBody");
    if (!tbody) return;
    tbody.closest("table").classList.add("match-table", "has-day-headers");
    renderGroupFilter(tbody);
    const matches = records
      .filter((r) => isGroupPhase(r.fields.Phase))
      .filter((r) => !groupFilter || groupKey(r.fields) === groupFilter)
      .sort(sortMatches);

    if (matches.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${isAdmin ? 5 : 4}" style="color:#94a3b8; padding:20px;">Aucune rencontre programmée${isAdmin ? '. Cliquez sur "+ Rencontre".' : "."}</td></tr>`;
      return;
    }

    // Regroupement par jour (lecture) pour une liste facile à suivre sur smartphone
    let html = "";
    let lastDay = null;
    matches.forEach((m) => {
      const day = m.fields.Date || "";
      if (!isAdmin && day !== lastDay) {
        const [y, mo, d] = day.split("-").map(Number);
        const label = day ? new Date(y, mo - 1, d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : "Date à définir";
        html += sectionRow(label.charAt(0).toUpperCase() + label.slice(1));
        lastDay = day;
      }
      html += matchRow(m, "Équipe 1", "Équipe 2");
    });
    tbody.innerHTML = html;
  }

  function computeStandings(matches) {
    const pts = Object.assign({ win: 3, draw: 1, loss: 0 }, cfg().points || {});
    const stats = {};
    const blank = () => ({ played: 0, won: 0, drawn: 0, lost: 0, points: 0, gf: 0, ga: 0 });
    matches.forEach((m) => {
      const t1 = (m.fields.Equipe1 || "").trim();
      const t2 = (m.fields.Equipe2 || "").trim();
      if (t1 && !stats[t1]) stats[t1] = blank();
      if (t2 && !stats[t2]) stats[t2] = blank();
      const s1 = m.fields.Score1, s2 = m.fields.Score2;
      if (t1 && t2 && Number.isInteger(s1) && Number.isInteger(s2)) {
        stats[t1].played++; stats[t2].played++;
        stats[t1].gf += s1; stats[t1].ga += s2;
        stats[t2].gf += s2; stats[t2].ga += s1;
        if (s1 > s2) { stats[t1].won++; stats[t1].points += pts.win; stats[t2].lost++; stats[t2].points += pts.loss; }
        else if (s1 < s2) { stats[t2].won++; stats[t2].points += pts.win; stats[t1].lost++; stats[t1].points += pts.loss; }
        else { stats[t1].drawn++; stats[t1].points += pts.draw; stats[t2].drawn++; stats[t2].points += pts.draw; }
      }
    });
    return Object.keys(stats)
      .map((name) => ({ name, ...stats[name], diff: stats[name].gf - stats[name].ga }))
      .sort((a, b) => b.points - a.points || b.diff - a.diff || b.gf - a.gf || a.name.localeCompare(b.name));
  }

  function renderStandings() {
    const tbody = document.getElementById("standingsTableBody");
    if (!tbody) return;
    tbody.closest("table").classList.add("standings-compact");
    const all = records.filter((r) => isGroupPhase(r.fields.Phase));
    const cats = categories();
    const groups = cats.length ? cats.map((c) => ({ label: c, list: all.filter((r) => r.fields["Catégorie"] === c) })) : [{ label: null, list: all }];

    let html = "";
    groups.forEach((g) => {
      const sorted = computeStandings(g.list);
      if (g.label) html += `<tr class="section-row ${catClass(g.label)}"><td colspan="7">${escapeHtml(g.label)}</td></tr>`;
      html += sorted
        .map(
          (t, i) => `
        <tr class="${catClass(g.label || (g.list[0] && g.list[0].fields["Catégorie"]))}">
          <td class="rank">${i + 1}</td>
          <td class="team-name">${teamHtml(t.name, "")}</td>
          <td>${t.played}</td>
          <td>${t.won}</td>
          <td>${t.drawn}</td>
          <td>${t.lost}</td>
          <td><span class="badge-points">${t.points}</span></td>
        </tr>`
        )
        .join("");
    });
    if (!html) html = `<tr><td colspan="7" style="color:#94a3b8; padding:15px;">Aucune équipe / score enregistré.</td></tr>`;
    tbody.innerHTML = html;
  }

  function renderKnockout() {
    const container = document.getElementById("knockoutContainer");
    if (!container) return;
    const cats = categories();

    container.innerHTML = PHASES.map((phase) => {
      const matches = records.filter((r) => r.fields.Phase === phase.id).sort(sortMatches);
      // une phase vide n'est affichée qu'en mode admin (pour pouvoir y ajouter un match)
      if (matches.length === 0 && !isAdmin && records.length > 0) return "";

      let rowsHtml;
      if (matches.length === 0) {
        rowsHtml = `<tr><td colspan="${isAdmin ? 5 : 4}" style="color:#94a3b8; padding:15px;">Aucun match dans cette phase.</td></tr>`;
      } else if (cats.length && !isAdmin) {
        rowsHtml = cats
          .map((c) => {
            const list = matches.filter((m) => m.fields["Catégorie"] === c);
            return list.length ? (phase.conso ? "" : sectionRow(c)) + list.map((m) => matchRow(m, "À déterminer", "À déterminer")).join("") : "";
          })
          .join("");
      } else {
        rowsHtml = matches.map((m) => matchRow(m, "Équipe / Joueur 1", "Équipe / Joueur 2")).join("");
      }

      return `
        <div class="phase-block${phase.conso ? " is-conso" : ""}">
          <div class="phase-header">
            <h3>${phase.title}</h3>
            <button class="btn btn-add admin-only" onclick="Tournoi.add('${phase.id}')">+ Match (${phase.title})</button>
          </div>
          <div class="table-wrapper">
            <table class="match-table">
              <thead>
                <tr>
                  <th style="width:18%;">Date</th><th style="width:32%;">Équipe 1</th><th style="width:14%;">Score</th><th style="width:32%;">Équipe 2</th><th class="admin-only" style="width:4%;"></th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </div>`;
    }).join("");
  }


  // ---------- Composition des groupes ----------

  // Clé unique d'un groupe : "Masculin|Groupe 1" (la catégorie évite de mélanger les groupes M/F)
  function groupKey(f) {
    return (f["Catégorie"] || "") + "|" + (f.Groupe || "");
  }
  // Nom court affiché ; la couleur (vert/rouge) indique la catégorie
  function groupLabel(key) {
    const [cat, grp] = key.split("|");
    return grp === "Groupe unique" && cat ? cat : grp;
  }
  // Groupes de la phase de poule (hors matchs croisés "Groupe 1 x Groupe 2")
  function pouleGroups() {
    const map = new Map();
    records
      .filter((r) => r.fields.Phase === "Poule" && r.fields.Groupe && !/\sx\s/i.test(r.fields.Groupe))
      .forEach((r) => {
        const k = groupKey(r.fields);
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(r);
      });
    const order = (k) => (catClass(k.split("|")[0]) === "cat-feminin" ? 1 : 0);
    return [...map.entries()].sort((a, b) => order(a[0]) - order(b[0]) || a[0].localeCompare(b[0], "fr", { numeric: true }));
  }
  function teamLetter(name) {
    const m = (name || "").match(/^[ÉE]quipe\s+([A-Z0-9]+)/i);
    return m ? m[1].toUpperCase() : "";
  }

  function ensureGroupsContainer() {
    let el = document.getElementById("groupsContainer");
    if (el) return el;
    const anchor = document.querySelector(".main-grid");
    if (!anchor) return null;
    el = document.createElement("section");
    el.id = "groupsContainer";
    el.className = "full-width-card groups-section";
    anchor.parentNode.insertBefore(el, anchor);
    return el;
  }

  function renderGroups() {
    const groups = pouleGroups();
    const existing = document.getElementById("groupsContainer");
    if (!groups.length) { if (existing) existing.innerHTML = ""; return; }
    const el = ensureGroupsContainer();
    if (!el) return;
    const cards = groups.map(([key, list]) => {
      const cat = key.split("|")[0];
      const standings = computeStandings(list);
      const anyPlayed = standings.some((t) => t.played > 0);
      const rows = standings
        .sort((a, b) => (anyPlayed ? 0 : teamLetter(a.name).localeCompare(teamLetter(b.name))))
        .map((t, i) => {
          const m = t.name.match(/^(.*?)\s*\((.*)\)\s*$/);
          const team = m ? m[1] : t.name, players = m ? m[2] : "";
          return `<li>
              <span class="g-rank">${anyPlayed ? i + 1 : ""}</span>
              <span class="g-letter">${escapeHtml(teamLetter(t.name) || "•")}</span>
              <span class="g-team"><strong>${escapeHtml(team)}</strong>${players ? `<small>${escapeHtml(players)}</small>` : ""}</span>
              <span class="g-stat" title="Matchs joués">${t.played} J</span>
              <span class="g-pts" title="Points">${t.points} pt${t.points > 1 ? "s" : ""}</span>
            </li>`;
        })
        .join("");
      const active = groupFilter === key ? " is-active" : "";
      return `<article class="group-card ${catClass(cat)}${active}">
          <header><h3>${escapeHtml(groupLabel(key))}</h3><span>${standings.length} duos · ${list.length} matchs</span></header>
          <ol>${rows}</ol>
          <button class="group-see" onclick="Tournoi.filterGroup('${escapeAttr(key)}', true)">Voir les matchs de ce groupe →</button>
        </article>`;
    });
    el.innerHTML = `
      <div class="card-header" style="border-bottom:2px solid var(--border); padding-bottom:12px; margin-bottom:20px;">
        <h2 class="card-title" style="font-size:1.5rem;">👥 Composition des groupes</h2>
        <span style="font-size:0.8rem;color:var(--text-muted);">Classement interne au groupe · mis à jour avec les scores</span>
      </div>
      <div class="groups-grid">${cards.join("")}</div>`;
  }

  // Filtre (puces) au-dessus du tableau des rencontres
  function renderGroupFilter(tbody) {
    const wrapper = tbody.closest(".table-wrapper");
    if (!wrapper) return;
    let bar = document.getElementById("groupFilterBar");
    const keys = [];
    records.filter((r) => isGroupPhase(r.fields.Phase) && r.fields.Groupe).forEach((r) => {
      const k = groupKey(r.fields);
      if (!keys.includes(k)) keys.push(k);
    });
    if (keys.length < 2) { if (bar) bar.remove(); return; }
    const order = (k) => (/\sx\s/i.test(k) ? 2 : catClass(k.split("|")[0]) === "cat-feminin" ? 1 : 0);
    keys.sort((a, b) => order(a) - order(b) || a.localeCompare(b, "fr", { numeric: true }));
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "groupFilterBar";
      bar.className = "group-filter";
      wrapper.parentNode.insertBefore(bar, wrapper);
    }
    const chip = (k, label, cls) =>
      `<button class="chip ${cls || ""}${groupFilter === k ? " is-active" : ""}" onclick="Tournoi.filterGroup('${escapeAttr(k)}')">${escapeHtml(label)}</button>`;
    bar.innerHTML =
      chip("", "Tous les matchs") +
      keys.map((k) => chip(k, /\sx\s/i.test(k) ? "Phase 2 (croisés)" : groupLabel(k), catClass(k.split("|")[0]))).join("");
  }

  function filterGroup(key, scroll) {
    groupFilter = groupFilter === key && !scroll ? "" : key;
    renderGroups();
    renderPouleTable();
    if (scroll) {
      const t = document.getElementById("groupFilterBar") || document.getElementById("pouleTableBody");
      if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function renderAll() {
    renderHeaderText();
    renderGroups();
    renderPouleTable();
    renderStandings();
    renderKnockout();
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function escapeAttr(str) {
    return escapeHtml(str);
  }

  // ---------- Cycle de vie ----------

  async function load() {
    setStatus("Chargement des résultats…", false);
    try {
      records = await fetchRecords();
      setStatus(`Résultats à jour · ${new Date().toLocaleTimeString("fr-FR")}`, false);
    } catch (e) {
      if (e.message === "token-manquant") {
        setStatus("⚠️ Connexion aux résultats non configurée (token Airtable manquant dans airtable-config.js).", true);
      } else {
        setStatus("⚠️ Impossible de charger les résultats : " + e.message, true);
      }
      records = [];
    }
    renderAll();
  }

  async function withSaving(promise) {
    setStatus("Enregistrement…", false);
    try {
      await promise;
      await load();
    } catch (e) {
      setStatus("⚠️ Échec de l'enregistrement : " + e.message, true);
    }
  }

  function toggleAdmin() {
    if (!isAdmin) {
      const pwd = prompt("Mot de passe administrateur pour modifier les résultats :");
      if (pwd === null) return;
      if (pwd !== window.ADMIN_PASSWORD) {
        alert("Mot de passe incorrect.");
        return;
      }
      isAdmin = true;
    } else {
      isAdmin = false;
    }
    document.body.classList.toggle("is-admin", isAdmin);
    const btn = document.getElementById("adminToggleBtn");
    btn.classList.toggle("is-on", isAdmin);
    btn.innerText = isAdmin ? "🔓 Déconnexion Admin" : "🔒 Connexion Admin";
    renderAll();
  }

  window.Tournoi = {
    add: (phase) => withSaving(createMatch(phase)),
    remove: (id) => {
      if (confirm("Supprimer cette rencontre ?")) withSaving(deleteMatch(id));
    },
    updateField: (id, field, value) => withSaving(updateMatch(id, field, value)),
    toggleAdmin,
    filterGroup,
  };

  document.addEventListener("DOMContentLoaded", load);
})();
