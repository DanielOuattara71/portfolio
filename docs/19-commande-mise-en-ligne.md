# Mise en production — de zéro à Vercel (procédure complète, étape par étape)

> Ce document est la **procédure à suivre** pour mettre le portfolio en ligne. Il part de la machine actuelle (déjà en état prêt : code committé, poussé sur `github.com/DanielOuattara71/portfolio`) et va jusqu'au site servi publiquement.
> **Ce qui est à faire de bout en bout** : créer les comptes, les variables d'environnement, déployer, vérifier.
> **Ce que je ne peux pas faire pour vous** : aucune de ces créations n'est automatisable ici — la plupart demandent une validation dans un navigateur. Les valeurs sensibles restent sous vos yeux, jamais dans le dépôt.
> **Ce que vous devez faire pour le site lui-même** : remplir Paramètres, liens, CV, photo, mentions légales — avant ou après la mise en ligne, c'est pareil.

---

## 0. Ce qui existe aujourd'hui (et ne se refera pas)

| Étape | État |
|---|---|
| Codesite/admin/API committés | `3fbd4e3` (`main`) sur `github.com/DanielOuattara71/portfolio` |
| Build production | OK (`typecheck` 5/5, `build` 3/3) |
| Cloudinary | *Compte déjà créé* : cloud `amtflrwz`, API key/secret ; PDF/raw delivery activée ; **mais le secret a transité** — le régénérer (voir §1.1) |
| À fournir | Nom affiché, photo, email pro, CV FR/EN, liens LinkedIn/GitHub |
| Mentions légales / Confidentialité | Modèles avec `[À COMPLÉTER]` bloquent publication — à remplir et publier via Textes |
| RÔLE restreint Neon | à créer (voir §2.5) |

---

## 1. Cloudinary (vous en avez déjà un — à remettre à neuf)

### 1.1 Régénérer les clés

