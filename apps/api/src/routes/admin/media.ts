import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { can } from '@portfolio/shared/permissions'
import { and, desc, eq, ilike, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm'
import { db } from '../../db/client'
import { contentItems, contentRefs, media, user as userTable } from '../../db/schema'
import { requestMeta } from '../../lib/request-meta'
import { problem, requirePermission, requireSession, type AdminEnv } from '../../middleware/admin'
import { audit } from '../../services/audit'
import { ACCEPTED_TYPES, MAX_PDF_BYTES, MediaError, completeUpload, createUpload } from '../../services/media'
import { getLocalStorage, getStorage, verifyLocalUpload } from '../../services/storage'

/** Media library routes (docs/admin/08 §4 "Médias"). */
export const mediaRoutes = new OpenAPIHono<AdminEnv>({
  defaultHook: (result, c) => {
    if (!result.success) return problem(c, 400, 'request.invalid', 'Invalid request')
  },
})

const Problem = z.object({ title: z.string(), status: z.number(), code: z.string(), detail: z.string().optional() })
const err = (d: string) => ({ content: { 'application/json': { schema: Problem } }, description: d })
const FOLDERS = media.folder.enumValues
const Localized = z.object({ fr: z.string().max(300).nullable(), en: z.string().max(300).nullable() })

const MediaDto = z
  .object({
    id: z.string(),
    status: z.enum(media.status.enumValues),
    kind: z.enum(media.kind.enumValues),
    folder: z.enum(FOLDERS),
    name: z.string(),
    mime: z.string(),
    bytes: z.number().nullable(),
    width: z.number().nullable(),
    height: z.number().nullable(),
    alt: Localized,
    caption: Localized,
    credit: z.string().nullable(),
    isPublic: z.boolean(),
    variants: z.array(z.object({ width: z.number(), height: z.number() })),
    uploadedBy: z.string().nullable(),
    createdAt: z.string(),
    deletedAt: z.string().nullable(),
    usageCount: z.number(),
  })
  .openapi('Media')

type Row = typeof media.$inferSelect
function dto(m: Row, uploadedBy: string | null, usageCount: number) {
  return {
    id: m.id,
    status: m.status,
    kind: m.kind,
    folder: m.folder,
    name: m.name,
    mime: m.mime,
    bytes: m.bytes,
    width: m.width,
    height: m.height,
    alt: m.alt,
    caption: m.caption,
    credit: m.credit,
    isPublic: m.isPublic,
    variants: m.variants.map((v) => ({ width: v.width, height: v.height })),
    uploadedBy,
    createdAt: m.createdAt.toISOString(),
    deletedAt: m.deletedAt?.toISOString() ?? null,
    usageCount,
  }
}

const usageCount = sql<number>`(select count(*)::int from ${contentRefs} where ${contentRefs.refMediaId} = ${media.id})`

async function usages(id: string) {
  return db!
    .select({ type: contentItems.type, key: contentItems.key, status: contentItems.status, field: contentRefs.field, published: contentRefs.published })
    .from(contentRefs)
    .innerJoin(contentItems, eq(contentItems.id, contentRefs.itemId))
    .where(eq(contentRefs.refMediaId, id))
}

function mediaProblem(c: Parameters<typeof problem>[0], e: unknown) {
  if (e instanceof MediaError) return problem(c, e.status === 413 || e.status === 415 ? 422 : e.status === 429 ? 429 : e.status === 404 ? 404 : e.status === 409 ? 409 : 422, e.code, 'Upload refused', e.message)
  throw e
}

mediaRoutes.use('/api/admin/media', requireSession(), requirePermission('content.read'))
mediaRoutes.use('/api/admin/media/*', requireSession(), requirePermission('content.read'))

/* ---------- Upload: 1. ask for an upload URL ---------- */
mediaRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/api/admin/media/uploads',
    summary: 'Start an upload: returns a short-lived target the browser sends the file to (PUT local, POST multipart Cloudinary)',
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.object({
              name: z.string().min(1).max(255),
              mime: z.enum(ACCEPTED_TYPES),
              bytes: z.number().int().positive().max(MAX_PDF_BYTES),
              folder: z.enum(FOLDERS).default('divers'),
            }),
          },
        },
      },
    },
    responses: {
      201: { content: { 'application/json': { schema: z.object({ id: z.string(), upload: z.object({ url: z.string(), method: z.enum(['PUT', 'POST']), headers: z.record(z.string(), z.string()), fields: z.record(z.string(), z.string()).optional(), expiresAt: z.string() }) }) } }, description: 'Upload ready' },
      403: err('Not allowed'),
      404: err('Unknown'),
      409: err('Conflict'),
      422: err('Refused'),
      429: err('Quota'),
    },
  }),
  async (c) => {
    const me = c.get('user')
    if (!can(me.role, 'media.write')) return problem(c, 403, 'permission.denied', 'Forbidden')
    const body = c.req.valid('json')
    try {
      return c.json(await createUpload({ ...body, userId: me.id }), 201)
    } catch (e) {
      if (e instanceof MediaError) {
        await audit({ action: 'media.upload.rejected', result: 'failure', severity: 'info', actorId: me.id, actorRole: me.role, resourceLabel: body.name, ...requestMeta(c.get('headers')), meta: { reason: e.code } })
      }
      return mediaProblem(c, e)
    }
  },
)

