import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { and, count, desc, eq, type SQL } from 'drizzle-orm'
import { can } from '@portfolio/shared/permissions'
import { db } from '../../db/client'
import { contactMessages } from '../../db/schema'
import { isSessionFresh, problem, requireSession, type AdminEnv } from '../../middleware/admin'
import { audit } from '../../services/audit'

/**
 * Inbox (docs/admin/02 §K): list + read (marks read) + status + delete.
 * Viewer: unread count only, no coordinates (docs/admin/04 §3).
 */
export const messagesRoutes = new OpenAPIHono<AdminEnv>({
  defaultHook: (result, c) => {
    if (!result.success) return problem(c, 400, 'request.invalid', 'Invalid request')
  },
})

const Problem = z.object({ title: z.string(), status: z.number(), code: z.string(), detail: z.string().optional() }).openapi('Problem')
const err = (d: string) => ({ content: { 'application/json': { schema: Problem } }, description: d })
const problemResponses = { 400: err('Invalid request'), 401: err('Not signed in'), 403: err('Not allowed'), 404: err('Not found'), 409: err('Conflict') }

const Status = z.enum(['new', 'read', 'answered', 'archived'])
const MessageDto = z
  .object({
    id: z.string(),
    createdAt: z.string(),
    profile: z.enum(['recruiter', 'client', 'other']),
    name: z.string(),
    email: z.string(),
    company: z.string().nullable(),
    role: z.string().nullable(),
    projectTypes: z.array(z.string()),
    timeline: z.string().nullable(),
    message: z.string(),
    locale: z.string(),
    status: Status,
    readAt: z.string().nullable(),
    answeredAt: z.string().nullable(),
    archivedAt: z.string().nullable(),
  })
  .openapi('Message')

type Row = typeof contactMessages.$inferSelect
function dto(m: Row) {
  return {
    id: m.id,
    createdAt: m.createdAt.toISOString(),
    profile: m.profile,
    name: m.name,
    email: m.email,
    company: m.company,
    role: m.role,
    projectTypes: m.projectTypes,
    timeline: m.timeline,
    message: m.message,
    locale: m.locale,
    status: m.status,
    readAt: m.readAt?.toISOString() ?? null,
    answeredAt: m.answeredAt?.toISOString() ?? null,
    archivedAt: m.archivedAt?.toISOString() ?? null,
  }
}

messagesRoutes.use('/api/admin/messages', requireSession())
messagesRoutes.use('/api/admin/messages/*', requireSession())

messagesRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/api/admin/messages',
    summary: 'List contact messages (newest first). Viewer sees only the unread count.',
    request: {
      query: z.object({
        status: z.enum(['new', 'read', 'answered', 'archived']).optional(),
        profile: z.enum(['recruiter', 'client', 'other']).optional(),
        type: z.enum(['web', 'mobile', 'api', 'ai', 'data', 'other']).optional(),
        locale: z.enum(['fr', 'en']).optional(),
        limit: z.coerce.number().int().min(1).max(200).default(100),
      }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({ messages: z.array(MessageDto).nullable(), unread: z.number(), counts: z.record(z.string(), z.number()) }).openapi('MessagesList'),
          },
        },
        description: 'Messages (or counts for viewers)',
      },
      ...problemResponses,
    },
  }),
  async (c) => {
    const me = c.get('user')
    const q = c.req.valid('query')
    if (me.role === 'viewer') {
      const [row] = await db!.select({ n: count() }).from(contactMessages).where(eq(contactMessages.status, 'new'))
      return c.json({ messages: null, unread: row?.n ?? 0, counts: {} }, 200)
    }
    if (!can(me.role, 'messages.read')) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    const where: SQL[] = []
    if (q.status) where.push(eq(contactMessages.status, q.status))
    if (q.profile) where.push(eq(contactMessages.profile, q.profile))
    if (q.locale) where.push(eq(contactMessages.locale, q.locale))
    const rows = await db!
      .select()
      .from(contactMessages)
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(contactMessages.createdAt))
      .limit(q.limit)
    const [unreadRow] = await db!.select({ n: count() }).from(contactMessages).where(eq(contactMessages.status, 'new'))
    const all = await db!.select({ status: contactMessages.status, n: count() }).from(contactMessages).groupBy(contactMessages.status)
    const counts = Object.fromEntries((all ?? []).map((r) => [r.status, r.n]))
    // Project-type filter in JS (text[] containment, small lists, deterministic).
    let filtered = rows
    if (q.type) filtered = rows.filter((r) => r.projectTypes.includes(q.type!))
    return c.json({ messages: filtered.map(dto), unread: unreadRow?.n ?? 0, counts }, 200)
  },
)

messagesRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/api/admin/messages/{id}',
    summary: 'Read one message (marks it read)',
    request: { params: z.object({ id: z.uuid() }) },
    responses: { 200: { content: { 'application/json': { schema: z.object({ message: MessageDto }) } }, description: 'Message' }, ...problemResponses },
  }),
  async (c) => {
    const me = c.get('user')
    if (!can(me.role, 'messages.read')) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    const { id } = c.req.valid('param')
    const [row] = await db!.select().from(contactMessages).where(eq(contactMessages.id, id)).limit(1)
    if (!row) return problem(c, 404, 'messages.not_found', 'Not found')
    if (row.status === 'new') {
      const [updated] = await db!
        .update(contactMessages)
        .set({ status: 'read', readAt: new Date() })
        .where(eq(contactMessages.id, id))
        .returning()
      return c.json({ message: dto(updated!) }, 200)
    }
    return c.json({ message: dto(row) }, 200)
  },
)

messagesRoutes.openapi(
  createRoute({
    method: 'patch',
    path: '/api/admin/messages/{id}',
    summary: 'Change the message status (new, read, answered, archived)',
    request: { params: z.object({ id: z.uuid() }), body: { content: { 'application/json': { schema: z.object({ status: Status }) } } } },
    responses: { 200: { content: { 'application/json': { schema: z.object({ message: MessageDto }) } }, description: 'Updated' }, ...problemResponses },
  }),
  async (c) => {
    const me = c.get('user')
    if (!can(me.role, 'messages.read')) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    const { id } = c.req.valid('param')
    const { status } = c.req.valid('json')
    const now = new Date()
    const patch =
      status === 'read'
        ? { status, readAt: now }
        : status === 'answered'
          ? { status, answeredAt: now, readAt: now }
          : status === 'archived'
            ? { status, archivedAt: now }
            : { status, readAt: null, answeredAt: null, archivedAt: null }
    const [updated] = await db!.update(contactMessages).set(patch).where(eq(contactMessages.id, id)).returning()
    if (!updated) return problem(c, 404, 'messages.not_found', 'Not found')
    await audit({
      action: 'messages.status_changed',
      result: 'success',
      actorId: me.id,
      actorRole: me.role,
      resourceType: 'contact_messages',
      resourceId: id,
      meta: { status },
    })
    return c.json({ message: dto(updated) }, 200)
  },
)

messagesRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/api/admin/messages/{id}',
    summary: 'Delete a message (admin, fresh session required 🔐)',
    request: { params: z.object({ id: z.uuid() }) },
    responses: { 204: { description: 'Deleted' }, ...problemResponses },
  }),
  async (c) => {
    const me = c.get('user')
    if (!can(me.role, 'messages.delete')) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    if (!isSessionFresh(c.get('session'))) return problem(c, 403, 'auth.reauth_required', 'Recent sign-in required', 'Confirm your identity and retry.')
    const { id } = c.req.valid('param')
    const [existing] = await db!.select().from(contactMessages).where(eq(contactMessages.id, id)).limit(1)
    if (!existing) return problem(c, 404, 'messages.not_found', 'Not found')
    await db!.delete(contactMessages).where(eq(contactMessages.id, id))
    await audit({
      action: 'messages.deleted',
      result: 'success',
      severity: 'warning',
      actorId: me.id,
      actorRole: me.role,
      resourceType: 'contact_messages',
      resourceId: id,
      meta: { profile: existing.profile, locale: existing.locale },
    })
    return c.body(null, 204)
  },
)
