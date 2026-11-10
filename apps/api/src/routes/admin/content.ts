import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { contentKeySchema, contentStatusSchema, contentTypeSchema, type ContentType } from '@portfolio/shared/content'
import { can, type Permission } from '@portfolio/shared/permissions'
import { requestMeta } from '../../lib/request-meta'
import { isSessionFresh, problem, requirePermission, requireSession, type AdminEnv } from '../../middleware/admin'
import { audit } from '../../services/audit'
import { createPreviewToken } from '../../services/preview'
import {
  WorkflowError,
  archiveItem,
  confirmField,
  createContent,
  deleteItem,
  diffItem,
  discard,
  duplicateItem,
  getItem,
  getItemByKey,
  itemView,
  listItems,
  listVersions,
  publish,
  reorder,
  restoreVersion,
  saveWorking,
  setFeatured,
  submitItem,
  unarchiveItem,
  unpublishItem,
} from '../../services/workflow'

/**
 * Generic editorial workflow routes (docs/admin/03, docs/admin/08 §4).
 * Reused by every content type: Parameters now (module 5), Projects next (module 6).
 * All routes live behind requireSession(); read access is content.read,
 * writes check the per-type permission (settings → settings.update, others → content.write/publish).
 */
export const contentRoutes = new OpenAPIHono<AdminEnv>({
  defaultHook: (result, c) => {
    if (!result.success) return problem(c, 400, 'request.invalid', 'Invalid request')
  },
})

const Problem = z
  .object({
    title: z.string(),
    status: z.number(),
    code: z.string(),
    detail: z.string().optional(),
    errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    issues: z.array(z.object({ path: z.string(), code: z.string(), message: z.string() })).optional(),
  })
  .openapi('Problem')
const err = (d: string) => ({ content: { 'application/json': { schema: Problem } }, description: d })
const problemResponses = { 400: err('Invalid request'), 401: err('Not signed in'), 403: err('Not allowed'), 404: err('Not found'), 409: err('Conflict'), 422: err('Publication blocked') }

const IssueSchema = z.object({ path: z.string(), code: z.string(), message: z.string() })
const ItemViewSchema = z
  .object({
    id: z.string(),
    type: contentTypeSchema,
    key: z.string(),
    status: z.string(),
    featured: z.boolean(),
    position: z.number().int(),
    modified: z.boolean(),
    revision: z.number().int(),
    working: z.record(z.string(), z.unknown()),
    published: z.record(z.string(), z.unknown()).nullable(),
    publishedAt: z.string().nullable(),
    updatedAt: z.string(),
    updatedBy: z.string().nullable(),
    pendingFields: z.array(z.string()),
    issues: z.array(IssueSchema),
  })
  .openapi('ContentItemView')
type ItemView = z.infer<typeof ItemViewSchema>

const VersionRowSchema = z.object({
  number: z.number().int(),
  kind: z.enum(['import', 'checkpoint', 'published', 'restored']),
  createdAt: z.string(),
  createdBy: z.string().nullable(),
  id: z.string(),
})

contentRoutes.use('/api/admin/content', requireSession(), requirePermission('content.read'))
contentRoutes.use('/api/admin/content/*', requireSession(), requirePermission('content.read'))

function writePermission(type: ContentType): Permission {
  return type === 'settings' ? 'settings.update' : 'content.write'
}
function publishPermission(type: ContentType): Permission {
  return type === 'settings' ? 'settings.update' : 'content.publish'
}

async function isDenied(c: Parameters<typeof problem>[0], permission: Permission): Promise<boolean> {
  const user = c.get('user')
  if (can(user.role, permission)) return false
  await audit({ action: 'access.denied', result: 'denied', severity: 'warning', actorId: user.id, actorRole: user.role, ...requestMeta(c.get('headers')), meta: { permission, path: c.req.path } })
  return true
}

