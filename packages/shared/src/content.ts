import { z } from 'zod'
import { CONTENT_STATUSES, DOMAINS, PROJECT_CONTEXTS, SKILL_LEVELS } from './constants'
import { projectLinkSchema } from './project'

/**
 * Content documents stored by the admin (docs/admin/08-architecture-donnees.md §3).
 * One JSON document per content item, FR and EN side by side. These schemas validate DRAFTS:
 * fields may be empty while you write. What is required to PUBLISH is checked separately
 * (publish rules, admin module "Projects").
 * Shapes mirror what the public site already renders, so its components do not change.
 */

export const CONTENT_TYPES = [
  'settings',
  'block',
  'project',
  'skill',
  'domain',
  'service',
  'step',
  'experience',
  'education',
  'certification',
] as const
export type ContentType = (typeof CONTENT_TYPES)[number]
export const contentTypeSchema = z.enum(CONTENT_TYPES)
export const contentStatusSchema = z.enum(CONTENT_STATUSES)

/** Item keys: "PRJ-02", "hero", "node-js"… (stable, never shown to visitors). */
export const contentKeySchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/, 'Letters, digits, - and _ only')

const str = (max: number) => z.string().max(max)
/** Same field in both languages, edited independently. */
const loc = <T extends z.ZodType>(schema: T) => z.object({ fr: schema, en: schema })
const mediaId = z.uuid()

/** Text with highlighted words (rendered in italic on the site). */
export const textSegmentSchema = z.object({ text: str(2000), accent: z.boolean().optional() })
export type TextSegment = z.infer<typeof textSegmentSchema>
const paragraphs = z.array(z.array(textSegmentSchema).max(20)).max(20)

export const seoSchema = z.object({
  title: loc(str(120).nullable()),
  description: loc(str(300).nullable()),
  imageId: mediaId.nullable(),
  index: z.boolean(),
})
export type Seo = z.infer<typeof seoSchema>
export const emptySeo = (): Seo => ({ title: { fr: null, en: null }, description: { fr: null, en: null }, imageId: null, index: true })

/* ---------- Settings (one item, key "site") ---------- */
export const settingsDocSchema = z.object({
  name: str(120).nullable(),
  initials: str(3).nullable(),
  email: z.email().max(254).nullable(),
  photoId: mediaId.nullable(),
  cv: loc(mediaId.nullable()),
  links: z.array(z.object({ label: str(40), href: z.url({ protocol: /^https$/ }).max(500) })).max(8),
  available: z.boolean(),
  availability: loc(str(80).nullable()),
  timezone: str(60).nullable(),
  city: str(80).nullable(),
  contactOpen: z.boolean(),
  defaultLocale: z.enum(['en', 'fr']),
})
export type SettingsDoc = z.infer<typeof settingsDocSchema>

/* ---------- Page blocks ---------- */
const heroLocale = z.object({
  eyebrow: str(80),
  lead: str(120),
  value: z.array(textSegmentSchema).max(20),
  stats: z.array(z.object({ before: str(40).optional(), strong: str(40), after: str(40).optional() })).max(6),
  badge: str(120),
  profile: z.array(z.object({ label: str(30), value: str(120).nullable() })).max(8),
})
const profileLocale = z.object({
  short: paragraphs,
  long: paragraphs,
  vision: str(300),
  facts: z.array(z.object({ label: str(40), value: str(160).nullable() })).max(10),
})

const leadSegments = z.array(textSegmentSchema).max(20)
const introLocale = z.object({
  title: str(120),
  lead: leadSegments,
})
const introProjectsLocale = z.object({
  homeTitle: str(120),
  homeLead: leadSegments,
  pageLead: leadSegments,
})
const introProfileLocale = z.object({
  homeTitle: str(120),
  pageTitle: str(120),
  pageLead: leadSegments,
})
const introServicesLocale = z.object({
  homeTitle: str(120),
  homeLead: leadSegments,
  servicesTitle: str(120),
  servicesLead: leadSegments,
})
const introExpertiseLocale = z.object({
  lead: leadSegments,
  skillsLead: leadSegments,
})

const bandLocale = z.object({
  title: str(160),
  accent: str(80),
  text: str(400),
  types: z.object({
    web: str(60),
    mobile: str(60),
    api: str(60),
    ai: str(60),
    data: str(60),
    other: str(60),
  }),
})

const footerLocale = z.object({
  title: str(120),
  accent: str(80),
  role: str(120),
  modes: str(120),
})

const richSection = z.object({ kind: z.enum(['h2', 'p']), text: str(4000) })
const richLocale = z.object({ sections: z.array(richSection).max(60) })

const seoPageLocale = z.object({ title: str(120), description: str(300) })

