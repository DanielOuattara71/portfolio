# Prompt de passation — Portfolio bilingue + espace d'administration

> **Destinataire : un agent IA de développement** qui reprend le projet en cours de route.
> Ce document est autonome. Lis-le en entier avant toute action, puis lis les fichiers indiqués dans « Lectures obligatoires ».
> Il décrit l'état réel du code au **2026-11-07**, puis la conception et le développement de **chaque module restant**, avec ses critères d'acceptation.

---

## 0. Ta mission et tes règles

Tu termines le portfolio personnel d'un Software & Data Engineer (Master 2 SIGL à l'ESATIC, orientation cloud et data engineering) :
- un **site public** bilingue FR/EN, déjà construit ;
- un **espace d'administration** privé, à moitié construit ;
- une **API**, qui relie les deux.

### Règles non négociables

1. **Ne jamais inventer de contenu personnel** : nom, email, dates, rôles, chiffres, résultats, liens, captures, clients. Une donnée inconnue reste `null` et la section correspondante est masquée sur le site. Les textes marqués « à valider » ne sont jamais publiés tant que l'utilisateur ne les a pas confirmés.
2. **Travailler module par module.** À la fin de chaque module :
   - présente les fichiers modifiés, ce qui fonctionne réellement, les tests faits et les limites ;
   - attends le « continue » de l'utilisateur avant le module suivant ;
   - ne déclare jamais une mesure de sécurité « effective » sans l'avoir testée.
3. **Parler à l'utilisateur en français, en le tutoyant**, simplement, sans jargon inutile. Commencer chaque compte rendu par le résultat. L'interface de l'admin est en français ; le site est en FR et EN.
4. **Ne pas pousser sur GitHub et ne pas créer de dépôt.** L'utilisateur le fera lui-même plus tard. Ne pas toucher au dépôt `github.com/DanielOuattara71/portfolio` déjà créé. Les commits locaux ne se font que sur demande.
5. **Ne jamais modifier le design du site public pour simplifier l'admin.** Toute valeur visuelle vient des design tokens (`var(--…)`) : aucune couleur ni durée codée en dur.
6. **Choix des dépendances** : prendre une version publiée depuis **au moins deux semaines**, et l'épingler exactement (`--save-exact`).
7. **Machine de l'utilisateur** : WSL Ubuntu, environ 4 Go de RAM. Lance au plus l'API et un front à la fois. Pour vérifier, préfère les builds (`node apps/*/.output/server/index.mjs`).
   - L'utilisateur fait parfois tourner son propre serveur `nuxt dev` du site (port 3000 ou 3001) et d'autres projets (`prince-edja-api`, `openclaw`) : **ne jamais tuer ses processus**.
   - Avec `pkill -f`, utilise un motif entre crochets (`"[o]utput/server/index.mjs"`) et **une seule commande `pkill` par appel shell**. Sinon le motif correspond à ta propre ligne de commande, qui se tue elle-même.
8. **Vérifier pour de vrai** : `pnpm typecheck`, builds, scénarios HTTP via le proxy de l'admin, tests navigateur (Chrome via puppeteer-core). Supprime ensuite les données de test : comptes, médias, journal (procédure au §3).

### Lectures obligatoires (dans cet ordre)

