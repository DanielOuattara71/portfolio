/**
 * Imports the initial content (src/seed/*.ts, the site content before the admin existed) into the database,
 * as PUBLISHED version 1 ("import"), so the site stays identical once it reads from the API.
 * Fields marked "à valider" keep that mark (pending_fields) and will block their next publication.
 *
 *   pnpm --filter @portfolio/api db:seed            # imports what is missing, never overwrites
 *   pnpm --filter @portfolio/api db:seed --replace  # local only: wipes content tables first
 */
import {
  contentDocSchema,
  emptySeo,
  type ContentType,
  type ProjectDoc,
  type ServiceDoc,
  type SettingsDoc,
  type SkillDoc,
  type TimelineDoc,
} from '@portfolio/shared/content'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { contentItems, contentRefs, contentSlugs, contentVersions, redirects } from '../db/schema'
import { homeSeed } from '../seed/home'
import { approachSeed, domainsSeed, educationSeed, experienceSeed, profileSeed, servicesSeed, skillsSeed, type TimelineSeed } from '../seed/profile'
import { projectsSeed } from '../seed/projects'
import { techSeed } from '../seed/tech'

type Draft = { type: ContentType; key: string; doc: unknown; featured?: boolean; pending?: string[] }
type Ref = { from: string; field: string; to: string } // "type:key" ids

const slugKey = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/* ---------- Skills (with the ribbon and project technologies) ---------- */
// Technologies used by projects or the ribbon that are not listed in the Expertise matrix:
// imported as hidden skills so every project technology points to a real skill.
const hiddenSkills = ['Dart', 'JavaScript', 'Nuxt', 'TypeScript', 'Hono', 'PostgreSQL', 'Vercel']
// Ribbon tiles whose label differs from the skill name.
const ribbonAlias: Record<string, string> = { 'LLM APIs': 'llm-api-integration', RAG: 'rag-agents' }

const skills: { key: string; doc: SkillDoc }[] = [
  ...skillsSeed.map((s) => ({ key: slugKey(s.name.en), doc: { name: s.name, level: s.level, visible: true, ribbon: null } as SkillDoc })),
  ...hiddenSkills.map((n) => ({ key: slugKey(n), doc: { name: { fr: n, en: n }, level: 'practised', visible: false, ribbon: null } as SkillDoc })),
]
const skillByName = (name: string) => skills.find((s) => s.doc.name.en === name || s.doc.name.fr === name || s.key === slugKey(name))

techSeed.forEach((t, position) => {
  const skill = ribbonAlias[t.name] ? skills.find((s) => s.key === ribbonAlias[t.name]) : skillByName(t.name)
  if (!skill) throw new Error(`Ribbon tile "${t.name}" has no matching skill`)
  skill.doc.ribbon = {
    position,
    label: skill.doc.name.en === t.name ? null : t.name,
    path: t.path ?? null,
    bg: t.bg ?? null,
    fg: t.fg ?? null,
    short: t.short ?? null,
  }
})

/* ---------- Everything else ---------- */
const drafts: Draft[] = []
const refs: Ref[] = []

const settings: SettingsDoc = {
  // Values of apps/web/app/composables/useSite.ts: nothing is known yet, it will be entered in the admin.
  name: null,
  initials: null,
  email: null,
  photoId: null,
  cv: { fr: null, en: null },
  links: [],
  available: true,
  availability: { fr: null, en: null },
  timezone: null,
  city: null,
  contactOpen: true,
  defaultLocale: 'en',
}
drafts.push({ type: 'settings', key: 'site', doc: settings })
drafts.push({ type: 'block', key: 'hero', doc: homeSeed })
drafts.push({ type: 'block', key: 'profile', doc: profileSeed })

for (const p of projectsSeed) {
  const stack = p.stack.map((name) => {
    const s = skillByName(name)
    if (!s) throw new Error(`Project ${p.id}: technology "${name}" has no matching skill`)
    refs.push({ from: `project:${p.id}`, field: 'stack', to: `skill:${s.key}` })
    return s.key
  })
  const { pending, gallery, ...caseStudy } = p.caseStudy
  const doc: ProjectDoc = {
    name: p.name,
    slug: p.slug,
    kind: p.kind,
    context: p.context,
    solo: p.solo ?? false,
    domains: p.domains,
    stack,
    period: p.period,
    role: p.role,
    tagline: p.tagline,
    summary: p.summary,
    links: p.links ?? [],
    coverId: null,
    gallery: [],
    caseStudy,
    seo: emptySeo(),
  }
  if (p.cover || gallery.length) throw new Error(`Project ${p.id}: seed images cannot be imported (no media library yet)`)
  drafts.push({ type: 'project', key: p.id, doc, featured: p.featured, pending: (pending ?? []).map((f) => `caseStudy.${f}`) })
}

for (const s of skills) drafts.push({ type: 'skill', key: s.key, doc: s.doc })

for (const d of domainsSeed) {
  drafts.push({ type: 'domain', key: d.key, doc: { key: d.key, name: { fr: d.name, en: d.name }, level: d.level, description: d.description } })
}

