import { contentDocSchema, emptySeo, type ContentType, type PublishIssue } from '@portfolio/shared/content'
import { and, desc, eq, ilike, inArray, max, or, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { contentItems, contentRefs, contentSlugs, contentVersions, media, redirects } from '../db/schema'
import { extractRefs, publishIssues } from './content-rules'
import { setMediaPublic } from './media'
import { revalidateSite } from './revalidate'

/**
 * Editorial workflow (docs/admin/03-workflow-editorial.md), the same for every content type:
 * - the WORKING copy is what the admin edits; the site only reads the PUBLISHED version (W1);
 * - saving is guarded by a revision number: nobody overwrites someone else's work silently;
 * - publishing is all-or-nothing (one transaction, W3), then public media and the site are refreshed;
 * - restoring a version gives a working copy, never a direct publication (W4).
 */
export class WorkflowError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: 404 | 409 | 422,
    public issues: PublishIssue[] = [],
  ) {
    super(message)
  }
}

type Item = typeof contentItems.$inferSelect
const MAX_CHECKPOINTS = 30

/** JSON with sorted keys: two documents are equal when their content is equal. */
export function stableJson(v: unknown): string {
  const norm = (x: unknown): unknown =>
    Array.isArray(x) ? x.map(norm) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, norm((x as Record<string, unknown>)[k])])) : x
  return JSON.stringify(norm(v))
}

export async function getItem(id: string) {
  const [item] = await db!.select().from(contentItems).where(eq(contentItems.id, id)).limit(1)
  return item ?? null
}
export async function getItemByKey(type: ContentType, key: string) {
  const [item] = await db!.select().from(contentItems).where(and(eq(contentItems.type, type), eq(contentItems.key, key))).limit(1)
  return item ?? null
}

async function publishedData(item: Item) {
  if (!item.publishedVersionId) return null
  const [v] = await db!.select().from(contentVersions).where(eq(contentVersions.id, item.publishedVersionId)).limit(1)
  return v ?? null
}

/** Everything the admin form needs: working copy, published copy, state, blocking issues. */
export async function itemView(item: Item) {
  const pub = await publishedData(item)
  const dirty = !pub || stableJson(pub.data) !== stableJson(item.working)
  return {
    id: item.id,
    type: item.type,
    key: item.key,
    status: item.status,
    featured: item.featured,
    position: item.position,
    /** A published version exists and the working copy differs ("Publié · modifié", also when in review). */
    modified: !!pub && dirty,
    revision: item.workingRevision,
    working: item.working,
    published: pub?.data ?? null,
    publishedAt: pub?.createdAt.toISOString() ?? null,
    updatedAt: item.workingUpdatedAt.toISOString(),
    updatedBy: item.workingUpdatedBy,
    pendingFields: item.pendingFields,
    issues: await publishIssues(item.type, item.working, item.pendingFields, item.id),
  }
}

function validateDraft(item: Pick<Item, 'type' | 'key'>, data: unknown) {
  const r = contentDocSchema(item.type, item.key).safeParse(data)
  if (!r.success) {
    throw new WorkflowError(
      'content.invalid',
      'Invalid content',
      422,
      r.error.issues.map((i) => ({ path: i.path.join('.'), code: 'invalid', message: i.message })),
    )
  }
  return r.data
}

type Tx = Parameters<Parameters<NonNullable<typeof db>['transaction']>[0]>[0]

