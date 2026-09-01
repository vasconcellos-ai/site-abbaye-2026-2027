/*
  Active/désactive le formulaire de pointage en ligne sur pointages-abbaye.html,
  et protège l'accès à ce formulaire par un mot de passe partagé (pour éviter
  qu'un élève absent de la cantine/l'Abbaye ne pointe quand même depuis
  n'importe où). État partagé via Airtable (table "Config") pour que tous les
  visiteurs voient le même état, quel que soit l'appareil.
*/

(function () {
  const TABLE_ID = "tbliDL8fiQy5yPb4n";
  const RECORD_ID = "recRDcmKip5fNWeAF";
  const UNLOCK_KEY = "pointageAccesDebloque";

  let isAdmin = false;
  let lastActif = false;
  let lastAccesLibre = false;

  function setStatus(message, isError) {
    const el = document.getElementById("pointageStatus");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("error", !!isError);
  }

  function isUnlocked() {
    try {
      return localStorage.getItem(UNLOCK_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function storeUnlocked() {
    try {
      localStorage.setItem(UNLOCK_KEY, "1");
    } catch (e) {
      // stockage indisponible (navigation privée, etc.) : rien de grave,
      // le mot de passe sera simplement redemandé la prochaine fois.
    }
  }

  async function airtableRequest(method, body) {
    const { token, baseId } = window.AIRTABLE_CONFIG;
    const res = await fetch(`https://api.airtable.com/v0/${baseId}/${TABLE_ID}/${RECORD_ID}`, {
      method,
      cache: "no-store",
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

  function renderPasswordGate() {
    const host = document.getElementById("pointageContent");
    host.innerHTML = `
      <div style="text-align:center; padding:40px 20px;">
        <div style="font-size:2.4rem; margin-bottom:12px;">🔑</div>
        <h3 style="color:var(--forest-dark); margin-bottom:8px;">Accès protégé</h3>
        <p style="color:var(--text-muted); max-width:480px; margin:0 auto 16px;">
          Ce formulaire est réservé aux élèves réellement présents à l'Abbaye.
          Entrez le mot de passe qui vous a été communiqué pour y accéder.
        </p>
        <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap; max-width:360px; margin:0 auto;">
          <input type="password" id="pointageAccesInput" placeholder="Mot de passe" style="flex:1 1 180px; padding:10px 12px; border:1px solid var(--border); border-radius:8px;">
          <button class="btn btn-add" onclick="PointageToggle.tryUnlock()">Valider</button>
        </div>
        <p id="pointageAccesError" style="color:#b00020; margin-top:10px; font-size:0.85rem;"></p>
      </div>`;
    const input = document.getElementById("pointageAccesInput");
    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") tryUnlock();
      });
      input.focus();
    }
  }

  function tryUnlock() {
    const input = document.getElementById("pointageAccesInput");
    const errorEl = document.getElementById("pointageAccesError");
    const value = input ? input.value : "";
    if (value === window.ACCESS_PASSWORD) {
      storeUnlocked();
      renderContent(lastActif, lastAccesLibre);
    } else if (errorEl) {
      errorEl.textContent = "Mot de passe incorrect.";
    }
  }

  function renderContent(actif, accesLibre) {
    lastActif = actif;
    lastAccesLibre = accesLibre;
    const host = document.getElementById("pointageContent");
    if (!actif) {
      host.innerHTML = `
        <div style="text-align:center; padding:40px 20px;">
          <div style="font-size:2.4rem; margin-bottom:12px;">🔒</div>
          <h3 style="color:var(--forest-dark); margin-bottom:8px;">Pointage en ligne désactivé</h3>
          <p style="color:var(--text-muted); max-width:480px; margin:0 auto;">
            La présence à l'Abbaye est actuellement enregistrée par lecture du QR code
            de la carte de lycéen à l'entrée. Ce formulaire sera réactivé ici si besoin
            (panne de réseau, lecteur QR indisponible, etc.).
          </p>
        </div>`;
      return;
    }
    if (accesLibre || isUnlocked()) {
      host.innerHTML = `<iframe class="airtable-embed" src="https://airtable.com/embed/appTif4wczWWlDSWO/pagKrGrVZJUobOfJJ/form" frameborder="0" width="100%" height="820"></iframe>`;
      return;
    }
    renderPasswordGate();
  }

  function renderAdminControls(actif, accesLibre, busy) {
    const host = document.getElementById("pointageAdminControls");
    if (!host) return;
    host.innerHTML = `
      <button class="btn btn-add" ${actif || busy ? "disabled" : ""} onclick="PointageToggle.setActif(true)">✅ Activer le pointage en ligne</button>
      <button class="btn btn-reset" ${!actif || busy ? "disabled" : ""} onclick="PointageToggle.setActif(false)">⛔ Désactiver le pointage en ligne</button>
      <div style="margin-top:8px; font-size:0.8rem; color:var(--text-muted);">État actuel : ${actif ? "activé ✅" : "désactivé ⛔"}</div>
      <div style="margin-top:14px; display:flex; gap:8px; flex-wrap:wrap; justify-content:center;">
        <button class="btn btn-add" ${accesLibre || busy ? "disabled" : ""} onclick="PointageToggle.setAccesLibre(true)">🔓 Autoriser l'accès à tous (sans mot de passe)</button>
        <button class="btn btn-reset" ${!accesLibre || busy ? "disabled" : ""} onclick="PointageToggle.setAccesLibre(false)">🔑 Restreindre l'accès (mot de passe requis)</button>
      </div>
      <div style="margin-top:8px; font-size:0.8rem; color:var(--text-muted);">Accès : ${accesLibre ? "ouvert à tous 🔓" : "protégé par mot de passe 🔑"}</div>
    `;
  }

  let requestSeq = 0;

  async function load() {
    const seq = ++requestSeq;
    setStatus("Chargement…");
    try {
      const rec = await airtableRequest("GET");
      if (seq !== requestSeq) return; // une requête plus récente a déjà répondu
      const actif = !!(rec.fields && rec.fields.Actif);
      const accesLibre = !!(rec.fields && rec.fields["Accès libre"]);
      renderContent(actif, accesLibre);
      renderAdminControls(actif, accesLibre, false);
      setStatus(actif ? "🟢 Pointage en ligne activé" : "⚪ Pointage en ligne désactivé — présence enregistrée par QR code");
    } catch (e) {
      if (seq !== requestSeq) return;
      setStatus("⚠️ Impossible de vérifier l'état du pointage : " + e.message, true);
      renderContent(false, false);
    }
  }

  async function setActif(value) {
    renderAdminControls(lastActif, lastAccesLibre, true);
    setStatus("Enregistrement…");
    try {
      const updated = await airtableRequest("PATCH", { fields: { Actif: value } });
      const confirmedActif = !!(updated.fields && updated.fields.Actif);
      if (confirmedActif !== value) {
        setStatus("⚠️ Airtable n'a pas confirmé le changement, nouvelle tentative…", true);
      }
      await load();
    } catch (e) {
      setStatus("⚠️ Échec de l'enregistrement : " + e.message, true);
      await load();
    }
  }

  async function setAccesLibre(value) {
    renderAdminControls(lastActif, lastAccesLibre, true);
    setStatus("Enregistrement…");
    try {
      const updated = await airtableRequest("PATCH", { fields: { "Accès libre": value } });
      const confirmed = !!(updated.fields && updated.fields["Accès libre"]);
      if (confirmed !== value) {
        setStatus("⚠️ Airtable n'a pas confirmé le changement, nouvelle tentative…", true);
      }
      await load();
    } catch (e) {
      setStatus("⚠️ Échec de l'enregistrement : " + e.message, true);
      await load();
    }
  }

  function toggleAdmin() {
    if (!isAdmin) {
      const pwd = prompt("Mot de passe administrateur :");
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
  }

  window.PointageToggle = { toggleAdmin, setActif, setAccesLibre, tryUnlock };
  document.addEventListener("DOMContentLoaded", load);
})();
