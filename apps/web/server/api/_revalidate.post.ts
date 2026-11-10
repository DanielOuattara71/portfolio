import { timingSafeEqual } from 'node:crypto'
import { invalidatePublishedContent } from '../utils/content'

/**
 * Called by the API right after a publication so the change shows on the next
 * page view instead of within 60 s. Checked with a shared secret:
 * runtimeConfig.revalidateToken (NUXT_REVALIDATE_TOKEN) against x-revalidate-token.
 * On Vercel this empties one instance only; the others refresh within 60 s.
 */
export default defineEventHandler(async (event) => {
  const expected = useRuntimeConfig().revalidateToken ?? ''
  const given = getHeader(event, 'x-revalidate-token') ?? ''
  const ok = expected.length > 0 && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  if (!ok) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  invalidatePublishedContent()
  return { ok: true }
})