/** Rebuilds the references of one side (working or published) of an item. */
async function writeRefs(tx: Tx, item: Pick<Item, 'id' | 'type'>, doc: unknown, published: boolean) {
  await tx.delete(contentRefs).where(and(eq(contentRefs.itemId, item.id), eq(contentRefs.published, published)))
  const refs = extractRefs(item.type, doc)
  if (!refs.length) return
  const keyed = refs.filter((r) => r.itemKey)
  const targets = keyed.length
    ? await tx
        .select({ id: contentItems.id, type: contentItems.type, key: contentItems.key })
        .from(contentItems)
        .where(inArray(contentItems.key, [...new Set(keyed.map((r) => r.itemKey!))]))
    : []
  type RefRow = typeof contentRefs.$inferInsert
  const rows: RefRow[] = []
  for (const r of refs) {
    if (r.mediaId) {
      rows.push({ itemId: item.id, field: r.field, refMediaId: r.mediaId, published })
      continue
    }
    const t = targets.find((x) => x.type === r.itemType && x.key === r.itemKey)
    if (t) rows.push({ itemId: item.id, field: r.field, refItemId: t.id, published })
  }
  // Media that no longer exist are reported by publishIssues; the foreign key would refuse them here.
  const mediaIds = rows.flatMap((r) => (r.refMediaId ? [r.refMediaId] : []))
  const existing = mediaIds.length ? new Set((await tx.select({ id: media.id }).from(media).where(inArray(media.id, mediaIds))).map((m) => m.id)) : new Set<string>()
  const valid = rows.filter((r) => !r.refMediaId || existing.has(r.refMediaId))
  if (valid.length) await tx.insert(contentRefs).values(valid)
}

export async function saveWorking(opts: { id: string; revision: number; data: unknown; userId: string; checkpoint?: boolean }) {
  const item = await getItem(opts.id)
  if (!item) throw new WorkflowError('content.not_found', 'Not found', 404)
  if (item.status === 'archived') throw new WorkflowError('content.archived', 'Archived content is read-only', 409)
  const data = validateDraft(item, opts.data)
  await db!.transaction(async (tx) => {
    const [updated] = await tx
      .update(contentItems)
      .set({ working: data, workingRevision: sql`${contentItems.workingRevision} + 1`, workingUpdatedAt: new Date(), workingUpdatedBy: opts.userId })
      .where(and(eq(contentItems.id, item.id), eq(contentItems.workingRevision, opts.revision)))
      .returning({ id: contentItems.id })
    if (!updated) throw new WorkflowError('content.conflict', 'Someone saved this content in the meantime', 409)
    await writeRefs(tx, item, data, false)
    if (opts.checkpoint) {
      const [{ n } = { n: 0 }] = await tx.select({ n: max(contentVersions.number) }).from(contentVersions).where(eq(contentVersions.itemId, item.id))
      await tx.insert(contentVersions).values({ itemId: item.id, number: (n ?? 0) + 1, kind: 'checkpoint', data, createdBy: opts.userId })
      // Keep the last 30 checkpoints; published versions are always kept.
      await tx.execute(sql`
        delete from content_version where item_id = ${item.id} and kind = 'checkpoint'
        and id not in (select id from content_version where item_id = ${item.id} and kind = 'checkpoint' order by number desc limit ${MAX_CHECKPOINTS})`)
    }
  })
  return itemView((await getItem(item.id))!)
}