/** Blocks are keyed; each key has its own document shape. */
export const BLOCK_SCHEMAS = {
  hero: loc(heroLocale),
  profile: loc(profileLocale),
  'intro-projects': loc(introProjectsLocale),
  'intro-profile': loc(introProfileLocale),
  'intro-services': loc(introServicesLocale),
  'intro-background': loc(introLocale),
  'intro-approach': loc(introLocale),
  'intro-expertise': loc(introExpertiseLocale),
  'intro-contact': loc(introLocale),
  band: loc(bandLocale),
  footer: loc(footerLocale),
  legal: loc(richLocale),
  privacy: loc(richLocale),
  'seo-home': loc(seoPageLocale),
  'seo-projects': loc(seoPageLocale),
  'seo-profile': loc(seoPageLocale),
  'seo-expertise': loc(seoPageLocale),
  'seo-contact': loc(seoPageLocale),
} as const
export type BlockKey = keyof typeof BLOCK_SCHEMAS
export type HeroDoc = z.infer<typeof BLOCK_SCHEMAS.hero>
export type ProfileDoc = z.infer<typeof BLOCK_SCHEMAS.profile>
export type IntroProjectsDoc = z.infer<(typeof BLOCK_SCHEMAS)['intro-projects']>
export type IntroProfileDoc = z.infer<(typeof BLOCK_SCHEMAS)['intro-profile']>
export type IntroServicesDoc = z.infer<(typeof BLOCK_SCHEMAS)['intro-services']>
export type IntroDoc = z.infer<(typeof BLOCK_SCHEMAS)['intro-background']>
export type IntroExpertiseDoc = z.infer<(typeof BLOCK_SCHEMAS)['intro-expertise']>
export type BandDoc = z.infer<(typeof BLOCK_SCHEMAS)['band']>
export type FooterDoc = z.infer<(typeof BLOCK_SCHEMAS)['footer']>
export type LegalDoc = z.infer<(typeof BLOCK_SCHEMAS)['legal']>
export type SeoPageDoc = z.infer<(typeof BLOCK_SCHEMAS)['seo-home']>

/* ---------- Projects ---------- */
export const CASE_STUDY_FIELDS = ['context', 'problem', 'goals', 'solution', 'architectureNote', 'techRoles', 'challenges', 'results'] as const
export type CaseStudyField = (typeof CASE_STUDY_FIELDS)[number]

export const projectDocSchema = z.object({
  name: loc(str(80)),
  slug: loc(z.string().max(80).regex(/^([a-z0-9]+(?:-[a-z0-9]+)*)?$/, 'Lowercase letters, digits and hyphens only')),
  kind: loc(str(80)),
  context: z.enum(PROJECT_CONTEXTS).nullable(),
  solo: z.boolean(),
  domains: z.array(z.enum(DOMAINS)).max(DOMAINS.length),
  /** Skill keys (technologies come from the Skills module). */
  stack: z.array(contentKeySchema).max(20),
  period: str(60).nullable(),
  role: loc(str(160).nullable()),
  tagline: loc(str(160)),
  summary: loc(str(300)),
  links: z.array(projectLinkSchema).max(6),
  coverId: mediaId.nullable(),
  gallery: z.array(z.object({ mediaId, caption: loc(str(200).nullable()) })).max(24),
  caseStudy: z.object({
    context: loc(str(4000)).nullable(),
    problem: loc(str(4000)).nullable(),
    goals: loc(z.array(str(400)).max(12)).nullable(),
    solution: loc(z.array(str(4000)).max(12)).nullable(),
    architectureNote: loc(str(4000)).nullable(),
    techRoles: z.array(z.object({ tech: str(60), role: loc(str(200)) })).max(20).nullable(),
    challenges: loc(z.array(str(600)).max(12)).nullable(),
    results: loc(z.array(str(600)).max(12)).nullable(),
  }),
  seo: seoSchema,
})
export type ProjectDoc = z.infer<typeof projectDocSchema>

/* ---------- Skills, domains, services, method ---------- */
export const skillDocSchema = z.object({
  name: loc(str(80)),
  level: z.enum(SKILL_LEVELS),
  /** Shown in the Expertise skill matrix. Hidden skills can still be project technologies. */
  visible: z.boolean(),
  /** Tile in the home technology ribbon, or null. */
  ribbon: z
    .object({
      position: z.number().int().min(0),
      /** Name in the tooltip when it differs from the skill name (e.g. "LLM APIs"). */
      label: str(40).nullable(),
      /** Simple Icons path (24×24) with brand colours, or a short text tile. */
      path: str(20000).nullable(),
      bg: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
      fg: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
      short: str(16).nullable(),
    })
    .nullable(),
})
export type SkillDoc = z.infer<typeof skillDocSchema>

