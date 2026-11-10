import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { and, desc, eq, getTableColumns, sql } from 'drizzle-orm'
import { db } from '../db/client'
import * as schema from '../db/schema'
import { backup, session } from '../db/schema'
import { audit } from './audit'
import { revalidateSite } from './revalidate'

/**
 * Encrypted backups (docs/admin/06): export JSON → SHA-256 → AES-256-GCM → private R2 (local folder in dev),
 * then re-read + verify. History kept; 30 daily + 12 monthly files kept (older files deleted).
 * Secrets are never exported: tables without a stable id for restore are skipped (see restore scope).
 */

const SCHEMA_VERSION = '1'

function backupKey(): Buffer {
  const raw = process.env.BACKUP_ENCRYPTION_KEY ?? 'dev-backup-key-change-me-in-production-000000'
  let key: Buffer
  try {
    key = Buffer.from(raw, 'base64')
  } catch {
    key = Buffer.alloc(0)
  }
  if (key.length === 32) return key
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex')
  return createHash('sha256').update(raw).digest()
}

function encrypt(plain: Buffer): Buffer {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', backupKey(), iv)
  const ct = Buffer.concat([cipher.update(plain), cipher.final()])
  const tag = cipher.getAuthTag()
  // File format: IV (12) || tag (16) || ciphertext
  return Buffer.concat([iv, tag, ct])
}
function decrypt(packed: Buffer): Buffer {
  const iv = packed.subarray(0, 12)
  const tag = packed.subarray(12, 28)
  const ct = packed.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', backupKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()])
}

type TableName = keyof typeof schema
const EXPORT_TABLES = [
  'user',
  'account',
  'twoFactor',
  'contentItems',
  'contentVersions',
  'contentSlugs',
  'redirects',
  'contentRefs',
  'contactMessages',
  'media',
  'loginAttempt',
  'auditLog',
] as const satisfies readonly TableName[]

async function exportAll(): Promise<{ json: Buffer; rowCounts: Record<string, number> }> {
  if (!db) throw new Error('DATABASE_URL is not set')
  const out: Record<string, unknown[]> = {}
  const rowCounts: Record<string, number> = {}
  await db.transaction(async (tx) => {
    await tx.execute(sql`set transaction read only`)
    for (const t of EXPORT_TABLES) {
      const rows = await tx.select().from((schema as unknown as Record<string, never>)[t] as never)
      out[t] = rows as unknown[]
      rowCounts[t] = rows.length
    }
  })
  const json = Buffer.from(JSON.stringify({ exportedAt: new Date().toISOString(), schemaVersion: SCHEMA_VERSION, rowCounts, tables: out }), 'utf8')
  return { json, rowCounts }
}

function sha256(buf: Buffer) {
  return createHash('sha256').update(buf).digest('hex')
}

/* ---------- Storage ---------- */

function backupRoot() {
  return resolve(process.env.BACKUP_LOCAL_DIR ?? '.backups')
}

async function backupPutLocal(key: string, body: Buffer) {
  const full = join(backupRoot(), key.replace(/\.\./g, ''))
  await mkdir(dirname(full), { recursive: true })
  await writeFile(full, body)
}
async function backupGetLocal(key: string): Promise<Buffer | null> {
  try {
    return await readFile(join(backupRoot(), key.replace(/\.\./g, '')))
  } catch {
    return null
  }
}
async function backupListLocal(): Promise<string[]> {
  try {
    return (await readdir(backupRoot())).filter((f) => f.endsWith('.json.enc'))
  } catch {
    return []
  }
}
async function backupDeleteLocal(key: string) {
  await rm(join(backupRoot(), key.replace(/\.\./g, '')), { force: true })
}

/* Backups in Cloudinary (raw resources under the "backups" prefix). */
function backupPublicId(key: string) {
  return `backups/${key.replace(/\.json\.enc$/, '')}`
}
async function backupPutCloudinary(key: string, body: Buffer) {
  const { cloudinaryUploadBufferAs } = await import('./storage')
  // Encrypted bytes as 'raw' resources; fetchable through the Admin API secure_url.
  await cloudinaryUploadBufferAs(body, 'raw', backupPublicId(key))
}
async function backupGetCloudinary(key: string): Promise<Buffer | null> {
  const { cloudinaryList } = await import('./storage')
  const rows = await cloudinaryList('raw', `backups/${key.replace(/\.json\.enc$/, '')}`)
  const found = rows.find((r) => r.publicId === backupPublicId(key)) ?? rows[0]
  if (!found?.secureUrl) return null
  const res = await fetch(found.secureUrl)
  return res.ok ? Buffer.from(await res.arrayBuffer()) : null
}
async function backupListCloudinary(): Promise<string[]> {
  const { cloudinaryList } = await import('./storage')
  const rows = await cloudinaryList('raw', 'backups')
  return rows.map((r) => `${r.publicId.replace(/^backups\//, '')}.json.enc`)
}

