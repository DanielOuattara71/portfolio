import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { Receiver } from '@upstash/qstash'
import { db } from '../db/client'
import { backup } from '../db/schema'
import { createBackup } from '../services/backup'
import { runChecks } from '../services/monitoring'
import { runMaintenance } from '../services/maintenance'

/**
 * Internal jobs (docs/admin/05 §C, 06): checks every 5 min, backup daily, maintenance daily.
 * Authenticated by the QStash signature (Upstash). In development a local script sends the
 * same signature with the dev signing key, or a bearer token when no signing key is set.
 * These routes never go through the admin proxy and are never public.
 */
export const internalRoutes = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) return c.json({ title: 'Invalid request', status: 400, code: 'request.invalid' }, 400, { 'Content-Type': 'application/problem+json' })
  },
})

const Secret = z.object({ ok: z.boolean() }).openapi('InternalOk')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function isAuthorized(c: any): Promise<boolean> {
  const sig = c.req.header('upstash-signature') ?? c.req.header('Upstash-Signature')
  const current = process.env.QSTASH_CURRENT_SIGNING_KEY
  const next = process.env.QSTASH_NEXT_SIGNING_KEY
  if (current && sig) {
    try {
      const receiver = new Receiver({ currentSigningKey: current, nextSigningKey: next || undefined })
      const body = await c.req.text()
      return await receiver.verify({ signature: sig, body, url: c.req.url })
    } catch {
      return false
    }
  }
  // Dev / fallback: bearer token (QStash can send custom headers on publish).
  const expected = process.env.QSTASH_TOKEN ?? process.env.INTERNAL_SECRET ?? ''
  if (!expected) return process.env.NODE_ENV !== 'production'
  const given = c.req.header('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  return given === expected
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function guard(c: any, next: () => Promise<any>): Promise<any> {
  if (!(await isAuthorized(c))) {
    return c.json({ title: 'Forbidden', status: 403, code: 'internal.forbidden' }, 403, { 'Content-Type': 'application/problem+json' })
  }
  return next()
}

internalRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/internal/checks',
    summary: 'Run the 5-minute probes (QStash in production, local script in dev)',
    responses: { 200: { content: { 'application/json': { schema: Secret } }, description: 'Executed' }, 403: { content: { 'application/json': { schema: z.object({ code: z.string() }) } }, description: 'Invalid signature' } },
  }),
  async (c) => guard(c, async () => {
    const results = await runChecks()
    return c.json({ ok: results.every((r) => r.ok) }, 200)
  }),
)

internalRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/internal/backup',
    summary: 'Run a scheduled backup (QStash daily)',
    responses: { 200: { content: { 'application/json': { schema: Secret } }, description: 'Executed' }, 403: { content: { 'application/json': { schema: z.object({ code: z.string() }) } }, description: 'Invalid signature' }, 500: { content: { 'application/json': { schema: z.object({ code: z.string(), error: z.string().optional() }) } }, description: 'Backup failed' } },
  }),
  async (c) => guard(c, async () => {
    try {
      await createBackup('scheduled', null)
      return c.json({ ok: true }, 200)
    } catch (e) {
      return c.json({ code: 'backup.failed', error: e instanceof Error ? e.message.slice(0, 500) : String(e).slice(0, 500) }, 500)
    }
  }),
)

internalRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/internal/maintenance',
    summary: 'Daily maintenance: purges + journal chain check',
    responses: { 200: { content: { 'application/json': { schema: z.object({ ok: z.boolean(), deleted: z.record(z.string(), z.number()) }).passthrough() } }, description: 'Executed' }, 403: { content: { 'application/json': { schema: z.object({ code: z.string() }) } }, description: 'Invalid signature' } },
  }),
  async (c) => guard(c, async () => {
    const { deleted, chain } = await runMaintenance()
    return c.json({ ok: chain.ok, deleted } as never, 200)
  }),
)

// Used by the local dev helper when the DB is unreachable (typed response for OpenAPI).
void db
void backup
