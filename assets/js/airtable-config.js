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
  token: "COLLEZ_VOTRE_TOKEN_ICI",
  baseId: "app3oF7VSf5Gqym0t",
  tableId: "tblmvsfP18ytKLdba",
};

/* Mot de passe pour activer le mode Admin (saisie des scores) sur les
   pages de tournoi. Changez-le si vous voulez. */
window.ADMIN_PASSWORD = "abbaye2027";