/* ---------- Upload: 2. local storage only — the signed PUT target ---------- */
mediaRoutes.put('/api/admin/media/local-upload/uploads/:id', async (c) => {
  const local = getLocalStorage()
  if (!local) return problem(c, 404, 'not_found', 'Not found')
  const me = c.get('user')
  if (!can(me.role, 'media.write')) return problem(c, 403, 'permission.denied', 'Forbidden')
  const key = `uploads/${c.req.param('id')}`
  const ct = c.req.query('ct') ?? ''
  if (!verifyLocalUpload(key, ct, Number(c.req.query('exp')), c.req.query('sig') ?? '') || c.req.header('content-type') !== ct) {
    return problem(c, 403, 'upload.signature', 'Forbidden', 'Upload link invalid or expired.')
  }
  const declared = Number(c.req.header('content-length') ?? '0')
  if (declared > MAX_PDF_BYTES) return problem(c, 422, 'media.too_large', 'File too large')
  const body = Buffer.from(await c.req.arrayBuffer())
  if (body.length > MAX_PDF_BYTES) return problem(c, 422, 'media.too_large', 'File too large')
  await local.putPrivate(key, body)
  return c.body(null, 200)
})

/* ---------- Upload: 3. check, optimise, store ---------- */
mediaRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/api/admin/media/uploads/{id}/complete',
    summary: 'Check the uploaded file (real type, size), optimise it and add it to the library (or replace a media)',
    request: {
      params: z.object({ id: z.uuid() }),
      body: { content: { 'application/json': { schema: z.object({ replaceOf: z.uuid().optional() }) } }, required: false },
    },
    responses: {
      200: { content: { 'application/json': { schema: z.object({ media: MediaDto, duplicate: z.boolean() }) } }, description: 'Ready' },
      403: err('Not allowed'),
      404: err('Unknown upload'),
      409: err('Already processed'),
      422: err('Refused'),
      429: err('Quota'),
    },
  }),
  async (c) => {
    const me = c.get('user')
    if (!can(me.role, 'media.write')) return problem(c, 403, 'permission.denied', 'Forbidden')
    const { id } = c.req.valid('param')
    const replaceOf = (await c.req.json().catch(() => ({})))?.replaceOf as string | undefined
    const meta = requestMeta(c.get('headers'))
    try {
      const r = await completeUpload(id, me.id, replaceOf)
      const [row] = await db!.select({ m: media, n: usageCount }).from(media).where(eq(media.id, r.id)).limit(1)
      await audit({
        action: replaceOf ? 'media.replaced' : r.duplicate ? 'media.upload.duplicate' : 'media.uploaded',
        result: 'success',
        actorId: me.id,
        actorRole: me.role,
        resourceType: 'media',
        resourceId: r.id,
        resourceLabel: row!.m.name,
        ...meta,
        meta: { bytes: row!.m.bytes, kind: row!.m.kind },
      })
      return c.json({ media: dto(row!.m, me.email, row!.n), duplicate: r.duplicate }, 200)
    } catch (e) {
      if (e instanceof MediaError) {
        await audit({ action: 'media.upload.rejected', result: 'failure', severity: 'warning', actorId: me.id, actorRole: me.role, resourceType: 'media', resourceId: id, ...meta, meta: { reason: e.code } })
      }
      return mediaProblem(c, e)
    }
  },
)