export const domainDocSchema = z.object({
  key: z.enum([...DOMAINS, 'software']),
  name: loc(str(80)),
  level: z.enum(SKILL_LEVELS),
  description: loc(str(300)),
})
export type DomainDoc = z.infer<typeof domainDocSchema>

export const serviceDocSchema = z.object({
  title: loc(str(80)),
  description: loc(str(300)),
  cases: loc(z.array(str(160)).max(8)),
  deliverables: loc(str(300)),
  /** Project item keys ("PRJ-01"). */
  projects: z.array(contentKeySchema).max(10),
})
export type ServiceDoc = z.infer<typeof serviceDocSchema>

export const stepDocSchema = z.object({ title: loc(str(60)), text: loc(str(300)) })
export type StepDoc = z.infer<typeof stepDocSchema>

/* ---------- Background ---------- */
export const timelineDocSchema = z.object({
  org: str(120),
  kind: loc(str(60)),
  role: loc(str(240)),
  period: loc(str(80)).nullable(),
  details: loc(str(1000)).nullable(),
  /** Linked project key, shown as "case study" link. */
  project: contentKeySchema.nullable(),
  /** Private bilingual study file (private by default, never made public by the workflow). */
  justificatifId: mediaId.nullable().optional(),
})
export type TimelineDoc = z.infer<typeof timelineDocSchema>

export const certificationDocSchema = z.object({
  name: loc(str(160)),
  issuer: str(120),
  issuedOn: z.iso.date().nullable(),
  expiresOn: z.iso.date().nullable(),
  credentialUrl: z.url({ protocol: /^https$/ }).max(500).nullable(),
})
export type CertificationDoc = z.infer<typeof certificationDocSchema>

/** Draft schema for a content item. Blocks depend on their key. */
export function contentDocSchema(type: ContentType, key: string): z.ZodType {
  switch (type) {
    case 'settings':
      return settingsDocSchema
    case 'block': {
      const s = BLOCK_SCHEMAS[key as BlockKey]
      if (!s) throw new Error(`Unknown block "${key}"`)
      return s
    }
    case 'project':
      return projectDocSchema
    case 'skill':
      return skillDocSchema
    case 'domain':
      return domainDocSchema
    case 'service':
      return serviceDocSchema
    case 'step':
      return stepDocSchema
    case 'experience':
    case 'education':
      return timelineDocSchema
    case 'certification':
      return certificationDocSchema
  }
}

/* ---------- What the public site receives (GET /public/content) ---------- */
export interface PublishedEntry<T> {
  key: string
  featured: boolean
  doc: T
}

/** A published media file, as the public site needs it (URLs of public copies only). */
export interface PublicMedia {
  kind: 'image' | 'pdf'
  alt: { fr: string | null; en: string | null }
  width: number | null
  height: number | null
  /** Image sizes, smallest first. */
  variants: { width: number; height: number; url: string }[]
  /** PDF file URL. */
  file: string | null
}

export interface PublicRedirect {
  type: ContentType
  locale: 'fr' | 'en'
  /** Old slug (without prefix). */
  from: string
  /** Current slug of the same item, if still published. */
  to: string | null
}

export interface PublishedContent {
  settings: SettingsDoc | null
  /** Media used by published content, by id. */
  media: Record<string, PublicMedia>
  /** Former project addresses → current address (301). */
  redirects: PublicRedirect[]
  blocks: {
    hero: HeroDoc | null
    profile: ProfileDoc | null
    introProjects: IntroProjectsDoc | null
    introProfile: IntroProfileDoc | null
    introServices: IntroServicesDoc | null
    introBackground: IntroDoc | null
    introApproach: IntroDoc | null
    introExpertise: IntroExpertiseDoc | null
    introContact: IntroDoc | null
    band: BandDoc | null
    footer: FooterDoc | null
    legal: LegalDoc | null
    privacy: LegalDoc | null
    seoHome: SeoPageDoc | null
    seoProjects: SeoPageDoc | null
    seoProfile: SeoPageDoc | null
    seoExpertise: SeoPageDoc | null
    seoContact: SeoPageDoc | null
  }
  projects: PublishedEntry<ProjectDoc>[]
  skills: PublishedEntry<SkillDoc>[]
  domains: PublishedEntry<DomainDoc>[]
  services: PublishedEntry<ServiceDoc>[]
  steps: PublishedEntry<StepDoc>[]
  experience: PublishedEntry<TimelineDoc>[]
  education: PublishedEntry<TimelineDoc>[]
  certifications: PublishedEntry<CertificationDoc>[]
  generatedAt: string
}

/* ---------- Publication checks (shared wording for the API and the admin) ---------- */
export interface PublishIssue {
  /** Dotted path of the field, e.g. "photoId", "cv.en", "links.0.href". */
  path: string
  code: string
  /** French message shown in the admin. */
  message: string
}
