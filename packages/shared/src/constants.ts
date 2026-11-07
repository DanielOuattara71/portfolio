/**
 * Plain constants and types, without Zod: safe to import in the browser bundle of the public site
 * (importing the package root pulls Zod in). Schemas live in index.ts, contact.ts and project.ts.
 */

/** Languages of the site. The first one is the fallback for unknown browser languages (international audience). */
export const LOCALES = ['en', 'fr'] as const
export type Locale = (typeof LOCALES)[number]
export const FALLBACK_LOCALE: Locale = 'en'

/** Professional fields, used to filter projects and group skills (docs/06-architecture.md). */
export const DOMAINS = ['web', 'mobile', 'data', 'cloud', 'ai'] as const
export type Domain = (typeof DOMAINS)[number]

/** Skill levels shown on the site (docs/03-positionnement.md). */
export const SKILL_LEVELS = ['practised', 'studied', 'exploring'] as const
export type SkillLevel = (typeof SKILL_LEVELS)[number]

/** Editorial workflow states (admin_portfolio.md, Prompt 03). */
export const CONTENT_STATUSES = ['draft', 'in_review', 'published', 'archived'] as const
export type ContentStatus = (typeof CONTENT_STATUSES)[number]

/** Admin roles (admin_portfolio.md, Prompt 04). */
export const ROLES = ['admin', 'editor', 'viewer'] as const
export type Role = (typeof ROLES)[number]

/** Project contexts shown as badges (docs/07-contenus.md §4). */
export const PROJECT_CONTEXTS = ['client', 'internship', 'academic', 'personal', 'this_site'] as const
export type ProjectContext = (typeof PROJECT_CONTEXTS)[number]