export async function publish(opts: { id: string; revision: number; userId: string }) {
  const result = await db!.transaction(async (tx) => {
    const [item] = await tx.select().from(contentItems).where(eq(contentItems.id, opts.id)).for('update').limit(1)
    if (!item) throw new WorkflowError('content.not_found', 'Not found', 404)
    if (item.workingRevision !== opts.revision) throw new WorkflowError('content.conflict', 'The content changed since you opened it', 409)
    if (item.status === 'archived') throw new WorkflowError('content.archived', 'Restore it as a draft first', 409)
    const data = validateDraft(item, item.working)
    const issues = await publishIssues(item.type, data, item.pendingFields, item.id)
    if (issues.length) throw new WorkflowError('publish.blocked', 'Publication blocked', 422, issues)

    const [{ n } = { n: 0 }] = await tx.select({ n: max(contentVersions.number) }).from(contentVersions).where(eq(contentVersions.itemId, item.id))
    const [version] = await tx
      .insert(contentVersions)
      .values({ itemId: item.id, number: (n ?? 0) + 1, kind: 'published', data, createdBy: opts.userId })
      .returning({ id: contentVersions.id, number: contentVersions.number })
    await tx.update(contentItems).set({ publishedVersionId: version!.id, status: 'published', archivedAt: null }).where(eq(contentItems.id, item.id))

    // Addresses: keep the old ones as redirects (shared links keep working).
    const slug = (data as { slug?: { fr: string; en: string } }).slug
    if (slug) {
      const current = await tx.select().from(contentSlugs).where(eq(contentSlugs.itemId, item.id))
      for (const locale of ['fr', 'en'] as const) {
        const old = current.find((s) => s.locale === locale)
        if (old && old.slug !== slug[locale]) {
          await tx.insert(redirects).values({ type: item.type, locale, fromSlug: old.slug, itemId: item.id }).onConflictDoUpdate({ target: [redirects.type, redirects.locale, redirects.fromSlug], set: { itemId: item.id } })
        }
        await tx.delete(redirects).where(and(eq(redirects.type, item.type), eq(redirects.locale, locale), eq(redirects.fromSlug, slug[locale])))
      }
      await tx.delete(contentSlugs).where(eq(contentSlugs.itemId, item.id))
      await tx.insert(contentSlugs).values([
        { itemId: item.id, type: item.type, locale: 'fr', slug: slug.fr },
        { itemId: item.id, type: item.type, locale: 'en', slug: slug.en },
      ])
    }
    await writeRefs(tx, item, data, true)
    return { item, version: version! }
  })

  // After commit: public copies of media, then the site. Failures here do not undo the publication.
  const mediaSync = await syncPublicMedia().catch((e) => ({ error: String(e) }))
  const site = await revalidateSite()
  return { view: await itemView((await getItem(opts.id))!), version: result.version.number, mediaSync, siteRefreshed: site }
}

/** Working copy back to the published version. */
export async function discard(opts: { id: string; userId: string }) {
  const item = await getItem(opts.id)
  if (!item) throw new WorkflowError('content.not_found', 'Not found', 404)
  const pub = await publishedData(item)
  if (!pub) throw new WorkflowError('content.never_published', 'Nothing published to go back to', 409)
  await db!.transaction(async (tx) => {
    await tx
      .update(contentItems)
      .set({ working: pub.data, workingRevision: sql`${contentItems.workingRevision} + 1`, workingUpdatedAt: new Date(), workingUpdatedBy: opts.userId })
      .where(eq(contentItems.id, item.id))
    await writeRefs(tx, item, pub.data, false)
  })
  return itemView((await getItem(item.id))!)
}

export async function listVersions(id: string) {
  return db!
    .select({ number: contentVersions.number, kind: contentVersions.kind, createdAt: contentVersions.createdAt, createdBy: contentVersions.createdBy, id: contentVersions.id })
    .from(contentVersions)
    .where(eq(contentVersions.itemId, id))
    .orderBy(desc(contentVersions.number))
}

/** A past version becomes the working copy (W4: never published directly). */
export async function restoreVersion(opts: { id: string; number: number; userId: string }) {
  const item = await getItem(opts.id)
  if (!item) throw new WorkflowError('content.not_found', 'Not found', 404)
  const [v] = await db!.select().from(contentVersions).where(and(eq(contentVersions.itemId, item.id), eq(contentVersions.number, opts.number))).limit(1)
  if (!v) throw new WorkflowError('version.not_found', 'Version not found', 404)
  const data = validateDraft(item, v.data)
  await db!.transaction(async (tx) => {
    await tx
      .update(contentItems)
      .set({ working: data, workingRevision: sql`${contentItems.workingRevision} + 1`, workingUpdatedAt: new Date(), workingUpdatedBy: opts.userId })
      .where(eq(contentItems.id, item.id))
    await writeRefs(tx, item, data, false)
  })
  return itemView((await getItem(item.id))!)
}

/* ---------- List, create, order, featured, duplicate, lifecycle (module 6) ---------- */

export interface ListRow {
  id: string
  type: ContentType
  key: string
  status: string
  featured: boolean
  position: number
  modified: boolean
  revision: number
  working: unknown
  published: unknown
  publishedAt: string | null
  updatedAt: string
  updatedBy: string | null
  pendingFields: string[]
}

