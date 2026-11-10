import { and, count, desc, eq, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { auditLog, contactMessages, contentItems, media } from '../db/schema'
import { listTranslations, missingAltMedia } from './translations'
import { verifyChain } from './audit'

/**
 * Dashboard figures (docs/admin/02 §A, prompt module 9): real numbers only,
 * every figure verifiable with a SQL count. Monitoring/backup: "not available" until module 10.
 */
export interface Todo {
  kind: string
  label: string
  detail: string | null
  link: string
}

export async function loadDashboard() {
  if (!db) throw new Error('DATABASE_URL is not set')

  const byStatus = async (type: string) => {
    const rows = await db!
      .select({ status: contentItems.status, n: count() })
      .from(contentItems)
      .where(eq(contentItems.type, type as never))
      .groupBy(contentItems.status)
    return Object.fromEntries((rows ?? []).map((r) => [r.status, r.n]))
  }

  const projects = await byStatus('project')
  const blocks = await byStatus('block')

  const todos: Todo[] = []

  // Settings: name/photo/CV
  const [settingsItem] = await db!.select().from(contentItems).where(eq(contentItems.type, 'settings')).limit(1)
  if (settingsItem) {
    const s = settingsItem.working as { name?: string | null; photoId?: string | null; cv?: { fr: string | null; en: string | null } }
    if (!s.name?.trim()) todos.push({ kind: 'settings_name', label: 'Nom affiché vide', detail: 'Le site affiche « Software & Data Engineer »', link: '/parametres' })
    if (!s.photoId) todos.push({ kind: 'settings_photo', label: 'Photo de profil absente', detail: null, link: '/parametres' })
    if (!s.cv?.fr) todos.push({ kind: 'settings_cv', label: 'CV FR absent', detail: null, link: '/parametres' })
    if (!s.cv?.en) todos.push({ kind: 'settings_cv', label: 'CV EN absent', detail: null, link: '/parametres' })
  }

  // Projects without any link
  const projectRows = await db!.select().from(contentItems).where(eq(contentItems.type, 'project'))
  for (const p of projectRows) {
    const doc = p.working as { links?: { href: string }[]; name?: { fr: string; en: string } }
    if (!doc.links?.length) todos.push({ kind: 'project_no_link', label: `${p.key} sans lien`, detail: doc.name?.fr || null, link: `/projets/${p.id}` })
    if (p.pendingFields.length) todos.push({ kind: 'pending', label: `${p.key} : ${p.pendingFields.length} champ(s) « à valider »`, detail: p.pendingFields.join(', '), link: `/projets/${p.id}` })
  }

  // Pending on any content (blocks, skills…)
  const pendingRows = await db!.select().from(contentItems).where(sql`${contentItems.pendingFields} <> '{}'::text[]`)
  for (const p of pendingRows) {
    if (p.type === 'project') continue // already listed
    todos.push({ kind: 'pending', label: `${p.type}:${p.key} : ${p.pendingFields.length} champ(s) « à valider »`, detail: p.pendingFields.join(', '), link: linkForContent(p.type, p.id, p.key) })
  }

  // Media without alt
  const altMissing = await missingAltMedia()
  for (const m of altMissing.slice(0, 10)) {
    todos.push({ kind: 'media_alt', label: `Image sans texte alternatif : ${m.name}`, detail: null, link: '/medias' })
  }

  // Translations (aggregated per content, capped)
  const { items: trItems, totalMissing } = await listTranslations()
  for (const t of trItems.slice(0, 10)) {
    todos.push({ kind: 'translation', label: `${t.type}:${t.key} : ${t.missing.length} champ(s) manquant(s)`, detail: null, link: '/traductions' })
  }
  if (totalMissing > 0 && trItems.length > 10) {
    todos.push({ kind: 'translation', label: `${totalMissing} traduction(s) manquante(s) au total`, detail: null, link: '/traductions' })
  }

  const [unreadRow] = await db!.select({ n: count() }).from(contactMessages).where(eq(contactMessages.status, 'new'))
  const unread = unreadRow?.n ?? 0

  // Module 10 figures: real, measured values only.
  const { alert: alertTable, backup: backupTable, incident: incidentTable, serviceCheck } = await import('../db/schema')
  const checks: Record<string, { ok: boolean | null; ms: number | null; at: string | null; n24h: number; okRate24h: number }> = {}
  for (const target of ['web', 'api', 'db', 'storage'] as const) {
    const [last] = await db!.select().from(serviceCheck).where(eq(serviceCheck.target, target)).orderBy(desc(serviceCheck.at)).limit(1)
    const day = await db!.select({ ok: serviceCheck.ok }).from(serviceCheck).where(and(eq(serviceCheck.target, target), sql`${serviceCheck.at} >= now() - interval '24 hours'`))
    const okN = day.filter((r) => r.ok).length
    checks[target] = { ok: last?.ok ?? null, ms: last?.ms ?? null, at: last ? last.at.toISOString() : null, n24h: day.length, okRate24h: day.length ? okN / day.length : 0 }
  }
  const openAlerts = await db!.select().from(alertTable).where(eq(alertTable.status, 'open')).orderBy(desc(alertTable.lastAt)).limit(20)
  const openIncidents = await db!.select().from(incidentTable).where(eq(incidentTable.status, 'open')).orderBy(desc(incidentTable.openedAt)).limit(20)
  const lastBackup = (await db!.select().from(backupTable).where(eq(backupTable.result, 'success')).orderBy(desc(backupTable.finishedAt)).limit(1))[0]
  const [restoreTestedRow] = await db!.select({ id: backupTable.id }).from(backupTable).where(and(eq(backupTable.result, 'success'), sql`${backupTable.restoreTestedAt} is not null`)).limit(1)
  const lastBackupFailed = (await db!.select().from(backupTable).where(eq(backupTable.result, 'failed')).orderBy(desc(backupTable.finishedAt)).limit(1))[0]
  const chain = await verifyChain()

  const recent = await db!
    .select({ id: auditLog.id, at: auditLog.at, actorEmail: sql<string>`(select email from "user" where id = ${auditLog.actorId})`, actorRole: auditLog.actorRole, action: auditLog.action, resourceLabel: auditLog.resourceLabel, result: auditLog.result, severity: auditLog.severity })
    .from(auditLog)
    .orderBy(desc(auditLog.id))
    .limit(10)

  return {
    projects,
    blocks,
    todos,
    unreadMessages: unread,
    recentActions: recent.map((r) => ({ ...r, at: r.at.toISOString() })),
    monitoring: {
      available: true as const,
      checks,
      openAlertsCount: openAlerts.length,
      openIncidents: openIncidents.length,
      chainOk: chain.ok,
      chainCheckedAt: new Date().toISOString(),
    },
    alerts: {
      available: true as const,
      open: openAlerts.map((a) => ({ id: a.id, rule: a.rule, severity: a.severity, count: a.count, lastAt: a.lastAt.toISOString() })),
    },
    backup: {
      available: true as const,
      lastSuccess: lastBackup ? { at: lastBackup.finishedAt?.toISOString() ?? null, bytes: lastBackup.bytes, verified: !!lastBackup.verifiedAt, restoreTested: !!lastBackup.restoreTestedAt } : null,
      lastFailure: lastBackupFailed ? { at: lastBackupFailed.finishedAt?.toISOString() ?? null, error: lastBackupFailed.error } : null,
      verified: !!restoreTestedRow,
    },
    generatedAt: new Date().toISOString(),
  }
}

function linkForContent(type: string, id: string, key: string): string {
  if (type === 'project') return `/projets/${id}`
  if (type === 'block') return `/textes?key=${encodeURIComponent(key)}`
  if (type === 'skill' || type === 'domain') return '/competences'
  return '/parcours'
}

export { count }
