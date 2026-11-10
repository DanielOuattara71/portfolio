# Admin · Étape 11 — Documentation technique

> Livrable du **Prompt 10** (module 11). Complément de [09-developpement.md](09-developpement.md) : comment le système est assemblé, comment le mettre en route, comment le vérifier.

## 1. Cartographie

```
Chaque décision est tracée dans docs/admin/01-à-08. Ce document décrit
l'existant à l'issue des modules 1 à 11.
```

| Pièce | Rôle | Porte / origine |
|---|---|---|
| `apps/api` | Contenu, médias, auth, inbox, monitoring, sauvegardes, maintenance (`src/index.ts` = entrée Vercel, `src/dev.ts` = serveur local) | 8787 |
| `apps/web` | Site public Nuxt 4, lit le contenu publié de l'API (cache 60 s), revalidation | 3000 |
| `apps/admin` | Admin Nuxt 4, sans SSR, jamais indexée, proxy `/api/**` → API | 3002 |
| `packages/shared` | Schémas Zod des contenus + permissions, sans build | — |
| `packages/design-tokens` | `tokens.json` → `dist/tokens.css` (seules valeurs de couleur/motion) | — |

Flux clé (production cible) : Navigateur → Vercel (site + admin) → réécriture `/api/*` de l'admin vers l'API → fonctions API → Neon (base) + Cloudinary (médias + sauvegardes privées) + Resend + Upstash QStash + Sentry.

## 2. Base de données (Drizzle)

- Migration générée : `pnpm --filter @portfolio/api db:generate` (lit `DATABASE_URL`).
- Application : `pnpm --filter @portfolio/api db:migrate` (message de NOTICE « schema drizzle already exists » bénin).
- Contenu initial : `db:seed` (idempotent, 51 éléments) + `db:seed:blocks` (13 blocs + 5 SEO).
- `--replace` local : vidange puis réimport (protégé en production).
- Garde-fous en base (`0003_audit_guards.sql`) : `audit_log` en ajout seulement (y compris `TRUNCATE`), purge ≥ 12 mois uniquement, 3 rôles, denier administrateur indestructible.
- Restauration complète en 1 transaction (`services/backup.ts`) : l'ordre FK-safe est `contentRefs → contentSlugs → redirects → contentVersions → questions dépendantes → ...` (voir le code).

## 3. Routes principales

| Préfixe | Rôle | Garde |
|---|---|---|
| `/public/*` | site public (CORS `ALLOWED_ORIGINS`) | — |
| `/health`, `/api/health` | santé avec vrai contrôle base | — |
| `/api/admin/*` | administration | secret du proxy + origine CSRF + session + droits (`monitoring.read`, `backups.*`, …) |
| `/internal/checks|backup|maintenance` | tâches planifiées | signature QStash (ou jeton en dev) |

RFC 9457 partout côté admin (`title`, `status`, `code`, `detail` optionnel) ; erreurs de validation → 400 `request.invalid` (12 routeurs avec `defaultHook`, dont `media`, `security`, `public/content` et `internal` corrigés au module 11).

## 4. Environnement (voir `.env.example`)

Groupes : base (`DATABASE_URL`) ; site (`NUXT_PUBLIC_SITE_URL`, `NUXT_PUBLIC_API_BASE`, `NUXT_PUBLIC_SHOW_PLACEHOLDERS`, `NUXT_REVALIDATE_TOKEN`) ; API (`API_PORT`, `ALLOWED_ORIGINS`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `MEDIA_STORAGE`, `MEDIA_PUBLIC_BASE_URL`, `CLOUDINARY_*`) ; sauvegardes (`BACKUP_ENCRYPTION_KEY`, `BACKUP_LOCAL_DIR`, préfixe Cloudinary `backups`) ; monitoring (`QSTASH_*`) ; Sentry (`SENTRY_DSN`, `NUXT_PUBLIC_SENTRY_DSN`) ; email (`RESEND_API_KEY`, `MAIL_FROM`) ; revalidation (`SITE_REVALIDATE_URL`, `REVALIDATE_TOKEN`) ; admin (`ADMIN_API_ORIGIN`, `ADMIN_PROXY_SECRET`).

**Secrets jamais sauvegardés avec les données** ; `BACKUP_ENCRYPTION_KEY` doit vivre aussi dans le gestionnaire de mots de passe (sans elle, les sauvegardes sont illisibles).

## 5. Démarrage local

```bash
pnpm install
pnpm db:up                 # Postgres 17 dans Docker
cp .env.example .env       # remplir les secrets
pnpm --filter @portfolio/api db:migrate
pnpm --filter @portfolio/api db:seed
pnpm --filter @portfolio/api admin:create -- --email you@x.y --name "Nom"
pnpm dev:api               # http://localhost:8787 (/health, /openapi.json)
pnpm dev                   # site http://localhost:3000 (nécessite l'API)
pnpm dev:admin             # admin http://localhost:3002 (nécessite l'API)
```

- Machine à faible mémoire (WSL ~4 Go) : API + **un** front à la fois.
- Tâches planifiées en dev : `pnpm --filter @portfolio/api internal -- checks|backup|maintenance`.
- Vérification : `pnpm typecheck` (5/5), `pnpm build` (3/3). Pas de scripts lint/test dans le dépôt.

## 6. Monitoring et maintenance (résumé)

- Sondes 5 min (`service_check`) : site `/fr`, `/health` API, `select 1`, fichier témoin de stockage.
- Alertes (`alert`) : e-mail ≤ 1/h par règle + affichage admin ; critique → incident auto (`incident` + `incident_note`, résolution obligatoire).
- Compteur 5xx en direct via le middleware `onError` + `recordApi5xx()`.
- Sauvegarde quotidienne + manuelle (`backup`) : export JSON en transaction de lecture, SHA-256, AES-256-GCM, stockage privé, relecture/vérification, conservation 42 fichiers.
- Maintenance quotidienne (`maintenance`) : purges 12 mois / 90 jours / 30 jours / 1 h + contrôle de la chaîne du journal.

## 7. Sentry

`@sentry/node` (API, `lib/sentry.ts`) + `@sentry/nuxt` (site, admin : `sentry.{client,server}.config.ts`). `tracesSampleRate: 0`, `beforeSend` retire user/cookies, aucune IP collectée. Sans DSN : silencieux.