export async function listItems(opts: { type?: ContentType; status?: string; q?: string }): Promise<ListRow[]> {
  const like = opts.q ? `%${opts.q.replace(/[%_\\]/g, (m) => `\\${m}`)}%` : null
  const rows = await db!
    .select({
      item: contentItems,
      published: contentVersions.data,
      publishedAt: contentVersions.createdAt,
    })
    .from(contentItems)
    .leftJoin(contentVersions, eq(contentVersions.id, contentItems.publishedVersionId))
    .where(
      and(
        opts.type ? eq(contentItems.type, opts.type) : undefined,
        opts.status ? eq(contentItems.status, opts.status as Item['status']) : undefined,
        like ? or(ilike(contentItems.key, like), sql`${contentItems.working}::text ilike ${like}`) : undefined,
      ),
    )
    .orderBy(desc(contentItems.type), desc(contentItems.position))
  // Re-sort in JS to match loadPublishedContent order (type, position, key): drizzle desc on enum is awkward.
  rows.sort((a, b) => String(a.item.type).localeCompare(String(b.item.type)) || a.item.position - b.item.position || a.item.key.localeCompare(b.item.key))
  return rows.map(({ item, published, publishedAt }) => ({
    id: item.id,
    type: item.type,
    key: item.key,
    status: item.status,
    featured: item.featured,
    position: item.position,
    modified: !!published && stableJson(published) !== stableJson(item.working),
    revision: item.workingRevision,
    working: item.working,
    published,
    publishedAt: publishedAt?.toISOString() ?? null,
    updatedAt: item.workingUpdatedAt.toISOString(),
    updatedBy: item.workingUpdatedBy,
    pendingFields: item.pendingFields,
  }))
}

function emptyProjectDoc() {
  return {
    name: { fr: '', en: '' },
    slug: { fr: '', en: '' },
    kind: { fr: '', en: '' },
    context: null as null,
    solo: false,
    domains: [] as never[],
    stack: [] as string[],
    period: null as string | null,
    role: { fr: null as string | null, en: null as string | null },
    tagline: { fr: '', en: '' },
    summary: { fr: '', en: '' },
    links: [] as { kind: 'demo' | 'code' | 'store' | 'doc'; href: string }[],
    coverId: null as string | null,
    gallery: [] as { mediaId: string; caption: { fr: string | null; en: string | null } }[],
    caseStudy: {
      context: null,
      problem: null,
      goals: null,
      solution: null,
      architectureNote: null,
      techRoles: null,
      challenges: null,
      results: null,
    },
    seo: emptySeo(),
  }
}

async function nextProjectKey(): Promise<string> {
  const rows = await db!.select({ key: contentItems.key }).from(contentItems).where(eq(contentItems.type, 'project'))
  let max = 0
  for (const r of rows) {
    const m = /^PRJ-(\d+)$/.exec(r.key)
    if (m) max = Math.max(max, Number(m[1]))
  }
  // Never reuse a deleted number: the journal keeps the deleted keys (append-only).
  try {
    const { auditLog } = await import('../db/schema')
    const deleted = await db!.select({ label: auditLog.resourceLabel }).from(auditLog).where(eq(auditLog.action, 'content.deleted'))
    for (const r of deleted) {
      const m = /PRJ-(\d+)/.exec(r.label ?? '')
      if (m) max = Math.max(max, Number(m[1]))
    }
  } catch {
    /* journal unreadable: fall back to existing keys only */
  }
  return `PRJ-${String(max + 1).padStart(2, '0')}`
}

export async function createProject(userId: string) {
  const key = await nextProjectKey()
  const data = validateDraft({ type: 'project', key }, emptyProjectDoc())
  return db!.transaction(async (tx) => {
    const [{ n } = { n: 0 }] = await tx.select({ n: max(contentItems.position) }).from(contentItems).where(eq(contentItems.type, 'project'))
    const [item] = await tx
      .insert(contentItems)
      .values({ type: 'project', key, position: (n ?? 0) + 1, status: 'draft', featured: false, working: data, workingRevision: 1, workingUpdatedBy: userId, pendingFields: [] })
      .returning()
    if (!item) throw new WorkflowError('content.create_failed', 'Could not create project', 409)
    await writeRefs(tx, item, data, false)
    return itemView(item)
  })
}

