/**
 * Local trigger for the internal jobs (docs/admin/05 §C, 06).
 * In production QStash calls POST /internal/* every 5 min (checks), daily (backup, maintenance)
 * with its signature. Locally this script calls the same routes with the bearer token
 * (QSTASH_TOKEN / INTERNAL_SECRET) when no QStash signing key is configured.
 *
 * Usage: pnpm --filter @portfolio/api internal -- checks|backup|maintenance
 */
const job = process.argv.slice(2).find((a) => ['checks', 'backup', 'maintenance'].includes(a)) ?? 'checks'
const base = (process.env.API_BASE ?? `http://localhost:${process.env.API_PORT ?? 8787}`).replace(/\/$/, '')
const token = process.env.QSTASH_TOKEN ?? process.env.INTERNAL_SECRET ?? ''

async function call(path: string) {
  const headers: Record<string, string> = {}
  if (token) headers['authorization'] = `Bearer ${token}`
  const res = await fetch(`${base}${path}`, { method: 'POST', headers })
  const text = await res.text()
  console.log(`${path} → ${res.status} ${text.slice(0, 2000)}`)
  if (!res.ok) process.exitCode = 1
}

const paths: Record<string, string> = {
  checks: '/internal/checks',
  backup: '/internal/backup',
  maintenance: '/internal/maintenance',
}

const target = paths[job]
if (!target) {
  console.error(`Unknown job "${job}" — expected checks|backup|maintenance`)
  process.exit(1)
}
export {}
await call(target)
