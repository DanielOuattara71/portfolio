/**
 * Imports the editorial texts that live in apps/web/i18n/locales/*.json as new
 * `block` content items (module 7), so the public site can read them from the API.
 * Idempotent: existing blocks are left untouched, never overwritten.
 *
 *   pnpm --filter @portfolio/api db:seed:blocks
 *
 * Legal/privacy arrive as DRAFTS with [À COMPLÉTER] placeholders: they are never
 * published until the owner fills them in the admin. Nothing is invented here.
 */
import { readFile } from 'node:fs/promises'
import { contentDocSchema, type ContentType } from '@portfolio/shared/content'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { contentItems, contentVersions } from '../db/schema'

type Draft = { type: ContentType; key: string; doc: unknown; status: 'published' | 'draft'; pending?: string[] }

function segify(template: string, accent: string | null): { text: string; accent?: boolean }[] {
  if (!accent) return [{ text: template }]
  const i = template.indexOf('{accent}')
  if (i < 0) return [{ text: template }]
  const segs: { text: string; accent?: boolean }[] = []
  if (i > 0) segs.push({ text: template.slice(0, i) })
  segs.push({ text: accent, accent: true })
  const rest = template.slice(i + '{accent}'.length)
  if (rest) segs.push({ text: rest })
  return segs
}
const plain = (s: string) => [{ text: s }]

async function readJson(name: string) {
  const here = new URL('.', import.meta.url)
  const p = new URL(`../../../web/i18n/locales/${name}.json`, here)
  return JSON.parse(await readFile(p, 'utf8'))
}