function emptyFor(type: ContentType, key: string): unknown {
  switch (type) {
    case 'skill':
      return { name: { fr: '', en: '' }, level: 'practised', visible: true, ribbon: null }
    case 'service':
      return { title: { fr: '', en: '' }, description: { fr: '', en: '' }, cases: { fr: [], en: [] }, deliverables: { fr: '', en: '' }, projects: [] }
    case 'step':
      return { title: { fr: '', en: '' }, text: { fr: '', en: '' } }
    case 'experience':
    case 'education':
      return { org: '', kind: { fr: '', en: '' }, role: { fr: '', en: '' }, period: null, details: null, project: null, justificatifId: null }
    case 'certification':
      return { name: { fr: '', en: '' }, issuer: '', issuedOn: null, expiresOn: null, credentialUrl: null }
    default:
      throw new WorkflowError('content.invalid', 'Creation is not supported for this type in this module', 422)
  }
}

async function nextKeyFor(type: ContentType): Promise<string> {
  const short = crypto.randomUUID().slice(0, 8)
  if (type === 'step') {
    const rows = await db!.select({ key: contentItems.key }).from(contentItems).where(eq(contentItems.type, 'step'))
    let max = 0
    for (const r of rows) {
      const m = /^step-(\d+)$/.exec(r.key)
      if (m) max = Math.max(max, Number(m[1]))
    }
    return `step-${max + 1}`
  }
  if (type === 'skill') return `skill-${short}`
  if (type === 'service') return `service-${short}`
  if (type === 'experience') return `experience-${short}`
  if (type === 'education') return `education-${short}`
  if (type === 'certification') return `certification-${short}`
  throw new WorkflowError('content.invalid', 'Creation is not supported for this type in this module', 422)
}

export async function createContent(type: ContentType, userId: string) {
  if (type === 'project') return createProject(userId)
  if (type === 'block' || type === 'domain' || type === 'settings') {
    throw new WorkflowError('content.invalid', 'This type is not created here (imported or fixed). Edit the existing item instead.', 422)
  }
  const key = await nextKeyFor(type)
  const data = validateDraft({ type, key }, emptyFor(type, key))
  return db!.transaction(async (tx) => {
    const [{ n } = { n: 0 }] = await tx.select({ n: max(contentItems.position) }).from(contentItems).where(eq(contentItems.type, type))
    const [item] = await tx
      .insert(contentItems)
      .values({ type, key, position: (n ?? 0) + 1, status: 'draft', featured: false, working: data, workingRevision: 1, workingUpdatedBy: userId, pendingFields: [] })
      .returning()
    if (!item) throw new WorkflowError('content.create_failed', 'Could not create content', 409)
    await writeRefs(tx, item, data, false)
    return itemView(item)
  })
}

export async function reorder(opts: { type: ContentType; ids: string[] }) {
  await db!.transaction(async (tx) => {
    for (let i = 0; i < opts.ids.length; i++) {
      await tx.update(contentItems).set({ position: i }).where(and(eq(contentItems.id, opts.ids[i]!), eq(contentItems.type, opts.type)))
    }
  })
  return { siteRefreshed: await revalidateSite() }
}

export async function setFeatured(id: string, featured: boolean) {
  const item = await getItem(id)
  if (!item) throw new WorkflowError('content.not_found', 'Not found', 404)
  await db!.update(contentItems).set({ featured }).where(eq(contentItems.id, id))
  const siteRefreshed = await revalidateSite()
  return { view: await itemView((await getItem(id))!), siteRefreshed }
}

