import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import type { ContentType, PublicMedia } from '@portfolio/shared/content'
import { and, asc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { db } from '../../db/client'
import { contentItems, contentSlugs, contentVersions, media, redirects } from '../../db/schema'
import { extractRefs } from '../../services/content-rules'
import { publicUrls } from '../../services/media'
import { loadPreviewContent } from '../../services/preview'

/**
 * Everything the public site shows, in one cached response (admin module 3).
 * Only PUBLISHED versions are read: a working copy never reaches visitors (docs/admin/03, rule W1).
 * Fields still marked "à valider" are removed, whatever the version says.
 */
export const publicContentRoutes = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) return c.json({ title: 'Invalid request', status: 400, code: 'request.invalid' }, 400, { 'Content-Type': 'application/problem+json' })
  },
})

type Entry = { key: string; featured: boolean; doc: Record<string, unknown> }

/** Removes "a.b.c" paths listed in pending_fields (e.g. "caseStudy.problem"). */
function withoutPending(doc: Record<string, unknown>, pending: string[]): Record<string, unknown> {
  if (!pending.length) return doc
  const copy = structuredClone(doc)
  for (const path of pending) {
    const parts = path.split('.')
    let node: Record<string, unknown> | undefined = copy
    for (const p of parts.slice(0, -1)) node = node?.[p] as Record<string, unknown> | undefined
    const last = parts.at(-1)
    if (node && last && last in node) node[last] = null
  }
  return copy
}

export async function loadPublishedContent() {
  if (!db) throw new Error('DATABASE_URL is not set')
  const rows = await db
    .select({ type: contentItems.type, key: contentItems.key, featured: contentItems.featured, pending: contentItems.pendingFields, data: contentVersions.data })
    .from(contentItems)
    .innerJoin(contentVersions, eq(contentVersions.id, contentItems.publishedVersionId))
    .where(and(eq(contentItems.status, 'published'), isNotNull(contentItems.publishedVersionId)))
    .orderBy(asc(contentItems.type), asc(contentItems.position), asc(contentItems.key))

  const byType = (t: ContentType): Entry[] =>
    rows.filter((r) => r.type === t).map((r) => ({ key: r.key, featured: r.featured, doc: withoutPending(r.data as Record<string, unknown>, r.pending) }))
  const one = (t: ContentType, key: string) => byType(t).find((e) => e.key === key)?.doc ?? null

  // Media used by published documents, with the URLs of their PUBLIC copies only.
  const mediaIds = new Set<string>()
  for (const r of rows) for (const ref of extractRefs(r.type, r.data)) if (ref.mediaId) mediaIds.add(ref.mediaId)
  const mediaRows = mediaIds.size
    ? await db.select().from(media).where(and(inArray(media.id, [...mediaIds]), eq(media.isPublic, true), eq(media.status, 'ready'), isNull(media.deletedAt)))
    : []
  const mediaMap: Record<string, PublicMedia> = Object.fromEntries(
    mediaRows.map((m) => {
      const urls = publicUrls(m)
      return [m.id, { kind: m.kind, alt: m.alt, width: m.width, height: m.height, variants: urls.variants, file: urls.file }]
    }),
  )

  // Former addresses → current address (the site answers 301).
  const redirectRows = await db.select({ type: redirects.type, locale: redirects.locale, from: redirects.fromSlug, itemId: redirects.itemId }).from(redirects)
  const slugRows = await db.select({ itemId: contentSlugs.itemId, locale: contentSlugs.locale, slug: contentSlugs.slug }).from(contentSlugs).where(eq(contentSlugs.type, 'project'))
  const currentSlug = new Map(slugRows.map((s) => [`${s.itemId}:${s.locale}`, s.slug]))
  const publicRedirects = redirectRows.map((r) => ({ type: r.type, locale: r.locale, from: r.from, to: currentSlug.get(`${r.itemId}:${r.locale}`) ?? null }))

  return {
    settings: one('settings', 'site'),
    media: mediaMap,
    redirects: publicRedirects,
    blocks: {
      hero: one('block', 'hero'),
      profile: one('block', 'profile'),
      introProjects: one('block', 'intro-projects'),
      introProfile: one('block', 'intro-profile'),
      introServices: one('block', 'intro-services'),
      introBackground: one('block', 'intro-background'),
      introApproach: one('block', 'intro-approach'),
      introExpertise: one('block', 'intro-expertise'),
      introContact: one('block', 'intro-contact'),
      band: one('block', 'band'),
      footer: one('block', 'footer'),
      legal: one('block', 'legal'),
      privacy: one('block', 'privacy'),
      seoHome: one('block', 'seo-home'),
      seoProjects: one('block', 'seo-projects'),
      seoProfile: one('block', 'seo-profile'),
      seoExpertise: one('block', 'seo-expertise'),
      seoContact: one('block', 'seo-contact'),
    },
    projects: byType('project'),
    skills: byType('skill'),
    domains: byType('domain'),
    services: byType('service'),
    steps: byType('step'),
    experience: byType('experience'),
    education: byType('education'),
    certifications: byType('certification'),
    generatedAt: new Date().toISOString(),
  }
}

