import { z } from 'zod'
import { localeSchema } from './index'

/** Contact form (docs/07-contenus.md §8, interactions I-14). Same rules on the site and the API. */
export const CONTACT_PROFILES = ['recruiter', 'client', 'other'] as const
export const PROJECT_TYPES = ['web', 'mobile', 'api', 'ai', 'data', 'other'] as const

export const contactSchema = z.object({
  profile: z.enum(CONTACT_PROFILES),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().max(254).email(),
  company: z.string().trim().max(160).optional(),
  role: z.string().trim().max(160).optional(),
  projectTypes: z.array(z.enum(PROJECT_TYPES)).max(PROJECT_TYPES.length).default([]),
  timeline: z.string().trim().max(120).optional(),
  message: z.string().trim().min(20).max(5000),
  consent: z.literal(true),
  locale: localeSchema,
  /** Honeypot: hidden field that humans leave empty. Accepted here so bots get no hint; the API discards filled ones. */
  website: z.string().max(500).optional(),
})

export type ContactInput = z.infer<typeof contactSchema>
export type ContactField = keyof ContactInput