function workflowProblem(c: Parameters<typeof problem>[0], e: WorkflowError) {
  if (e.status === 404) return c.json({ title: e.message, status: 404, code: e.code }, 404, { 'Content-Type': 'application/problem+json' })
  if (e.status === 409) return c.json({ title: e.message, status: 409, code: e.code }, 409, { 'Content-Type': 'application/problem+json' })
  return c.json({ title: e.message, status: 422, code: e.code, ...(e.issues?.length ? { issues: e.issues } : {}) }, 422, { 'Content-Type': 'application/problem+json' })
}

function label(type: string, key: string) {
  return `${type}:${key}`
}

/* ---------- Read one content ---------- */
contentRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/api/admin/content/by-key/{type}/{key}',
    summary: 'Read a content by its type and key (working copy, published version, state, blocking issues)',
    request: { params: z.object({ type: contentTypeSchema, key: contentKeySchema }) },
    responses: { 200: { content: { 'application/json': { schema: ItemViewSchema } }, description: 'Content' }, ...problemResponses },
  }),
  async (c) => {
    const { type, key } = c.req.valid('param')
    // Settings are reserved to administrators (docs/admin/02 §J, 04 §3): even reads need settings.update.
    if (type === 'settings' && (await isDenied(c, 'settings.update'))) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    const item = await getItemByKey(type, key)
    if (!item) return problem(c, 404, 'content.not_found', 'Not found')
    return c.json((await itemView(item)) as unknown as ItemView, 200)
  },
)

contentRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/api/admin/content/{id}',
    summary: 'Read a content by its id (working copy, published version, state, blocking issues)',
    request: { params: z.object({ id: z.uuid() }) },
    responses: { 200: { content: { 'application/json': { schema: ItemViewSchema } }, description: 'Content' }, ...problemResponses },
  }),
  async (c) => {
    const { id } = c.req.valid('param')
    const item = await getItem(id)
    if (!item) return problem(c, 404, 'content.not_found', 'Not found')
    if (item.type === 'settings' && (await isDenied(c, 'settings.update'))) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    return c.json((await itemView(item)) as unknown as ItemView, 200)
  },
)

/* ---------- Save the working copy ---------- */
contentRoutes.openapi(
  createRoute({
    method: 'put',
    path: '/api/admin/content/{id}/working',
    summary: 'Save the working copy (revision guard → 409; checkpoint creates a restore point in the history)',
    request: {
      params: z.object({ id: z.uuid() }),
      body: {
        content: {
          'application/json': {
            schema: z.object({
              revision: z.number().int().positive(),
              data: z.record(z.string(), z.unknown()),
              checkpoint: z.boolean().optional(),
            }),
          },
        },
        required: true,
      },
    },
    responses: { 200: { content: { 'application/json': { schema: ItemViewSchema } }, description: 'Saved' }, ...problemResponses },
  }),
  async (c) => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const item = await getItem(id)
    if (!item) return problem(c, 404, 'content.not_found', 'Not found')
    if (await isDenied(c, writePermission(item.type))) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    const me = c.get('user')
    try {
      const view = await saveWorking({ id, revision: body.revision, data: body.data, userId: me.id, checkpoint: body.checkpoint })
      if (body.checkpoint) {
        await audit({
          action: 'content.saved',
          result: 'success',
          actorId: me.id,
          actorRole: me.role,
          resourceType: 'content',
          resourceId: id,
          resourceLabel: label(view.type, view.key),
          ...requestMeta(c.get('headers')),
          meta: { revision: view.revision },
        })
      }
      return c.json(view as unknown as ItemView, 200)
    } catch (e) {
      if (e instanceof WorkflowError) return workflowProblem(c, e)
      throw e
    }
  },
)

