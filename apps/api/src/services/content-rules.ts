import type {
  CertificationDoc,
  ContentType,
  DomainDoc,
  ProjectDoc,
  PublishIssue,
  ServiceDoc,
  SettingsDoc,
  SkillDoc,
  StepDoc,
  TimelineDoc,
} from '@portfolio/shared/content'
import { and, eq, inArray, ne } from 'drizzle-orm'
import { db } from '../db/client'
import { contentItems, contentSlugs, media } from '../db/schema'

/**
 * Per-type rules of the publication workflow (docs/admin/02, 03):
 * - which media and other contents a document uses (content_ref, to block deleting them);
 * - what must be true before publishing (checked server-side; the admin shows the same list).
 */
export type Ref = { field: string; mediaId?: string; itemType?: ContentType; itemKey?: string }

export function extractRefs(type: ContentType, doc: unknown): Ref[] {
  const refs: Ref[] = []
  const m = (field: string, id: string | null | undefined) => id && refs.push({ field, mediaId: id })
  if (type === 'settings') {
    const d = doc as SettingsDoc
    m('photoId', d.photoId)
    m('cv.fr', d.cv.fr)
    m('cv.en', d.cv.en)
  } else if (type === 'project') {
    const d = doc as ProjectDoc
    m('coverId', d.coverId)
    d.gallery.forEach((g) => m('gallery', g.mediaId))
    m('seo.imageId', d.seo.imageId)
    d.stack.forEach((k) => refs.push({ field: 'stack', itemType: 'skill', itemKey: k }))
  } else if (type === 'service') {
    ;(doc as ServiceDoc).projects.forEach((k) => refs.push({ field: 'projects', itemType: 'project', itemKey: k }))
  } else if (type === 'experience' || type === 'education') {
    const d = doc as TimelineDoc
    if (d.project) refs.push({ field: 'project', itemType: 'project', itemKey: d.project })
    m('justificatifId', d.justificatifId)
  }
  return refs
}

type MediaRow = Pick<typeof media.$inferSelect, 'id' | 'kind' | 'status' | 'deletedAt' | 'alt' | 'name'>

async function loadMedia(ids: string[]): Promise<Map<string, MediaRow>> {
  if (!ids.length || !db) return new Map()
  const rows = await db
    .select({ id: media.id, kind: media.kind, status: media.status, deletedAt: media.deletedAt, alt: media.alt, name: media.name })
    .from(media)
    .where(inArray(media.id, ids))
  return new Map(rows.map((r) => [r.id, r]))
}