async function main() {
  if (!db) throw new Error('DATABASE_URL is not set')
  const fr = await readJson('fr')
  const en = await readJson('en')
  const drafts: Draft[] = []

  const introProjects = {
    fr: {
      homeTitle: fr.home.projects.title as string,
      homeLead: segify(fr.home.projects.lead as string, fr.home.projects.leadAccent as string),
      pageLead: plain(fr.projectsPage.lead as string),
    },
    en: {
      homeTitle: en.home.projects.title as string,
      homeLead: segify(en.home.projects.lead as string, en.home.projects.leadAccent as string),
      pageLead: plain(en.projectsPage.lead as string),
    },
  }
  drafts.push({ type: 'block', key: 'intro-projects', doc: introProjects, status: 'published' })

  drafts.push({
    type: 'block',
    key: 'intro-profile',
    doc: {
      fr: { homeTitle: fr.home.profile.title as string, pageTitle: fr.profilePage.background as string, pageLead: plain(fr.profilePage.backgroundLead as string) },
      en: { homeTitle: en.home.profile.title as string, pageTitle: en.profilePage.background as string, pageLead: plain(en.profilePage.backgroundLead as string) },
    },
    status: 'published',
  })

  drafts.push({
    type: 'block',
    key: 'intro-services',
    doc: {
      fr: {
        homeTitle: fr.home.services.title as string,
        homeLead: segify(fr.home.services.lead as string, fr.home.services.leadAccent as string),
        servicesTitle: fr.expertisePage.services as string,
        servicesLead: plain(fr.expertisePage.servicesLead as string),
      },
      en: {
        homeTitle: en.home.services.title as string,
        homeLead: segify(en.home.services.lead as string, en.home.services.leadAccent as string),
        servicesTitle: en.expertisePage.services as string,
        servicesLead: plain(en.expertisePage.servicesLead as string),
      },
    },
    status: 'published',
  })

  drafts.push({
    type: 'block',
    key: 'intro-background',
    doc: {
      fr: { title: fr.home.background.title as string, lead: plain(fr.home.background.lead as string) },
      en: { title: en.home.background.title as string, lead: plain(en.home.background.lead as string) },
    },
    status: 'published',
  })
  drafts.push({
    type: 'block',
    key: 'intro-approach',
    doc: {
      fr: { title: fr.home.approach.title as string, lead: plain(fr.home.approach.lead as string) },
      en: { title: en.home.approach.title as string, lead: plain(en.home.approach.lead as string) },
    },
    status: 'published',
  })
  drafts.push({
    type: 'block',
    key: 'intro-expertise',
    doc: {
      fr: { lead: plain(fr.expertisePage.lead as string), skillsLead: plain(fr.expertisePage.skillsLead as string) },
      en: { lead: plain(en.expertisePage.lead as string), skillsLead: plain(en.expertisePage.skillsLead as string) },
    },
    status: 'published',
  })
  drafts.push({
    type: 'block',
    key: 'intro-contact',
    doc: {
      fr: { title: fr.pages.contact.route as string, lead: plain(fr.contactPage.lead as string) },
      en: { title: en.pages.contact.route as string, lead: plain(en.contactPage.lead as string) },
    },
    status: 'published',
  })

  drafts.push({
    type: 'block',
    key: 'band',
    doc: {
      fr: {
        title: fr.home.band.title as string,
        accent: fr.home.band.accent as string,
        text: fr.home.band.text as string,
        types: fr.home.band.types as Record<string, string>,
      },
      en: {
        title: en.home.band.title as string,
        accent: en.home.band.accent as string,
        text: en.home.band.text as string,
        types: en.home.band.types as Record<string, string>,
      },
    },
    status: 'published',
  })

  drafts.push({
    type: 'block',
    key: 'footer',
    doc: {
      fr: { title: fr.footer.title as string, accent: fr.footer.titleAccent as string, role: fr.footer.role as string, modes: fr.footer.modes as string },
      en: { title: en.footer.title as string, accent: en.footer.titleAccent as string, role: en.footer.role as string, modes: en.footer.modes as string },
    },
    status: 'published',
  })

  // Legal/privacy: template with placeholders, as drafts. The site keeps showing the stub until published.
  const legalTemplate = {
    fr: {
      sections: [
        { kind: 'h2', text: 'Éditeur du site' },
        { kind: 'p', text: '[À COMPLÉTER : nom de l’éditeur ou de l’association, adresse de contact, numéro le cas échéant.]' },
        { kind: 'h2', text: 'Hébergeur' },
        { kind: 'p', text: '[À COMPLÉTER : hébergeur Vercel Inc., adresse, pays.]' },
        { kind: 'h2', text: 'Accès au site' },
        { kind: 'p', text: '[À COMPLÉTER : conditions d’accès, âge minimum s’il y a lieu.]' },
      ],
    },
    en: {
      sections: [
        { kind: 'h2', text: 'Site publisher' },
        { kind: 'p', text: '[À COMPLÉTER: publisher name or association, contact address, number if applicable.]' },
        { kind: 'h2', text: 'Host' },
        { kind: 'p', text: '[À COMPLÉTER: host Vercel Inc., address, country.]' },
        { kind: 'h2', text: 'Access' },
        { kind: 'p', text: '[À COMPLÉTER: access terms, minimum age if applicable.]' },
      ],
    },
  }
  const privacyTemplate = {
    fr: {
      sections: [
        { kind: 'h2', text: 'Données collectées' },
        { kind: 'p', text: '[À COMPLÉTER : liste des données collectées par le formulaire de contact et les journaux techniques.]' },
        { kind: 'h2', text: 'Durées de conservation' },
        { kind: 'p', text: 'Messages de contact : 12 mois. Journal d’activité : 12 mois. Tentatives de connexion : 90 jours.' },
        { kind: 'h2', text: 'Contact' },
        { kind: 'p', text: '[À COMPLÉTER : adresse de contact pour vos demandes (accès, rectification, suppression).]' },
      ],
    },
    en: {
      sections: [
        { kind: 'h2', text: 'Data collected' },
        { kind: 'p', text: '[À COMPLÉTER: list of data collected by the contact form and technical logs.]' },
        { kind: 'h2', text: 'Retention periods' },
        { kind: 'p', text: 'Contact messages: 12 months. Activity log: 12 months. Sign-in attempts: 90 days.' },
        { kind: 'h2', text: 'Contact' },
        { kind: 'p', text: '[À COMPLÉTER: contact address for your requests (access, correction, deletion).]' },
      ],
    },
  }
  drafts.push({ type: 'block', key: 'legal', doc: legalTemplate, status: 'draft' })
  drafts.push({ type: 'block', key: 'privacy', doc: privacyTemplate, status: 'draft' })

  // Page SEO (defaults = current pages.* texts from i18n).
  const seoFor = (page: string) => ({
    fr: { title: (fr.pages as Record<string, { title: string; description: string }>)[page]?.title ?? '', description: (fr.pages as Record<string, { title: string; description: string }>)[page]?.description ?? '' },
    en: { title: (en.pages as Record<string, { title: string; description: string }>)[page]?.title ?? '', description: (en.pages as Record<string, { title: string; description: string }>)[page]?.description ?? '' },
  })
  drafts.push({ type: 'block', key: 'seo-home', doc: seoFor('home'), status: 'published' })
  drafts.push({ type: 'block', key: 'seo-projects', doc: seoFor('projects'), status: 'published' })
  drafts.push({ type: 'block', key: 'seo-profile', doc: seoFor('profile'), status: 'published' })
  drafts.push({ type: 'block', key: 'seo-expertise', doc: seoFor('expertise'), status: 'published' })
  drafts.push({ type: 'block', key: 'seo-contact', doc: seoFor('contact'), status: 'published' })

  const problems: string[] = []
  for (const d of drafts) {
    const r = contentDocSchema(d.type, d.key).safeParse(d.doc)
    if (!r.success) problems.push(`${d.type}:${d.key} → ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
  }
  if (problems.length) {
    console.error('Block docs do not match schemas:\n' + problems.join('\n'))
    process.exit(1)
  }

  const created: string[] = []
  const skipped: string[] = []
  await db.transaction(async (tx) => {
    for (const d of drafts) {
      const existing = await tx.query.contentItems.findFirst({ where: (t, { and }) => and(eq(t.type, d.type), eq(t.key, d.key)) })
      if (existing) {
        skipped.push(d.key)
        continue
      }
      const [item] = await tx
        .insert(contentItems)
        .values({ type: d.type, key: d.key, position: 0, status: d.status, featured: false, working: d.doc, workingRevision: 1, workingUpdatedBy: null, pendingFields: d.pending ?? [] })
        .returning({ id: contentItems.id })
      if (!item) throw new Error(`Insert failed for ${d.type}:${d.key}`)
      if (d.status === 'published') {
        const [v] = await tx.insert(contentVersions).values({ itemId: item.id, number: 1, kind: 'import', data: d.doc }).returning({ id: contentVersions.id })
        await tx.update(contentItems).set({ publishedVersionId: v!.id }).where(eq(contentItems.id, item.id))
      }
      created.push(d.key)
    }
  })
  console.log(`Imported ${created.length} blocks (${created.join(', ') || 'none'}), ${skipped.length} already present (${skipped.join(', ') || 'none'}).`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
