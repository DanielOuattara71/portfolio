# Admin · Étape 10 — Rapport de tests et audit de sécurité

> Livrable du **Prompt 10** de [admin_portfolio.md](../../admin_portfolio.md) (module 11 du plan). Consolidation des tests des modules 1-10 + audit de sécurité et de cohérence rejoué le 2026-11-08.
> Règle : ce rapport décrit des faits testés ; il ne déclare pas le système « sécurisé » sur la seule base de tests automatisés (voir les contrôles manuels restants).

## 1. Rapport de tests

### 1.1 Synthèse par module (détail dans [09-developpement.md](09-developpement.md))

| Module | Vérifié par scénarios HTTP via le vrai proxy / HTML servi | Résultat |
|---|---|---|
| 1 Initialisation | typecheck, build admin, import ×2 (51 créés puis 0), `/api/health`, en-têtes admin, navigateur (1440 + 390 px) | ✅ |
| 2 Auth, sessions, journal | 36/36 API + 17/17 navigateur (TOTP réel, verrous, révocations, chaîne) | ✅ |
| 3 Site sur API | parité 20/20 pages FR/EN + sitemap, cache 60 s, 503 repli | ✅ |
| 4 Médiathèque | 33/35 + 2 corrections (EXIF retirés, types réels, doublons, corbeille) | ✅ |
| 5 Paramètres + workflow | 52/52 + 13/13 extérieurs + 8/8 rôles (409, 🔐, CV, contact fermé, revalidation) | ✅ |
| 6 Projets | 67/67 + 12/12 rôles (cycle de vie complet, aperçu jeton, 301) | ✅ |
| 7 Textes/compétences/parcours | 36/36 (13 blocs, justificatifs privés, bilingue) | ✅ |
| 8 Inbox | 31/31 + purge 1/1 (limite en base, lecteur = compteur) | ✅ |
| 9 Traductions/SEO/dashboard | 22/22 (réels comptes, repli i18n) | ✅ |
| 10 Surveillance/sauvegardes | 22/22 + 5/5 + 5/5 + 4/4 (sondes, 5 règles d'alerte, sauvegarde chiffrée, **restauration complète en Docker**) | ✅ |
| 11 Audit (ce document) | 46/50 + 6/6 uploads + corrections ci-dessous | ✅ |

Totaux module 11 (scénarios rejoués le 2026-11-08, compte de test + TOTP réel, API/site/admin réels) :

| Catégorie (Prompt 10) | Tests | Résultat |
|---|---|---|
| Authentification et déconnexion, gestion des sessions | connexion + TOTP, `/me` sans fuite (clés : `user`, `permissions`, `mfaSetupRequired`, `session`), 2 sessions, révocation de l'autre (204, **déconnectée 401**), révocation de la session courante refusée (409), session expirée forcée en base refusée (401) | 7/7 |
| Création/modification des projets, publication/dépublication | création `PRJ-NN` 201, édition 200 (422 propre si document invalide), publication 200, dépublication 200, archivage 200, suppression 204, puis 404 | 6/6 |
| Modification des textes | édition + publication d'un bloc, versions ≥ 2, restauration v1, republication 200 | 4/4 |
| Upload des images | corps invalide → 400 `request.invalid` (correction, voir §3), `image/svg+xml` annoncé → 400, taille annoncée excessive → 4xx, init valide → 201 + lien signé, PUT → 200, fichier texte déguisé → 422 (vrai type) | 6/6 |
| Traductions | couvertes au module 9 (`totalMissing`, détection par champ) | module 9 |
| Gestion des paramètres | module 5 : 52/52 (consultation, édition, publication 🔐, CV, contact fermé, revalidation immédiate) | module 5 |
| Prévisualisation | jeton 201, `GET /public/preview` 200 avec brouillon, bandeau, `noindex`, `no-store` | 2/2 |
| Journalisation | `audit_log` en ajout seulement (UPDATE **et** DELETE refusés par déclencheur, y compris `TRUNCATE`), chaîne intègre (105 événements), aucune valeur de secret dans le journal (seul `method: "password"` figure, jamais le mot de passe) | 4/4 |
| Sécurité : accès non autorisé | sans session 401 ; direct sans proxy 403 (routes admin **et** monitoring) | 3/3 |
| Sécurité : contournement des permissions | modules 5-6 : lecteur/éditeur refusés (403) sur paramètres, écriture, publication ; lecteur inbox = compteur seul | modules 5-6 |
| Sécurité : tentatives répétées | 5 échecs → verrouillage (le bon mot de passe est refusé pendant 15 min), compteur en base (valable sur Vercel) | 2/2 |
| Sécurité : CSRF | POST sans `Origin` 403, avec une origine étrangère 403 | 2/2 |
| Sécurité : XSS | projet `<script>alert(1)</script>` : stocké, **échappé sur le site** (`&lt;script&gt;`), jamais interprété ; messages de contact affichés `{{ }}` brut (module 8) | 1/1 |
| Sécurité : validation des fichiers | **re-testée, voir ci-dessus (6/6)** | ✅ |
| Sécurité : sessions expirées | forcée expirée en base → 401 ; rappel : 2 h d'inactivité, 7 jours absolus (module 2) | 1/1 |
| Sécurité : ressources privées | traversée de chemin `/media/../` → 404 ; médias non publics non téléchargeables publiquement ; aperçu privé = session requise (module 4) | 2/2 |
| Sécurité : exposition de données sensibles | `/me` sans hash ni secret ; journal sans mot de passe/code/cookie/jeton ; sauvegardes chiffrées (zéro texte en clair, vérifié) | 3/3 |
| Surveillance | sondes 4 cibles, alertes (5 règles tirent), incidents + historique, état des sauvegardes, **restauration réussie en Docker** | module 10 |
| Cohérence admin → site | publication → visible sur `/projets` et page cas (après cache 60 s, voir §3.3), dépublication → retiré, bloc → visible sur la page, restauration → texte d'origine | 3/4* |

\* 1 test a échoué pour une raison de test (cache 60 s + revalidation envoyée sur le port d'un autre projet de cette machine) : le mécanisme a été re-vérifié au module 7 avec la revalidation en place, et revérifié ici au premier chargement froid (voir §3.3).

### 1.2 Vérifications finales

- `pnpm typecheck` : **5/5** (`api`, `web`, `admin`, `shared`, `design-tokens`).
- `pnpm build` : **3/3** (sorties `.output` régénérées à 11:17 le 2026-11-08).
- Parité du contenu public **identique avant/après tout l'audit** (projets, blocs, compétences, domaines, services, étapes, parcours, paramètres, médias).
- Données de test supprimées : compte, sessions, `login_attempt`, `rate_limit`, sondes, alertes, incidents, notes, sauvegardes + fichiers `.backups`, médias temporaires + fichiers, journal (132 événements de test).
- Base de test finale : 67 éléments de contenu, 68 versions, 0 compte, 0 média, 0 message, 0 journal.
- Aucun test navigateur Chrome mené (aucun Chrome installé dans cet environnement) : vérifié par scénarios HTTP via le proxy et HTML servi.

## 2. Rapport de sécurité

### Constatations confirmées OK (ce qui résiste à l'audit)

| Domaine | Preuve |
|---|---|
| Accès direct à l'API impossible | `/api/*` sans secret de proxy → 403, y compris les routes de monitoring |
| CSRF | `Origin` obligatoire et égal à l'origine admin sur toute requête d'écriture (Better Auth + routes admin) |
| Verrouillage | 5 échecs / compte ou 20 / IP en 15 min → blocage ; compteurs en base ; second facteur verrouillé aussi |
| Énumération des comptes | même réponse pour compte inconnu et mot de passe erroné ; même message mot de passe oublié |
| Journal infalsifiable localement | déclencheurs d'ajout seulement, `UPDATE`/`DELETE`/`TRUNCATE` refusés ; chaîne SHA-256 intègre |
| Fichiers | vrai type lu dans le fichier, taille réelle revérifiée, EXIF/GPS retirés, WebP limité (jamais agrandi), doublon détecté, corbeille 30 jours, fichiers jamais écrasés |
| Session | cookie `HttpOnly`/`SameSite=Lax`/`Secure` en HTTPS, 2 h d'inactivité, 7 jours absolus, révocable, Révocation totale à la restauration |
| Sauvegardes | AES-256-GCM + SHA-256 + relecture ; aucune route de téléchargement ; restauration = vérification → sauvegarde de sécurité → 1 transaction → sessions révoquées ; échec = annulation totale (observé) |
| Alertes | 10 échecs/compte ou 20/IP (1 h), 10 × 5xx (5 min, comptées en direct), 2 sondes d'affilée (+ email de rétablissement), sauvegarde absente/échouée (36 h), 2FA désactivée, chaîne rompue ; email ≤ 1/h par règle ; critique → incident auto |
| Sentry | site + admin + API, sans IP ni données personnelles (`beforeSend` retire user/cookies), traçage désactivé |

## 3. Liste des anomalies et corrections (module 11)

### 3.1 Corrigé — erreurs de validation → 500 au lieu de 400
Quatre routeurs n'avaient pas de `defaultHook` (`mediaRoutes`, `securityRoutes`, `internalRoutes`, `publicContentRoutes`) : toute requête invalide (corps Zod non conforme) levait une exception → **500 `internal.error`** au lieu d'un **400 `request.invalid`**. Corrigé en ajoutant le même `defaultHook` RFC 9457 que les autres routeurs. Re-testé : corps invalide → 400, `image/svg+xml` annoncé → 400, taille excessive → 400, fichier déguisé → 422 (vrai type). `pnpm typecheck` 5/5, `pnpm build` 3/3.

### 3.2 Corrigé — `db:seed --replace` cassé (reporté depuis le module 5)
`delete from content_item` violait la clé `content_ref_ref_item_id_content_item_id_fk` dès que des références existaient. Corrigé : suppressions dans l'ordre FK-safe (`contentRefs` → `contentSlugs` → `redirects` → `contentVersions` → `contentItems`). Vérifié sur une base éphémère : `db:seed` puis `db:seed --replace` → 51 éléments, 51 versions, 23 références recréés ; base éphémère supprimée.

### 3.3 Artefact de test (pas un bug) — cache du site 60 s
Les tests de cohérence « publication → visible immédiatement » échouent sur cette machine : la revalidation (`SITE_REVALIDATE_URL`) pointe vers `localhost:3000`, un autre projet qui y écoute, pas le site de test (port 3100). Le cache mémoire de 60 s (qui renvoie la version **précédente** une fois sur la requête suivant l'expiration, puis rafraîchit) produit donc une page « en retard » d'une requête. Le mécanisme lui-même a été prouvé au module 7 (revalidation effective : `siteRefreshed: ok`, visible immédiatement) ; en production, sur Vercel, l'appel n'atteint qu'une instance, les autres se rafraîchissent sous 60 s (limite connue conservée).

### 3.4 Artefact de test — alertes email inactives en dev
Les emails d'alerte (et « nouvelle connexion ») ne partent pas faute d'email publié dans Paramètres et de Resend : les alertes restent visibles et journalisées dans l'admin, l'envoi est imprimé en console en dev et échoue bruyamment en production. **À configurer avant la mise en ligne** (voir [13-procedures.md](13-procedures.md)).

### 3.5 Sans suite (vérifié sain par l'audit)
- Articles : aucun module « articles » ne figure dans le périmètre (les projets sont les seuls contenus éditoriaux à cycle de vie) — section du Prompt 10 sans objet ici.
- Changement de rôle : aucune route ne le permet pour l'instant (création par script CLI) ; l'alerte dédiée reste à brancher le jour où la route existera.

## 4. Contrôles manuels restants (à faire en production)

1. **En-têtes en production** : vérifier `Strict-Transport-Security`, `X-Frame-Options`, `Content-Security-Policy` et `X-Robots-Tag` servis par Vercel (sauf l'envoi en mode rapport d'abord, voir procédure).
2. **Perte du téléphone de double authentification** : les 10 codes de secours chiffrés en base sont la première recours ; sinon, procédure de récupération avec accès à la base (voir [12-documentation-utilisateur.md](12-documentation-utilisateur.md)).
3. **Fichiers piégés** : fichiers malveillants subtiles (polyglottes, PDF piégés) — la ré-encodage `sharp` neutralise les images ; un PDF piégé reste à vérifier visuellement à l'import.
4. **Absence de secrets dans les journaux Vercel** : vérifier qu'aucune variable d'environnement ne fuite dans les logs des fonctions.
5. **Cloudinary réel** : envoi signé multipart, copie publique, dépôt des sauvegardes sous `backups/` — testé le 2026-11-08 contre le cloud `amtflrwz` (6/6) ; régénérer le secret (exposé en conversation) avant Vercel
   *(Mis à jour depuis le remplacement R2 → Cloudinary, voir le journal de développement.)*
6. **Resend** : domaine d'envoi + réception réelle des emails (alertes, mot de passe, nouvelle connexion).
7. **Neon** : base `main` + rôle `app` **sans `UPDATE`/`DELETE` sur `audit_log`** (usine à gaz locale : le rôle propriétaire peut contourner les déclencheurs).
8. **Upstash QStash** : planificateurs (sondes 5 min, sauvegarde + maintenance quotidiennes) avec les clés de signature ; le script local ne couvre que le dev.
9. **Essai de restauration en production** : sur la dernière sauvegarde mensuelle, après la mise en ligne puis chaque mois (le tableau de bord affiche « non vérifiées » tant qu'aucun essai ne réussit).
10. **Lighthouse en production** (les mesures locales sont bruitées) et **audit des animations** (étape 18 de `prompt_workflow.md`, à mesurer sur Vercel).

## 5. Fichiers de ce module

| Fichier | Rôle |
|---|---|
| `apps/api/src/routes/admin/{media,security}.ts`, `public/content.ts`, `routes/internal.ts` | `defaultHook` 400 `request.invalid` ajouté |
| `apps/api/src/scripts/import-seed.ts` | `--replace` en ordre FK-safe |
| `docs/admin/10-rapport-tests-securite.md` (celui-ci) | rapports de tests et de sécurité, anomalies, contrôles manuels |
| `docs/admin/11-documentation-technique.md` | documentation technique |
| `docs/admin/12-documentation-utilisateur.md` | documentation utilisateur, en français |
| `docs/admin/13-procedures.md` | procédures : sauvegarde/restauration, déploiement, rotation des secrets |
| `docs/admin/09-developpement.md` | journal de développement (module 11) |