const EntrySchema = z.object({ key: z.string(), featured: z.boolean(), doc: z.record(z.string(), z.unknown()) })
const ContentSchema = z
  .object({
    settings: z.record(z.string(), z.unknown()).nullable(),
    media: z.record(z.string(), z.unknown()),
    redirects: z.array(z.object({ type: z.string(), locale: z.enum(['fr', 'en']), from: z.string(), to: z.string().nullable() })),
    blocks: z.object({
      hero: z.record(z.string(), z.unknown()).nullable(),
      profile: z.record(z.string(), z.unknown()).nullable(),
      introProjects: z.record(z.string(), z.unknown()).nullable(),
      introProfile: z.record(z.string(), z.unknown()).nullable(),
      introServices: z.record(z.string(), z.unknown()).nullable(),
      introBackground: z.record(z.string(), z.unknown()).nullable(),
      introApproach: z.record(z.string(), z.unknown()).nullable(),
      introExpertise: z.record(z.string(), z.unknown()).nullable(),
      introContact: z.record(z.string(), z.unknown()).nullable(),
      band: z.record(z.string(), z.unknown()).nullable(),
      footer: z.record(z.string(), z.unknown()).nullable(),
      legal: z.record(z.string(), z.unknown()).nullable(),
      privacy: z.record(z.string(), z.unknown()).nullable(),
      seoHome: z.record(z.string(), z.unknown()).nullable(),
      seoProjects: z.record(z.string(), z.unknown()).nullable(),
      seoProfile: z.record(z.string(), z.unknown()).nullable(),
      seoExpertise: z.record(z.string(), z.unknown()).nullable(),
      seoContact: z.record(z.string(), z.unknown()).nullable(),
    }),
    projects: z.array(EntrySchema),
    skills: z.array(EntrySchema),
    domains: z.array(EntrySchema),
    services: z.array(EntrySchema),
    steps: z.array(EntrySchema),
    experience: z.array(EntrySchema),
    education: z.array(EntrySchema),
    certifications: z.array(EntrySchema),
    generatedAt: z.string(),
  })
  .openapi('PublishedContent')

publicContentRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/public/content',
    summary: 'All published content, both languages (documents validated by @portfolio/shared/content)',
    responses: {
      200: { content: { 'application/json': { schema: ContentSchema } }, description: 'Published content' },
      503: { content: { 'application/json': { schema: z.object({ code: z.string() }) } }, description: 'Database unavailable' },
    },
  }),
  async (c) => {
    try {
      const content = await loadPublishedContent()
      // Short shared cache: a publication shows up within a minute even before on-demand refresh exists.
      c.header('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300')
      return c.json(content as z.infer<typeof ContentSchema>, 200)
    } catch (e) {
      console.error('[public/content]', e)
      return c.json({ code: 'content.unavailable' }, 503)
    }
  },
)

publicContentRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/public/preview/{token}',
    summary: 'Private preview: published shape with one working copy swapped in ("à valider" fields stay visible, listed in preview.pendingFields)',
    request: { params: z.object({ token: z.string().min(10).max(2000) }) },
    responses: {
      200: { content: { 'application/json': { schema: ContentSchema.extend({ preview: z.object({ itemId: z.string(), type: z.string(), key: z.string(), pendingFields: z.array(z.string()) }) }) } }, description: 'Preview content' },
      403: { content: { 'application/json': { schema: z.object({ code: z.string() }) } }, description: 'Invalid or expired token' },
      404: { content: { 'application/json': { schema: z.object({ code: z.string() }) } }, description: 'Content not found' },
      503: { content: { 'application/json': { schema: z.object({ code: z.string() }) } }, description: 'Unavailable' },
    },
  }),
  async (c) => {
    const { token } = c.req.valid('param')
    try {
      const { content, marked } = await loadPreviewContent(token)
      c.header('Cache-Control', 'private, no-store')
      c.header('X-Robots-Tag', 'noindex, nofollow')
      return c.json({ ...content, preview: marked } as never, 200)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unavailable'
      if (msg === 'Invalid token' || msg === 'Token expired') return c.json({ code: 'preview.invalid_token' }, 403)
      if (msg === 'Content not found') return c.json({ code: 'preview.not_found' }, 404)
      console.error('[public/preview]', e)
      return c.json({ code: 'preview.unavailable' }, 503)
    }
  },
)
