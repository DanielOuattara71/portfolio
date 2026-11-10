import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { contactSchema } from '@portfolio/shared/contact'
import { and, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { contactMessages, contentItems, contentVersions } from '../db/schema'
import { audit } from '../services/audit'
import { dbRateLimit, notifyNewMessage } from '../services/messages'

/** POST /public/contact — real endpoint: validation, honeypot, rate limit, storage. */
const ErrorSchema = z
  .object({
    error: z.enum(['validation', 'rate_limited', 'unavailable', 'closed']),
    fields: z.array(z.string()).optional(),
    retryAfter: z.number().optional(),
  })
  .openapi('ContactError')

const route = createRoute({
  method: 'post',
  path: '/public/contact',
  summary: 'Send a message through the contact form',
  request: { body: { content: { 'application/json': { schema: contactSchema.openapi('ContactInput') } }, required: true } },
  responses: {
    201: { content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } }, description: 'Message stored' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Invalid fields' },
    429: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Too many messages' },
    503: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Storage unavailable' },
  },
})

export const contactRoutes = new OpenAPIHono({
  // Validation errors: list the invalid field names only (no internal details).
  defaultHook: (result, c) => {
    if (!result.success) {
      const fields = [...new Set(result.error.issues.map((i) => String(i.path[0] ?? 'body')))]
      return c.json({ error: 'validation' as const, fields }, 400)
    }
  },
})

contactRoutes.openapi(route, async (c) => {
  const input = c.req.valid('json')

  // Honeypot filled: answer like a success so bots learn nothing, store nothing.
  if (input.website) return c.json({ ok: true as const }, 201)

  if (!db) return c.json({ error: 'unavailable' as const }, 503)

  // Closed from the admin Settings (published version only): refuse without storing anything.
  try {
    const [row] = await db
      .select({ data: contentVersions.data })
      .from(contentItems)
      .innerJoin(contentVersions, eq(contentVersions.id, contentItems.publishedVersionId))
      .where(and(eq(contentItems.type, 'settings'), eq(contentItems.key, 'site'), eq(contentItems.status, 'published')))
      .limit(1)
    if (row && (row.data as { contactOpen?: boolean }).contactOpen === false) {
      return c.json({ error: 'closed' as const }, 503)
    }
  } catch {
    return c.json({ error: 'unavailable' as const }, 503)
  }

  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'local'
  // Shared (Postgres) limiter: works across Vercel instances, unlike memory.
  const limit = await dbRateLimit(`contact:${ip}`, 5, 10 * 60 * 1000)
  if (!limit.ok) {
    c.header('Retry-After', String(limit.retryAfter))
    return c.json({ error: 'rate_limited' as const, retryAfter: limit.retryAfter }, 429)
  }

  let insertedId: string | null = null
  try {
    const [row] = await db
      .insert(contactMessages)
      .values({
        profile: input.profile,
        name: input.name,
        email: input.email,
        company: input.company || null,
        role: input.role || null,
        projectTypes: input.projectTypes,
        timeline: input.timeline || null,
        message: input.message,
        locale: input.locale,
      })
      .returning({ id: contactMessages.id })
    insertedId = row?.id ?? null
  } catch {
    return c.json({ error: 'unavailable' as const }, 503)
  }

  await audit({
    action: 'contact.received',
    result: 'success',
    resourceType: 'contact_messages',
    resourceId: insertedId,
    meta: { profile: input.profile, locale: input.locale, types: input.projectTypes.length },
  })
  // Owner notification: failures are journalised (inside notifyNewMessage) and never block.
  if (insertedId) {
    await notifyNewMessage({
      id: insertedId,
      profile: input.profile,
      name: input.name,
      email: input.email,
      company: input.company || null,
      role: input.role || null,
      projectTypes: input.projectTypes,
      timeline: input.timeline || null,
      message: input.message,
      locale: input.locale,
    })
  }
  return c.json({ ok: true as const }, 201)
})