/* ---------- Publish ---------- */
contentRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/api/admin/content/{id}/publish',
    summary: 'Publish the working copy (all-or-nothing transaction). Settings require a fresh session (10 min).',
    request: {
      params: z.object({ id: z.uuid() }),
      body: { content: { 'application/json': { schema: z.object({ revision: z.number().int().positive() }) } }, required: true },
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({ item: ItemViewSchema, version: z.number().int(), siteRefreshed: z.enum(['ok', 'not_configured', 'failed']) }),
          },
        },
        description: 'Published',
      },
      ...problemResponses,
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param')
    const { revision } = c.req.valid('json')
    const item = await getItem(id)
    if (!item) return problem(c, 404, 'content.not_found', 'Not found')
    if (await isDenied(c, publishPermission(item.type))) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    // Sensitive operation (🔐): publishing Settings needs a session younger than 10 minutes.
    // The client re-authenticates (password + TOTP → new session) and replays this request.
    if (item.type === 'settings' && !isSessionFresh(c.get('session'))) {
      return problem(c, 403, 'auth.reauth_required', 'Recent sign-in required', 'Confirm your identity and retry.')
    }
    const me = c.get('user')
    try {
      const result = await publish({ id, revision, userId: me.id })
      await audit({
        action: 'content.published',
        result: 'success',
        actorId: me.id,
        actorRole: me.role,
        resourceType: 'content',
        resourceId: id,
        resourceLabel: label(result.view.type, result.view.key),
        ...requestMeta(c.get('headers')),
        meta: { version: result.version, siteRefreshed: result.siteRefreshed },
      })
      return c.json({ item: result.view as unknown as ItemView, version: result.version, siteRefreshed: result.siteRefreshed }, 200)
    } catch (e) {
      if (e instanceof WorkflowError) {
        if (e.code === 'publish.blocked') {
          await audit({
            action: 'content.publish_blocked',
            result: 'failure',
            actorId: me.id,
            actorRole: me.role,
            resourceType: 'content',
            resourceId: id,
            resourceLabel: label(item.type, item.key),
            ...requestMeta(c.get('headers')),
            meta: { issues: e.issues.length, paths: e.issues.map((i) => i.path) },
          })
        }
        return workflowProblem(c, e)
      }
      throw e
    }
  },
)

/* ---------- Discard the working copy ---------- */
contentRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/api/admin/content/{id}/discard',
    summary: 'Discard the working copy: it becomes the published version again',
    request: { params: z.object({ id: z.uuid() }) },
    responses: { 200: { content: { 'application/json': { schema: ItemViewSchema } }, description: 'Discarded' }, ...problemResponses },
  }),
  async (c) => {
    const { id } = c.req.valid('param')
    const item = await getItem(id)
    if (!item) return problem(c, 404, 'content.not_found', 'Not found')
    if (await isDenied(c, writePermission(item.type))) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    const me = c.get('user')
    try {
      const view = await discard({ id, userId: me.id })
      await audit({
        action: 'content.discarded',
        result: 'success',
        actorId: me.id,
        actorRole: me.role,
        resourceType: 'content',
        resourceId: id,
        resourceLabel: label(view.type, view.key),
        ...requestMeta(c.get('headers')),
      })
      return c.json(view as unknown as ItemView, 200)
    } catch (e) {
      if (e instanceof WorkflowError) return workflowProblem(c, e)
      throw e
    }
  },
)

/* ---------- History ---------- */
contentRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/api/admin/content/{id}/versions',
    summary: 'History of a content (checkpoints and published versions, newest first)',
    request: { params: z.object({ id: z.uuid() }) },
    responses: {
      200: { content: { 'application/json': { schema: z.object({ versions: z.array(VersionRowSchema) }) } }, description: 'History' },
      ...problemResponses,
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param')
    const item = await getItem(id)
    if (!item) return problem(c, 404, 'content.not_found', 'Not found')
    if (item.type === 'settings' && (await isDenied(c, 'settings.update'))) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    const versions = await listVersions(id)
    return c.json({ versions: versions.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })) }, 200)
  },
)

contentRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/api/admin/content/{id}/versions/{n}/restore',
    summary: 'Restore a past version as the new working copy (never published directly)',
    request: { params: z.object({ id: z.uuid(), n: z.coerce.number().int().positive() }) },
    responses: { 200: { content: { 'application/json': { schema: ItemViewSchema } }, description: 'Restored' }, ...problemResponses },
  }),
  async (c) => {
    const { id, n } = c.req.valid('param')
    const item = await getItem(id)
    if (!item) return problem(c, 404, 'content.not_found', 'Not found')
    if (await isDenied(c, writePermission(item.type))) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    const me = c.get('user')
    try {
      const view = await restoreVersion({ id, number: n, userId: me.id })
      await audit({
        action: 'content.version_restored',
        result: 'success',
        actorId: me.id,
        actorRole: me.role,
        resourceType: 'content',
        resourceId: id,
        resourceLabel: label(view.type, view.key),
        ...requestMeta(c.get('headers')),
        meta: { version: n },
      })
      return c.json(view as unknown as ItemView, 200)
    } catch (e) {
      if (e instanceof WorkflowError) return workflowProblem(c, e)
      throw e
    }
  },
)

/* ---------- List, create, order (module 6) ---------- */

const ListRowSchema = z
  .object({
    id: z.string(),
    type: contentTypeSchema,
    key: z.string(),
    status: z.string(),
    featured: z.boolean(),
    position: z.number().int(),
    modified: z.boolean(),
    revision: z.number().int(),
    working: z.record(z.string(), z.unknown()),
    published: z.record(z.string(), z.unknown()).nullable(),
    publishedAt: z.string().nullable(),
    updatedAt: z.string(),
    updatedBy: z.string().nullable(),
    pendingFields: z.array(z.string()),
  })
  .openapi('ContentListRow')

contentRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/api/admin/content',
    summary: 'List contents (filter by type, status, free text)',
    request: { query: z.object({ type: contentTypeSchema.optional(), status: contentStatusSchema.optional(), q: z.string().max(120).optional() }) },
    responses: { 200: { content: { 'application/json': { schema: z.object({ items: z.array(ListRowSchema) }) } }, description: 'Items' }, ...problemResponses },
  }),
  async (c) => {
    const q = c.req.valid('query')
    if (q.type === 'settings' && (await isDenied(c, 'settings.update'))) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    const items = await listItems(q)
    return c.json({ items: items as unknown as z.infer<typeof ListRowSchema>[] }, 200)
  },
)

contentRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/api/admin/content',
    summary: 'Create a content (project PRJ-NN, skill, service, step, experience, education, certification)',
    request: { body: { content: { 'application/json': { schema: z.object({ type: contentTypeSchema }) } }, required: true } },
    responses: { 201: { content: { 'application/json': { schema: ItemViewSchema } }, description: 'Created' }, ...problemResponses },
  }),
  async (c) => {
    const { type } = c.req.valid('json')
    if (await isDenied(c, 'content.write')) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    const me = c.get('user')
    try {
      const view = await createContent(type, me.id)
      await audit({
        action: 'content.created',
        result: 'success',
        actorId: me.id,
        actorRole: me.role,
        resourceType: 'content',
        resourceId: view.id,
        resourceLabel: label(view.type, view.key),
        ...requestMeta(c.get('headers')),
      })
      return c.json(view as unknown as ItemView, 201)
    } catch (e) {
      if (e instanceof WorkflowError) return workflowProblem(c, e)
      throw e
    }
  },
)

contentRoutes.openapi(
  createRoute({
    method: 'put',
    path: '/api/admin/content/order',
    summary: 'Set the order of contents of one type (ids in display order)',
    request: {
      body: { content: { 'application/json': { schema: z.object({ type: contentTypeSchema, ids: z.array(z.uuid()).max(200) }) } }, required: true },
    },
    responses: {
      200: { content: { 'application/json': { schema: z.object({ siteRefreshed: z.enum(['ok', 'not_configured', 'failed']) }) } }, description: 'Reordered' },
      ...problemResponses,
    },
  }),
  async (c) => {
    const body = c.req.valid('json')
    if (await isDenied(c, writePermission(body.type))) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    const me = c.get('user')
    const result = await reorder(body)
    await audit({
      action: 'content.ordered',
      result: 'success',
      actorId: me.id,
      actorRole: me.role,
      resourceType: 'content',
      resourceLabel: body.type,
      ...requestMeta(c.get('headers')),
      meta: { count: body.ids.length },
    })
    return c.json(result, 200)
  },
)

