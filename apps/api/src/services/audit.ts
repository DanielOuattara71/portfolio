import { createHash } from 'node:crypto'
import { asc, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { auditLog } from '../db/schema'

/**
 * Append-only activity log with a hash chain (docs/admin/05-surveillance-journalisation.md §A).
 * Each row stores the SHA-256 of the previous row; any later edit or deletion breaks the chain.
 */
export interface AuditEntry {
  action: string
  result: 'success' | 'failure' | 'denied'
  severity?: 'info' | 'warning' | 'critical'
  actorId?: string | null
  actorRole?: string | null
  resourceType?: string | null
  resourceId?: string | null
  resourceLabel?: string | null
  requestId?: string | null
  ipTrunc?: string | null
  ua?: string | null
  /** Context only: field names, counts, method… never secrets or message bodies. */
  meta?: Record<string, unknown> | null
}

const GENESIS = '0'.repeat(64)
// Same arbitrary key for every writer: serialises chain appends across connections.
const CHAIN_LOCK = 742_031

type Row = typeof auditLog.$inferSelect

/** jsonb does not keep key order, so the hash uses keys sorted at every level. */
function stable(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stable)
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.keys(v as Record<string, unknown>)
        .sort()
        .map((k) => [k, stable((v as Record<string, unknown>)[k])]),
    )
  }
  return v
}

function digest(prevHash: string, r: Omit<Row, 'id' | 'hash' | 'prevHash'>): string {
  const canonical = JSON.stringify([
    prevHash,
    r.at.toISOString(),
    r.actorId,
    r.actorRole,
    r.action,
    r.resourceType,
    r.resourceId,
    r.resourceLabel,
    r.result,
    r.severity,
    r.requestId,
    r.ipTrunc,
    r.ua,
    stable(r.meta ?? null),
  ])
  return createHash('sha256').update(canonical).digest('hex')
}

/** Never throws: a logging failure must not break the action, but it is reported on stderr. */
export async function audit(e: AuditEntry): Promise<void> {
  if (!db) return
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${CHAIN_LOCK})`)
      const last = await tx.select({ hash: auditLog.hash }).from(auditLog).orderBy(sql`${auditLog.id} desc`).limit(1)
      const prevHash = last[0]?.hash ?? GENESIS
      const row = {
        at: new Date(),
        actorId: e.actorId ?? null,
        actorRole: e.actorRole ?? null,
        action: e.action,
        resourceType: e.resourceType ?? null,
        resourceId: e.resourceId ?? null,
        resourceLabel: e.resourceLabel?.slice(0, 200) ?? null,
        result: e.result,
        severity: e.severity ?? 'info',
        requestId: e.requestId?.slice(0, 64) ?? null,
        ipTrunc: e.ipTrunc ?? null,
        ua: e.ua ?? null,
        meta: e.meta ?? null,
      }
      await tx.insert(auditLog).values({ ...row, prevHash, hash: digest(prevHash, row) })
    })
  } catch (err) {
    console.error('[audit] could not write event', e.action, err)
  }
}

/** Recomputes every link. The first remaining row may follow purged rows: its prev_hash is not checked. */
export async function verifyChain(): Promise<{ ok: boolean; checked: number; brokenAt: number | null }> {
  if (!db) return { ok: false, checked: 0, brokenAt: null }
  const rows = await db.select().from(auditLog).orderBy(asc(auditLog.id))
  let prev: string | null = null
  for (const r of rows) {
    if (prev !== null && r.prevHash !== prev) return { ok: false, checked: rows.length, brokenAt: r.id }
    if (digest(r.prevHash, r) !== r.hash) return { ok: false, checked: rows.length, brokenAt: r.id }
    prev = r.hash
  }
  return { ok: true, checked: rows.length, brokenAt: null }
}
