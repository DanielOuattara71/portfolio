import { createHmac, timingSafeEqual } from 'node:crypto'
import { getItem } from './workflow'
import { loadPublishedContent } from '../routes/public/content'
import { CONTENT_TYPES } from '@portfolio/shared/content'

/**
 * Private preview (docs/admin/03 §Prévisualiser): the site renders the WORKING copy
 * of a project on its real page, with a banner and noindex, for 30 minutes.
 * The token is HMAC-signed and bound to the user who created it.
 */
export const PREVIEW_TTL_SEC = 30 * 60

function secret() {
  const s = process.env.BETTER_AUTH_SECRET ?? ''
  if (s.length < 32) throw new Error('BETTER_AUTH_SECRET must be set to create preview tokens')
  return s
}

function b64url(buf: Buffer) {
  return buf.toString('base64url')
}

export function createPreviewToken(itemId: string, userId: string) {
  const exp = Math.floor(Date.now() / 1000) + PREVIEW_TTL_SEC
  const payload = b64url(Buffer.from(JSON.stringify({ itemId, userId, exp })))
  const sig = b64url(createHmac('sha256', secret()).update(payload).digest())
  return { token: `${payload}.${sig}`, expiresAt: new Date(exp * 1000).toISOString() }
}

export function verifyPreviewToken(token: string): { itemId: string; userId: string; exp: number } {
  const [payload, sig] = token.split('.')
  if (!payload || !sig) throw new Error('Invalid token')
  const expected = Buffer.from(b64url(createHmac('sha256', secret()).update(payload).digest()))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new Error('Invalid token')
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  if (!data?.itemId || !data?.userId || !data?.exp) throw new Error('Invalid token')
  if (Math.floor(Date.now() / 1000) > data.exp) throw new Error('Token expired')
  return data
}

/** PublishedContent with the working copy swapped in for one item ("à valider" fields stay visible). */
export async function loadPreviewContent(token: string) {
  const { itemId } = verifyPreviewToken(token)
  const item = await getItem(itemId)
  if (!item) throw new Error('Content not found')
  const content = await loadPublishedContent()
  const marked = { itemId, type: item.type, key: item.key, pendingFields: item.pendingFields }
  const working = item.working as Record<string, unknown>

  if (item.type === 'project') {
    const idx = content.projects.findIndex((p) => p.key === item.key)
    if (idx >= 0) content.projects[idx] = { key: item.key, featured: item.featured, doc: working as never }
    else content.projects.push({ key: item.key, featured: item.featured, doc: working as never })
  } else if (item.type === 'settings') {
    content.settings = working as never
  } else if (item.type === 'block') {
    const map: Record<string, string> = {
      hero: 'hero',
      profile: 'profile',
      'intro-projects': 'introProjects',
      'intro-profile': 'introProfile',
      'intro-services': 'introServices',
      'intro-background': 'introBackground',
      'intro-approach': 'introApproach',
      'intro-expertise': 'introExpertise',
      'intro-contact': 'introContact',
      band: 'band',
      footer: 'footer',
      legal: 'legal',
      privacy: 'privacy',
      'seo-home': 'seoHome',
      'seo-projects': 'seoProjects',
      'seo-profile': 'seoProfile',
      'seo-expertise': 'seoExpertise',
      'seo-contact': 'seoContact',
    }
    const slot = map[item.key]
    if (slot) (content.blocks as Record<string, unknown>)[slot] = working
  } else if (CONTENT_TYPES.includes(item.type)) {
    const map: Record<string, { key: string; featured: boolean; doc: unknown }[]> = {
      skill: content.skills as never,
      domain: content.domains as never,
      service: content.services as never,
      step: content.steps as never,
      experience: content.experience as never,
      education: content.education as never,
      certification: content.certifications as never,
    }
    const list = map[item.type]
    if (list) {
      const idx = list.findIndex((p) => p.key === item.key)
      if (idx >= 0) list[idx] = { key: item.key, featured: item.featured, doc: working } as never
      else list.push({ key: item.key, featured: item.featured, doc: working } as never)
    }
  }
  return { content, marked }
}
