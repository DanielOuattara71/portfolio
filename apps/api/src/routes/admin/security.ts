import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { ROLE_PERMISSIONS, can } from '@portfolio/shared/permissions'
import { and, desc, eq, gte, lt, lte, type SQL } from 'drizzle-orm'
import { getAuth } from '../../auth'
import { db } from '../../db/client'
import { auditLog, loginAttempt, session as sessionTable, user as userTable } from '../../db/schema'
import { requestMeta, truncateIp, uaFamily } from '../../lib/request-meta'
import { MAX_SESSION_AGE_MS, problem, requirePermission, requireSession, type AdminEnv } from '../../middleware/admin'
import { audit, verifyChain } from '../../services/audit'

/**
 * Admin module 2: who am I, sessions, sign-in history, activity log
 * (docs/admin/08-architecture-donnees.md §4, routes /api/admin/me, /security/*, /audit*).
 */
export const securityRoutes = new OpenAPIHono<AdminEnv>({
  defaultHook: (result, c) => {
    if (!result.success) return problem(c, 400, 'request.invalid', 'Invalid request')
  },
})

const Problem = z.object({ title: z.string(), status: z.number(), code: z.string(), detail: z.string().optional() }).openapi('Problem')
const problemResponses = {
  401: { content: { 'application/json': { schema: Problem } }, description: 'Not signed in' },
  403: { content: { 'application/json': { schema: Problem } }, description: 'Not allowed' },
}

/* ---------- /me ---------- */
const Me = z
  .object({
    user: z.object({ id: z.string(), email: z.string(), name: z.string(), role: z.enum(['admin', 'editor', 'viewer']), twoFactorEnabled: z.boolean() }),
    permissions: z.array(z.string()),
    mfaSetupRequired: z.boolean(),
    session: z.object({ createdAt: z.string(), expiresAt: z.string(), absoluteExpiresAt: z.string() }),
  })
  .openapi('Me')

securityRoutes.use('/api/admin/me', requireSession({ allowWithoutMfa: true }))
securityRoutes.openapi(
  createRoute({ method: 'get', path: '/api/admin/me', summary: 'Current account, role and rights', responses: { 200: { content: { 'application/json': { schema: Me } }, description: 'Signed in' }, ...problemResponses } }),
  (c) => {
    const u = c.get('user')
    const s = c.get('session')
    return c.json({
      user: u,
      permissions: [...ROLE_PERMISSIONS[u.role]],
      mfaSetupRequired: u.role === 'admin' && !u.twoFactorEnabled,
      session: { createdAt: s.createdAt.toISOString(), expiresAt: s.expiresAt.toISOString(), absoluteExpiresAt: new Date(s.createdAt.getTime() + MAX_SESSION_AGE_MS).toISOString() },
    }, 200)
  },
)

/* ---------- Sessions ---------- */
const SessionRow = z.object({
  id: z.string(),
  userEmail: z.string(),
  device: z.string().nullable(),
  ip: z.string().nullable(),
  createdAt: z.string(),
  lastActiveAt: z.string(),
  expiresAt: z.string(),
  current: z.boolean(),
})

securityRoutes.use('/api/admin/security/*', requireSession(), requirePermission('security.sessions.own'))
securityRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/api/admin/security/sessions',
    summary: 'Active sessions (own, or every account with security.sessions.all)',
    request: { query: z.object({ scope: z.enum(['own', 'all']).default('own') }) },
    responses: { 200: { content: { 'application/json': { schema: z.object({ sessions: z.array(SessionRow) }) } }, description: 'Sessions' }, ...problemResponses },
  }),
  async (c) => {
    const me = c.get('user')
    const { scope } = c.req.valid('query')
    if (scope === 'all' && !can(me.role, 'security.sessions.all')) return problem(c, 403, 'permission.denied', 'Forbidden')
    const where: SQL[] = [gte(sessionTable.expiresAt, new Date())]
    if (scope === 'own') where.push(eq(sessionTable.userId, me.id))
    const rows = await db!
      .select({ s: sessionTable, email: userTable.email })
      .from(sessionTable)
      .innerJoin(userTable, eq(userTable.id, sessionTable.userId))
      .where(and(...where))
      .orderBy(desc(sessionTable.updatedAt))
    const current = c.get('session').id
    return c.json({
      sessions: rows.map(({ s, email }) => ({
        id: s.id,
        userEmail: email,
        device: uaFamily(s.userAgent),
        ip: truncateIp(s.ipAddress),
        createdAt: s.createdAt.toISOString(),
        lastActiveAt: s.updatedAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        current: s.id === current,
      })),
    }, 200)
  },
)

securityRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/api/admin/security/sessions/{id}',
    summary: 'Revoke a session (own, or any with security.sessions.all)',
    request: { params: z.object({ id: z.string().min(1).max(100) }) },
    responses: { 204: { description: 'Revoked' }, 404: { content: { 'application/json': { schema: Problem } }, description: 'Unknown session' }, 409: { content: { 'application/json': { schema: Problem } }, description: 'Current session' }, ...problemResponses },
  }),
  async (c) => {
    const me = c.get('user')
    const { id } = c.req.valid('param')
    const [target] = await db!.select().from(sessionTable).where(eq(sessionTable.id, id)).limit(1)
    if (!target || (target.userId !== me.id && !can(me.role, 'security.sessions.all'))) return problem(c, 404, 'session.not_found', 'Not found')
    if (target.id === c.get('session').id) return problem(c, 409, 'session.current', 'Use sign out to end the current session')
    const ctx = await getAuth().$context
    await ctx.internalAdapter.deleteSession(target.token)
    await audit({ action: 'auth.session.revoked', result: 'success', actorId: me.id, actorRole: me.role, resourceType: 'session', resourceId: target.id, ...requestMeta(c.get('headers')), meta: { ownerId: target.userId } })
    return c.body(null, 204)
  },
)

/* ---------- Sign-in history ---------- */
const LoginRow = z.object({ at: z.string(), userEmail: z.string().nullable(), ip: z.string().nullable(), device: z.string().nullable(), result: z.string() })
securityRoutes.use('/api/admin/security/logins', requirePermission('security.sessions.all'))
securityRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/api/admin/security/logins',
    summary: 'Recent sign-in attempts (90 days kept)',
    responses: { 200: { content: { 'application/json': { schema: z.object({ attempts: z.array(LoginRow) }) } }, description: 'Attempts' }, ...problemResponses },
  }),
  async (c) => {
    const rows = await db!
      .select({ a: loginAttempt, email: userTable.email })
      .from(loginAttempt)
      .leftJoin(userTable, eq(userTable.id, loginAttempt.userId))
      .orderBy(desc(loginAttempt.at))
      .limit(100)
    return c.json({ attempts: rows.map(({ a, email }) => ({ at: a.at.toISOString(), userEmail: email, ip: a.ipTrunc, device: a.ua, result: a.result })) }, 200)
  },
)

/* ---------- Activity log ---------- */
const AuditRow = z.object({
  id: z.number(),
  at: z.string(),
  actorEmail: z.string().nullable(),
  actorRole: z.string().nullable(),
  action: z.string(),
  resource: z.string().nullable(),
  result: z.string(),
  severity: z.string(),
  ip: z.string().nullable(),
  device: z.string().nullable(),
  meta: z.record(z.string(), z.unknown()).nullable(),
})

securityRoutes.use('/api/admin/audit', requireSession())
securityRoutes.use('/api/admin/audit/*', requireSession())
securityRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/api/admin/audit',
    summary: 'Activity log, newest first (own actions only without audit.read.all)',
    request: {
      query: z.object({
        severity: z.enum(['info', 'warning', 'critical']).optional(),
        action: z.string().max(80).regex(/^[a-z_.]+$/).optional(),
        before: z.coerce.number().int().positive().optional(),
        from: z.iso.date().optional(),
        to: z.iso.date().optional(),
        limit: z.coerce.number().int().min(1).max(200).default(50),
      }),
    },
    responses: { 200: { content: { 'application/json': { schema: z.object({ events: z.array(AuditRow), next: z.number().nullable() }) } }, description: 'Events' }, ...problemResponses },
  }),
  async (c) => {
    const me = c.get('user')
    if (!can(me.role, 'audit.read.own')) return problem(c, 403, 'permission.denied', 'Forbidden')
    const q = c.req.valid('query')
    const where: SQL[] = []
    if (!can(me.role, 'audit.read.all')) where.push(eq(auditLog.actorId, me.id))
    if (q.severity) where.push(eq(auditLog.severity, q.severity))
    if (q.action) where.push(eq(auditLog.action, q.action))
    if (q.before) where.push(lt(auditLog.id, q.before))
    if (q.from) where.push(gte(auditLog.at, new Date(`${q.from}T00:00:00Z`)))
    if (q.to) where.push(lte(auditLog.at, new Date(`${q.to}T23:59:59.999Z`)))
    const rows = await db!
      .select({ e: auditLog, email: userTable.email })
      .from(auditLog)
      .leftJoin(userTable, eq(userTable.id, auditLog.actorId))
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(auditLog.id))
      .limit(q.limit + 1)
    const page = rows.slice(0, q.limit)
    return c.json({
      events: page.map(({ e, email }) => ({
        id: e.id,
        at: e.at.toISOString(),
        actorEmail: email,
        actorRole: e.actorRole,
        action: e.action,
        resource: e.resourceLabel ?? (e.resourceType ? `${e.resourceType}${e.resourceId ? ` ${e.resourceId}` : ''}` : null),
        result: e.result,
        severity: e.severity,
        ip: e.ipTrunc,
        device: e.ua,
        meta: (e.meta as Record<string, unknown> | null) ?? null,
      })),
      next: rows.length > q.limit ? (page.at(-1)?.e.id ?? null) : null,
    }, 200)
  },
)

securityRoutes.use('/api/admin/audit/integrity', requirePermission('audit.read.all'))
securityRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/api/admin/audit/integrity',
    summary: 'Recompute the activity log hash chain',
    responses: { 200: { content: { 'application/json': { schema: z.object({ ok: z.boolean(), checked: z.number(), brokenAt: z.number().nullable(), checkedAt: z.string() }) } }, description: 'Result' }, ...problemResponses },
  }),
  async (c) => c.json({ ...(await verifyChain()), checkedAt: new Date().toISOString() }, 200),
)