1. `AGENTS.md`, à la racine : faits techniques à jour, commandes, pièges.
2. `admin_portfolio.md` (cahier des charges de l'admin, 10 prompts) et `prompt_workflow.md` (site, 20 prompts).
3. `docs/admin/01` à `08` : audit, cahier fonctionnel, workflow, sécurité, surveillance, sauvegardes, maquettes, architecture. Tout y est **validé par l'utilisateur**.
4. `docs/admin/09-developpement.md` : journal de développement des modules 1 à 4 (ce qui est fait et testé).
5. `docs/06-architecture.md`, `docs/07-contenus.md`, `docs/11-architecture-technique.md`, `docs/17-optimisation.md` : décisions du site.
6. `docs/admin/07-maquettes-admin.html` : maquettes cliquables des 16 écrans de l'admin. C'est la **référence visuelle**.

---

## 1. Décisions déjà prises (ne pas les remettre en cause)

| Sujet | Décision |
|---|---|
| Positionnement | Recruteurs + clients freelance, télétravail international ; l'anglais compte autant que le français |
| Projets | 5 : Prince Edja (client, réalisé seul), Retrouve Moi, Gestion de livraison (stage Smart Innovation 7), Data Engineering (travaux pratiques), Portfolio & CMS (ce site) |
| Design | Direction « Index Studio » : papier chaud, encre, **orange #ff7a1a** (marqueur), **Poppins seule** (italique comprise) |
| Navigation du site | Ancres de l'accueil + page Contact. **Section Insights retirée** : pas de module Articles pour l'instant (modèle prêt pour plus tard) |
| Nom affiché | Inconnu tant qu'il n'est pas saisi : le site affiche « Software & Data Engineer » à la place (logo « / ») |
| Liens de projet | **Au moins un lien obligatoire pour publier un projet** (`projectLinksSchema`) ; les URL réelles seront saisies dans l'admin |
| Libellés d'interface | Restent dans `apps/web/i18n/locales/*.json`. **Seuls les textes éditoriaux** passent dans l'admin |
| Bilingue | Projets et textes du site : **les deux langues sont obligatoires pour publier** |
| Suppression d'un projet | Seulement s'il n'a jamais été publié, ou après archivage |
| Technologies d'un projet | Choisies parmi les compétences (clés de compétences) |
| Justificatifs | Privés par défaut |
| Messages de contact archivés | Supprimés après 12 mois |
| Paramètres (nom, email, CV) | Passent par brouillon → aperçu → publication, comme les contenus |
| Hébergement | Vercel (3 projets : site, admin, API), Postgres Neon, Cloudflare R2, Resend, Upstash (Redis + QStash), Sentry. **Déploiement via Vercel CLI** (pas de GitHub pour l'instant) |
| Stockage des médias | Local en développement ; R2 en production (pilote écrit, **pas encore testé**) |

---

## 2. Architecture et état du code

```
apps/web     Site public Nuxt 4 (SSR, i18n FR/EN, URL traduites). Lit le contenu PUBLIÉ via l'API.
apps/admin   Admin Nuxt 4 (ssr: false, port 3002, noindex). Parle à l'API par son propre /api/** (proxy).
apps/api     Hono + @hono/zod-openapi + Drizzle/Postgres + Better Auth 1.7.12 (port 8787).
packages/shared         Constantes, schémas Zod, permissions, types partagés (code source TS, pas de build).
packages/design-tokens  tokens.json → dist/tokens.css (+ motion). Couleurs warning/danger/info ajoutées pour l'admin.
```

### Fait et testé

| Étape | Contenu |
|---|---|
| Site, étapes 1 à 17 | Conception, design system, maquettes, développement des pages, optimisation (Lighthouse a11y/SEO 100) |
| Admin 01–08 | Spécifications validées |
| Module 1 | Tables de contenu versionné, import des contenus du site (51 contenus, 23 références), squelette de l'admin |
| Module 2 | Better Auth, double authentification obligatoire pour l'admin, sessions (2 h d'inactivité, 7 jours maximum), blocage après 5 échecs, proxy à secret, journal chaîné non modifiable, pages Connexion / Double authentification / Sessions / Journal / Mon compte |
| Module 3 | Le site lit `GET /public/content` (versions publiées seulement, champs « à valider » retirés), avec un cache de 60 s ; parité vérifiée sur 20 pages identiques |
| Module 4 | Médiathèque : envoi en 3 temps via un lien signé, vrai type vérifié, ré-encodage WebP sans EXIF, doublons, remplacement, corbeille, copies publiques uniquement pour les médias utilisés par un contenu publié |

### Module 5 commencé (code écrit et compilé, **ni branché ni testé**)

- `apps/api/src/services/content-rules.ts` : `extractRefs(type, doc)` (médias, compétences et projets utilisés) et `publishIssues(type, doc, pendingFields)` (règles de publication). Règles écrites pour l'instant : médias existants, type attendu, texte alternatif FR+EN, paramètres.
- `apps/api/src/services/workflow.ts` : workflow générique.
  - `itemView` (copie de travail, version publiée, état « modifié », problèmes bloquants) ;
  - `saveWorking` (contrôle de révision → 409, point de sauvegarde, 30 conservés) ;
  - `publish` (transaction verrouillée, adresses et redirections, références) ;
  - `discard`, `listVersions`, `restoreVersion` ;
  - `syncPublicMedia` (un média est public exactement tant qu'une version publiée l'utilise).
- `apps/api/src/services/revalidate.ts` : `revalidateSite()` appelle `SITE_REVALIDATE_URL` avec l'en-tête `x-revalidate-token`. **L'endpoint côté site n'existe pas encore.**
- `GET /public/content` renvoie désormais `media` : `{ [id]: PublicMedia }`, avec les URL des copies publiques des médias utilisés.
- `packages/shared/src/content.ts` contient `PublicMedia`, `PublishedContent.media` et `PublishIssue`.

### Modèle de données (rappel)

| Table | Rôle |
|---|---|
| `content_item` | Une ligne par contenu (`type` parmi settings, block, project, skill, domain, service, step, experience, education, certification ; `key` ; `position` ; `status` ; `featured` ; `working` jsonb ; `working_revision` ; `published_version_id` ; `pending_fields`) |
| `content_version` | Instantanés : `import`, `checkpoint`, `published`, `restored` |
| `content_slug`, `redirect` | Adresses publiées par langue ; anciennes adresses → 301 |
| `content_ref` | Ce que chaque côté (copie de travail / version publiée) utilise ; bloque les suppressions |
| `media` | Médiathèque (voir module 4) |
| `user`, `session`, `account`, `verification`, `two_factor`, `rate_limit` | Better Auth ; `user.role` vaut admin, editor ou viewer |
| `audit_log` | Ajout seulement (déclencheur), empreinte SHA-256 chaînée ; écriture par `services/audit.ts` |
| `login_attempt` | Conservé 90 jours |
| `contact_messages` | Formulaire de contact (existant) |

Schémas des documents : `packages/shared/src/content.ts` (`contentDocSchema(type, key)` valide les **brouillons**). Droits : `packages/shared/src/permissions.ts` (`can(role, permission)`).

### Conventions de code à respecter

- **API**
  - routes `/api/admin/*` : `requireSession()` puis `requirePermission('…')` (`apps/api/src/middleware/admin.ts`) ;
  - erreurs au format RFC 9457 via `problem(c, status, code, title, detail)` ;
  - chaque route est déclarée avec `createRoute` (OpenAPI) et des schémas Zod ;
  - chaque action notable est inscrite au journal par `audit({...})` : jamais de secret ni de corps de message.
- **Sécurité**
  - le proxy de l'admin ajoute `x-admin-proxy` (secret) et `x-admin-client-ip` ;
  - `originGuard` refuse toute écriture dont l'`Origin` n'est pas celle de l'admin ;
  - les opérations sensibles 🔐 exigent une **session de moins de 10 minutes** (à implémenter au module 5, voir plus bas).
- **Admin**
  - classes utilitaires dans `apps/admin/app/assets/admin.css` (`.panel`, `.btn`, `.chip.ok|warn|crit|info`, `.alert`, `.tw` + `table`, `.field`, `.inp`, `.seg`, `.list`, `.sk`) ;
  - navigation dans `composables/useNav.ts` (`ready: true` quand un module est livré) ;
  - `$fetch<Type>()` toujours typé explicitement : sinon Nuxt plante sur l'inférence des URL dynamiques (« Excessive stack depth ») ;
  - **jamais `structuredClone` sur un objet réactif de Vue.**
- **Site**
  - composables `useContent.ts`, `useHomeContent.ts`, `useSite.ts` alimentés par `usePublished()` ;
  - les formes de données ne changent pas, donc les composants non plus ;
  - textes d'interface dans `i18n/locales`.
- **Tests HTTP** : appeler l'admin sur `http://localhost:3002` avec un en-tête `origin` et les cookies. Les secrets TOTP sont **chiffrés en base** : pour un test navigateur, configure la double authentification via l'interface et lis la clé affichée (`.secret`).

### Nettoyage après tests (base locale)

```sql
begin;
delete from content_ref where ref_media_id is not null;  -- seulement si tu as créé des médias de test
delete from media;
alter table "user" disable trigger user_keep_one_admin; delete from "user"; alter table "user" enable trigger user_keep_one_admin;
delete from login_attempt; delete from rate_limit; delete from verification;
set local app.audit_purge = 'on'; delete from audit_log;
commit;
```

Supprime aussi `apps/api/.storage/`, et restaure tout contenu modifié pour un test (re-pointer `published_version_id`, `working` = données de la version 1).

---

## 3. Modules restants — conception et développement

Chaque module se termine par :
- une section ajoutée à `docs/admin/09-developpement.md` (fichiers, règles, tests, limites) ;
- la mise à jour d'`AGENTS.md` si de nouveaux faits techniques apparaissent ;
- le passage à `ready: true` des éléments de navigation concernés ;
- un compte rendu court à l'utilisateur.

### Module 5 — Paramètres (+ socle du workflow)

**Objectif** : l'utilisateur saisit son nom, ses initiales, sa photo, son email, ses réseaux, ses CV FR/EN et sa disponibilité. Il prévisualise, puis publie. Le site les affiche aussitôt.

**API**

1. **Routes génériques de contenu** (réutilisées aux modules 6 et 7), toutes sous `requireSession()` :
   - `GET /api/admin/content/by-key/{type}/{key}` et `GET /api/admin/content/{id}` → `itemView` ;
   - `PUT /api/admin/content/{id}/working` `{ revision, data, checkpoint? }` → `saveWorking` (409 `content.conflict` si la révision diffère) ;
   - `POST /api/admin/content/{id}/publish` `{ revision }` → `publish` (422 `publish.blocked` avec la liste `issues`) ;
   - `POST /api/admin/content/{id}/discard` ;
   - `GET /api/admin/content/{id}/versions` ;
   - `POST /api/admin/content/{id}/versions/{n}/restore`.
2. **Droits par type** :
   - `settings` exige `settings.update` pour écrire et publier ;
   - les autres types exigent `content.write` pour écrire et `content.publish` pour publier ; un éditeur peut seulement « soumettre en révision ».
3. **Vérification d'identité récente** (🔐) : middleware `requireFreshSession(10 min)`, basé sur `session.createdAt`. Au-delà, réponse 403 `auth.reauth_required`. Le client affiche alors une fenêtre « Confirme ton identité » (mot de passe, puis code TOTP via `signIn.email` + `twoFactor.verifyTotp`, ce qui crée une session neuve), puis rejoue l'action. S'applique à la publication des paramètres.
4. **Journal** : `content.saved` (point de sauvegarde), `content.published` (avec numéro de version), `content.discarded`, `content.version_restored`, `content.publish_blocked`.
5. **`POST /public/contact`** : refuser avec 503 `contact.closed` si `settings.contactOpen` vaut false dans la version publiée.

**Site public**

- **Rafraîchissement immédiat** : endpoint `apps/web/server/api/_revalidate.post.ts`.
  - Il vérifie `x-revalidate-token` contre `runtimeConfig.revalidateToken` (`NUXT_REVALIDATE_TOKEN`).
  - Il vide le cache de `getPublishedContent`. Remplace `defineCachedFunction` par un petit cache mémoire maison avec `invalidate()` : la requête suivante attend le contenu frais et retombe sur l'ancien si l'API ne répond pas.
  - Côté API : `SITE_REVALIDATE_URL` et `REVALIDATE_TOKEN`.
  - Limite à documenter : sur Vercel, l'appel n'atteint qu'une instance ; les autres se rafraîchissent en 60 s.
- **`useSite()`** :
  - `cvUrl` = `media[cv[lc]].file` ;
  - `photo` = { `src` : variante de 960 px, `srcset`, `alt` : `alt[lc]` } ;
  - `availability` = texte publié s'il existe, sinon libellé i18n.
- **Affichage** : la photo dans `PortraitStack` (prop `photoUrl`, passée par `Hero.vue`) et dans `UiPortrait` sur `/profil`. La boîte « Disponibilité » de `/contact` affiche le vrai état, sans texte forcé.
- **Routes `/fr/cv` et `/en/cv`** (route serveur Nitro) : redirection 302 vers le PDF publié de la langue, sinon 404.
- **Contact fermé** : si `contactOpen` est false, la page Contact affiche un message à la place du formulaire (textes i18n FR/EN à ajouter).

**Admin**

- Page `pages/parametres.vue`, d'après la maquette « Paramètres » :
  - **Identité** : nom, initiales (1 à 3 majuscules), photo ;
  - **Contact** : email, réseaux (liste ordonnable, libellé + URL `https`, 8 au maximum), formulaire ouvert ou fermé ;
  - **CV** : FR, EN ;
  - **Disponibilité** : interrupteur, textes FR/EN, fuseau, ville.
- Ne pas exposer `defaultLocale` tant que le site ne l'applique pas dynamiquement (redirection `/` codée dans `nuxt.config`). Le documenter.
- Composant réutilisable **`MediaPicker`** : fenêtre qui liste la médiathèque filtrée par type (image ou PDF), avec recherche et import direct. Il servira aussi aux projets.
- **Barre d'état** :
  - chip Brouillon / Publié / Publié · modifié ;
  - « Enregistré il y a X s » ;
  - boutons Enregistrer, Abandonner (avec confirmation), Historique (liste des versions, restaurer → copie de travail) et Publier.
- **Liste « Avant publication »** : problèmes renvoyés par `issues`, chacun relié à son champ.
- **Aperçu local** (le vrai aperçu sur le site arrive au module 6) : logo, grand nom du Hero, signature du pied de page, rendus avec les mêmes règles que `useDisplayName()`.
- **Enregistrement automatique** : 3 s après la dernière frappe, sur le serveur, sans point de sauvegarde. Gérer le 409 : proposer de recharger ou de comparer, sans rien écraser.

**Critères d'acceptation**
- Saisir un nom et le publier → en moins d'1 s (rafraîchissement) et au plus 60 s, le logo, le Hero, le pied de page, les titres des pages et les données structurées `Person` affichent le nom. Vérifier aussi qu'un brouillon non publié ne change rien.
- Choisir une photo sans texte alternatif → publication refusée avec un message clair. Après l'ajout des textes alternatifs, la publication réussit. La photo devient publique (`is_public`) et s'affiche sur `/fr` et `/fr/profil` ; si on la retire puis republie, elle redevient privée.
- `/fr/cv` et `/en/cv` redirigent vers le bon PDF.
- Une publication de plus de 10 minutes après la connexion déclenche la vérification d'identité.
- Un éditeur ou un lecteur reçoit 403 sur les paramètres.
- Restaurer une version produit une copie de travail, pas une publication.
- Parité : avec des paramètres vides, le site reste identique à aujourd'hui (réutiliser le script de comparaison des 20 pages).

### Module 6 — Projets et workflow complet

**Objectif** : gérer les 5 projets et en créer d'autres, avec tout le workflow de l'étape 03 et le vrai aperçu sur le site.

**API**
- **Liste** : `GET /api/admin/content?type=project&status&q`, avec l'état modifié, les langues complètes, le nombre de liens et `featured`.
- **Création** : `POST /api/admin/content` `{ type: 'project' }`. Elle attribue `PRJ-NN` (numéro suivant, jamais réutilisé) et crée une copie de travail vide **valide** (chaînes vides, listes vides, `seo` par défaut), en brouillon.
- **Autres actions** :
  - `PUT /api/admin/content/order` `{ type, ids[] }` ;
  - `PATCH …/{id}/featured` ;
  - `POST …/{id}/duplicate` ;
  - `POST …/{id}/submit` (en révision) ;
  - `POST …/{id}/unpublish` ;
  - `POST …/{id}/archive` et `…/unarchive` (archiver retire la version publiée et rafraîchit le site) ;
  - `DELETE …/{id}` : 409 si le projet a été publié et n'est pas archivé, ou s'il est référencé par un service ou une expérience ; confirmation par saisie du nom côté client ; nouvelle vérification d'identité.
- **Comparaison** : `GET …/{id}/diff?from=working|published|vN&to=…`, différences champ par champ et langue par langue.
- **Aperçu** : `POST …/{id}/preview-token` renvoie un jeton signé (HMAC), valable 30 min, lié à l'utilisateur. `GET /public/preview/{token}` renvoie le **document de travail** au même format que `/public/content`, avec les champs « à valider » visibles mais marqués.
- **Règles de publication**, à compléter dans `publishIssues` pour `project` :
  - nom, adresse (slug), type, accroche et description en FR **et** EN ;
  - contexte et au moins un domaine ;
  - **au moins un lien `https`** ;
  - adresses uniques par langue (requête sur `content_slug` en excluant le projet lui-même) ;
  - technologies présentes dans les compétences ;
  - images existantes avec textes alternatifs ;
  - aucun champ « à valider » restant.
  - Bouton « Confirmer ce texte » : `POST …/{id}/confirm-field` `{ path }`, qui retire le chemin de `pending_fields` (journalisé).

**Site public**
- **Images** :
  - `cover` = URL de la variante publique adaptée, avec `srcset` (480/960/1600/2400) ;
  - galerie depuis `gallery` + `media` ;
  - textes alternatifs par langue ;
  - les images ont déjà `loading="lazy"` et `decoding="async"` ; utiliser `fetchpriority="high"` sur la couverture.
- **Liens** : ils s'affichent déjà dans l'étude de cas (`project.links`).
- **Anciennes adresses** : ajouter `redirects` au contenu publié (ou une route `GET /public/redirects`) ; le site renvoie une 301 depuis l'ancien slug vers le nouveau. Un projet supprimé ou archivé → 404 (410 si supprimé, enregistré au journal).
- **Mode aperçu** : `/fr/projets/{slug}?apercu={token}` (et l'équivalent EN) charge `/public/preview/{token}` côté serveur, avec un bandeau « Aperçu — non publié », `noindex` et sans cache.

**Admin**
- **Liste** `pages/projets/index.vue`, d'après la maquette : tableau, filtres par statut, recherche, glisser-déposer accessible au clavier pour l'ordre, interrupteur « Accueil », chip « aucun lien ».
- **Formulaire** `pages/projets/[id].vue`, onglets Général / Étude de cas / Médias / Liens / SEO / Historique :
  - **édition côte à côte FR | EN** ;
  - indicateur de complétude par langue ;
  - liste « Avant publication » à droite ;
  - zone sensible : Dépublier / Archiver / Supprimer.
- **Format des textes** : garder la **forme actuelle des documents** (chaînes et listes de paragraphes), car le site les affiche telles quelles. Un éditeur riche (TipTap, JSON nettoyé côté serveur) n'est à ajouter **que si l'utilisateur le demande** : pose-lui la question en début de module.
- Comparaison (affichage des différences), historique et restauration, aperçu (ouvre le site dans un nouvel onglet avec le jeton).

**Critères d'acceptation**
- Créer un projet complet, le publier, le voir sur `/fr/projets`, `/en/projects`, l'accueil (s'il est mis en avant), la page Expertise (compteurs des compétences) et le sitemap.
- Changer son slug → l'ancienne URL renvoie 301 vers la nouvelle.
- Publication refusée sans lien, sans texte EN ou avec un champ « à valider ».
- Dépublier → 404 et retrait du sitemap.
- Deux onglets en conflit → 409 sans perte de données.
- Les images d'un projet publié deviennent publiques, et redeviennent privées s'il est dépublié et que plus rien ne les utilise.
- Lecteur : lecture seule. Éditeur : il soumet, il ne publie pas.

### Module 7 — Textes du site, compétences, parcours, services, méthode

**Blocs de texte** (`type = 'block'`) :
- Ajouter des schémas dans `BLOCK_SCHEMAS` pour :
  - `intro-projects`, `intro-profile`, `intro-services`, `intro-background`, `intro-approach`, `intro-expertise`, `intro-contact` ;
  - `band` (titre, mot mis en valeur, texte, libellés des types) ;
  - `footer` (phrase d'appel, mot mis en valeur, rôle, modes) ;
  - `legal` et `privacy` (texte riche simple : paragraphes et titres).
- Les **déplacer** depuis `apps/web/i18n/locales/*.json`. Repère les clés éditoriales dans `home.*`, `profilePage.*`, `expertisePage.*`, `contactPage.lead`, `projectsPage.lead`, `footer.*`. Les libellés de boutons et d'erreurs restent dans les fichiers de langue.
- Écrire un script d'import idempotent (comme `db:seed`), puis basculer le site sur les blocs publiés.
- Vérifier la **parité des 20 pages** avant et après.

**Pages légales** : les pages `/mentions-legales` et `/confidentialite` affichent les blocs publiés (`noindex` conservé). **Ne rien rédiger d'inventé**. Proposer un modèle de texte avec des champs `[À COMPLÉTER : éditeur, hébergeur Vercel Inc., contact…]`, et laisser l'utilisateur valider. La page Confidentialité doit mentionner les durées de conservation : messages 12 mois, journal 12 mois, tentatives de connexion 90 jours.

**Admin**
- **Textes du site** : liste des blocs à gauche, formulaire FR/EN à droite, choix des mots mis en valeur (2 au maximum par phrase, segments `accent: true`), aperçu du Hero.
- **Compétences** :
  - matrice par niveau (Pratiqué / Étudié / En exploration) : visible ou non, dans le ruban ou non, ordre ;
  - nombre de projets **calculé** ;
  - suppression refusée si une compétence est utilisée (liste des projets) ;
  - éditeur de tuile du ruban : tracé SVG Simple Icons, couleurs de fond et de logo, avec **contrôle de contraste ≥ 3:1** ; ou texte court.
- **Domaines** : 5, à traduire en EN (l'import a mis le même texte dans les deux langues).
- **Parcours** : expériences, formations et certifications, aux champs complets de l'étape 02 §F. Justificatifs privés par défaut. Le bloc « Certifications » est masqué sur le site tant qu'aucune n'est publiée.
- **Services** (projets liés choisis parmi les projets publiés) et **étapes de la méthode**.

**Critères d'acceptation** : parité avant/après la migration des textes ; chaque type se publie, se dépublie et se restaure, et apparaît sur le site.

### Module 8 — Boîte de réception

- **API** :
  - `GET /api/admin/messages?status&profile&type&locale` ;
  - `GET /api/admin/messages/{id}` (passe en « lu ») ;
  - `PATCH` du statut (nouveau, lu, répondu, archivé) ;
  - `DELETE` (droit `messages.delete`, nouvelle vérification d'identité) ;
  - colonnes `read_at`, `answered_at`, `archived_at` (migration).
- **Lecteur** : il voit uniquement le compteur, pas les coordonnées.
- **Notification** : email via `sendMail` à chaque nouveau message (`POST /public/contact`), vers l'email publié dans les Paramètres. Un échec d'envoi ne bloque jamais l'enregistrement du message ; il est journalisé.
- **Limite de débit** du formulaire de contact : passer de la mémoire à Upstash Redis (ou à la table `rate_limit`) pour fonctionner sur Vercel.
- **Admin** : liste et panneau de lecture d'après la maquette. Le message est affiché **comme texte brut**, jamais interprété. Bouton « Répondre » : affiche l'adresse à copier, avec un lien `mailto:`.
- **Purge** des messages archivés depuis plus de 12 mois : prévoir la fonction, appelée par la maintenance du module 10.
- **Critères d'acceptation** : un message envoyé depuis le site apparaît, notifié (en développement, l'email s'affiche dans la console de l'API) ; changement de statut ; suppression journalisée ; texte du type `<script>` affiché sans être exécuté.

### Module 9 — Traductions, SEO, tableau de bord

- **Traductions** : `GET /api/admin/translations`, qui renvoie pour chaque contenu les champs FR/EN manquants (calculés à partir des schémas : chaînes vides ou `null` dans une langue seulement). Page Traductions avec un lien vers chaque champ.
- **SEO**
  - utiliser le champ `seo` des projets (titre, description, image de partage, indexation) ;
  - blocs `seo-home`, `seo-projects`, `seo-profile`, `seo-expertise`, `seo-contact` pour les pages, en remplacement de `pages.*.description` dans i18n ; valeurs par défaut = textes actuels ;
  - `usePageSeo` lit ces valeurs, avec repli sur l'existant ;
  - aperçus Google et LinkedIn dans l'admin ;
  - le sitemap respecte « ne pas indexer ».
- **Tableau de bord** : `GET /api/admin/dashboard` avec des **chiffres réels uniquement** :
  - projets par état, blocs par état ;
  - liste « À compléter », calculée : nom vide, photo ou CV absents, projets sans lien, champs « à valider », images sans texte alternatif, traductions manquantes ;
  - messages non lus ;
  - 10 dernières actions du journal ;
  - état des services, alertes et dernière sauvegarde : « non disponible » tant que le module 10 n'existe pas.
- **Critères d'acceptation** : chaque chiffre est vérifiable par une requête SQL ; aucune valeur d'exemple.

### Module 10 — Surveillance, alertes, incidents, sauvegardes, maintenance

Spécifications : `docs/admin/05` et `06`.
- **Tables** : `service_check`, `alert`, `incident`, `incident_note`, `backup`.
- **Routes internes** `POST /internal/checks`, `/internal/backup`, `/internal/maintenance`, protégées par la **signature QStash**. En développement, un script local les déclenche.
- **Sondes** toutes les 5 min : site, `/health` de l'API, base (`select 1`), stockage (lecture d'un fichier témoin). On enregistre le code, la durée et l'erreur.
- **Alertes**, envoyées par email (Resend) et affichées dans l'admin, une par heure au maximum pour une même alerte :
  - 10 échecs de connexion en 1 h sur un compte, ou 20 depuis une même adresse ;
  - 10 erreurs 5xx en 5 min ;
  - 2 sondes en échec de suite ;
  - sauvegarde échouée ou absente depuis 36 h ;
  - changement de rôle, désactivation de la double authentification ;
  - chaîne du journal rompue.
  - Email « nouvelle connexion » depuis un appareil inconnu.
- **Incidents** : ouverts, pris en charge, résolus ; notes horodatées ; note de résolution obligatoire.
- **Sauvegarde** :
  - export JSON de toutes les tables dans une transaction en lecture seule ;
  - empreinte SHA-256, chiffrement AES-256-GCM (`BACKUP_ENCRYPTION_KEY`), envoi dans un dépôt R2 **privé** séparé (dossier local en développement) ;
  - **relecture et vérification** ;
  - historique ; conservation de 30 sauvegardes quotidiennes et 12 mensuelles.
- **Restauration** 🔐 : vérification d'abord, puis sauvegarde de l'état actuel, puis restauration en une transaction, puis sessions révoquées et site rafraîchi. Restauration partielle d'un seul contenu, rendu en brouillon.
- **Essai de restauration obligatoire** dans la base Docker locale ; tant qu'il n'a pas réussi, le tableau de bord affiche « non vérifiées ».
- **Maintenance quotidienne** :
  - purges : journal de plus de 12 mois via `audit_log_purge`, tentatives de plus de 90 jours, sessions expirées de plus de 30 jours, messages archivés de plus de 12 mois, corbeille des médias de plus de 30 jours (fichiers privés et publics), envois `uploading`/`failed` de plus d'1 h, anciens fichiers des médias remplacés (`replaced_keys`) ;
  - contrôle de la chaîne du journal.
- **Sentry** (site, admin, API), sans IP ni données personnelles.
- **Admin** : pages Sécurité et surveillance (sondes et courbes, alertes, incidents, intégrité) et Sauvegardes, d'après la maquette.

### Étape 10 de l'admin — Tests, audit de sécurité, documentation

Suivre `admin_portfolio.md`, Prompt 10.
- **Rapports** : tests, sécurité, anomalies, corrections.
- **Documentation** : technique, et **utilisateur en français** (comment publier, gérer les images, retrouver un compte perdu).
- **Procédures** : sauvegarde et restauration, déploiement, rotation des secrets.
- **Contrôles manuels restants** à lister : en-têtes en production, CSP, perte du téléphone de double authentification, fichiers piégés, absence de secrets dans les journaux Vercel.

### Site public — étapes 18 à 20 de `prompt_workflow.md`

- **18. Audit des animations** : intro, entrées du Hero, révélations, transitions, curseur, mobile. Respecter `docs/08-motion.md`. Réduire le temps de blocage au chargement sans dénaturer l'identité. Mesurer **sur Vercel**, car les mesures locales sont bruitées.
- **19. Tests fonctionnels complets** du site, avec les vrais contenus.
- **20. Mise en production** :
  - Neon : base `main` et rôle `app` **sans UPDATE ni DELETE sur `audit_log`** ;
  - migrations, puis `db:seed`, puis création de l'administrateur ;
  - 3 projets Vercel via la CLI ; réécriture `/api/*` de l'admin vers l'API ;
  - variables d'environnement (`.env.example` en donne la liste ; ajouter `SITE_REVALIDATE_URL`, `REVALIDATE_TOKEN`, `NUXT_REVALIDATE_TOKEN`, `BACKUP_ENCRYPTION_KEY`, `QSTASH_*`, `UPSTASH_*`, `SENTRY_DSN`) ;
  - R2 : deux dépôts, CORS du dépôt privé (PUT depuis l'origine de l'admin), domaine public, **et test réel du pilote R2** ;
  - Resend : domaine d'envoi ;
  - CSP en mode rapport, puis appliquée ;
  - Lighthouse en production ;
  - essai de restauration.

---

## 4. Ce que seul l'utilisateur peut fournir (le lui demander au bon moment, sans bloquer le reste)

- **Module 5** : nom, initiales, photo, email professionnel, liens LinkedIn et GitHub, CV FR et EN.
- **Module 6** : liens et captures des 5 projets, confirmation ou correction des textes « à valider », rôles, périodes et résultats vérifiables.
- **Module 7** : intitulé, dates, lieu et missions du stage chez Smart Innovation 7 ; dates de la formation ; certifications éventuelles ; informations légales (éditeur du site).
- **Mise en production** : création des comptes Neon, Vercel, Cloudflare, Resend, Upstash et Sentry (il saisit lui-même les secrets) ; domaine éventuel.
- Le dépôt GitHub viendra plus tard, à son initiative.

## 5. Format de compte rendu attendu après chaque module

1. Une phrase de résultat : ce qui marche, et ce qui ne marche pas ou n'a pas été testé.
2. Ce que l'utilisateur peut faire maintenant, en langage simple.
3. Les tests réalisés, avec leurs chiffres (par exemple « 36/36 »), et les données de test supprimées.
4. Les limites et les contrôles restants.
5. Le module suivant, puis attendre son accord.