export async function duplicateItem(id: string, userId: string) {
  const src = await getItem(id)
  if (!src) throw new WorkflowError('content.not_found', 'Not found', 404)
  if (src.type !== 'project') throw new WorkflowError('content.invalid', 'Duplication is only supported for projects in this module', 422)
  const key = await nextProjectKey()
  const data = validateDraft({ type: 'project', key }, src.working)
  return db!.transaction(async (tx) => {
    const [{ n } = { n: 0 }] = await tx.select({ n: max(contentItems.position) }).from(contentItems).where(eq(contentItems.type, 'project'))
    const [item] = await tx
      .insert(contentItems)
      .values({ type: 'project', key, position: (n ?? 0) + 1, status: 'draft', featured: false, working: data, workingRevision: 1, workingUpdatedBy: userId, pendingFields: src.pendingFields })
      .returning()
    if (!item) throw new WorkflowError('content.create_failed', 'Could not duplicate project', 409)
    await writeRefs(tx, item, data, false)
    return itemView(item)
  })
}

export async function submitItem(id: string) {
  const item = await getItem(id)
  if (!item) throw new WorkflowError('content.not_found', 'Not found', 404)
  if (item.status === 'archived') throw new WorkflowError('content.archived', 'Archived content is read-only', 409)
  if (item.status === 'published' && !item.publishedVersionId) throw new WorkflowError('content.invalid', 'Nothing to submit', 409)
  await db!.update(contentItems).set({ status: 'in_review', workingUpdatedAt: new Date() }).where(eq(contentItems.id, id))
  return itemView((await getItem(id))!)
}

async function withdrawPublished(tx: Tx, item: Item) {
  await tx.update(contentItems).set({ publishedVersionId: null }).where(eq(contentItems.id, item.id))
  await tx.delete(contentSlugs).where(eq(contentSlugs.itemId, item.id))
  await tx.delete(redirects).where(and(eq(redirects.type, item.type), eq(redirects.itemId, item.id)))
  await tx.delete(contentRefs).where(and(eq(contentRefs.itemId, item.id), eq(contentRefs.published, true)))
}

export async function unpublishItem(id: string) {
  return db!.transaction(async (tx) => {
    const [item] = await tx.select().from(contentItems).where(eq(contentItems.id, id)).for('update').limit(1)
    if (!item) throw new WorkflowError('content.not_found', 'Not found', 404)
    if (!item.publishedVersionId) throw new WorkflowError('content.never_published', 'Nothing published', 409)
    await withdrawPublished(tx, item)
    await tx.update(contentItems).set({ status: 'draft' }).where(eq(contentItems.id, id))
    return item
  }).then(async () => {
    const mediaSync = await syncPublicMedia().catch((e) => ({ error: String(e) }))
    const siteRefreshed = await revalidateSite()
    return { view: await itemView((await getItem(id))!), mediaSync, siteRefreshed }
  })
}

export async function archiveItem(id: string) {
  return db!.transaction(async (tx) => {
    const [item] = await tx.select().from(contentItems).where(eq(contentItems.id, id)).for('update').limit(1)
    if (!item) throw new WorkflowError('content.not_found', 'Not found', 404)
    if (item.status === 'archived') throw new WorkflowError('content.archived', 'Already archived', 409)
    if (item.publishedVersionId) await withdrawPublished(tx, item)
    await tx.update(contentItems).set({ status: 'archived', archivedAt: new Date(), publishedVersionId: null }).where(eq(contentItems.id, id))
    return item
  }).then(async () => {
    const mediaSync = await syncPublicMedia().catch((e) => ({ error: String(e) }))
    const siteRefreshed = await revalidateSite()
    return { view: await itemView((await getItem(id))!), mediaSync, siteRefreshed }
  })
}

export async function unarchiveItem(id: string) {
  const item = await getItem(id)
  if (!item) throw new WorkflowError('content.not_found', 'Not found', 404)
  if (item.status !== 'archived') throw new WorkflowError('content.invalid', 'Not archived', 409)
  await db!.update(contentItems).set({ status: 'draft', archivedAt: null }).where(eq(contentItems.id, id))
  return itemView((await getItem(id))!)
}

