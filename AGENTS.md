# AGENTS.md

High-signal repo facts for working in this portfolio monorepo. Prefer executable sources (`package.json`, `turbo.json`, `pnpm-workspace.yaml`, app configs) over prose.

## Stack & layout (pnpm workspaces + Turborepo)

- Package manager: `pnpm@12.18.0` (Corepack), Node `>=24.15.0` (`.node-version`). Root scripts run via Turbo (`turbo.json`).
- Workspaces: `apps/*`, `packages/*` (`pnpm-workspace.yaml`). Only `esbuild` may run install scripts.
- `apps/web` (`@portfolio/web`): Nuxt 4 public site, SSR, `fr`/`en` with translated URL prefixes (`nuxt.config.ts` uses `@nuxtjs/i18n` `strategy: 'prefix'` + `customRoutes`; locales in `apps/web/i18n/locales/{fr,en}.json`).
- `apps/api` (`@portfolio/api`): Hono + `@hono/zod-openapi`, Postgres via Drizzle. Vercel entry is `src/index.ts` (default export); local dev server is `src/dev.ts`. Schema/migrations: `src/db/schema/index.ts`, `src/db/migrations` (`drizzle.config.ts`). `/public/*` is CORS-restricted to `ALLOWED_ORIGINS`.
- `packages/design-tokens` (`@portfolio/design-tokens`): `tokens.json` → generated `dist/` (`tokens.css`, `motion`) via custom `node build.mjs`. This is the package that produces build output consumed by others.
- `packages/shared` (`@portfolio/shared`): exports raw TypeScript source (`./src/*.ts`); no build step, `typecheck` is `tsc --noEmit`.
- `apps/admin` is referenced in `README.md`/`docs/` but does not exist yet; do not assume it is present.
- `docs/` (steps 1–11) records design/architecture decisions; consult when behavior or structure is unclear (e.g. `docs/06-architecture.md`, `docs/11-architecture-technique.md`).

## Commands (run from repo root unless noted)

```bash
pnpm install
pnpm db:up                        # Postgres 17 in Docker (docker-compose.yml; local creds in .env.example)
pnpm dev                          # web dev (turbo, filter @portfolio/web) http://localhost:3000
pnpm dev:api                      # api dev (turbo, filter @portfolio/api) http://localhost:8787 (/health, /openapi.json)
pnpm build                        # turbo build all (dependsOn ^build)
pnpm typecheck                    # turbo typecheck all (dependsOn ^build)
pnpm tokens                       # regenerate design-tokens dist from tokens.json
pnpm --filter @portfolio/api db:generate   # drizzle-kit generate (needs DATABASE_URL env)
pnpm --filter @portfolio/api db:migrate    # drizzle-kit migrate (needs DATABASE_URL env)
```

- `turbo.json`: `dev` and `typecheck` depend on `^build` (design-tokens builds before dependents). `dev` is persistent/non-cached.
- No lint, format, or test scripts are configured in the repo root/apps/packages. Do not invent `pnpm lint`/`pnpm test`; if verification is needed, use `pnpm typecheck` and/or a targeted build.
- Low-memory machines (e.g. WSL ~4 GB): run one app at a time (`pnpm dev` or `pnpm dev:api`), not both.

## Environment & secrets

- Copy `.env.example` → `.env` (never commit `.env`). Local DB uses Docker values from `docker-compose.yml`; production uses Neon credentials set in Vercel.
- Env loading is per-app: web dev uses `nuxt dev --dotenv ../../.env`; api dev uses `tsx watch --env-file-if-exists=../../.env`; `drizzle.config.ts` reads `process.env.DATABASE_URL` directly.
- Key vars: `DATABASE_URL`, `NUXT_PUBLIC_SITE_URL`, `NUXT_PUBLIC_API_BASE`, `API_PORT`, `ALLOWED_ORIGINS` (comma-separated, used by API CORS for `/public/*`), `NUXT_PUBLIC_SHOW_PLACEHOLDERS` (review mode: `true` locally shows "to provide" placeholders and unconfirmed `pending` case-study fields; never set in production).

## Conventions & gotchas

- Design values come only from design tokens (`var(--…)` / `@portfolio/design-tokens`); never hard-code colors or motion durations. Edit `packages/design-tokens/tokens.json` and run `pnpm tokens` (or rely on turbo build deps).
- UI copy lives in `apps/web/i18n/locales/{fr,en}.json`; editorial/content data comes from the API. Translated route paths are defined in `nuxt.config.ts` (`i18n.pages`).
- `apps/web` postinstall runs `nuxt prepare`. If types/auto-imports look stale, a prepare/rebuild of deps may be needed (respect `^build` ordering).
- `packages/shared` is consumed as TS source across the monorepo; keep its exports and runtime deps compatible with both Nuxt (web) and Hono (api) consumers.
