# Guide — Site Maison Abbaye 2026-2027

Ce document explique comment fonctionne le site, comment le mettre en ligne,
et comment demander des modifications à l'avenir.

## 1. Comment ça marche

- **Aucune base de données à installer** : les pages sont de simples fichiers
  HTML/CSS/JS. Vous n'avez rien à "coder" — vous demandez une modification
  dans une conversation avec Claude Code (comme celle-ci), et le fichier est
  modifié directement.
- **Les résultats de tournois** sont stockés dans Airtable (base "Maison
  Abbaye - Tournois 2026-2027"), pas dans le navigateur. Résultat : un score
  saisi en mode Admin est visible instantanément par tous les visiteurs, sur
  n'importe quel appareil — c'est ce qui manquait à la version précédente.

## 2. Structure des fichiers

```
index.html                 → page d'accueil
reglement-abbaye.html       → Règlement Abbaye
calendrier.html              → Calendrier annuel des tournois
cafe-des-idees.html          → Café des Idées
conseil-de-maison.html       → Conseil de maison
tournois/
  football/index.html        → page interactive du tournoi (résultats + classement)
  football/reglement.html    → sous-page
  football/buteurs.html      → sous-page
  football/cartons-sanctions.html
  basketball/index.html, reglement.html, equipes.html
  billard/index.html
  echecs/index.html, reglement.html
  babyfoot/index.html
  poker/index.html
  jeuxvideo/index.html
  flechettes/index.html
assets/
  css/style.css               → tout le design du site (une seule feuille de style)
  js/site.js                  → menu de navigation + pied de page (partagés)
  js/tournoi.js                → moteur des pages de tournoi (connecté à Airtable)
  js/airtable-config.js        → identifiants Airtable + mot de passe admin
  img/                          → logos et photos
```

Pour ajouter une page, un tournoi ou une photo : dites-le simplement à Claude
Code, en précisant où et quoi. Vous n'avez pas besoin de connaître cette
structure par cœur — elle sert de référence si vous êtes curieux.

## 3. Étape à faire une seule fois : connecter Airtable

Le fichier `assets/js/airtable-config.js` contient un `token` à renseigner :

1. Allez sur https://airtable.com/create/tokens (connectez-vous avec le
   compte Airtable déjà utilisé pour créer la base "Maison Abbaye - Tournois
   2026-2027").
2. Cliquez sur "Create token".
3. Scopes à cocher : `data.records:read` et `data.records:write`.
4. Access : sélectionnez uniquement la base "Maison Abbaye - Tournois
   2026-2027" (pas tout votre compte).
5. Créez le token, copiez-le (il commence par `pat...`).
6. Ouvrez `assets/js/airtable-config.js` et remplacez
   `"COLLEZ_VOTRE_TOKEN_ICI"` par ce token. Vous pouvez aussi me le donner
   dans une conversation Claude Code et je le collerai pour vous.

Tant que ce token n'est pas renseigné, les pages de tournoi affichent un
message d'avertissement clair au lieu de scores — c'est normal et volontaire,
pas un bug.

**Mot de passe Admin** (pour saisir des scores) : `abbaye2027` par défaut,
modifiable dans le même fichier (`window.ADMIN_PASSWORD`).

## 4. Mettre le site en ligne (GitHub Pages)

1. Créez un compte gratuit sur https://github.com si vous n'en avez pas.
2. Créez un nouveau dépôt (repository) vide, par exemple nommé
   `site-abbaye-2026-2027`. Ne cochez aucune case d'initialisation (pas de
   README ni de licence).
3. Donnez-moi le nom du dépôt (et votre nom d'utilisateur GitHub) ; je
   connecterai ce dossier local au dépôt et publierai le site.
4. Dans les paramètres du dépôt GitHub (`Settings` → `Pages`), choisissez la
   branche `main` comme source. GitHub vous donnera une adresse du type
   `https://<votre-nom>.github.io/site-abbaye-2026-2027/`.
5. Pour toute mise à jour future : vous me demandez la modification, je
   l'applique, puis je pousse (`git push`) — le site en ligne se met à jour
   en 1 à 2 minutes.

## 5. Ajouter du contenu vous-même, au fil de l'année

Tout se fait en me le demandant simplement, par exemple :
- « Ajoute une page "Voyage scolaire" avec ce texte et ces photos »
- « Crée un tournoi de Pétanque avec le même système que les autres »
- « Change la photo d'accueil par celle-ci »
- « Le tournoi de Poker doit avoir une page Règlement, comme le foot »

Je fais la modification directement dans les fichiers et vous montre le
résultat avant de publier.

## 6. À propos du mot de passe Admin et du token Airtable

Comme pour le modèle proposé par Gemini, le mot de passe Admin et le token
Airtable sont visibles par toute personne qui inspecterait le code source de
la page (ce n'est pas une vraie sécurité, seulement un frein à la saisie
accidentelle). C'est adapté pour un usage interne (scores sportifs, non
sensibles). Ne réutilisez jamais ce token pour autre chose, et vous pouvez le
révoquer à tout moment depuis https://airtable.com/create/tokens.
