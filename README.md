# Portfolio — Software & Data Engineer

Bilingual (FR / EN) portfolio with its own content management system.
Design and decisions are documented step by step in [`docs/`](docs/).

## Structure

| Path | What |
|---|---|
| `apps/web` | Public site — Nuxt 4, server rendered, `/fr` and `/en` with translated URLs |
| `apps/api` | API — Hono + Zod/OpenAPI, PostgreSQL through Drizzle |
| `apps/admin` | Admin area (added at the admin step) |
| `packages/design-tokens` | `tokens.json` (Index Studio design system) → CSS variables and motion constants |
| `packages/shared` | Constants and Zod schemas shared by the site, the admin and the API |
| `docs/` | Design documents (steps 1 to 11) |

## Requirements

- Node.js 24 (see `.node-version`)
- pnpm 12 — enable it once with `corepack enable --install-directory ~/.local/bin`
- Docker (local PostgreSQL)

## Getting started

```bash
cp .env.example .env      # local values only, never commit .env
pnpm install
pnpm db:up                # starts PostgreSQL 17 in Docker
pnpm dev:api              # API on http://localhost:8787  (/health, /openapi.json)
pnpm dev                  # public site on http://localhost:3000
```

On a machine with little memory (WSL with 4 GB), run one app at a time.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Public site in development mode |
| `pnpm dev:api` | API in development mode (reloads on change) |
| `pnpm build` | Builds every app and package |
| `pnpm typecheck` | Type checks the whole monorepo |
| `pnpm tokens` | Regenerates CSS variables from `packages/design-tokens/tokens.json` |
| `pnpm db:up` / `pnpm db:down` | Starts / stops the local database |
| `pnpm --filter @portfolio/api db:generate` | Creates a migration from the Drizzle schema |
| `pnpm --filter @portfolio/api db:migrate` | Applies migrations |

## Conventions

- Design values come only from the design tokens (`var(--…)`); never hard-code a color or a duration.
- Interface copy lives in `apps/web/i18n/locales/{fr,en}.json`; editorial content comes from the API.
- No secret in the repository: environment variables are set in Vercel per environment.