/** Problems that block publication. Empty list = can be published. `excludeItemId` skips the item itself (slug uniqueness). */
export async function publishIssues(type: ContentType, doc: unknown, pendingFields: string[], excludeItemId?: string): Promise<PublishIssue[]> {
  const issues: PublishIssue[] = pendingFields.map((path) => ({ path, code: 'pending', message: 'Texte « à valider » : confirme-le ou corrige-le avant de publier.' }))
  const refs = extractRefs(type, doc).filter((r) => r.mediaId)
  const found = await loadMedia(refs.map((r) => r.mediaId!))

  for (const r of refs) {
    const f = found.get(r.mediaId!)
    if (!f || f.status !== 'ready' || f.deletedAt) {
      issues.push({ path: r.field, code: 'media.missing', message: 'Fichier introuvable ou dans la corbeille : choisis-en un autre.' })
      continue
    }
    const isProof = r.field.includes('justificatif')
    if (isProof) {
      // Private proof: image or PDF, alternative text only for images shown to visitors (proofs stay private).
      if (f.kind === 'image' && (!f.alt.fr || !f.alt.en)) {
        issues.push({ path: r.field, code: 'media.alt', message: `Image « ${f.name} » : texte alternatif FR et EN obligatoire (Médiathèque).` })
      }
      continue
    }
    const wantPdf = r.field.startsWith('cv.')
    if (wantPdf && f.kind !== 'pdf') issues.push({ path: r.field, code: 'media.kind', message: 'Le CV doit être un fichier PDF.' })
    if (!wantPdf && f.kind !== 'image') issues.push({ path: r.field, code: 'media.kind', message: 'Ce champ attend une image.' })
    if (f.kind === 'image' && (!f.alt.fr || !f.alt.en)) {
      issues.push({ path: r.field, code: 'media.alt', message: `Image « ${f.name} » : texte alternatif FR et EN obligatoire (Médiathèque).` })
    }
  }

  if (type === 'settings') {
    const d = doc as SettingsDoc
    if (d.initials && !/^[A-ZÀ-Ý]{1,3}$/u.test(d.initials)) issues.push({ path: 'initials', code: 'format', message: 'Initiales : 1 à 3 lettres majuscules.' })
    if (d.name !== null && d.name.trim().length < 2) issues.push({ path: 'name', code: 'format', message: 'Nom affiché trop court.' })
    if (d.available && ((d.availability.fr && !d.availability.en) || (!d.availability.fr && d.availability.en))) {
      issues.push({ path: 'availability', code: 'translation', message: 'Texte de disponibilité : remplis les deux langues, ou aucune.' })
    }
    d.links.forEach((l, i) => {
      if (!l.label.trim()) issues.push({ path: `links.${i}.label`, code: 'required', message: `Réseau ${i + 1} : libellé manquant.` })
    })
  }

  if (type === 'project') {
    const d = doc as ProjectDoc
    const need = (path: string, v: string | null | undefined) => {
      if (!v || !v.trim()) issues.push({ path, code: 'required', message: 'Champ obligatoire en français et en anglais.' })
    }
    need('name.fr', d.name.fr)
    need('name.en', d.name.en)
    need('slug.fr', d.slug.fr)
    need('slug.en', d.slug.en)
    need('kind.fr', d.kind.fr)
    need('kind.en', d.kind.en)
    need('tagline.fr', d.tagline.fr)
    need('tagline.en', d.tagline.en)
    need('summary.fr', d.summary.fr)
    need('summary.en', d.summary.en)
    if (!d.context) issues.push({ path: 'context', code: 'required', message: 'Contexte obligatoire (client, stage, académique, personnel, ce site).' })
    if (!d.domains.length) issues.push({ path: 'domains', code: 'required', message: 'Au moins un domaine est obligatoire.' })
    if (!d.links.length) issues.push({ path: 'links', code: 'required', message: 'Au moins un lien est obligatoire pour publier.' })
    else if (!d.links.some((l) => l.href.startsWith('https://'))) {
      issues.push({ path: 'links', code: 'required', message: 'Au moins un lien https est obligatoire pour publier.' })
    }
    // Slugs unique per language, excluding this project itself.
    if (db) {
      for (const [locale, slug] of [['fr', d.slug.fr], ['en', d.slug.en]] as const) {
        if (!slug.trim()) continue
        const where = excludeItemId
          ? and(eq(contentSlugs.type, 'project'), eq(contentSlugs.locale, locale), eq(contentSlugs.slug, slug), ne(contentSlugs.itemId, excludeItemId))
          : and(eq(contentSlugs.type, 'project'), eq(contentSlugs.locale, locale), eq(contentSlugs.slug, slug))
        const [taken] = await db.select({ id: contentSlugs.itemId }).from(contentSlugs).where(where).limit(1)
        if (taken) issues.push({ path: `slug.${locale}`, code: 'slug.unique', message: 'Cette adresse est déjà utilisée par un autre projet.' })
      }
      // Technologies must be known skills.
      if (d.stack.length) {
        const rows = await db.select({ key: contentItems.key }).from(contentItems).where(and(eq(contentItems.type, 'skill'), inArray(contentItems.key, d.stack)))
        const known = new Set(rows.map((r) => r.key))
        for (const k of d.stack) {
          if (!known.has(k)) issues.push({ path: 'stack', code: 'stack.unknown', message: `Technologie inconnue : ${k} (choisis-la dans les compétences).` })
        }
      }
    }
  }

  // Bilingual-required types (docs/admin/02 D4): FR and EN must both be complete to publish.
  // Existing blocks (hero/profile) keep their imported values: only check the new blocks strictly.
  const segText = (segs: { text: string }[] | undefined) => (segs ?? []).map((s) => s.text).join('').trim()
  const needSeg = (path: string, segs: { text: string }[] | undefined) => {
    if (!segText(segs)) issues.push({ path, code: 'required', message: 'Texte obligatoire en français et en anglais.' })
  }
  const needStr = (path: string, v: string | null | undefined) => {
    if (!v || !v.trim()) issues.push({ path, code: 'required', message: 'Champ obligatoire en français et en anglais.' })
  }
  if (type === 'block') {
    // Key is not passed here; check by shape (documented per key in BLOCK_SCHEMAS).
    const d = doc as Record<string, unknown>
    // intro-projects / intro-profile / intro-services / intro-expertise / intro-background / intro-approach / intro-contact / band / footer / legal
    for (const lc of ['fr', 'en'] as const) {
      const L = d[lc] as Record<string, unknown> | undefined
      if (!L) continue
      const isBlocks = typeof L === 'object' && L !== null && ('sections' in L || 'homeLead' in L || 'pageLead' in L || 'lead' in L || 'title' in L)
      if (!isBlocks) continue
      // Generic fallback: every top-level string / segment field must be non-empty in both languages.
      for (const [field, val] of Object.entries(L)) {
        if (typeof val === 'string') {
          if (!val.trim()) issues.push({ path: `${field}.${lc}`, code: 'required', message: 'Champ obligatoire en français et en anglais.' })
        } else if (Array.isArray(val) && (val.length === 0 || typeof (val[0] as { text?: string })?.text === 'string')) {
          // Segment lists (lead, value…): empty means missing in this language.
          // Paragraph lists (profile short/long) are arrays of arrays, handled by their own check below if needed.
          if (val.length === 0 || typeof (val[0] as { text?: string })?.text === 'string') needSeg(`${field}.${lc}`, val as never)
        }
      }
      // Legal/privacy: at least one section with text, no "[À COMPLÉTER" marker left.
      if (Array.isArray((L as { sections?: unknown[] }).sections)) {
        const sections = (L as { sections: { kind: string; text: string }[] }).sections
        if (!sections.some((s) => s.text.trim())) issues.push({ path: `sections.${lc}`, code: 'required', message: 'Texte obligatoire en français et en anglais.' })
        const allText = sections.map((s) => s.text).join('\n')
        if (allText.includes('[À COMPLÉTER')) issues.push({ path: `sections.${lc}`, code: 'pending', message: 'Remplace les champs [À COMPLÉTER] avant de publier.' })
      }
    }
  }
  if (type === 'skill') {
    const d = doc as SkillDoc
    needStr('name.fr', d.name.fr)
    needStr('name.en', d.name.en)
    if (d.ribbon) {
      if (d.ribbon.path && !d.ribbon.short && !d.ribbon.label) {
        /* Logo path alone is fine */
      } else if (!d.ribbon.path && !d.ribbon.short && !d.ribbon.label) {
        issues.push({ path: 'ribbon', code: 'required', message: 'Tuile du ruban : tracé SVG ou texte court.' })
      }
    }
  }
  if (type === 'domain') {
    const d = doc as DomainDoc
    needStr('name.fr', d.name.fr)
    needStr('name.en', d.name.en)
    needStr('description.fr', d.description.fr)
    needStr('description.en', d.description.en)
  }
  if (type === 'service') {
    const d = doc as ServiceDoc
    needStr('title.fr', d.title.fr)
    needStr('title.en', d.title.en)
    needStr('description.fr', d.description.fr)
    needStr('description.en', d.description.en)
    needStr('deliverables.fr', d.deliverables.fr)
    needStr('deliverables.en', d.deliverables.en)
    if (!d.cases.fr.length || !d.cases.en.length) issues.push({ path: 'cases', code: 'required', message: 'Cas d’usage obligatoires en français et en anglais.' })
  }
  if (type === 'step') {
    const d = doc as StepDoc
    needStr('title.fr', d.title.fr)
    needStr('title.en', d.title.en)
    needStr('text.fr', d.text.fr)
    needStr('text.en', d.text.en)
  }
  if (type === 'experience' || type === 'education') {
    const d = doc as TimelineDoc
    needStr('org', d.org)
    needStr('kind.fr', d.kind.fr)
    needStr('kind.en', d.kind.en)
    needStr('role.fr', d.role.fr)
    needStr('role.en', d.role.en)
  }
  if (type === 'certification') {
    const d = doc as CertificationDoc
    needStr('name.fr', d.name.fr)
    needStr('name.en', d.name.en)
    needStr('issuer', d.issuer)
  }
  return issues
}
