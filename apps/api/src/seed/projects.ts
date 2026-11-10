// INITIAL CONTENT, used only by scripts/import-seed.ts (pnpm --filter @portfolio/api db:seed).
// Since admin module 3 the public site reads the database; edit content in the admin, not here.
import type { Domain, Locale, ProjectContext } from '@portfolio/shared/constants'
import type { ProjectLink } from '@portfolio/shared/project'

/**
 * Projects + case studies. TEMPORARY SEED from docs/07-contenus.md §4 — only known facts.
 * Unknown values are null/empty and hidden on the site (never fake captures). UI shows clearly
 * identified placeholders for missing visuals (prompt 15). Will be served by the API with the same shape.
 */
type Localized<T = string> = Record<Locale, T>

export interface CaseStudySeed {
  context: Localized<string> | null
  problem: Localized<string> | null
  goals: Localized<string[]> | null
  solution: Localized<string[]> | null
  architectureNote: Localized<string> | null
  techRoles: { tech: string; role: Localized<string> }[] | null
  challenges: Localized<string[]> | null
  results: Localized<string[]> | null
  /** Real capture paths. Empty = placeholders in review mode only, never fake screenshots. */
  gallery: string[]
  /**
   * Fields drafted from what the owner said, marked [À VALIDER] in docs/07-contenus.md.
   * Hidden on the public site until confirmed; shown in review mode (NUXT_PUBLIC_SHOW_PLACEHOLDERS).
   */
  pending?: PendingField[]
}

export type PendingField = Exclude<keyof CaseStudySeed, 'gallery' | 'pending'>

export interface ProjectSeed {
  id: string
  /** Display name per language (proper nouns stay identical) */
  name: Localized
  slug: Localized
  context: ProjectContext | null
  solo?: boolean
  domains: Domain[]
  stack: string[]
  period: string | null
  kind: Localized
  role: Localized<string | null>
  tagline: Localized
  summary: Localized
  cover: string | null
  /** Required before publishing (projectLinksSchema). Null until the owner provides the real URLs. */
  links: ProjectLink[] | null
  featured: boolean
  caseStudy: CaseStudySeed
}

const emptyCase = (): CaseStudySeed => ({
  context: null,
  problem: null,
  goals: null,
  solution: null,
  architectureNote: null,
  techRoles: null,
  challenges: null,
  results: null,
  gallery: [],
})

