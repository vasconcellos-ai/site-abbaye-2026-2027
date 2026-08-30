/*
  Active/désactive le formulaire de pointage en ligne sur pointages-abbaye.html.
  État partagé via Airtable (table "Config") pour que tous les visiteurs voient
  le même état, quel que soit l'appareil.
*/

(function () {
  const TABLE_ID = "tbliDL8fiQy5yPb4n";
  const RECORD_ID = "recRDcmKip5fNWeAF";

  let isAdmin = false;

  function setStatus(message, isError) {
    const el = document.getElementById("pointageStatus");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("error", !!isError);
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

  function renderContent(actif) {
    const host = document.getElementById("pointageContent");
    if (actif) {
      host.innerHTML = `<iframe class="airtable-embed" src="https://airtable.com/embed/appTif4wczWWlDSWO/pagKrGrVZJUobOfJJ/form" frameborder="0" width="100%" height="820"></iframe>`;
    } else {
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
    }
  }

  function renderAdminControls(actif, busy) {
    const host = document.getElementById("pointageAdminControls");
    if (!host) return;
    host.innerHTML = `
      <button class="btn btn-add" ${actif || busy ? "disabled" : ""} onclick="PointageToggle.setActif(true)">✅ Activer le pointage en ligne</button>
      <button class="btn btn-reset" ${!actif || busy ? "disabled" : ""} onclick="PointageToggle.setActif(false)">⛔ Désactiver le pointage en ligne</button>
      <div style="margin-top:8px; font-size:0.8rem; color:var(--text-muted);">État actuel : ${actif ? "activé ✅" : "désactivé ⛔"}</div>
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
      renderContent(actif);
      renderAdminControls(actif, false);
      setStatus(actif ? "🟢 Pointage en ligne activé" : "⚪ Pointage en ligne désactivé — présence enregistrée par QR code");
    } catch (e) {
      if (seq !== requestSeq) return;
      setStatus("⚠️ Impossible de vérifier l'état du pointage : " + e.message, true);
      renderContent(false);
    }
  }

  async function setActif(value) {
    renderAdminControls(value, true);
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

  window.PointageToggle = { toggleAdmin, setActif };
  document.addEventListener("DOMContentLoaded", load);
})();