1. Allez sur [console.cloudinary.com](https://console.cloudinary.com) — panneau **Settings → API Keys** (icône clé à droite de votre nom en haut à droite).
2. **Create New API Key** : nom libre (ex. `portfolio-vendu`) → récupérez `API Key` et `API Secret`. **Notez-les immédiatement dans un gestionnaire de mots de passe à double facteur.**
3. **Révoquez l'ancienne paire** (celle que vous avez partagée ici) : **Disable** de l'ancienne → elle cesse de fonctionner.

### 1.2 Médias et sauvegardes

Dans **Settings → Security** :
- **PDF and ZIP files delivery** : coché, « Allow delivery of PDF and ZIP ».
- **Strict Transformations** : désactivé tant que vous n'êtes pas prêt (optionnel).
- **Restricted media types** : OK de laisser PDF seulement autorisés par votre choix.

Toute nouvelle fonction de delivery (servir un PDF) marche déjà (vérifié dans ce projet).

---

## 2. Neon (base de données, Obligatoire)

### 2.1 Créer un compte et le projet

1. Allez sur [neon.tech](https://neon.tech) → **Sign up** (recommandé : GitHub).
2. Dashboard → **New project** :
   - **Project name** : `portfolio`.
   - **Region** : la même que votre site Vercel *(pour le routage, choisir `Europe (Frankfurt)` ou `Europe (Paris)` — votre public / votre admin y vivront mieux)*.
   - **Postgres version** : 17 (dernière).
   - **Default branch** : `main` (c'est ce que vous avez aujourd'hui en local).

### 2.2 Récupérer l'URL de connexion

1. Dans le panneau du projet → **Dashboard → Connection string**.
2. Choisissez **Connection string** → format `postgresql://USER:PASSWORD@...neon.tech/neondb?sslmode=require`.
3. Utilisez **Pooled connection** (Piscinet) si vous voyez deux onglets, sinon l'URL standard marche.

### 2.3 Projets (branching optionnel)

- Laisser `main` seul suffit pour ce projet. Si vous voulez essayer des changements sans casser `main`, créez une branche — dites-moi et je vous montrerai.

### 2.4 Migrer la base et importer le contenu

Sur cette machine (toutes ces commandes depuis `~/projets/portfolio`) :

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@...neon.tech/neondb?sslmode=require"
pnpm --filter @portfolio/api db:migrate
pnpm --filter @portfolio/api db:seed        # importe le contenu affiché sur le site tel quel
pnpm --filter @portfolio/api db:seed:blocks   # importe les blocs de texte (idempotent)
pnpm --filter @portfolio/api admin:create -- --email VOTRE@EMAIL.FR --name "Ton Nom"
```

> Les étapes 4 et 5 écrivent dans `DATABASE_URL` ; elles sont **idempotentes** — vous pouvez les rejouer, mais la 1ère (migrate) ne rejoue pas deux fois.

### 2.5 Créer le rôle restreint `app` (recommandé — `admin:create` et `audit_log`)

Dans **SQL Editor** de Neon :

```sql
-- Rôle secondaire pour l'API : sans DELETE/UPDATE sur audit_log
create role app nologin;

grant connect on database neondb to app;
grant usage on schema public to app;
grant select on all tables in schema public to app;
grant insert on audit_log to app;
grant insert on rate_limit to app;
grant select, insert, update on content_item, content_version, media, contact_messages to app;
-- Triggers restent en place : ce rôle ne contourne pas ; il est simplement même rôle —
-- en réalité le rôle courant (propriétaire par défaut) peut contourner ; app le peut à peine.
```

> ⚠️ Production = **un seul** `DATABASE_URL` public — il faut le changer à chaque rotation de mots de passe (voir `docs/admin/13-procedures.md`).

---

## 3. Vercel (Obligatoire, 3 projets séparés)

### 3.1 Créer un compte et lier la machine locale au CLI

1. [vercel.com](https://vercel.com) → **Sign up** (GitHub recommandé).

2. ```bash
   pnpm dlx vercel login      # s'authentifie dans le navigateur
   vercel whoami              # vérifie la session (affiche votre identifiant)
   ```

### 3.2 Importer le dépôt — 3 projets séparément

1. Dashboard Vercel → **Add New… → Project** → **Import Git Repository** → `DanielOuattara71/portfolio`.
2. **Root Directory** : saisissez `apps/web` (et **jamais** la racine).
3. **Framework** : Nuxt — détecté automatiquement. **Root Directory est critique.**
4. Avant d'appuyer sur **Deploy**, configurez les variables pour ce projet d'abord (§3.4) ; déployez avec ces variables (on ne déploie pas à vide).

Répétez §3.2 pour :
- `portfolio-api` → `apps/api`, Framework : **Other**.
- `portfolio-admin` → `apps/admin`, **Root Directory** `apps/admin`.

### 3.3 Variables d'environnement (à saisir dans chaque projet, Vercel > projet > Settings > Environment Variables)

> **Tous** les copier-coller se font depuis le tableau (même variable, même valeur dans les 3 projets à moins que la colonne « Projet » ne l'indique différemment).
> Les valeurs sont **sensibles** : c'est le dashboard qui s'en occupe — vous les copiez depuis votre gestionnaire de mots de passe.

| Variable | Projet | Valeur |
|---|---|---|
| `DATABASE_URL` | API | URL de connexion Neon (§2.2) |
| `NODE_ENV` | tous | `production` |
| `NUXT_PUBLIC_SITE_URL` | Web + Admin | `https://<nom>-portfolio-web-xxxx.vercel.app` |
| `NUXT_PUBLIC_API_BASE` | Web | `https://<nom>-portfolio-api-xxxx.vercel.app` |
| `NUXT_PUBLIC_SHOW_PLACEHOLDERS` | Web | **Ne pas définir** (ou `false`) |
| `NUXT_PUBLIC_SENTRY_DSN` | Web + Admin | votre DSN public Sentry |
| `SENTRY_DSN` | API | votre DSN Sentry |
| `MEDIA_STORAGE` | API | `cloudinary` |
| `CLOUDINARY_CLOUD_NAME` | API | votre cloud name |
| `CLOUDINARY_API_KEY` | API | votre nouvelle API key |
| `CLOUDINARY_API_SECRET` | API | votre nouveau API secret |
| `BETTER_AUTH_SECRET` | API | `openssl rand -base64 48` |
| `BETTER_AUTH_URL` | API | `https://<nom>-portfolio-admin-xxxx.vercel.app` |
| `ADMIN_API_ORIGIN` | Admin | `https://<nom>-portfolio-api-xxxx.vercel.app` |
| `ADMIN_PROXY_SECRET` | API + Admin | `openssl rand -hex 32` (même valeur 2×) |
| `NUXT_REVALIDATE_TOKEN` | Web | `openssl rand -hex 32` |
| `SITE_REVALIDATE_URL` | API | `https://<nom>-portfolio-web-xxxx.vercel.app/api/_revalidate` |
| `REVALIDATE_TOKEN` | API | `<même valeur que NUXT_REVALIDATE_TOKEN>` |
| `RESEND_API_KEY` | API | votre clé Resend |
| `MAIL_FROM` | API | ex. `Portfolio <noreply@mon-domaine.fr>` |
| `BACKUP_ENCRYPTION_KEY` | API | `openssl rand -base64 32` |
| `QSTASH_CURRENT_SIGNING_KEY` | API | vos clés QStash |
| `QSTASH_NEXT_SIGNING_KEY` | API | vos clés QStash |
| `QSTASH_TOKEN` | API | votre token QStash |
| `UPSTASH_REDIS_REST_URL` | API | vos clés Redis |
| `UPSTASH_REDIS_REST_TOKEN` | API | vos clés Redis |
| `NUXT_PUBLIC_SENTRY_DSN` | Web | même valeur que `SENTRY_DSN` |

> 3 projets → **même nom de variable, même valeur** dans 3 projets. Vous la collez 3 fois (UI ou `vercel env add` en CLI).

### 3.4 Rewrites dans l'admin (obligatoire avant le premier chargement)

1. Dans le projet `portfolio-admin`, **Settings → Rewrites** → Add rewrite :
   - **Source** : `/api/:path*`
   - **Destination** : `https://<votre-api>.vercel.app/api/:path*`
2. Cela dirige les appels `/api/**` de l'admin (qui passe par le proxy + secret proxy) vers l'API — sinon le cookie de session ne serait pas première partie et l'admin resterait bloqué.

### 3.5 CLI optionnel (alternatif au dashboard)

```bash
vercel env add DATABASE_URL production
#  collez votre URL Neon quand il le demande
#  répète pour chaque variable de §3.3
```

### 3.6 Build (sur un `vercel --prod` sans variables → erreurs « DATABASE_URL missing »)

Chaque projet part d'une branche de déploiement, mais la mise en ligne finale est `git push` + bascule automatique vers le dossier concerné. **Si vous ne faites que déployer Vercel sans renseigner les variables de build, le statut sera : Built, mais pages avec 500.**

Ordre recommandé :
1. `portfolio-api` → variables → **deploy → vous constatez `/health` OK publiquement** (`curl https://portfolio-api-xxxx.vercel.app/health`).
2. `portfolio-admin` → variables → **deploy → visitez l'admin**, vous devez voir la page de connexion (ou l'erreur `config.proxy_secret` si une variable est manquante).
3. `portfolio-web` → variables locales (dont `NUXT_REVALIDATE_TOKEN` partagé avec l'API) → **deploy** → vous voyez le site public, `/fr` enfin OK.

### 3.7 Domaine personnalisé (Facultatif)

1. Si vous voulez `www.votre-domaine.fr` (ou équivalent `.com`/`.fr`) :
   - registrer chez OVH, Cloudflare Registrar, ou Gandi (à choisir).
   - **DNS** : CNAME vers `cname1.vercel-dns.com` pour `www` et `votre-domaine.com`.
   - **Vercel** → projet Web → **Settings → Domains** → ajouter le domaine → Vercel provisionne Let's Encrypt auto (HTTPS gratuit).
2. Si vous restez sur `*.vercel.app` : aucun domaine n’est nécessaire ; Vercel vous fournit `(nom unique).vercel.app` avec HTTPS.

---

## 4. Resend (si vous voulez emails réels — recommandé)

1. [resend.com](https://resend.com) → **Sign up** (GitHub).
2. **Domains** → **Add Domain** → votre domaine (vous pouvez utiliser un sous-domaine comme `mail.portfolio.example.com`).
3. **DNS** : ajoutez les enregistrements TXT/MX que Resend propose (incluant SPF et DKIM). **Sans ça, les mails vont en spam.**
4. Récupérez `RESEND_API_KEY` (API) et choisissez `MAIL_FROM` (ex. `Portfolio <noreply@mail.votredomaine.com>`).

---

## 5. Upstash (si vous voulez les sondes + backup automatiques)

### 5.1 QStash (planification — obligatoire pour les sondes)

1. [upstash.com](https://upstash.com) → **Sign up**.
2. Dashboard → **QStash** → **Create QStash** (projet) → récupérez :
   - `QSTASH_CURRENT_SIGNING_KEY`
   - `QSTASH_NEXT_SIGNING_KEY`
   - `QSTASH_TOKEN`
3. Créer les planificateurs :
   - `POST …/internal/checks` — **every 5 minutes**,
   - `POST …/internal/backup` — **daily** (3 h UTC),
   - `POST …/internal/maintenance` — **daily** (3 h 30 UTC).
4. Pas besoin de modifier la base ; seule votre API s’en servira, via la signature QStash.

### 5.2 Redis (rate limit en mémoire — pas obligatoire)

Le site tient ses limites sur `rate_limit` Postgres ; Redis reste en option. Si vous voulez :
- **Redis** → Create Database → `portfolio-rate-limit` → copiez `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`.

---

## 6. Sentry (optionnel — erreurs en prod)

1. [sentry.io](https://sentry.io) → **Sign up** → **Create project** :
   - `portfolio-api` (Node),
   - `portfolio-web` (Nuxt / VUE),
   - `portfolio-admin` (Nuxt / VUE).
2. Copiez **DSN** pour chaque projet (même valeur si vous n'avez qu'un projet).
3. Collez-les comme `SENTRY_DSN` (API) et `NUXT_PUBLIC_SENTRY_DSN` (Web).

---

## 7. Vérification avant la mise en ligne

1. **Paramètres** (dans l'admin) : nom, initiales, email, photo (upload FR/EN alt), CV FR/EN.
   → Puis **Publier** et **Vérifier** `/fr` et `/en`, `/fr/cv`, `/en/cv` (redirect vers le PDF).
2. **Projets** : confirmez les textes « à valider » — PRJ-01 (context, problem) / PRJ-02 (problem, goals, techRoles) / PRJ-05 (solution), puis **Publier**.
3. **Textes** : mentions légales / confidentialité : remplissez avant de publier.
4. **Vercel** : les 3 projets doivent être `Ready` (fond vert) et récents (avant publication).
5. **Urls** :
   - `https://<nom>.vercel.app/fr` → 200.
   - `https://<nom>.vercel.app/api/health` → aucun contenu de contrôle public (il est reachable seulement par le proxy — voir les règles du module 4 —, mais il devrait répondre en 200).
   - `/login` de l'admin → page de connexion.
6. **Premier admin** : dans le terminal local, depuis ce dossier :
   ```bash
   pnpm --filter @portfolio/api admin:create -- --email VOTRE@EMAIL --name "Ton Nom"
   ```
   Cela crée votre premier administrateur sur la base Neon de prod. La **double authentification est obligatoire** lors de la première connexion — scannez le QR ; conservez les codes de secours.

---

## 8. Test final de bout en bout

- Vous ouvrez un regard privé sur `https://portfolio-xxxx.vercel.app` :
  - `/fr`, `/en` → contenu du site tel que vous l'avez publié
  - `/fr/projets/prince-edja` → la capture et le lien ;
  - `/fr/cv` → redirige vers votre PDF ;
  - `/` → redirige vers `/{fr|en}`.
- Dans l'admin de prod, votre compte fonctionne, l'onglet **Monitoring** montre les alarmes, les sondes.
- `audit_log` enchaînés : sur Neon, `select hello_hash from audit_log limit 3;` (ou recharger le Tableau de bord : « chaîne intègre »).

---

## 9. Règles et mémoire permanente

- **Rien ne part en production sans votre OK explicite.** Vous seuls créez les variables d'environnement, vous seuls poussez/reconfigurez.
- **Toute action "production" est une opération unique** : connexion Neon (URL), compte Vercel (import), paramètres variables. Rien n'est échelonné automatiquement ni « livré via le code ».
- **Les secrets doivent être régénérés à chaque étape** — un ancien secret **connu en haut de cette conversation** doit être déclaré obsolète.
- **Rotation des secrets** (avec `openssl rand -hex 32` et `... -base64 48`) :
  - `BETTER_AUTH_SECRET` (invalidation des sessions)
  - `ADMIN_PROXY_SECRET` (bloquer la liste `/api/*` d'une ancienne paire)
  - `_RESILIENT_TOKEN` (envoi de caches)
  - `__-ENCRYPTION_KEY` (lecture des sauvegardes anciennes lues avec l'ancienne clé)
- **Si un déploiement ne marche pas** : allez dans Vercel → projet concerné → "Logs" → Build / Runtime. Les erreurs remontées ne contiennent pas de secret (tout est planifié avant injection).
- **Domaines HTTPS** : laissez toujours Vercel gérer TLS (Let's Encrypt).

---

## 10. Rappel limites connues

- `db:seed --replace` pourrait casser une prod existante — ne l'utilisez jamais qu'en local d'import.
- `rate_limit` est tenu en Postgres ; Redis n'est pas requis.
- **Aucune partie de ce site n'est automatiquement mise à jour** (le code est déployé quand vous poussez `main` ; les contenus, quand vous cliquez Publier).
- **Aucune sauvegarde automatique n'est configurée** tant que QStash (`section 5.1`) n'est pas en place. Pour l'instant, la sauvegarde se lance manuellement (voir admin Sauvegardes).

---

## 11. Références

- `docs/18-mise-en-production.md` — audit et tests sécurité.
- `docs/admin/13-procedures.md` — procédures de sauvegarde/restauration/déploiement/rotation des secrets.
- `AGENTS.md` — variables, commandes, comment démarrer.