/* ---------- Library ---------- */
mediaRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/api/admin/media',
    summary: 'List media, newest first (trash with trash=1)',
    request: {
      query: z.object({
        folder: z.enum(FOLDERS).optional(),
        kind: z.enum(media.kind.enumValues).optional(),
        q: z.string().max(80).optional(),
        trash: z.enum(['0', '1']).default('0'),
      }),
    },
    responses: { 200: { content: { 'application/json': { schema: z.object({ media: z.array(MediaDto) }) } }, description: 'Media' } },
  }),
  async (c) => {
    const q = c.req.valid('query')
    const where: SQL[] = [eq(media.status, 'ready'), q.trash === '1' ? isNotNull(media.deletedAt) : isNull(media.deletedAt)]
    if (q.folder) where.push(eq(media.folder, q.folder))
    if (q.kind) where.push(eq(media.kind, q.kind))
    if (q.q) {
      const like = `%${q.q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`
      where.push(or(ilike(media.name, like), sql`${media.alt}->>'fr' ilike ${like}`, sql`${media.alt}->>'en' ilike ${like}`)!)
    }
    const rows = await db!
      .select({ m: media, email: userTable.email, n: usageCount })
      .from(media)
      .leftJoin(userTable, eq(userTable.id, media.uploadedBy))
      .where(and(...where))
      .orderBy(desc(media.createdAt))
      .limit(200)
    return c.json({ media: rows.map((r) => dto(r.m, r.email, r.n)) }, 200)
  },
)

mediaRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/api/admin/media/{id}',
    summary: 'One media with the contents that use it',
    request: { params: z.object({ id: z.uuid() }) },
    responses: {
      200: { content: { 'application/json': { schema: z.object({ media: MediaDto, usages: z.array(z.object({ type: z.string(), key: z.string(), status: z.string(), field: z.string(), published: z.boolean() })) }) } }, description: 'Media' },
      404: err('Unknown'),
    },
  }),
  async (c) => {
    const { id } = c.req.valid('param')
    const [row] = await db!.select({ m: media, email: userTable.email, n: usageCount }).from(media).leftJoin(userTable, eq(userTable.id, media.uploadedBy)).where(eq(media.id, id)).limit(1)
    if (!row || row.m.status !== 'ready') return problem(c, 404, 'media.not_found', 'Not found')
    return c.json({ media: dto(row.m, row.email, row.n), usages: await usages(id) }, 200)
  },
)

/** Private file for the admin preview (never cached by shared caches). */
mediaRoutes.get('/api/admin/media/:id/file', async (c) => {
  const id = c.req.param('id')
  if (!z.uuid().safeParse(id).success) return problem(c, 404, 'media.not_found', 'Not found')
  const [m] = await db!.select().from(media).where(eq(media.id, id)).limit(1)
  if (!m || m.status !== 'ready') return problem(c, 404, 'media.not_found', 'Not found')
  const want = Number(c.req.query('w') ?? 480)
  const key = m.kind === 'pdf' ? m.originalKey! : (m.variants.find((v) => v.width >= want) ?? m.variants.at(-1))!.key
  const body = await getStorage().getPrivate(key)
  if (!body) return problem(c, 404, 'media.file_missing', 'File missing')
  return c.body(new Uint8Array(body), 200, {
    'Content-Type': m.kind === 'pdf' ? 'application/pdf' : 'image/webp',
    'Cache-Control': 'private, max-age=300',
    'Content-Disposition': m.kind === 'pdf' ? 'inline' : 'inline',
    'X-Content-Type-Options': 'nosniff',
  })
})

const Patch = z.object({
  name: z.string().min(1).max(160).optional(),
  folder: z.enum(FOLDERS).optional(),
  alt: Localized.optional(),
  caption: Localized.optional(),
  credit: z.string().max(160).nullable().optional(),
})

