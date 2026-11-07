import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { contactSchema } from '@portfolio/shared/contact'
import { db } from '../db/client'
import { contactMessages } from '../db/schema'
import { rateLimit } from '../lib/rate-limit'

/** POST /public/contact — real endpoint: validation, honeypot, rate limit, storage. */
const ErrorSchema = z
  .object({
    error: z.enum(['validation', 'rate_limited', 'unavailable']),
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

  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'local'
  const limit = rateLimit(`contact:${ip}`, 5, 10 * 60 * 1000)
  if (!limit.ok) {
    c.header('Retry-After', String(limit.retryAfter))
    return c.json({ error: 'rate_limited' as const, retryAfter: limit.retryAfter }, 429)
  }

  if (!db) return c.json({ error: 'unavailable' as const }, 503)

  try {
    await db.insert(contactMessages).values({
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
  } catch {
    return c.json({ error: 'unavailable' as const }, 503)
  }

  // Email notification (Resend) is added with the admin notifications.
  return c.json({ ok: true as const }, 201)
})
