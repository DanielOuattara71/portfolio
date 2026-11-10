import { and, eq, lt, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { contactMessages, contentItems, contentVersions } from '../db/schema'
import { audit } from './audit'
import { sendMail } from './mail'

/** Retention (docs/07-contenus: confidentialité): archived messages purged after 12 months. */
export const ARCHIVED_RETENTION_MS = 12 * 30 * 24 * 60 * 60 * 1000

/** Published Settings email (the only destination for contact notifications). */
export async function publishedEmail(): Promise<string | null> {
  if (!db) return null
  const [row] = await db
    .select({ data: contentVersions.data })
    .from(contentItems)
    .innerJoin(contentVersions, eq(contentVersions.id, contentItems.publishedVersionId))
    .where(and(eq(contentItems.type, 'settings'), eq(contentItems.key, 'site'), eq(contentItems.status, 'published')))
    .limit(1)
  const email = (row?.data as { email?: string | null } | undefined)?.email
  return email && email.trim() ? email.trim() : null
}

/**
 * Notify the owner of a new contact message. Never throws: a failure is journalised
 * and must not block the message storage (module 8 acceptance).
 */
export async function notifyNewMessage(input: {
  id: string
  profile: string
  name: string
  email: string
  company: string | null
  role: string | null
  projectTypes: string[]
  timeline: string | null
  message: string
  locale: string
}): Promise<'sent' | 'skipped' | 'failed'> {
  const to = await publishedEmail()
  if (!to) return 'skipped'
  const subject = input.locale === 'en' ? `New contact message (${input.profile})` : `Nouveau message de contact (${input.profile})`
  const text = [
    `De : ${input.name} <${input.email}>`,
    input.company ? `Entreprise : ${input.company}` : '',
    input.role ? `Poste : ${input.role}` : '',
    input.projectTypes.length ? `Types de projet : ${input.projectTypes.join(', ')}` : '',
    input.timeline ? `Délai : ${input.timeline}` : '',
    `Langue : ${input.locale}`,
    '',
    input.message,
  ]
    .filter((l) => l !== '')
    .join('\n')
  try {
    await sendMail({ to, subject, text })
    return 'sent'
  } catch (e) {
    await audit({
      action: 'contact.notification_failed',
      result: 'failure',
      severity: 'warning',
      resourceType: 'contact_messages',
      resourceId: input.id,
      meta: { error: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200) },
    })
    return 'failed'
  }
}

/** Delete messages archived more than 12 months ago. Called by the module-10 maintenance. */
export async function purgeArchivedMessages(now = new Date()): Promise<{ deleted: number }> {
  if (!db) return { deleted: 0 }
  const cutoff = new Date(now.getTime() - ARCHIVED_RETENTION_MS)
  const rows = await db
    .delete(contactMessages)
    .where(and(eq(contactMessages.status, 'archived'), lt(contactMessages.archivedAt, cutoff)))
    .returning({ id: contactMessages.id })
  await audit({
    action: 'contact.purged',
    result: 'success',
    resourceType: 'contact_messages',
    meta: { deleted: rows.length, cutoff: cutoff.toISOString() },
  })
  return { deleted: rows.length }
}

/** Fixed-window rate limit in Postgres (works on Vercel, unlike memory). Key namespace `contact:{ip}`. */
export async function dbRateLimit(key: string, limit: number, windowMs: number): Promise<{ ok: boolean; retryAfter: number }> {
  if (!db) return { ok: true, retryAfter: 0 }
  const { rateLimit } = await import('../db/schema')
  const now = Date.now()
  const [row] = await db.select().from(rateLimit).where(eq(rateLimit.key, key)).limit(1)
  if (!row || now - row.lastRequest > windowMs) {
    // New window (or expiry): reset the counter.
    if (row) await db.update(rateLimit).set({ count: 1, lastRequest: now }).where(eq(rateLimit.key, key))
    else await db.insert(rateLimit).values({ id: key, key, count: 1, lastRequest: now }).onConflictDoNothing()
    return { ok: true, retryAfter: 0 }
  }
  if (row.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - row.lastRequest)) / 1000) }
  }
  await db
    .update(rateLimit)
    .set({ count: sql`${rateLimit.count} + 1`, lastRequest: now })
    .where(eq(rateLimit.key, key))
  return { ok: true, retryAfter: 0 }
}
