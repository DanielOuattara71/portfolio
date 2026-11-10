import type { Locale } from '@portfolio/shared/constants'
import type { ProjectDoc, PublicMedia, PublishedContent, PublishedEntry } from '@portfolio/shared/content'

/**
 * Content access for sections and pages. Reads the PUBLISHED content served by the API
 * (loaded once by plugins/content.ts). Shapes are unchanged since the seed-file era, so
 * components do not depend on where content comes from.
 */
export function useLocaleCode() {
  const { locale } = useI18n()
  return computed(() => (locale.value === 'fr' ? 'fr' : 'en') as Locale)
}

/** Raw published content. Always set: the content plugin stops rendering when the API is down. */
export function usePublished() {
  const state = useState<PublishedContent | null>('published-content')
  return computed(() => state.value!)
}

/** Text blocks (intros, band, footer, legal…) in the current language. Null = not published yet (fall back to i18n). */
export function useTextBlocks() {
  const content = usePublished()
  const lc = useLocaleCode()
  return computed(() => {
    const b = content.value.blocks
    return {
      introProjects: b.introProjects ? { homeTitle: b.introProjects[lc.value].homeTitle, homeLead: b.introProjects[lc.value].homeLead, pageLead: b.introProjects[lc.value].pageLead } : null,
      introProfile: b.introProfile ? { homeTitle: b.introProfile[lc.value].homeTitle, pageTitle: b.introProfile[lc.value].pageTitle, pageLead: b.introProfile[lc.value].pageLead } : null,
      introServices: b.introServices ? { homeTitle: b.introServices[lc.value].homeTitle, homeLead: b.introServices[lc.value].homeLead, servicesTitle: b.introServices[lc.value].servicesTitle, servicesLead: b.introServices[lc.value].servicesLead } : null,
      introBackground: b.introBackground ? { title: b.introBackground[lc.value].title, lead: b.introBackground[lc.value].lead } : null,
      introApproach: b.introApproach ? { title: b.introApproach[lc.value].title, lead: b.introApproach[lc.value].lead } : null,
      introExpertise: b.introExpertise ? { lead: b.introExpertise[lc.value].lead, skillsLead: b.introExpertise[lc.value].skillsLead } : null,
      introContact: b.introContact ? { title: b.introContact[lc.value].title, lead: b.introContact[lc.value].lead } : null,
      band: b.band ? { title: b.band[lc.value].title, accent: b.band[lc.value].accent, text: b.band[lc.value].text, types: b.band[lc.value].types } : null,
      footer: b.footer ? { title: b.footer[lc.value].title, accent: b.footer[lc.value].accent, role: b.footer[lc.value].role, modes: b.footer[lc.value].modes } : null,
      legal: b.legal ? b.legal[lc.value].sections : null,
      privacy: b.privacy ? b.privacy[lc.value].sections : null,
      seoHome: b.seoHome ? b.seoHome[lc.value] : null,
      seoProjects: b.seoProjects ? b.seoProjects[lc.value] : null,
      seoProfile: b.seoProfile ? b.seoProfile[lc.value] : null,
      seoExpertise: b.seoExpertise ? b.seoExpertise[lc.value] : null,
      seoContact: b.seoContact ? b.seoContact[lc.value] : null,
    }
  })
}

/** Skill key → display name (project technologies are stored as skill keys). */
function useSkillNames() {
  const content = usePublished()
  const lc = useLocaleCode()
  return computed(() => new Map(content.value.skills.map((s) => [s.key, s.doc.name[lc.value]])))
}

function mediaImage(
  media: Record<string, PublicMedia>,
  id: string | null | undefined,
  lc: Locale,
): { src: string; srcset: string; alt: string | null } | null {
  if (!id) return null
  const m = media[id]
  if (!m || m.kind !== 'image' || !m.variants.length) return null
  const sorted = [...m.variants].sort((a, b) => a.width - b.width)
  const picked = sorted.find((v) => v.width >= 960) ?? sorted.at(-1)!
  return {
    src: picked.url,
    srcset: sorted.map((v) => `${v.url} ${v.width}w`).join(', '),
    alt: m.alt[lc] ?? null,
  }
}

function projectView(
  p: PublishedEntry<ProjectDoc>,
  lc: Locale,
  skillNames: Map<string, string>,
  media: Record<string, PublicMedia>,
) {
  const d = p.doc
  const cover = mediaImage(media, d.coverId, lc)
  return {
    id: p.key,
    name: d.name[lc],
    slug: d.slug[lc],
    context: d.context,
    solo: d.solo,
    domains: d.domains,
    stack: d.stack.map((k) => skillNames.get(k) ?? k),
    period: d.period,
    kind: d.kind[lc],
    role: d.role[lc],
    tagline: d.tagline[lc],
    summary: d.summary[lc],
    cover: cover?.src ?? null,
    coverSrcset: cover?.srcset ?? null,
    coverAlt: cover?.alt ?? null,
    featured: p.featured,
  }
}

