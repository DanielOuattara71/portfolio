// INITIAL CONTENT, used only by scripts/import-seed.ts (pnpm --filter @portfolio/api db:seed).
// Since admin module 3 the public site reads the database; edit content in the admin, not here.
import type { Locale } from '@portfolio/shared/constants'

/**
 * Home page content. TEMPORARY SEED: copy validated in docs/07-contenus.md.
 * It will be served by the API (GET /public/pages/home) once the data model exists,
 * with the same shape, so components do not change.
 */
export interface TextSegment {
  text: string
  accent?: boolean
}

export interface StatPill {
  before?: string
  strong: string
  after?: string
}

export interface HomeContent {
  eyebrow: string
  lead: string
  value: TextSegment[]
  stats: StatPill[]
  badge: string
  profile: { label: string; value: string | null }[]
}

export const homeSeed: Record<Locale, HomeContent> = {
  fr: {
    eyebrow: 'Software & Data Engineer',
    lead: 'Du produit à la donnée.',
    value: [
      { text: 'Je conçois des applications web et mobiles ' },
      { text: 'de bout en bout', accent: true },
      { text: ", j'y intègre l'IA et l'automatisation quand elles sont utiles, et je me spécialise dans " },
      { text: 'la donnée et le cloud', accent: true },
      { text: '.' },
    ],
    stats: [
      { strong: '5', after: 'études de cas' },
      { strong: 'FR · EN', after: 'bilingue' },
      { before: 'M2 SIGL ·', strong: 'ESATIC' },
    ],
    badge: 'SOFTWARE · DATA · CLOUD · IA · WEB · MOBILE · ',
    profile: [
      { label: 'role', value: 'Software & Data Engineer' },
      { label: 'focus', value: 'web · mobile · IA · data · cloud' },
      { label: 'langs', value: 'fr · en' },
      { label: 'mode', value: 'télétravail international' },
      { label: 'ville', value: null },
    ],
  },
  en: {
    eyebrow: 'Software & Data Engineer',
    lead: 'From product to data.',
    value: [
      { text: 'I design and build web and mobile apps ' },
      { text: 'end to end', accent: true },
      { text: ', add AI and automation where they make a real difference, and I’m specialising in ' },
      { text: 'data and cloud', accent: true },
      { text: '.' },
    ],
    stats: [
      { strong: '5', after: 'case studies' },
      { strong: 'FR · EN', after: 'bilingual' },
      { before: 'Master’s ·', strong: 'ESATIC' },
    ],
    badge: 'SOFTWARE · DATA · CLOUD · AI · WEB · MOBILE · ',
    profile: [
      { label: 'role', value: 'Software & Data Engineer' },
      { label: 'focus', value: 'web · mobile · AI · data · cloud' },
      { label: 'langs', value: 'fr · en' },
      { label: 'mode', value: 'remote, worldwide' },
      { label: 'city', value: null },
    ],
  },
}