export async function deleteItem(id: string) {
  return db!.transaction(async (tx) => {
    const [item] = await tx.select().from(contentItems).where(eq(contentItems.id, id)).for('update').limit(1)
    if (!item) throw new WorkflowError('content.not_found', 'Not found', 404)
    const [ever] = await tx.select({ id: contentVersions.id }).from(contentVersions).where(and(eq(contentVersions.itemId, id), eq(contentVersions.kind, 'published'))).limit(1)
    if (ever && item.status !== 'archived') throw new WorkflowError('content.published_not_archived', 'Archive it before deleting it', 409)
    const [referenced] = await tx.select({ id: contentRefs.itemId }).from(contentRefs).where(eq(contentRefs.refItemId, id)).limit(1)
    if (referenced) throw new WorkflowError('content.referenced', 'This project is linked from a service or an experience', 409)
    const snapshot = { id: item.id, type: item.type, key: item.key }
    await tx.delete(contentItems).where(eq(contentItems.id, id))
    return snapshot
  }).then(async (snapshot) => {
    const mediaSync = await syncPublicMedia().catch((e) => ({ error: String(e) }))
    const siteRefreshed = await revalidateSite()
    return { snapshot, mediaSync, siteRefreshed }
  })
}

async function docFor(side: string, item: Item): Promise<unknown> {
  if (side === 'working') return item.working
  if (side === 'published') {
    const pub = await publishedData(item)
    return pub?.data ?? null
  }
  const m = /^v(\d+)$/.exec(side)
  if (m) {
    const [v] = await db!.select().from(contentVersions).where(and(eq(contentVersions.itemId, item.id), eq(contentVersions.number, Number(m[1])))).limit(1)
    if (!v) throw new WorkflowError('version.not_found', 'Version not found', 404)
    return v.data
  }
  throw new WorkflowError('content.invalid', 'Unknown side (working, published or vN)', 422)
}

function diffDocs(path: string, a: unknown, b: unknown, out: { path: string; from: unknown; to: unknown }[]) {
  if (stableJson(a) === stableJson(b)) return
  const isObj = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v)
  if (isObj(a) && isObj(b)) {
    const keys = new Set([...Object.keys(a as Record<string, unknown>), ...Object.keys(b as Record<string, unknown>)])
    for (const k of [...keys].sort()) diffDocs(path ? `${path}.${k}` : k, (a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], out)
    return
  }
  out.push({ path: path || '(document)', from: a ?? null, to: b ?? null })
}

export async function diffItem(id: string, from: string, to: string) {
  const item = await getItem(id)
  if (!item) throw new WorkflowError('content.not_found', 'Not found', 404)
  const [a, b] = await Promise.all([docFor(from, item), docFor(to, item)])
  const differences: { path: string; from: unknown; to: unknown }[] = []
  diffDocs('', a, b, differences)
  return { from, to, differences }
}

export async function confirmField(id: string, path: string) {
  const item = await getItem(id)
  if (!item) throw new WorkflowError('content.not_found', 'Not found', 404)
  if (!item.pendingFields.includes(path)) throw new WorkflowError('content.invalid', 'Field is not marked « à valider »', 422)
  const next = item.pendingFields.filter((p) => p !== path)
  await db!.update(contentItems).set({ pendingFields: next }).where(eq(contentItems.id, id))
  return itemView((await getItem(id))!)
}

/**
 * A media file is public exactly while a PUBLISHED version uses it.
 * Called after every publication; idempotent.
 */
export async function syncPublicMedia() {
  // Private proofs (justificatifs) never become public (docs/admin/02 §F).
  const used = new Set(
    (
      await db!
        .selectDistinct({ id: contentRefs.refMediaId })
        .from(contentRefs)
        .where(and(eq(contentRefs.published, true), sql`${contentRefs.refMediaId} is not null`, sql`${contentRefs.field} <> 'justificatifId'`))
    ).map((r) => r.id!),
  )
  const all = await db!.select({ id: media.id, isPublic: media.isPublic, status: media.status }).from(media)
  let published = 0
  let withdrawn = 0
  for (const m of all) {
    if (m.status !== 'ready') continue
    if (used.has(m.id) && !m.isPublic) {
      await setMediaPublic(m.id, true)
      published++
    } else if (!used.has(m.id) && m.isPublic) {
      await setMediaPublic(m.id, false)
      withdrawn++
    }
  }
  return { published, withdrawn }
}
