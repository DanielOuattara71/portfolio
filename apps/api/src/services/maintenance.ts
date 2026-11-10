import { sql } from 'drizzle-orm'
import { db } from '../db/client'
import { verifyChain } from './audit'
import { purgeArchivedMessages } from './messages'
import { getStorage } from './storage'

/**
 * Daily maintenance (docs/admin/05 §Conservation, 06): purges + journal chain check.
 * Local trigger: POST /internal/maintenance (QStash signature) or the scripts/internal.ts dev helper.
 */

export async function runMaintenance(now = new Date()) {
  if (!db) throw new Error('DATABASE_URL is not set')

  const out: Record<string, number> = {}

  // Audit log > 12 months via the dedicated purge function (only way to delete).
  const auditRes = (await db!.execute(sql`select audit_log_purge(interval '365 days') as n`) as unknown) as Record<string, unknown>[]
  out.auditPurged = Number(auditRes[0]?.n ?? 0)

  // Login attempts > 90 days.
  const attemptsRes = (await db!.execute(sql`delete from login_attempt where at < now() - interval '90 days' returning id`) as unknown) as Record<string, unknown>[]
  out.loginAttempts = attemptsRes.length

  // Expired sessions > 30 days.
  const sessionsRes = (await db!.execute(sql`delete from session where expires_at < now() - interval '30 days' returning id`) as unknown) as Record<string, unknown>[]
  out.sessions = sessionsRes.length

  // Archived messages > 12 months (shared with the inbox service).
  out.messages = (await purgeArchivedMessages(now)).deleted

  // Media trash > 30 days (private + public files).
  const trashed = (await db!.execute(sql`select id from media where deleted_at is not null and deleted_at < now() - interval '30 days'`) as unknown) as { id: string }[]
  const storage = getStorage()
  let trashedFiles = 0
  for (const row of trashed) {
    try {
      const found = (await db!.execute(sql`select original_key, variants from media where id = ${row.id}`) as unknown) as { original_key: string | null; variants: { key: string }[] | null }[]
      const rec = found[0]
      if (rec?.original_key) {
        await storage.deletePrivate(rec.original_key).catch(() => {})
        await storage.deletePublic(rec.original_key).catch(() => {})
        trashedFiles++
      }
      for (const v of rec?.variants ?? []) {
        await storage.deletePrivate(v.key).catch(() => {})
        await storage.deletePublic(v.key).catch(() => {})
        trashedFiles++
      }
    } catch {
      /* best effort */
    }
  }
  const delTrash = (await db!.execute(sql`delete from media where deleted_at is not null and deleted_at < now() - interval '30 days' returning id`) as unknown) as Record<string, unknown>[]
  out.mediaTrashed = delTrash.length
  out.mediaFiles = trashedFiles

  // Aborted/failed uploads > 1h.
  const uploads = (await db!.execute(sql`delete from media where status in ('uploading', 'failed') and updated_at < now() - interval '1 hour' returning id`) as unknown) as Record<string, unknown>[]
  out.uploads = uploads.length

  // Old replaced-keys files (private + public).
  let replacedFiles = 0
  const replaced = (await db!.execute(sql`select replaced_keys from media where replaced_keys <> '[]'::jsonb`) as unknown) as { replaced_keys: string[] }[]
  for (const row of replaced) {
    for (const k of row.replaced_keys ?? []) {
      await storage.deletePrivate(k).catch(() => {})
      await storage.deletePublic(k).catch(() => {})
      replacedFiles++
    }
  }
  out.replacedFiles = replacedFiles
  await db!.execute(sql`update media set replaced_keys = '[]'::jsonb where replaced_keys <> '[]'::jsonb`)

  // Journal chain.
  const chain = await verifyChain()
  out.chainOk = chain.ok ? 1 : 0

  return { deleted: out, chain }
}