servicesSeed.forEach((s, i) => {
  const key = slugKey(s.title.en)
  const doc: ServiceDoc = { title: s.title, description: s.description, cases: s.cases, deliverables: s.deliverables, projects: s.projectIds }
  s.projectIds.forEach((id) => refs.push({ from: `service:${key}`, field: 'projects', to: `project:${id}` }))
  drafts.push({ type: 'service', key, doc })
  void i
})

approachSeed.fr.forEach((step, i) => {
  const en = approachSeed.en[i]
  if (!en) throw new Error(`Approach step ${i + 1} has no English version`)
  drafts.push({ type: 'step', key: `step-${i + 1}`, doc: { title: { fr: step.title, en: en.title }, text: { fr: step.text, en: en.text } } })
})

const timeline = (type: 'experience' | 'education', list: TimelineSeed[]) =>
  list.forEach((e) => {
    const key = slugKey(`${e.org} ${e.kind.en}`)
    const doc: TimelineDoc = { org: e.org, kind: e.kind, role: e.role, period: e.period, details: e.details, project: e.projectId ?? null }
    if (e.projectId) refs.push({ from: `${type}:${key}`, field: 'project', to: `project:${e.projectId}` })
    drafts.push({ type, key, doc })
  })
timeline('experience', experienceSeed)
timeline('education', educationSeed)

/* ---------- Validate everything before touching the database ---------- */
const problems: string[] = []
for (const d of drafts) {
  const r = contentDocSchema(d.type, d.key).safeParse(d.doc)
  if (!r.success) problems.push(`${d.type}:${d.key} → ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
}
if (problems.length) {
  console.error('Seed content does not match the content schemas:\n' + problems.join('\n'))
  process.exit(1)
}

/* ---------- Write ---------- */
async function main() {
  if (!db) throw new Error('DATABASE_URL is not set')
  const replace = process.argv.includes('--replace')
  if (replace && process.env.NODE_ENV === 'production') throw new Error('--replace is refused in production')

  const summary = await db.transaction(async (tx) => {
    if (replace) {
      // FK-safe order: children first (refs → slugs/redirects → versions → items).
      await tx.delete(contentRefs)
      await tx.delete(contentSlugs)
      await tx.delete(redirects)
      await tx.delete(contentVersions)
      await tx.delete(contentItems)
    }
    const ids = new Map<string, string>()
    const created: string[] = []
    const skipped: string[] = []
    const positions = new Map<ContentType, number>()

    for (const d of drafts) {
      const position = positions.get(d.type) ?? 0
      positions.set(d.type, position + 1)
      const existing = await tx.query.contentItems.findFirst({ where: (t, { and }) => and(eq(t.type, d.type), eq(t.key, d.key)) })
      if (existing) {
        ids.set(`${d.type}:${d.key}`, existing.id)
        skipped.push(`${d.type}:${d.key}`)
        continue
      }
      const [item] = await tx
        .insert(contentItems)
        .values({ type: d.type, key: d.key, position, status: 'published', featured: d.featured ?? false, working: d.doc, pendingFields: d.pending ?? [] })
        .returning({ id: contentItems.id })
      if (!item) throw new Error(`Insert failed for ${d.type}:${d.key}`)
      const [version] = await tx
        .insert(contentVersions)
        .values({ itemId: item.id, number: 1, kind: 'import', data: d.doc })
        .returning({ id: contentVersions.id })
      if (!version) throw new Error(`Version insert failed for ${d.type}:${d.key}`)
      await tx.update(contentItems).set({ publishedVersionId: version.id }).where(eq(contentItems.id, item.id))
      if (d.type === 'project') {
        const slug = (d.doc as ProjectDoc).slug
        await tx.insert(contentSlugs).values([
          { itemId: item.id, type: 'project', locale: 'fr', slug: slug.fr },
          { itemId: item.id, type: 'project', locale: 'en', slug: slug.en },
        ])
      }
      ids.set(`${d.type}:${d.key}`, item.id)
      created.push(`${d.type}:${d.key}`)
    }

    // References only for items created now (existing ones keep theirs).
    const fresh = new Set(created)
    const rows = refs
      .filter((r) => fresh.has(r.from))
      .map((r) => {
        const itemId = ids.get(r.from)
        const refItemId = ids.get(r.to)
        if (!itemId || !refItemId) throw new Error(`Broken reference ${r.from} → ${r.to}`)
        return { itemId, field: r.field, refItemId, published: true }
      })
    if (rows.length) await tx.insert(contentRefs).values(rows)
    return { created, skipped, refs: rows.length }
  })

  const byType = (list: string[]) =>
    Object.entries(list.reduce<Record<string, number>>((acc, k) => ({ ...acc, [k.split(':')[0]!]: (acc[k.split(':')[0]!] ?? 0) + 1 }), {}))
      .map(([t, n]) => `${t} ${n}`)
      .join(', ')
  console.log(`Imported ${summary.created.length} items (${byType(summary.created) || 'none'}), ${summary.refs} references.`)
  if (summary.skipped.length) console.log(`Already present, left untouched: ${summary.skipped.length} (${byType(summary.skipped)}).`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