export const projectsSeed: ProjectSeed[] = [
  {
    id: 'PRJ-01',
    name: { fr: 'Prince Edja', en: 'Prince Edja' },
    slug: { fr: 'prince-edja', en: 'prince-edja' },
    context: 'client',
    solo: true,
    domains: ['web'],
    stack: [],
    period: null,
    kind: { fr: 'projet client', en: 'client project' },
    role: { fr: 'conception et développement, seul', en: 'design and development, solo' },
    tagline: { fr: 'Une plateforme web pour faire vivre un univers artistique.', en: 'A web platform to showcase an artistic universe.' },
    summary: {
      fr: "Plateforme web qui présente un univers artistique, ses projets et ses contenus éditoriaux, avec une réflexion sur un espace d'administration.",
      en: 'A web platform presenting an artistic universe, its projects and editorial content, with groundwork for an admin area.',
    },
    cover: null,
    links: null,
    featured: true,
    caseStudy: {
      ...emptyCase(),
      pending: ['context', 'problem'],
      context: {
        fr: "Le client avait besoin d'un site pour présenter son univers artistique, ses projets et ses contenus, et pouvoir le faire évoluer.",
        en: 'The client needed a website to present their artistic universe, projects and content, and to keep it up to date over time.',
      },
      problem: {
        fr: "Réunir des contenus de nature différente (projets, textes éditoriaux) dans un site cohérent, et préparer leur mise à jour sans passer par le code.",
        en: 'Bring together different kinds of content (projects, editorial pieces) in one coherent site, and prepare for updates without touching the code.',
      },
    },
  },
  {
    id: 'PRJ-02',
    name: { fr: 'Retrouve Moi', en: 'Retrouve Moi' },
    slug: { fr: 'retrouve-moi', en: 'retrouve-moi' },
    context: null,
    domains: ['mobile', 'cloud'],
    stack: ['Flutter', 'Node.js', 'MongoDB', 'Firebase', 'Cloudflare R2'],
    period: null,
    kind: { fr: 'application mobile', en: 'mobile app' },
    role: { fr: null, en: null },
    tagline: { fr: "Une application mobile pour retrouver ce qu'on a perdu.", en: "A mobile app to find what you've lost." },
    summary: {
      fr: "Application mobile de recherche d'objets perdus et retrouvés.",
      en: 'A mobile app for reporting and finding lost items.',
    },
    cover: null,
    links: null,
    featured: true,
    caseStudy: {
      ...emptyCase(),
      pending: ['problem', 'goals', 'techRoles'],
      problem: {
        fr: "Quand on perd un objet, on ne sait pas s'il a été trouvé, ni par qui. Quand on en trouve un, il est difficile d'en retrouver le propriétaire.",
        en: "When you lose something, you rarely know whether anyone found it. When you find something, it's hard to track down its owner.",
      },
      goals: {
        fr: [
          "Publier une annonce d'objet perdu ou trouvé, avec photo.",
          'Rechercher parmi les annonces.',
          'Mettre en relation la personne qui a perdu et celle qui a trouvé.',
        ],
        en: [
          'Post a lost or found item with a photo.',
          'Search existing posts.',
          'Connect the person who lost the item with the one who found it.',
        ],
      },
      techRoles: [
        { tech: 'Flutter', role: { fr: 'Application mobile multiplateforme', en: 'Cross-platform mobile app' } },
        { tech: 'Node.js', role: { fr: 'API qui gère les annonces et les utilisateurs', en: 'API handling posts and users' } },
        { tech: 'MongoDB', role: { fr: 'Base de données des annonces', en: 'Database for posts' } },
        { tech: 'Firebase', role: { fr: 'À préciser (authentification, notifications)', en: 'To be specified (authentication, notifications)' } },
        { tech: 'Cloudflare R2', role: { fr: "Stockage des photos d'objets", en: 'Storage for item photos' } },
      ],
    },
  },
  {
    id: 'PRJ-03',
    name: { fr: 'Gestion de livraison', en: 'Delivery management' },
    slug: { fr: 'gestion-de-livraison', en: 'delivery-management' },
    context: 'internship',
    domains: ['web', 'mobile'],
    stack: ['Vue.js', 'Node.js', 'API REST'],
    period: null,
    kind: { fr: 'stage · Smart Innovation 7', en: 'internship · Smart Innovation 7' },
    role: { fr: null, en: null },
    tagline: { fr: 'Une solution de gestion de livraison : web, mobile et API.', en: 'A delivery management solution: web, mobile and API.' },
    summary: {
      fr: 'Solution de gestion de livraison développée pendant mon stage : interface web, application mobile et API REST.',
      en: 'A delivery management solution built during my internship: web interface, mobile app and REST API.',
    },
    cover: null,
    links: null,
    featured: true,
    caseStudy: {
      ...emptyCase(),
      context: {
        fr: 'Projet réalisé au sein de Smart Innovation 7 pendant mon stage.',
        en: 'Built at Smart Innovation 7 during my internship.',
      },
    },
  },
  {
    id: 'PRJ-04',
    name: { fr: 'Data Engineering', en: 'Data Engineering' },
    slug: { fr: 'data-engineering', en: 'data-engineering' },
    context: 'academic',
    domains: ['data'],
    stack: ['Python', 'Pandas'],
    period: null,
    kind: { fr: 'travaux pratiques', en: 'coursework' },
    role: { fr: null, en: null },
    tagline: { fr: 'Rendre un jeu de données fiable, étape par étape.', en: 'Making a dataset reliable, step by step.' },
    summary: {
      fr: 'Exploration, nettoyage, transformation et contrôle de la qualité des données avec Python et Pandas.',
      en: 'Exploring, cleaning, transforming and quality-checking data with Python and Pandas.',
    },
    cover: null,
    links: null,
    featured: true,
    caseStudy: {
      ...emptyCase(),
      context: {
        fr: 'Travaux pratiques de mon Master, orienté data engineering.',
        en: "Coursework from my Master's, on the data engineering track.",
      },
      solution: {
        fr: ['Quatre étapes : explorer les données, les nettoyer, les transformer, puis contrôler leur qualité.'],
        en: ['Four steps: explore the data, clean it, transform it, then check its quality.'],
      },
      architectureNote: {
        fr: 'Pipeline en quatre étapes : exploration, nettoyage, transformation, contrôle qualité.',
        en: 'A four-step pipeline: explore, clean, transform, quality check.',
      },
    },
  },
  {
    id: 'PRJ-05',
    name: { fr: 'Portfolio & CMS', en: 'Portfolio & CMS' },
    slug: { fr: 'portfolio-cms', en: 'portfolio-cms' },
    context: 'this_site',
    domains: ['web', 'cloud'],
    stack: ['Nuxt', 'TypeScript', 'Hono', 'PostgreSQL', 'Vercel'],
    period: '2026',
    kind: { fr: 'ce site · en cours', en: 'this site · in progress' },
    role: { fr: 'conception et développement', en: 'design and development' },
    tagline: {
      fr: "Ce site : un portfolio bilingue et son propre espace d'administration.",
      en: 'This site: a bilingual portfolio with its own admin system.',
    },
    summary: {
      fr: "Site public bilingue, API, espace d'administration sécurisé et déploiement sur Vercel, conçus et développés de bout en bout.",
      en: 'A bilingual public site, an API, a secure admin area and deployment on Vercel, designed and built end to end.',
    },
    cover: null,
    links: null,
    featured: true,
    caseStudy: {
      ...emptyCase(),
      // The solution line is a note about the writing process, not a fact about the project.
      pending: ['solution'],
      context: {
        fr: 'Je voulais un portfolio dont je gère tous les contenus moi-même, en français et en anglais, sans modifier le code à chaque changement.',
        en: 'I wanted a portfolio where I manage all the content myself, in French and English, without editing code for every change.',
      },
      goals: {
        fr: [
          "Gérer projets, textes, articles et médias depuis un espace d'administration.",
          'Publier chaque langue indépendamment.',
          "Sécuriser l'accès (connexion, rôles, journal d'activité, sauvegardes).",
          'Garder un site rapide et accessible.',
        ],
        en: [
          'Manage projects, copy, articles and media from an admin area.',
          'Publish each language independently.',
          'Secure access (sign-in, roles, activity log, backups).',
          'Keep the site fast and accessible.',
        ],
      },
      solution: {
        fr: [
          'Solution, architecture, difficultés et résultats sont rédigés au fil du développement, à partir de ce qui est réellement construit.',
        ],
        en: ['Solution, architecture, challenges and results are written as development progresses, based on what is actually built.'],
      },
    },
  },
]