export function useProjects() {
  const content = usePublished()
  const lc = useLocaleCode()
  const names = useSkillNames()
  return computed(() => content.value.projects.map((p) => projectView(p, lc.value, names.value, content.value.media)))
}
export type Project = ReturnType<typeof useProjects>['value'][number]

export function useProfile() {
  const content = usePublished()
  const lc = useLocaleCode()
  return computed(() => content.value.blocks.profile![lc.value])
}

export function useDomains() {
  const content = usePublished()
  const lc = useLocaleCode()
  return computed(() =>
    content.value.domains.map(({ doc }) => ({ key: doc.key, name: doc.name[lc.value], level: doc.level, description: doc.description[lc.value] })),
  )
}

export function useSkills() {
  const content = usePublished()
  const lc = useLocaleCode()
  return computed(() =>
    content.value.skills
      .filter((s) => s.doc.visible)
      .map((s) => {
        const projectCount = content.value.projects.filter((p) => p.doc.stack.includes(s.key)).length
        return {
          name: s.doc.name[lc.value],
          level: s.doc.level,
          projectCount,
          // Search term for "projects using this skill" (matches the stack names shown on cards).
          stackKey: projectCount ? s.doc.name[lc.value] : undefined,
        }
      }),
  )
}

export function useServices() {
  const content = usePublished()
  const lc = useLocaleCode()
  return computed(() =>
    content.value.services.map(({ doc }) => ({
      title: doc.title[lc.value],
      description: doc.description[lc.value],
      cases: doc.cases[lc.value],
      deliverables: doc.deliverables[lc.value],
      projects: doc.projects
        .map((key) => content.value.projects.find((p) => p.key === key))
        .filter((p) => !!p)
        .map((p) => ({ id: p.key, name: p.doc.name[lc.value], slug: p.doc.slug[lc.value] })),
    })),
  )
}

export function useBackground() {
  const content = usePublished()
  const lc = useLocaleCode()
  const map = (list: PublishedContent['experience']) =>
    list.map(({ doc }) => ({
      org: doc.org,
      kind: doc.kind[lc.value],
      role: doc.role[lc.value],
      period: doc.period?.[lc.value] ?? null,
      details: doc.details?.[lc.value] ?? null,
      project: (() => {
        const p = doc.project ? content.value.projects.find((x) => x.key === doc.project) : undefined
        return p ? { name: p.doc.name[lc.value], slug: p.doc.slug[lc.value] } : undefined
      })(),
    }))
  return computed(() => ({ experience: map(content.value.experience), education: map(content.value.education) }))
}

export function useApproach() {
  const content = usePublished()
  const lc = useLocaleCode()
  return computed(() => content.value.steps.map(({ doc }) => ({ title: doc.title[lc.value], text: doc.text[lc.value] })))
}

/** Former address → current slug for this locale, or null. */
export function useRedirectFor(slug: string, lc: Locale): ComputedRef<string | null> {
  const content = usePublished()
  return computed(() => {
    const r = content.value.redirects?.find((x) => x.type === 'project' && x.locale === lc && x.from === slug)
    return r?.to ?? null
  })
}

export function useProjectBySlug(slug: Ref<string> | string) {
  const content = usePublished()
  const lc = useLocaleCode()
  const names = useSkillNames()
  return computed(() => {
    const s = typeof slug === 'string' ? slug : slug.value
    const list = content.value.projects
    const idx = list.findIndex((p) => p.doc.slug[lc.value] === s || p.doc.slug.fr === s || p.doc.slug.en === s)
    const entry = list[idx]
    if (!entry) return null
    // Fields still "à valider" arrive as null from the API: they are never public (preview shows them).
    const c = entry.doc.caseStudy
    const next = list[(idx + 1) % list.length]
    const gallery = entry.doc.gallery
      .map((g) => {
        const img = mediaImage(content.value.media, g.mediaId, lc.value)
        return img ? { src: img.src, srcset: img.srcset, alt: img.alt ?? '', caption: g.caption[lc.value] } : null
      })
      .filter((g): g is { src: string; srcset: string; alt: string; caption: string | null } => !!g)
    return {
      ...projectView(entry, lc.value, names.value, content.value.media),
      links: entry.doc.links,
      seo: entry.doc.seo,
      caseStudy: {
        context: c.context?.[lc.value] ?? null,
        problem: c.problem?.[lc.value] ?? null,
        goals: c.goals?.[lc.value] ?? null,
        solution: c.solution?.[lc.value] ?? null,
        architectureNote: c.architectureNote?.[lc.value] ?? null,
        techRoles: c.techRoles?.map((r) => ({ tech: r.tech, role: r.role[lc.value] })) ?? null,
        challenges: c.challenges?.[lc.value] ?? null,
        results: c.results?.[lc.value] ?? null,
        gallery,
      },
      next: next && next.key !== entry.key ? { name: next.doc.name[lc.value], slug: next.doc.slug[lc.value], tagline: next.doc.tagline[lc.value] } : null,
    }
  })
}
export type ProjectCase = NonNullable<ReturnType<typeof useProjectBySlug>['value']>
