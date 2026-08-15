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
    { id: "Finale", title: "🏆 Finale" },
  ];

  let isAdmin = false;
  let records = [];

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
    document.getElementById("headerTitle").innerText = cfg().title;
    document.getElementById("headerSub").innerText = cfg().subtitle;
    document.getElementById("tabTag").innerText = cfg().tag;
  }

  function renderPouleTable() {
    const tbody = document.getElementById("pouleTableBody");
    if (!tbody) return;
    const matches = records
      .filter((r) => r.fields.Phase === "Poule")
      .sort((a, b) => (a.fields.Ordre || 0) - (b.fields.Ordre || 0) || (a.fields.Date || "").localeCompare(b.fields.Date || ""));

    if (matches.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${isAdmin ? 5 : 4}" style="color:#94a3b8; padding:20px;">Aucune rencontre programmée${isAdmin ? '. Cliquez sur "+ Rencontre".' : "."}</td></tr>`;
      return;
    }

    tbody.innerHTML = matches
      .map((m) => {
        const f = m.fields;
        const s1 = f.Score1 ?? "";
        const s2 = f.Score2 ?? "";
        const disabled = isAdmin ? "" : "disabled";
        return `
          <tr>
            <td><input type="date" value="${f.Date || ""}" ${disabled} onchange="Tournoi.updateField('${m.id}','Date',this.value)"></td>
            <td><input type="text" value="${escapeAttr(f.Equipe1 || "")}" placeholder="Équipe 1" ${disabled} onchange="Tournoi.updateField('${m.id}','Equipe1',this.value)"></td>
            <td>
              <input type="number" min="0" value="${s1}" placeholder="0" ${disabled} onchange="Tournoi.updateField('${m.id}','Score1',this.value)">
              <span>x</span>
              <input type="number" min="0" value="${s2}" placeholder="0" ${disabled} onchange="Tournoi.updateField('${m.id}','Score2',this.value)">
            </td>
            <td><input type="text" value="${escapeAttr(f.Equipe2 || "")}" placeholder="Équipe 2" ${disabled} onchange="Tournoi.updateField('${m.id}','Equipe2',this.value)"></td>
            <td class="admin-only"><button class="btn btn-delete" onclick="Tournoi.remove('${m.id}')">✕</button></td>
          </tr>`;
      })
      .join("");
  }

  function renderStandings() {
    const tbody = document.getElementById("standingsTableBody");
    if (!tbody) return;
    const matches = records.filter((r) => r.fields.Phase === "Poule");
    const stats = {};

    matches.forEach((m) => {
      const t1 = (m.fields.Equipe1 || "").trim();
      const t2 = (m.fields.Equipe2 || "").trim();
      if (t1 && !stats[t1]) stats[t1] = { played: 0, won: 0, drawn: 0, lost: 0, points: 0, gf: 0, ga: 0 };
      if (t2 && !stats[t2]) stats[t2] = { played: 0, won: 0, drawn: 0, lost: 0, points: 0, gf: 0, ga: 0 };
    });

    matches.forEach((m) => {
      const t1 = (m.fields.Equipe1 || "").trim();
      const t2 = (m.fields.Equipe2 || "").trim();
      const s1 = m.fields.Score1;
      const s2 = m.fields.Score2;
      if (t1 && t2 && Number.isInteger(s1) && Number.isInteger(s2)) {
        stats[t1].played++; stats[t2].played++;
        stats[t1].gf += s1; stats[t1].ga += s2;
        stats[t2].gf += s2; stats[t2].ga += s1;
        if (s1 > s2) { stats[t1].won++; stats[t1].points += 3; stats[t2].lost++; }
        else if (s1 < s2) { stats[t2].won++; stats[t2].points += 3; stats[t1].lost++; }
        else { stats[t1].drawn++; stats[t1].points++; stats[t2].drawn++; stats[t2].points++; }
      }
    });

    const sorted = Object.keys(stats)
      .map((name) => ({ name, ...stats[name], diff: stats[name].gf - stats[name].ga }))
      .sort((a, b) => b.points - a.points || b.diff - a.diff);

    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="color:#94a3b8; padding:15px;">Aucune équipe / score enregistré.</td></tr>`;
      return;
    }

    tbody.innerHTML = sorted
      .map(
        (t, i) => `
        <tr>
          <td class="rank">${i + 1}</td>
          <td class="team-name">${escapeHtml(t.name)}</td>
          <td>${t.played}</td>
          <td>${t.won}</td>
          <td>${t.drawn}</td>
          <td>${t.lost}</td>
          <td><span class="badge-points">${t.points}</span></td>
        </tr>`
      )
      .join("");
  }

  function renderKnockout() {
    const container = document.getElementById("knockoutContainer");
    if (!container) return;

    container.innerHTML = PHASES.map((phase) => {
      const matches = records
        .filter((r) => r.fields.Phase === phase.id)
        .sort((a, b) => (a.fields.Ordre || 0) - (b.fields.Ordre || 0) || (a.fields.Date || "").localeCompare(b.fields.Date || ""));

      let rowsHtml;
      if (matches.length === 0) {
        rowsHtml = `<tr><td colspan="${isAdmin ? 5 : 4}" style="color:#94a3b8; padding:15px;">Aucun match dans cette phase.</td></tr>`;
      } else {
        rowsHtml = matches
          .map((m) => {
            const f = m.fields;
            const s1 = f.Score1 ?? "";
            const s2 = f.Score2 ?? "";
            const disabled = isAdmin ? "" : "disabled";
            return `
              <tr>
                <td style="width:18%;"><input type="date" value="${f.Date || ""}" ${disabled} onchange="Tournoi.updateField('${m.id}','Date',this.value)"></td>
                <td style="width:32%;"><input type="text" value="${escapeAttr(f.Equipe1 || "")}" placeholder="Équipe / Joueur 1" ${disabled} onchange="Tournoi.updateField('${m.id}','Equipe1',this.value)"></td>
                <td style="width:14%;">
                  <input type="number" min="0" value="${s1}" placeholder="0" ${disabled} onchange="Tournoi.updateField('${m.id}','Score1',this.value)">
                  <span>x</span>
                  <input type="number" min="0" value="${s2}" placeholder="0" ${disabled} onchange="Tournoi.updateField('${m.id}','Score2',this.value)">
                </td>
                <td style="width:32%;"><input type="text" value="${escapeAttr(f.Equipe2 || "")}" placeholder="Équipe / Joueur 2" ${disabled} onchange="Tournoi.updateField('${m.id}','Equipe2',this.value)"></td>
                <td class="admin-only" style="width:4%;"><button class="btn btn-delete" onclick="Tournoi.remove('${m.id}')">✕</button></td>
              </tr>`;
          })
          .join("");
      }

      return `
        <div class="phase-block">
          <div class="phase-header">
            <h3>${phase.title}</h3>
            <button class="btn btn-add admin-only" onclick="Tournoi.add('${phase.id}')">+ Match (${phase.title})</button>
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Équipe / Joueur 1</th><th>Score</th><th>Équipe / Joueur 2</th><th class="admin-only"></th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </div>`;
    }).join("");
  }

  function renderAll() {
    renderHeaderText();
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
  };

  document.addEventListener("DOMContentLoaded", load);
})();
