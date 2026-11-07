import { z } from 'zod'

/**
 * External links of a project. Rule (owner request, 2026-11-07): every published project has
 * at least one link. The admin and the API validate it with `projectLinksSchema` before publishing.
 */
export const PROJECT_LINK_KINDS = ['demo', 'code', 'store', 'doc'] as const
export type ProjectLinkKind = (typeof PROJECT_LINK_KINDS)[number]

export const projectLinkSchema = z.object({
  kind: z.enum(PROJECT_LINK_KINDS),
  href: z.url({ protocol: /^https?$/ }).max(500),
})
export type ProjectLink = z.infer<typeof projectLinkSchema>

/** At least one link to publish a project; a handful at most to keep the page readable. */
export const projectLinksSchema = z.array(projectLinkSchema).min(1, 'At least one link is required').max(6)
