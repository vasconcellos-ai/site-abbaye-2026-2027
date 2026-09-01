/*
  Configuration Airtable — stockage partagé des résultats de tournois.

  Base créée : "Maison Abbaye - Tournois 2026-2027" (table "Rencontres").

  ÉTAPE À FAIRE PAR VOUS (une seule fois) :
  1. Allez sur https://airtable.com/create/tokens
  2. Créez un token avec :
     - Scopes : data.records:read et data.records:write
     - Access : uniquement la base "Maison Abbaye - Tournois 2026-2027"
  3. Copiez le token généré (il commence par "pat...") et collez-le
     ci-dessous à la place de "COLLEZ_VOTRE_TOKEN_ICI".

  ATTENTION : ce fichier est chargé par le navigateur de chaque visiteur du
  site, donc ce token est techniquement visible par quiconque regarde le
  code source de la page (comme le mot de passe admin ci-dessous). C'est
  sans risque pour un site interne de résultats sportifs, mais n'utilisez
  jamais ce même token ailleurs, et vous pouvez le révoquer/regénérer à
  tout moment depuis la page Airtable ci-dessus si besoin.
*/

window.AIRTABLE_CONFIG = {
  token: "patX1azwaNiFEDwk0.7de037225e8cc2b513352dab8df4c18a85770e91d2b0d6ea0fda6ab00900271a",
  baseId: "app3oF7VSf5Gqym0t",
  tableId: "tblmvsfP18ytKLdba",
};

/* Mot de passe pour activer le mode Admin (saisie des scores, activer/
   désactiver le pointage) sur les pages de tournoi et de pointage.
   Changez-le si vous voulez. */
window.ADMIN_PASSWORD = "abbaye2027";

/* Mot de passe donné aux élèves/AED pour débloquer les formulaires de
   pointage (Abbaye et Cantine) quand l'accès n'est pas ouvert à tous.
   Différent du mot de passe Admin ci-dessus. */
window.ACCESS_PASSWORD = "ABB27";
