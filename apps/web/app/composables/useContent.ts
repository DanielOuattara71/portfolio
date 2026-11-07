import type { Locale } from '@portfolio/shared/constants'
import { projectsSeed, type CaseStudySeed, type PendingField } from '~/content/projects'
import { approachSeed, domainsSeed, educationSeed, experienceSeed, profileSeed, servicesSeed, skillsSeed } from '~/content/profile'

/**
 * Content access for sections and pages. Today it reads the seed modules;
 * the next step swaps these functions for API calls returning the same shapes.
 */
export function useLocaleCode() {
  const { locale } = useI18n()
  return computed(() => (locale.value === 'fr' ? 'fr' : 'en') as Locale)
}

export function useProjects() {
  const lc = useLocaleCode()
  return computed(() =>
    projectsSeed.map((p) => ({
      id: p.id,
      name: p.name[lc.value],
      slug: p.slug[lc.value],
      context: p.context,
      solo: p.solo ?? false,
      domains: p.domains,
      stack: p.stack,
      period: p.period,
      kind: p.kind[lc.value],
      role: p.role[lc.value],
      tagline: p.tagline[lc.value],
      summary: p.summary[lc.value],
      cover: p.cover,
      featured: p.featured,
    })),
  )
}
export type Project = ReturnType<typeof useProjects>['value'][number]

export function useProfile() {
  const lc = useLocaleCode()
  return computed(() => profileSeed[lc.value])
}

export function useDomains() {
  const lc = useLocaleCode()
  return computed(() => domainsSeed.map((d) => ({ ...d, description: d.description[lc.value] })))
}

export function useSkills() {
  const lc = useLocaleCode()
  return computed(() =>
    skillsSeed.map((s) => ({
      name: s.name[lc.value],
      level: s.level,
      projectCount: s.stackKey ? projectsSeed.filter((p) => p.stack.includes(s.stackKey!)).length : 0,
      stackKey: s.stackKey,
    })),
  )
}

export function useServices() {
  const lc = useLocaleCode()
  return computed(() =>
    servicesSeed.map((s) => ({
      title: s.title[lc.value],
      description: s.description[lc.value],
      cases: s.cases[lc.value],
      deliverables: s.deliverables[lc.value],
      projects: s.projectIds.map((id) => projectsSeed.find((p) => p.id === id)).filter((p) => !!p).map((p) => ({ id: p.id, name: p.name[lc.value], slug: p.slug[lc.value] })),
    })),
  )
}

export function useBackground() {
  const lc = useLocaleCode()
  const map = (list: typeof experienceSeed) =>
    list.map((e) => ({
      org: e.org,
      kind: e.kind[lc.value],
      role: e.role[lc.value],
      period: e.period?.[lc.value] ?? null,
      details: e.details?.[lc.value] ?? null,
      project: (() => {
        const p = e.projectId ? projectsSeed.find((x) => x.id === e.projectId) : undefined
        return p ? { name: p.name[lc.value], slug: p.slug[lc.value] } : undefined
      })(),
    }))
  return computed(() => ({ experience: map(experienceSeed), education: map(educationSeed) }))
}

export function useApproach() {
  const lc = useLocaleCode()
  return computed(() => approachSeed[lc.value])
}

export function useProjectBySlug(slug: Ref<string> | string) {
  const lc = useLocaleCode()
  const showPlaceholders = useShowPlaceholders()
  return computed(() => {
    const s = typeof slug === 'string' ? slug : slug.value
    const seed = projectsSeed.find((p) => p.slug[lc.value] === s || p.slug.fr === s || p.slug.en === s)
    if (!seed) return null
    const raw = seed.caseStudy
    // Unconfirmed drafts stay out of the public site (review mode shows them).
    const hide = new Set(showPlaceholders.value ? [] : (raw.pending ?? []))
    const c = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, hide.has(k as PendingField) ? null : v]),
    ) as unknown as CaseStudySeed
    return {
      id: seed.id,
      name: seed.name[lc.value],
      slug: seed.slug[lc.value],
      context: seed.context,
      solo: seed.solo ?? false,
      domains: seed.domains,
      stack: seed.stack,
      period: seed.period,
      kind: seed.kind[lc.value],
      role: seed.role[lc.value],
      tagline: seed.tagline[lc.value],
      summary: seed.summary[lc.value],
      cover: seed.cover,
      links: seed.links,
      featured: seed.featured,
      caseStudy: {
        context: c.context?.[lc.value] ?? null,
        problem: c.problem?.[lc.value] ?? null,
        goals: c.goals?.[lc.value] ?? null,
        solution: c.solution?.[lc.value] ?? null,
        architectureNote: c.architectureNote?.[lc.value] ?? null,
        techRoles: c.techRoles?.map((r) => ({ tech: r.tech, role: r.role[lc.value] })) ?? null,
        challenges: c.challenges?.[lc.value] ?? null,
        results: c.results?.[lc.value] ?? null,
        gallery: c.gallery,
      },
      next: (() => {
        const idx = projectsSeed.findIndex((p) => p.id === seed.id)
        const next = projectsSeed[(idx + 1) % projectsSeed.length]
        return next ? { name: next.name[lc.value], slug: next.slug[lc.value], tagline: next.tagline[lc.value] } : null
      })(),
    }
  })
}
export type ProjectCase = NonNullable<ReturnType<typeof useProjectBySlug>['value']>
