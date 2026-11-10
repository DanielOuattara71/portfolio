import { and, count, desc, eq, gte, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { alert, backup, incident, incidentNote, loginAttempt, serviceCheck } from '../db/schema'
import { audit, verifyChain } from './audit'
import { publishedEmail } from './messages'
import { sendMail } from './mail'

/**
 * Probes + alerts (docs/admin/05). Only measured values are shown.
 * QStash calls POST /internal/checks every 5 min in production; locally a script triggers it.
 */

export type CheckTarget = 'web' | 'api' | 'db' | 'storage'

interface ProbeResult {
  target: CheckTarget
  ok: boolean
  statusCode: number | null
  ms: number
  error: string | null
}

async function probe(target: CheckTarget): Promise<ProbeResult> {
  const started = Date.now()
  try {
    if (target === 'db') {
      if (!db) return { target, ok: false, statusCode: null, ms: Date.now() - started, error: 'DATABASE_URL not set' }
      await db.execute(sql`select 1`)
      return { target, ok: true, statusCode: 200, ms: Date.now() - started, error: null }
    }
    if (target === 'api') {
      const base = process.env.PUBLIC_API_BASE ?? `http://localhost:${process.env.API_PORT ?? 8787}`
      const res = await fetch(`${base.replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(5000) })
      const ms = Date.now() - started
      if (!res.ok) return { target, ok: false, statusCode: res.status, ms, error: `HTTP ${res.status}` }
      return { target, ok: true, statusCode: res.status, ms, error: null }
    }
    if (target === 'web') {
      const base = process.env.PUBLIC_SITE_URL ?? process.env.NUXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
      const res = await fetch(`${base.replace(/\/$/, '')}/fr`, { signal: AbortSignal.timeout(5000) })
      const ms = Date.now() - started
      if (!res.ok) return { target, ok: false, statusCode: res.status, ms, error: `HTTP ${res.status}` }
      return { target, ok: true, statusCode: res.status, ms, error: null }
    }
    // Storage: local witness file read (private storage), or R2 HEAD via list? Local: read .storage/.witness if present, else ok when the directory exists.
    const { getStorage } = await import('./storage')
    const storage = getStorage()
    const started2 = Date.now()
    // Witness: private read of a tiny marker; absence is not a failure in dev (storage empty yet).
    // We treat "storage reachable" as: getPrivate returns (even null) without throwing.
    try {
      await storage.getPrivate('.witness')
      return { target, ok: true, statusCode: 200, ms: Date.now() - started2, error: null }
    } catch (e) {
      return { target, ok: false, statusCode: null, ms: Date.now() - started2, error: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200) }
    }
  } catch (e) {
    return { target, ok: false, statusCode: null, ms: Date.now() - started, error: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200) }
  }
}

export async function runChecks(now = new Date()) {
  const targets: CheckTarget[] = ['web', 'api', 'db', 'storage']
  const results = await Promise.all(targets.map((t) => probe(t)))
  if (db) {
    await db.insert(serviceCheck).values(results.map((r) => ({ at: now, target: r.target, ok: r.ok, statusCode: r.statusCode, ms: r.ms, error: r.error })))
  }
  await evaluateAlerts(now)
  return results
}

/* ---------- Alerts ---------- */

async function upsertAlert(rule: string, severity: 'warning' | 'critical', data: Record<string, unknown>, now: Date) {
  if (!db) return null
  const [open] = await db.select().from(alert).where(and(eq(alert.rule, rule), eq(alert.status, 'open'))).limit(1)
  const [ack] = await db.select().from(alert).where(and(eq(alert.rule, rule), eq(alert.status, 'acknowledged'))).limit(1)
  const current = open ?? ack ?? null
  let row = current
  let shouldEmail = false
  if (!row) {
    const [inserted] = await db.insert(alert).values({ rule, severity, status: 'open', firstAt: now, lastAt: now, count: 1, data }).returning()
    row = inserted!
    shouldEmail = true
  } else {
    const last = new Date(row.lastAt).getTime()
    const [updated] = await db
      .update(alert)
      .set({ lastAt: now, count: (row.count ?? 0) + 1, data })
      .where(eq(alert.id, row.id))
      .returning()
    row = updated!
    shouldEmail = now.getTime() - last >= 60 * 60 * 1000
  }
  if (shouldEmail && row) {
    await sendAlertEmail(rule, severity, data)
    await audit({ action: 'alert.opened', result: 'success', severity, resourceType: 'alert', resourceId: String(row.id), meta: { rule } })
    // Critical alerts open an incident automatically.
    if (severity === 'critical') {
      await ensureIncident(row.id, rule, severity, data)
    }
  }
  return row
}

async function sendAlertEmail(rule: string, severity: string, data: Record<string, unknown>) {
  const to = await publishedEmail()
  if (!to) return
  try {
    await sendMail({
      to,
      subject: `Alerte ${severity}: ${rule}`,
      text: `Alerte ${severity} — ${rule}\n${JSON.stringify(data, null, 2)}\n`,
    })
  } catch {
    /* Email failure must not block monitoring; journalised inside sendMail callers where noted. */
  }
}

async function ensureIncident(alertId: number, rule: string, severity: 'warning' | 'critical', data: Record<string, unknown>) {
  if (!db) return
  const [existing] = await db.select().from(incident).where(and(eq(incident.alertId, alertId), eq(incident.status, 'open'))).limit(1)
  if (existing) return
  const n = (await db.select({ n: count() }).from(incident).then((r) => r[0]?.n ?? 0)) + 1
  const number = `INC-${String(n).padStart(3, '0')}`
  const [row] = await db
    .insert(incident)
    .values({ number, title: `Alerte ${rule}`, severity, status: 'open', alertId, openedBy: 'system' })
    .returning()
  await db.insert(incidentNote).values({ incidentId: row!.id, authorId: null, text: `Incident ouvert automatiquement (${rule}). ${JSON.stringify(data).slice(0, 500)}` })
}

export async function evaluateAlerts(now = new Date()) {
  if (!db) return
  // Login failures: 10/account or 20/IP in 1h (critical).
  const since = new Date(now.getTime() - 60 * 60 * 1000)
  const failures = await db
    .select({ userId: loginAttempt.userId, ipTrunc: loginAttempt.ipTrunc, result: loginAttempt.result, at: loginAttempt.at })
    .from(loginAttempt)
    .where(gte(loginAttempt.at, since))
  const byUser = new Map<string, number>()
  const byIp = new Map<string, number>()
  for (const f of failures) {
    if (f.result !== 'failure' && f.result !== 'second_factor_failed') continue
    if (f.userId) byUser.set(f.userId, (byUser.get(f.userId) ?? 0) + 1)
    if (f.ipTrunc) byIp.set(f.ipTrunc, (byIp.get(f.ipTrunc) ?? 0) + 1)
  }
  const worstUser = [...byUser.entries()].sort((a, b) => b[1] - a[1])[0]
  if (worstUser && worstUser[1] >= 10) await upsertAlert('login.account_flood', 'critical', { userId: worstUser[0], count: worstUser[1] }, now)
  const worstIp = [...byIp.entries()].sort((a, b) => b[1] - a[1])[0]
  if (worstIp && worstIp[1] >= 20) await upsertAlert('login.ip_flood', 'critical', { ip: worstIp[0], count: worstIp[1] }, now)

  // 10× 5xx in 5 min (api target).
  const fiveMin = new Date(now.getTime() - 5 * 60 * 1000)
  const errors = await db
    .select()
    .from(serviceCheck)
    .where(and(eq(serviceCheck.target, 'api'), gte(serviceCheck.at, fiveMin)))
  const n5xx = errors.filter((e) => (e.statusCode ?? 0) >= 500).length
  if (n5xx >= 10) await upsertAlert('api.errors_5xx', 'critical', { count: n5xx }, now)

  // 2 probes failed in a row (+ recovery email when back to ok, docs/admin/05 §D).
  for (const target of ['web', 'api', 'db', 'storage'] as CheckTarget[]) {
    const last2 = await db
      .select()
      .from(serviceCheck)
      .where(eq(serviceCheck.target, target))
      .orderBy(desc(serviceCheck.at))
      .limit(2)
    if (last2.length === 2 && !last2[0]!.ok && !last2[1]!.ok) {
      await upsertAlert('probe.failed_twice', 'critical', { target }, now)
    } else if (last2.length >= 1 && last2[0]!.ok) {
      const [open] = await db.select().from(alert).where(and(eq(alert.rule, 'probe.failed_twice'), eq(alert.status, 'open'))).limit(1)
      const matchesTarget = open && String((open.data as Record<string, unknown> | null)?.target) === target
      if (open && matchesTarget) {
        await sendAlertEmail('probe.recovered', 'info', { target })
        await db.update(alert).set({ status: 'resolved' }).where(eq(alert.id, open.id))
        await audit({ action: 'alert.recovered', result: 'success', actorId: 'system', resourceType: 'alert', resourceId: String(open.id), meta: { target } })
        const [openIncident] = await db.select().from(incident).where(and(eq(incident.alertId, open.id), eq(incident.status, 'open'))).limit(1)
        if (openIncident) {
          await db.insert(incidentNote).values({ incidentId: openIncident.id, authorId: null, text: `Sonde ${target} de nouveau OK.` })
        }
      }
    }
  }

  // Backup failed or missing since 36h.
  const [lastBackup] = await db.select().from(backup).where(eq(backup.result, 'success')).orderBy(desc(backup.finishedAt)).limit(1)
  const missingSince = lastBackup?.finishedAt ? now.getTime() - new Date(lastBackup.finishedAt).getTime() : Number.POSITIVE_INFINITY
  if (!lastBackup || missingSince > 36 * 60 * 60 * 1000) {
    await upsertAlert('backup.missing', 'critical', { lastBackup: lastBackup?.finishedAt?.toISOString() ?? null }, now)
  }
  const [failedBackup] = await db.select().from(backup).where(eq(backup.result, 'failed')).orderBy(desc(backup.finishedAt)).limit(1)
  if (failedBackup && failedBackup.finishedAt && now.getTime() - new Date(failedBackup.finishedAt).getTime() < 36 * 60 * 60 * 1000) {
    await upsertAlert('backup.failed', 'critical', { backupId: failedBackup.id }, now)
  }

  // Audit-log chain broken.
  const chain = await verifyChain()
  if (!chain.ok) await upsertAlert('audit.chain_broken', 'critical', { brokenAt: chain.brokenAt }, now)
}

/** Record one real 5xx response (called by the API error middleware). Path only, no IP/body. */
export async function recordApi5xx(info: { status: number; ms: number; path: string }) {
  if (!db) return
  try {
    await db.insert(serviceCheck).values({ at: new Date(), target: 'api', ok: false, statusCode: info.status, ms: info.ms, error: `api 5xx ${info.path}` })
  } catch {
    /* never block error responses on monitoring writes */
  }
}

/** Raise a security alert (2FA disabled, role change…) — used by the auth hooks. */
export async function raiseSecurityAlert(rule: string, severity: 'warning' | 'critical', data: Record<string, unknown>) {
  await upsertAlert(rule, severity, data, new Date())
}

/**
 * Email "nouvelle connexion" when a user signs in from an unseen device/browser
 * (docs/admin/05 §B). A device is unseen when no previous successful attempt used
 * the same user agent for this account. Never throws.
 */
export async function maybeNotifyNewDevice(userId: string, userEmail: string, headers: Headers) {
  if (!db) return
  try {
    const { requestMeta } = await import('../lib/request-meta')
    const m = requestMeta(headers)
    const prior = await db.select().from(loginAttempt).where(eq(loginAttempt.userId, userId)).limit(50)
    const seen = prior.some((p) => p.result === 'success' && p.ua === m.ua)
    if (seen) return
    const hadSuccess = prior.some((p) => p.result === 'success' && p.ua !== m.ua)
    // First-ever sign-in (single device) is not "unknown" — only alert when switching devices.
    if (!hadSuccess) return
    const adminUrl = (process.env.BETTER_AUTH_URL ?? 'http://localhost:3002').replace(/\/$/, '')
    await sendMail({
      to: userEmail,
      subject: 'Nouvelle connexion à l’administration',
      text: `Une connexion à l'administration du portfolio vient d'être ouverte depuis un appareil ou un navigateur inhabituel.\n\nAppareil : ${m.ua ?? 'inconnu'}\nAdresse (tronquée) : ${m.ipTrunc ?? 'inconnue'}\n\nSi ce n'est pas toi, révoque la session depuis ${adminUrl}/sessions et change ton mot de passe. Ce message est un simple signalement (voyage, VPN possibles), pas une preuve de compromission.`,
    }).catch(() => {})
    await audit({ action: 'auth.new_device.notified', result: 'success', actorId: userId, meta: { ua: m.ua, ipTrunc: m.ipTrunc } })
  } catch {
    /* never block sign-in on notification failures */
  }
}

export async function markAlertAcknowledged(id: number, userId: string) {
  if (!db) return
  await db.update(alert).set({ status: 'acknowledged' }).where(eq(alert.id, id))
  await audit({ action: 'alert.acknowledged', result: 'success', actorId: userId, resourceType: 'alert', resourceId: String(id) })
}
export async function markAlertResolved(id: number, userId: string) {
  if (!db) return
  await db.update(alert).set({ status: 'resolved' }).where(eq(alert.id, id))
  await audit({ action: 'alert.resolved', result: 'success', actorId: userId, resourceType: 'alert', resourceId: String(id) })
}