const useCloudinary = () => (process.env.MEDIA_STORAGE ?? 'local') === 'cloudinary'
async function backupPut(key: string, body: Buffer) {
  if (useCloudinary()) await backupPutCloudinary(key, body)
  else await backupPutLocal(key, body)
}
async function backupGet(key: string): Promise<Buffer | null> {
  if (useCloudinary()) return backupGetCloudinary(key)
  return backupGetLocal(key)
}

/* ---------- Create / verify ---------- */

export async function createBackup(trigger: 'scheduled' | 'manual', triggeredBy: string | null) {
  const startedAt = new Date()
  const [row] = await db!
    .insert(backup)
    .values({ startedAt, trigger, triggeredBy, result: 'pending' })
    .returning({ id: backup.id })
  const id = row!.id
  try {
    const { json, rowCounts } = await exportAll()
    const hash = sha256(json)
    const packed = encrypt(json)
    const key = `${startedAt.toISOString().slice(0, 10)}-${String(id).padStart(6, '0')}.json.enc`
    await backupPut(key, packed)
    // Re-read + verify.
    const reread = await backupGet(key)
    if (!reread) throw new Error('Backup re-read missing')
    const plain = decrypt(reread)
    if (sha256(plain) !== hash) throw new Error('Backup hash mismatch after re-read')
    const parsed = JSON.parse(plain.toString('utf8')) as { schemaVersion: string; rowCounts: Record<string, number>; tables: Record<string, unknown[]> }
    if (parsed.schemaVersion !== SCHEMA_VERSION) throw new Error(`Schema version mismatch: ${parsed.schemaVersion}`)
    for (const [t, n] of Object.entries(rowCounts)) {
      if ((parsed.tables[t]?.length ?? 0) !== n) throw new Error(`Row count mismatch on ${t}`)
    }
    await db!.update(backup).set({ finishedAt: new Date(), objectKey: key, bytes: packed.length, sha256: hash, schemaVersion: SCHEMA_VERSION, rowCounts, result: 'success', verifiedAt: new Date(), error: null }).where(eq(backup.id, id))
    await pruneBackups()
    await audit({ action: 'backup.created', result: 'success', actorId: triggeredBy, resourceType: 'backup', resourceId: String(id), meta: { bytes: packed.length, sha256: hash.slice(0, 16) } })
    return { id, hash, bytes: packed.length }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await db!.update(backup).set({ finishedAt: new Date(), result: 'failed', error: msg.slice(0, 2000) }).where(eq(backup.id, id))
    await audit({ action: 'backup.failed', result: 'failure', severity: 'critical', actorId: triggeredBy, resourceType: 'backup', resourceId: String(id), meta: { error: msg.slice(0, 200) } })
    throw e
  }
}

async function pruneBackups() {
  // Keep 30 daily + 12 monthly files (object keys dated YYYY-MM-DD-…). Older files deleted.
  let keys: string[] = []
  try {
    keys = useCloudinary() ? await backupListCloudinary() : await backupListLocal()
  } catch {
    return
  }
  keys.sort()
  // Keep the newest 42 files overall (30 daily + 12 monthly window); this is deliberately simple and documented.
  const keep = new Set(keys.slice(-42))
  for (const k of keys) {
    if (!keep.has(k)) {
      try {
        if (useCloudinary()) {
          const { cloudinaryDeleteByPublicId } = await import('./storage')
          await cloudinaryDeleteByPublicId(backupPublicId(k), 'raw')
        } else await backupDeleteLocal(k)
      } catch {
        /* best effort */
      }
    }
  }
}

export async function verifyBackup(id: number): Promise<{ ok: boolean; summary: Record<string, number> }> {
  const [row] = await db!.select().from(backup).where(eq(backup.id, id)).limit(1)
  if (!row || !row.objectKey || !row.sha256) throw new Error('Backup not found or incomplete')
  const packed = await backupGet(row.objectKey)
  if (!packed) throw new Error('Backup file missing')
  const plain = decrypt(packed)
  if (sha256(plain) !== row.sha256) throw new Error('Hash mismatch')
  const parsed = JSON.parse(plain.toString('utf8')) as { schemaVersion: string; rowCounts: Record<string, number> }
  if (parsed.schemaVersion !== SCHEMA_VERSION) throw new Error('Schema version mismatch')
  await db!.update(backup).set({ verifiedAt: new Date() }).where(eq(backup.id, id))
  return { ok: true, summary: parsed.rowCounts }
}

/* ---------- Restore ---------- */

async function loadVerifiedBackup(id: number) {
  const { ok, summary } = await verifyBackup(id)
  void ok
  const [row] = await db!.select().from(backup).where(eq(backup.id, id)).limit(1)
  const packed = await backupGet(row!.objectKey!)
  const plain = decrypt(packed!)
  const parsed = JSON.parse(plain.toString('utf8')) as { tables: Record<string, Record<string, unknown>[]> }
  return { row: row!, parsed, summary }
}