mediaRoutes.openapi(
  createRoute({
    method: 'patch',
    path: '/api/admin/media/{id}',
    summary: 'Edit descriptive information (name, folder, alternative text, caption, credit)',
    request: { params: z.object({ id: z.uuid() }), body: { content: { 'application/json': { schema: Patch } } } },
    responses: { 200: { content: { 'application/json': { schema: z.object({ media: MediaDto }) } }, description: 'Updated' }, 403: err('Not allowed'), 404: err('Unknown') },
  }),
  async (c) => {
    const me = c.get('user')
    if (!can(me.role, 'media.write')) return problem(c, 403, 'permission.denied', 'Forbidden')
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const clean = (v: { fr: string | null; en: string | null }) => ({ fr: v.fr?.trim() || null, en: v.en?.trim() || null })
    const [m] = await db!
      .update(media)
      .set({
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(body.folder ? { folder: body.folder } : {}),
        ...(body.alt ? { alt: clean(body.alt) } : {}),
        ...(body.caption ? { caption: clean(body.caption) } : {}),
        ...(body.credit !== undefined ? { credit: body.credit?.trim() || null } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(media.id, id), eq(media.status, 'ready')))
      .returning()
    if (!m) return problem(c, 404, 'media.not_found', 'Not found')
    await audit({ action: 'media.updated', result: 'success', actorId: me.id, actorRole: me.role, resourceType: 'media', resourceId: id, resourceLabel: m.name, ...requestMeta(c.get('headers')), meta: { fields: Object.keys(body) } })
    const [{ n } = { n: 0 }] = await db!.select({ n: usageCount }).from(media).where(eq(media.id, id))
    return c.json({ media: dto(m, null, n) }, 200)
  },
)

mediaRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/api/admin/media/{id}',
    summary: 'Move to the trash (refused while a content uses the file)',
    request: { params: z.object({ id: z.uuid() }) },
    responses: { 204: { description: 'In the trash' }, 403: err('Not allowed'), 404: err('Unknown'), 409: err('In use') },
  }),
  async (c) => {
    const me = c.get('user')
    const { id } = c.req.valid('param')
    const [m] = await db!.select().from(media).where(and(eq(media.id, id), eq(media.status, 'ready'), isNull(media.deletedAt))).limit(1)
    if (!m) return problem(c, 404, 'media.not_found', 'Not found')
    if (!can(me.role, 'media.delete.any') && !(can(me.role, 'media.delete.own') && m.uploadedBy === me.id)) return problem(c, 403, 'permission.denied', 'Forbidden')
    const used = await usages(id)
    if (used.length || m.isPublic) {
      await audit({ action: 'media.delete.refused', result: 'denied', severity: 'info', actorId: me.id, actorRole: me.role, resourceType: 'media', resourceId: id, resourceLabel: m.name, meta: { usages: used.length } })
      return problem(c, 409, 'media.in_use', 'In use', `Used by ${used.length} content(s): remove it from them first.`)
    }
    await db!.update(media).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(media.id, id))
    await audit({ action: 'media.trashed', result: 'success', actorId: me.id, actorRole: me.role, resourceType: 'media', resourceId: id, resourceLabel: m.name, ...requestMeta(c.get('headers')) })
    return c.body(null, 204)
  },
)

mediaRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/api/admin/media/{id}/restore',
    summary: 'Take a file out of the trash',
    request: { params: z.object({ id: z.uuid() }) },
    responses: { 204: { description: 'Restored' }, 403: err('Not allowed'), 404: err('Unknown'), 409: err('Duplicate') },
  }),
  async (c) => {
    const me = c.get('user')
    if (!can(me.role, 'media.write')) return problem(c, 403, 'permission.denied', 'Forbidden')
    const { id } = c.req.valid('param')
    const [m] = await db!.select().from(media).where(and(eq(media.id, id), isNotNull(media.deletedAt))).limit(1)
    if (!m) return problem(c, 404, 'media.not_found', 'Not found')
    try {
      await db!.update(media).set({ deletedAt: null, updatedAt: new Date() }).where(eq(media.id, id))
    } catch {
      return problem(c, 409, 'media.duplicate', 'The same file is already in the library')
    }
    await audit({ action: 'media.restored', result: 'success', actorId: me.id, actorRole: me.role, resourceType: 'media', resourceId: id, resourceLabel: m.name })
    return c.body(null, 204)
  },
)

/* ---------- Public files (local storage only; R2 serves its own public bucket) ---------- */
export const localMediaRoutes = new OpenAPIHono()
localMediaRoutes.get('/media/*', async (c) => {
  const local = getLocalStorage()
  if (!local) return c.notFound()
  const key = c.req.path.replace(/^\/media\//, '')
  let body: Buffer | null = null
  try {
    body = await local.readPublic(key)
  } catch {
    body = null
  }
  if (!body) return c.notFound()
  return c.body(new Uint8Array(body), 200, {
    'Content-Type': key.endsWith('.pdf') ? 'application/pdf' : 'image/webp',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  })
})
