import { z } from 'zod'
import { DOMAINS, LOCALES } from './constants'

// Constants and types (no Zod). The public site imports them from '@portfolio/shared/constants'.
export * from './constants'

export const localeSchema = z.enum(LOCALES)
export const domainSchema = z.enum(DOMAINS)

/** URL slug: lowercase letters, digits and single hyphens. */
export const slugSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, digits and hyphens only')