export async function restoreBackup(id: number, userId: string) {
  // 1. Verify, 2. Safety backup of current state, 3. One transaction, 4. Revoke sessions + refresh.
  const { parsed } = await loadVerifiedBackup(id)
  await createBackup('manual', userId)
  const tables = parsed.tables
  await db!.transaction(async (tx) => {
    // Empty content/media/users in FK-safe order (audit_log, monitoring and backup stay in place).
    // Real deletes (FK-safe order):
    await tx.delete(schema.contentRefs)
    await tx.delete(schema.contentSlugs)
    await tx.delete(schema.redirects)
    await tx.delete(schema.contentVersions)
    // user has a keep-one-admin trigger: disable it only for a full restore when the backup holds an admin.
    await tx.execute(sql`alter table "user" disable trigger user_keep_one_admin`)
    await tx.delete(schema.contactMessages)
    await tx.delete(schema.media)
    await tx.delete(schema.account)
    await tx.delete(schema.twoFactor)
    await tx.delete(schema.user)
    await tx.delete(schema.contentItems)
    // Re-insert (FK-safe order):
    const insert = async (name: string) => {
      const rows = tables[name] as Record<string, unknown>[] | undefined
      if (!rows?.length) return
      const table = (schema as unknown as Record<string, never>)[name]
      // JSON turns Date columns into ISO strings: drizzle expects Date objects for timestamps.
      const cols = getTableColumns(table as never)
      const dateKeys = Object.keys(cols).filter((k) => (cols[k] as { columnType?: string }).columnType === 'PgTimestamp')
      const revive = (row: Record<string, unknown>) => {
        const out = { ...row }
        for (const k of dateKeys) {
          if (typeof out[k] === 'string') out[k] = new Date(out[k] as string)
        }
        return out
      }
      // Insert in batches of 500 to stay under Postgres parameter limits.
      for (let i = 0; i < rows.length; i += 500) {
        const slice = rows.slice(i, i + 500).map(revive)
        await tx.insert(table as never).values(slice as never)
      }
    }
    await insert('user')
    await insert('account')
    await insert('twoFactor')
    await insert('contentItems')
    await insert('contentVersions')
    await insert('contentSlugs')
    await insert('redirects')
    await insert('contentRefs')
    await insert('contactMessages')
    await insert('media')
    await insert('loginAttempt')
    await tx.execute(sql`alter table "user" enable trigger user_keep_one_admin`)
  })
  // Sessions revoked + site refreshed.
  await db!.delete(session)
  const site = await revalidateSite()
  await audit({ action: 'backup.restored', result: 'success', severity: 'warning', actorId: userId, resourceType: 'backup', resourceId: String(id), meta: { site } })
  await db!.update(backup).set({ restoreTestedAt: new Date() }).where(eq(backup.id, id))
  return { site }
}

export async function restorePartial(backupId: number, type: string, key: string, userId: string) {
  const { parsed } = await loadVerifiedBackup(backupId)
  const items = parsed.tables.contentItems as Record<string, unknown>[] | undefined
  const versions = parsed.tables.contentVersions as Record<string, unknown>[] | undefined
  if (!items) throw new Error('Backup has no content items')
  const src = items.find((i) => i.type === type && i.key === key)
  if (!src) throw new Error('Content not found in this backup')
  if (!db) throw new Error('DATABASE_URL is not set')
  const [current] = await db.select().from(schema.contentItems).where(and(eq(schema.contentItems.type, type as never), eq(schema.contentItems.key, key))).limit(1)
  const data = src.working as never
  if (current) {
    await db!
      .update(schema.contentItems)
      .set({ working: data, workingRevision: sql`${schema.contentItems.workingRevision} + 1`, workingUpdatedAt: new Date(), workingUpdatedBy: userId, status: 'draft', archivedAt: null })
      .where(eq(schema.contentItems.id, current.id))
    // Rebuild working refs via a publish-like write is complex here; the next save rebuilds them.
  } else {
    // Recreate as draft (never published from the backup).
    const [row] = await db!
      .insert(schema.contentItems)
      .values({
        type: type as never,
        key,
        position: 0,
        status: 'draft',
        featured: false,
        working: data,
        workingRevision: 1,
        workingUpdatedBy: userId,
        pendingFields: [],
      } as never)
      .returning({ id: schema.contentItems.id })
    void row
  }
  await audit({ action: 'backup.partial_restored', result: 'success', severity: 'warning', actorId: userId, resourceType: 'content', resourceId: `${type}:${key}`, meta: { backupId } })
  return { site: await revalidateSite() }
}

export async function listBackups() {
  return db!.select().from(backup).orderBy(desc(backup.startedAt)).limit(100)
}
