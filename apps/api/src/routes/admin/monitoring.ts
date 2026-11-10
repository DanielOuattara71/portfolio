import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { and, desc, eq, gte } from 'drizzle-orm'
import { can } from '@portfolio/shared/permissions'
import { db } from '../../db/client'
import { alert, incident, incidentNote, serviceCheck } from '../../db/schema'
import { isSessionFresh, problem, requireSession, type AdminEnv } from '../../middleware/admin'
import { audit } from '../../services/audit'
import { createBackup, listBackups, restoreBackup, restorePartial, verifyBackup } from '../../services/backup'
import { markAlertAcknowledged, markAlertResolved } from '../../services/monitoring'

/** Security/monitoring + backups (docs/admin/05 §E, 06). */
export const monitoringRoutes = new OpenAPIHono<AdminEnv>({
  defaultHook: (result, c) => {
    if (!result.success) return problem(c, 400, 'request.invalid', 'Invalid request')
  },
})

const Problem = z.object({ title: z.string(), status: z.number(), code: z.string(), detail: z.string().optional() }).openapi('Problem')
const err = (d: string) => ({ content: { 'application/json': { schema: Problem } }, description: d })
const problemResponses = { 400: err('Invalid request'), 401: err('Not signed in'), 403: err('Not allowed'), 404: err('Not found'), 409: err('Conflict'), 422: err('Unprocessable Entity'), 500: err('Server error') }

monitoringRoutes.use('/api/admin/monitoring/*', requireSession())
monitoringRoutes.use('/api/admin/alerts/*', requireSession())
monitoringRoutes.use('/api/admin/incidents*', requireSession())
monitoringRoutes.use('/api/admin/backups*', requireSession())

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deny(c: any, perm: Parameters<typeof can>[1]) {
  const me = c.get('user')
  if (can(me.role, perm)) return null
  await audit({ action: 'access.denied', result: 'denied', severity: 'warning', actorId: me.id, actorRole: me.role, meta: { permission: perm, path: c.req.path } })
  return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
}

/* ---------- Monitoring ---------- */

monitoringRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/api/admin/monitoring/status',
    summary: 'Latest probe per target + 24h median/p95',
    responses: {
      200: { content: { 'application/json': { schema: z.object({ latest: z.array(z.unknown()), stats: z.array(z.unknown()) }).passthrough() } }, description: 'Status' },
      ...problemResponses,
    },
  }),
  async (c) => {
    const denied = await deny(c, 'monitoring.read')
    if (denied) return denied as never
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const latest: { target: string; ok: boolean; statusCode: number | null; ms: number | null; at: string; error: string | null }[] = []
    const stats: { target: string; n: number; okRate: number; medianMs: number; p95Ms: number }[] = []
    for (const target of ['web', 'api', 'db', 'storage'] as const) {
      const [last] = await db!.select().from(serviceCheck).where(eq(serviceCheck.target, target)).orderBy(desc(serviceCheck.at)).limit(1)
      if (last) latest.push({ target, ok: last.ok, statusCode: last.statusCode, ms: last.ms, at: last.at.toISOString(), error: last.error })
      const day = await db!.select({ ok: serviceCheck.ok, ms: serviceCheck.ms }).from(serviceCheck).where(and(eq(serviceCheck.target, target), gte(serviceCheck.at, since)))
      const okRows = day.filter((r) => r.ok && r.ms !== null)
      const ms = okRows.map((r) => r.ms!).sort((a, b) => a - b)
      const med = ms.length ? ms[Math.floor(ms.length / 2)]! : 0
      const p95 = ms.length ? ms[Math.min(ms.length - 1, Math.floor(ms.length * 0.95))]! : 0
      stats.push({ target, n: day.length, okRate: day.length ? okRows.length / day.length : 0, medianMs: med, p95Ms: p95 })
    }
    return c.json({ latest, stats } as never, 200)
  },
)

monitoringRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/api/admin/monitoring/checks',
    summary: 'Probe history for curves',
    request: { query: z.object({ target: z.enum(['web', 'api', 'db', 'storage']).optional(), limit: z.coerce.number().int().min(1).max(500).default(120) }) },
    responses: {
      200: { content: { 'application/json': { schema: z.object({ checks: z.array(z.unknown()) }).passthrough() } }, description: 'Checks' },
      ...problemResponses,
    },
  }),
  async (c) => {
    const denied = await deny(c, 'monitoring.read')
    if (denied) return denied as never
    const q = c.req.valid('query')
    const rows = await db!
      .select()
      .from(serviceCheck)
      .where(q.target ? eq(serviceCheck.target, q.target) : undefined)
      .orderBy(desc(serviceCheck.at))
      .limit(q.limit)
    return c.json({ checks: rows.map((r) => ({ at: r.at.toISOString(), target: r.target, ok: r.ok, statusCode: r.statusCode, ms: r.ms, error: r.error })) } as never, 200)
  },
)

/* ---------- Alerts ---------- */

monitoringRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/api/admin/alerts',
    summary: 'Open alerts (newest first)',
    responses: {
      200: { content: { 'application/json': { schema: z.object({ alerts: z.array(z.unknown()) }).passthrough() } }, description: 'Alerts' },
      ...problemResponses,
    },
  }),
  async (c) => {
    const denied = await deny(c, 'monitoring.read')
    if (denied) return denied as never
    const rows = await db!.select().from(alert).orderBy(desc(alert.lastAt)).limit(100)
    return c.json({ alerts: rows.map((r) => ({ ...r, firstAt: r.firstAt.toISOString(), lastAt: r.lastAt.toISOString() })) } as never, 200)
  },
)

for (const [action] of [['acknowledge'], ['resolve']] as const) {
  monitoringRoutes.openapi(
    createRoute({
      method: 'post',
      path: `/api/admin/alerts/{id}/${action}`,
      summary: `Mark an alert ${action === 'acknowledge' ? 'acknowledged' : 'resolved'}`,
      request: { params: z.object({ id: z.coerce.number().int().positive() }) },
      responses: { 200: { content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } }, description: 'Updated' }, ...problemResponses },
    }),
    async (c) => {
      const denied = await deny(c, 'monitoring.read')
      if (denied) return denied as never
      const { id } = c.req.valid('param')
      const me = c.get('user')
      if (action === 'acknowledge') await markAlertAcknowledged(id, me.id)
      else await markAlertResolved(id, me.id)
      return c.json({ ok: true } as never, 200)
    },
  )
}

/* ---------- Incidents ---------- */

monitoringRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/api/admin/incidents',
    summary: 'List incidents (newest first)',
    responses: {
      200: { content: { 'application/json': { schema: z.object({ incidents: z.array(z.unknown()) }).passthrough() } }, description: 'Incidents' },
      ...problemResponses,
    },
  }),
  async (c) => {
    const denied = await deny(c, 'monitoring.read')
    if (denied) return denied as never
    const rows = await db!.select().from(incident).orderBy(desc(incident.openedAt)).limit(100)
    return c.json({ incidents: rows.map((r) => ({ ...r, openedAt: r.openedAt.toISOString(), resolvedAt: r.resolvedAt?.toISOString() ?? null })) } as never, 200)
  },
)

monitoringRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/api/admin/incidents',
    summary: 'Create an incident manually',
    request: { body: { content: { 'application/json': { schema: z.object({ title: z.string().min(2).max(240), severity: z.enum(['warning', 'critical']) }) } }, required: true } },
    responses: { 201: { content: { 'application/json': { schema: z.object({ id: z.number() }) } }, description: 'Created' }, ...problemResponses },
  }),
  async (c) => {
    const me = c.get('user')
    const denied = await deny(c, 'monitoring.read')
    if (denied) return denied as never
    const { title, severity } = c.req.valid('json')
    const all = await db!.select({ id: incident.id }).from(incident)
    const number = `INC-${String(all.length + 1).padStart(3, '0')}`
    const [row] = await db!.insert(incident).values({ number, title, severity, status: 'open', openedBy: me.id }).returning({ id: incident.id })
    await audit({ action: 'incident.opened', result: 'success', actorId: me.id, actorRole: me.role, resourceType: 'incident', resourceId: String(row!.id) })
    return c.json({ id: row!.id } as never, 201)
  },
)

monitoringRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/api/admin/incidents/{id}/notes',
    summary: 'Add a dated note',
    request: { params: z.object({ id: z.coerce.number().int().positive() }), body: { content: { 'application/json': { schema: z.object({ text: z.string().min(1).max(5000) }) } }, required: true } },
    responses: { 201: { content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } }, description: 'Added' }, ...problemResponses },
  }),
  async (c) => {
    const denied = await deny(c, 'monitoring.read')
    if (denied) return denied as never
    const { id } = c.req.valid('param')
    const { text } = c.req.valid('json')
    const me = c.get('user')
    await db!.insert(incidentNote).values({ incidentId: id, authorId: me.id, text })
    return c.json({ ok: true } as never, 201)
  },
)

monitoringRoutes.openapi(
  createRoute({
    method: 'patch',
    path: '/api/admin/incidents/{id}',
    summary: 'Acknowledge or resolve (resolution note required to resolve)',
    request: { params: z.object({ id: z.coerce.number().int().positive() }), body: { content: { 'application/json': { schema: z.object({ status: z.enum(['acknowledged', 'resolved']), resolution: z.string().max(5000).optional() }) } }, required: true } },
    responses: { 200: { content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } }, description: 'Updated' }, ...problemResponses },
  }),
  async (c) => {
    const denied = await deny(c, 'monitoring.read')
    if (denied) return denied as never
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch = { status: body.status } as any
    if (body.status === 'resolved') {
      if (!body.resolution?.trim()) return problem(c, 422, 'incident.resolution_required', 'Unprocessable Entity', 'A resolution note is required to resolve.') as never
      patch.resolvedAt = new Date()
      patch.resolution = body.resolution
    }
    const [updated] = await db!.update(incident).set(patch).where(eq(incident.id, id)).returning()
    if (!updated) return problem(c, 404, 'incident.not_found', 'Not found') as never
    if (body.status === 'resolved') {
      await db!.insert(incidentNote).values({ incidentId: id, authorId: c.get('user').id, text: `Résolution : ${body.resolution}` })
    }
    return c.json({ ok: true } as never, 200)
  },
)

monitoringRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/api/admin/incidents/{id}/notes',
    summary: 'List notes of an incident',
    request: { params: z.object({ id: z.coerce.number().int().positive() }) },
    responses: {
      200: { content: { 'application/json': { schema: z.object({ notes: z.array(z.object({ at: z.string(), text: z.string() })) }).passthrough() } }, description: 'Notes' },
      ...problemResponses,
    },
  }),
  async (c) => {
    const denied = await deny(c, 'monitoring.read')
    if (denied) return denied as never
    const { id } = c.req.valid('param')
    const rows = await db!.select().from(incidentNote).where(eq(incidentNote.incidentId, id)).orderBy(incidentNote.at)
    return c.json({ notes: rows.map((r) => ({ at: r.at.toISOString(), text: r.text })) } as never, 200)
  },
)

/* ---------- Backups ---------- */

monitoringRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/api/admin/backups',
    summary: 'Backup history (newest first)',
    responses: {
      200: { content: { 'application/json': { schema: z.object({ backups: z.array(z.unknown()) }).passthrough() } }, description: 'Backups' },
      ...problemResponses,
    },
  }),
  async (c) => {
    const denied = await deny(c, 'backups.read')
    if (denied) return denied as never
    const rows = await listBackups()
    return c.json({
      backups: rows.map((r) => ({
        ...r,
        startedAt: r.startedAt.toISOString(),
        finishedAt: r.finishedAt?.toISOString() ?? null,
        verifiedAt: r.verifiedAt?.toISOString() ?? null,
        restoreTestedAt: r.restoreTestedAt?.toISOString() ?? null,
        rowCounts: (r.rowCounts as Record<string, number> | null) ?? null,
      })),
    } as never, 200)
  },
)

monitoringRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/api/admin/backups',
    summary: 'Run a manual backup (fresh session required)',
    responses: { 201: { content: { 'application/json': { schema: z.object({ id: z.number() }) } }, description: 'Created' }, ...problemResponses },
  }),
  async (c) => {
    const denied = await deny(c, 'backups.run')
    if (denied) return denied as never
    if (!isSessionFresh(c.get('session'))) return problem(c, 403, 'auth.reauth_required', 'Recent sign-in required', 'Confirm your identity and retry.') as never
    const me = c.get('user')
    try {
      const { id } = await createBackup('manual', me.id)
      return c.json({ id } as never, 201)
    } catch (e) {
      return problem(c, 500, 'backup.failed', 'Backup failed', e instanceof Error ? e.message.slice(0, 300) : 'Unknown error') as never
    }
  },
)

monitoringRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/api/admin/backups/{id}/verify',
    summary: 'Re-read, decrypt and verify a backup',
    request: { params: z.object({ id: z.coerce.number().int().positive() }) },
    responses: { 200: { content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } }, description: 'Verified' }, ...problemResponses },
  }),
  async (c) => {
    const denied = await deny(c, 'backups.read')
    if (denied) return denied as never
    const { id } = c.req.valid('param')
    try {
      await verifyBackup(id)
      return c.json({ ok: true } as never, 200)
    } catch (e) {
      return problem(c, 422, 'backup.invalid', 'Verification failed', e instanceof Error ? e.message.slice(0, 300) : 'Invalid backup') as never
    }
  },
)

monitoringRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/api/admin/backups/{id}/restore',
    summary: 'Full restore (fresh session): verify, safety backup, one transaction, sessions revoked',
    request: { params: z.object({ id: z.coerce.number().int().positive() }) },
    responses: { 200: { content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } }, description: 'Restored' }, ...problemResponses },
  }),
  async (c) => {
    const denied = await deny(c, 'backups.run')
    if (denied) return denied as never
    if (!isSessionFresh(c.get('session'))) return problem(c, 403, 'auth.reauth_required', 'Recent sign-in required', 'Confirm your identity and retry.') as never
    const { id } = c.req.valid('param')
    const me = c.get('user')
    try {
      await restoreBackup(id, me.id)
      return c.json({ ok: true } as never, 200)
    } catch (e) {
      return problem(c, 422, 'backup.invalid', 'Restore failed', e instanceof Error ? e.message.slice(0, 300) : 'Restore failed') as never
    }
  },
)

monitoringRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/api/admin/backups/{id}/restore-partial',
    summary: 'Partial restore of a single content as a draft',
    request: {
      params: z.object({ id: z.coerce.number().int().positive() }),
      body: { content: { 'application/json': { schema: z.object({ type: z.string(), key: z.string() }) } }, required: true },
    },
    responses: { 200: { content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } }, description: 'Restored as draft' }, ...problemResponses },
  }),
  async (c) => {
    const denied = await deny(c, 'backups.run')
    if (denied) return denied as never
    if (!isSessionFresh(c.get('session'))) return problem(c, 403, 'auth.reauth_required', 'Recent sign-in required', 'Confirm your identity and retry.') as never
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const me = c.get('user')
    try {
      await restorePartial(id, body.type, body.key, me.id)
      return c.json({ ok: true } as never, 200)
    } catch (e) {
      return problem(c, 422, 'backup.invalid', 'Partial restore failed', e instanceof Error ? e.message.slice(0, 300) : 'Restore failed') as never
    }
  },
)