/* ---------- Featured, duplicate, submit, lifecycle, delete, diff, preview, confirm ---------- */

contentRoutes.openapi(
  createRoute({
    method: 'patch',
    path: '/api/admin/content/{id}/featured',
    summary: 'Toggle "shown on the home page" (published projects show on /fr immediately, after refresh)',
    request: { params: z.object({ id: z.uuid() }), body: { content: { 'application/json': { schema: z.object({ featured: z.boolean() }) } } } },
    responses: {
      200: { content: { 'application/json': { schema: z.object({ item: ItemViewSchema, siteRefreshed: z.enum(['ok', 'not_configured', 'failed']) }) } }, description: 'Updated' },
      ...problemResponses,
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param')
    const { featured } = c.req.valid('json')
    const item = await getItem(id)
    if (!item) return problem(c, 404, 'content.not_found', 'Not found')
    if (await isDenied(c, writePermission(item.type))) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    const me = c.get('user')
    try {
      const { view, siteRefreshed } = await setFeatured(id, featured)
      await audit({
        action: 'content.featured',
        result: 'success',
        actorId: me.id,
        actorRole: me.role,
        resourceType: 'content',
        resourceId: id,
        resourceLabel: label(view.type, view.key),
        ...requestMeta(c.get('headers')),
        meta: { featured },
      })
      return c.json({ item: view as unknown as ItemView, siteRefreshed }, 200)
    } catch (e) {
      if (e instanceof WorkflowError) return workflowProblem(c, e)
      throw e
    }
  },
)

contentRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/api/admin/content/{id}/duplicate',
    summary: 'Duplicate a project as a new draft (next PRJ-NN, working copy copied, never published)',
    request: { params: z.object({ id: z.uuid() }) },
    responses: { 201: { content: { 'application/json': { schema: ItemViewSchema } }, description: 'Duplicated' }, ...problemResponses },
  }),
  async (c) => {
    const { id } = c.req.valid('param')
    const item = await getItem(id)
    if (!item) return problem(c, 404, 'content.not_found', 'Not found')
    if (await isDenied(c, writePermission(item.type))) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    const me = c.get('user')
    try {
      const view = await duplicateItem(id, me.id)
      await audit({
        action: 'content.duplicated',
        result: 'success',
        actorId: me.id,
        actorRole: me.role,
        resourceType: 'content',
        resourceId: view.id,
        resourceLabel: label(view.type, view.key),
        ...requestMeta(c.get('headers')),
        meta: { from: id },
      })
      return c.json(view as unknown as ItemView, 201)
    } catch (e) {
      if (e instanceof WorkflowError) return workflowProblem(c, e)
      throw e
    }
  },
)

contentRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/api/admin/content/{id}/submit',
    summary: 'Submit for review (editors; administrators publish directly)',
    request: { params: z.object({ id: z.uuid() }) },
    responses: { 200: { content: { 'application/json': { schema: ItemViewSchema } }, description: 'Submitted' }, ...problemResponses },
  }),
  async (c) => {
    const { id } = c.req.valid('param')
    const item = await getItem(id)
    if (!item) return problem(c, 404, 'content.not_found', 'Not found')
    const perm = item.type === 'settings' ? ('settings.update' as const) : ('content.submit' as const)
    if (await isDenied(c, perm)) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    const me = c.get('user')
    try {
      const view = await submitItem(id)
      await audit({
        action: 'content.submitted',
        result: 'success',
        actorId: me.id,
        actorRole: me.role,
        resourceType: 'content',
        resourceId: id,
        resourceLabel: label(view.type, view.key),
        ...requestMeta(c.get('headers')),
      })
      return c.json(view as unknown as ItemView, 200)
    } catch (e) {
      if (e instanceof WorkflowError) return workflowProblem(c, e)
      throw e
    }
  },
)

contentRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/api/admin/content/{id}/unpublish',
    summary: 'Unpublish: removed from the site, slugs and redirects deleted, becomes a draft',
    request: { params: z.object({ id: z.uuid() }) },
    responses: {
      200: { content: { 'application/json': { schema: z.object({ item: ItemViewSchema, siteRefreshed: z.enum(['ok', 'not_configured', 'failed']) }) } }, description: 'Unpublished' },
      ...problemResponses,
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param')
    const item = await getItem(id)
    if (!item) return problem(c, 404, 'content.not_found', 'Not found')
    if (await isDenied(c, publishPermission(item.type))) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    const me = c.get('user')
    try {
      const { view, siteRefreshed } = await unpublishItem(id)
      await audit({
        action: 'content.unpublished',
        result: 'success',
        actorId: me.id,
        actorRole: me.role,
        resourceType: 'content',
        resourceId: id,
        resourceLabel: label(view.type, view.key),
        ...requestMeta(c.get('headers')),
      })
      return c.json({ item: view as unknown as ItemView, siteRefreshed }, 200)
    } catch (e) {
      if (e instanceof WorkflowError) return workflowProblem(c, e)
      throw e
    }
  },
)

contentRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/api/admin/content/{id}/archive',
    summary: 'Archive: removed from the site and read-only (restore as draft)',
    request: { params: z.object({ id: z.uuid() }) },
    responses: {
      200: { content: { 'application/json': { schema: z.object({ item: ItemViewSchema, siteRefreshed: z.enum(['ok', 'not_configured', 'failed']) }) } }, description: 'Archived' },
      ...problemResponses,
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param')
    const item = await getItem(id)
    if (!item) return problem(c, 404, 'content.not_found', 'Not found')
    if (await isDenied(c, publishPermission(item.type))) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    const me = c.get('user')
    try {
      const { view, siteRefreshed } = await archiveItem(id)
      await audit({
        action: 'content.archived',
        result: 'success',
        actorId: me.id,
        actorRole: me.role,
        resourceType: 'content',
        resourceId: id,
        resourceLabel: label(view.type, view.key),
        ...requestMeta(c.get('headers')),
      })
      return c.json({ item: view as unknown as ItemView, siteRefreshed }, 200)
    } catch (e) {
      if (e instanceof WorkflowError) return workflowProblem(c, e)
      throw e
    }
  },
)

contentRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/api/admin/content/{id}/unarchive',
    summary: 'Restore an archived content as a draft',
    request: { params: z.object({ id: z.uuid() }) },
    responses: { 200: { content: { 'application/json': { schema: ItemViewSchema } }, description: 'Restored' }, ...problemResponses },
  }),
  async (c) => {
    const { id } = c.req.valid('param')
    const item = await getItem(id)
    if (!item) return problem(c, 404, 'content.not_found', 'Not found')
    if (await isDenied(c, publishPermission(item.type))) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    const me = c.get('user')
    try {
      const view = await unarchiveItem(id)
      await audit({
        action: 'content.unarchived',
        result: 'success',
        actorId: me.id,
        actorRole: me.role,
        resourceType: 'content',
        resourceId: id,
        resourceLabel: label(view.type, view.key),
        ...requestMeta(c.get('headers')),
      })
      return c.json(view as unknown as ItemView, 200)
    } catch (e) {
      if (e instanceof WorkflowError) return workflowProblem(c, e)
      throw e
    }
  },
)

contentRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/api/admin/content/{id}',
    summary: 'Delete a content (only if never published or archived, and not referenced). Fresh session required (🔐).',
    request: { params: z.object({ id: z.uuid() }) },
    responses: { 204: { description: 'Deleted' }, ...problemResponses },
  }),
  async (c) => {
    const { id } = c.req.valid('param')
    const item = await getItem(id)
    if (!item) return problem(c, 404, 'content.not_found', 'Not found')
    if (item.type === 'settings') return problem(c, 422, 'content.invalid', 'Invalid content', 'The Settings cannot be deleted.')
    if (await isDenied(c, 'content.delete')) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    if (!isSessionFresh(c.get('session'))) return problem(c, 403, 'auth.reauth_required', 'Recent sign-in required', 'Confirm your identity and retry.')
    const me = c.get('user')
    try {
      const { snapshot } = await deleteItem(id)
      await audit({
        action: 'content.deleted',
        result: 'success',
        severity: 'warning',
        actorId: me.id,
        actorRole: me.role,
        resourceType: 'content',
        resourceId: id,
        resourceLabel: label(snapshot.type, snapshot.key),
        ...requestMeta(c.get('headers')),
      })
      return c.body(null, 204)
    } catch (e) {
      if (e instanceof WorkflowError) return workflowProblem(c, e)
      throw e
    }
  },
)

contentRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/api/admin/content/{id}/diff',
    summary: 'Compare two sides field by field (working, published or vN)',
    request: { params: z.object({ id: z.uuid() }), query: z.object({ from: z.string().max(20), to: z.string().max(20) }) },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              from: z.string(),
              to: z.string(),
              differences: z.array(z.object({ path: z.string(), from: z.unknown(), to: z.unknown() })),
            }),
          },
        },
        description: 'Differences',
      },
      ...problemResponses,
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param')
    const q = c.req.valid('query')
    const item = await getItem(id)
    if (!item) return problem(c, 404, 'content.not_found', 'Not found')
    if (item.type === 'settings' && (await isDenied(c, 'settings.update'))) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    try {
      const result = await diffItem(id, q.from, q.to)
      return c.json(result as never, 200)
    } catch (e) {
      if (e instanceof WorkflowError) return workflowProblem(c, e)
      throw e
    }
  },
)

contentRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/api/admin/content/{id}/preview-token',
    summary: 'Create a private preview link (HMAC token, 30 min, bound to this user)',
    request: { params: z.object({ id: z.uuid() }) },
    responses: {
      201: { content: { 'application/json': { schema: z.object({ token: z.string(), expiresAt: z.string() }) } }, description: 'Token created' },
      ...problemResponses,
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param')
    const item = await getItem(id)
    if (!item) return problem(c, 404, 'content.not_found', 'Not found')
    if (item.type === 'settings' && (await isDenied(c, 'settings.update'))) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    const me = c.get('user')
    const { token, expiresAt } = createPreviewToken(id, me.id)
    await audit({
      action: 'content.preview_token_created',
      result: 'success',
      actorId: me.id,
      actorRole: me.role,
      resourceType: 'content',
      resourceId: id,
      resourceLabel: label(item.type, item.key),
      ...requestMeta(c.get('headers')),
      meta: { expiresAt },
    })
    return c.json({ token, expiresAt }, 201)
  },
)

contentRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/api/admin/content/{id}/confirm-field',
    summary: 'Confirm a "à valider" field: removes it from pending_fields (journalised)',
    request: { params: z.object({ id: z.uuid() }), body: { content: { 'application/json': { schema: z.object({ path: z.string().min(1).max(120) }) } }, required: true } },
    responses: { 200: { content: { 'application/json': { schema: ItemViewSchema } }, description: 'Confirmed' }, ...problemResponses },
  }),
  async (c) => {
    const { id } = c.req.valid('param')
    const { path } = c.req.valid('json')
    const item = await getItem(id)
    if (!item) return problem(c, 404, 'content.not_found', 'Not found')
    if (await isDenied(c, writePermission(item.type))) return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    const me = c.get('user')
    try {
      const view = await confirmField(id, path)
      await audit({
        action: 'content.field_confirmed',
        result: 'success',
        actorId: me.id,
        actorRole: me.role,
        resourceType: 'content',
        resourceId: id,
        resourceLabel: label(view.type, view.key),
        ...requestMeta(c.get('headers')),
        meta: { path },
      })
      return c.json(view as unknown as ItemView, 200)
    } catch (e) {
      if (e instanceof WorkflowError) return workflowProblem(c, e)
      throw e
    }
  },
)
