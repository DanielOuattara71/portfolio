import { createHash } from 'node:crypto'
import { and, count, eq, gte, isNull, ne } from 'drizzle-orm'
import sharp, { type Metadata } from 'sharp'
import { db } from '../db/client'
import { media, type MediaVariant } from '../db/schema'
import { getStorage } from './storage'

/**
 * Media rules (docs/admin/04-securite-authentification.md §5, 02 §G):
 * - accepted: JPEG, PNG, WebP, AVIF (images), PDF; the REAL type is read from the file signature;
 * - images up to 10 MB and 8 000 px, PDF up to 15 MB;
 * - images are re-encoded (removes anything hidden in the file) without metadata (EXIF, GPS),
 *   then resized to a few widths in WebP;
 * - the same file twice is not stored twice;
 * - SVG is not accepted for now (technology logos are stored as icon paths in Skills).
 */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const
export const ACCEPTED_TYPES = [...IMAGE_TYPES, 'application/pdf'] as const
export type AcceptedType = (typeof ACCEPTED_TYPES)[number]
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_PDF_BYTES = 15 * 1024 * 1024
export const MAX_PIXELS_SIDE = 8000
export const UPLOADS_PER_HOUR = 50
const WIDTHS = [480, 960, 1600, 2400]
const UPLOAD_URL_TTL = 5 * 60

export class MediaError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: 400 | 404 | 409 | 413 | 415 | 422 | 429 = 422,
  ) {
    super(message)
  }
}

/** File signature → MIME type, or null when unknown. */
export function sniff(buf: Buffer): AcceptedType | null {
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  if (buf.toString('ascii', 4, 8) === 'ftyp' && ['avif', 'avis'].includes(buf.toString('ascii', 8, 12))) return 'image/avif'
  if (buf.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf'
  return null
}

/** "Capture écran (2).PNG" → "Capture écran (2).png": display only, never a path. */
export function cleanName(name: string) {
  return (
    name
      .normalize('NFC')
      .replace(/[\\/\u0000-\u001f<>:"|?*]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160) || 'fichier'
  )
}

const variantKey = (id: string, width: number, version: string) => `variants/${id}/${version}-${width}.webp`

export async function createUpload(input: { name: string; mime: string; bytes: number; folder: (typeof media.folder.enumValues)[number]; userId: string }) {
  if (!db) throw new Error('No database')
  if (!(ACCEPTED_TYPES as readonly string[]).includes(input.mime)) throw new MediaError('media.type_refused', 'File type not accepted', 415)
  const max = input.mime === 'application/pdf' ? MAX_PDF_BYTES : MAX_IMAGE_BYTES
  if (input.bytes > max) throw new MediaError('media.too_large', `File larger than ${max / 1024 / 1024} MB`, 413)

  const [recent] = await db
    .select({ n: count() })
    .from(media)
    .where(and(eq(media.uploadedBy, input.userId), gte(media.createdAt, new Date(Date.now() - 3600_000))))
  if ((recent?.n ?? 0) >= UPLOADS_PER_HOUR) throw new MediaError('media.quota', 'Upload limit reached (50 per hour)', 429)

  const id = crypto.randomUUID()
  const uploadKey = `uploads/${id}`
  await db.insert(media).values({
    id,
    kind: input.mime === 'application/pdf' ? 'pdf' : 'image',
    folder: input.folder,
    name: cleanName(input.name),
    mime: input.mime,
    uploadKey,
    uploadedBy: input.userId,
  })
  const target = await getStorage().presignUpload(uploadKey, input.mime, UPLOAD_URL_TTL)
  return { id, upload: target }
}

async function fail(id: string, code: string, message: string, status: MediaError['status'] = 422): Promise<never> {
  await db!.update(media).set({ status: 'failed', error: code, updatedAt: new Date() }).where(eq(media.id, id))
  throw new MediaError(code, message, status)
}

/** Processes an uploaded file. `replaceOf`: keep that media id and swap its files (references stay valid). */
export async function completeUpload(id: string, userId: string, replaceOf?: string) {
  if (!db) throw new Error('No database')
  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1)
  if (!row || row.uploadedBy !== userId) throw new MediaError('media.not_found', 'Upload not found', 404)
  if (row.status !== 'uploading') throw new MediaError('media.already_processed', 'Upload already processed', 409)

  const storage = getStorage()
  const raw = await storage.getPrivate(row.uploadKey)
  if (!raw) await fail(id, 'media.missing_file', 'The file was not received')
  const buf = raw!
  // The upload URL cannot enforce a size limit: the real size is checked here.
  await storage.deletePrivate(row.uploadKey)
  const real = sniff(buf)
  if (!real) await fail(id, 'media.type_refused', 'Not a JPEG, PNG, WebP, AVIF or PDF file', 415)
  if ((real === 'application/pdf') !== (row.kind === 'pdf')) await fail(id, 'media.type_mismatch', 'The file content does not match its type', 415)
  const max = real === 'application/pdf' ? MAX_PDF_BYTES : MAX_IMAGE_BYTES
  if (buf.length > max) await fail(id, 'media.too_large', `File larger than ${max / 1024 / 1024} MB`, 413)

  const sha256 = createHash('sha256').update(buf).digest('hex')
  const [dup] = await db
    .select({ id: media.id, name: media.name })
    .from(media)
    .where(and(eq(media.sha256, sha256), eq(media.status, 'ready'), isNull(media.deletedAt), ne(media.id, replaceOf ?? id)))
    .limit(1)
  if (dup) {
    await db.delete(media).where(eq(media.id, id))
    // A replacement identical to ANOTHER media would make two entries share one file: refused.
    if (replaceOf) throw new MediaError('media.duplicate', `This file is already in the library: ${dup.name}`, 409)
    return { id: dup.id, duplicate: true as const }
  }

  // Files of a replaced media get a new version tag: nothing is ever overwritten.
  const targetId = replaceOf ?? id
  const version = crypto.randomUUID().slice(0, 8)
  let originalKey: string
  let variants: MediaVariant[] = []
  let width: number | null = null
  let height: number | null = null

  if (real === 'application/pdf') {
    originalKey = `originals/${targetId}/${version}.pdf`
    await storage.putPrivate(originalKey, buf, 'application/pdf')
  } else {
    let meta: Metadata
    try {
      meta = await sharp(buf, { limitInputPixels: MAX_PIXELS_SIDE * MAX_PIXELS_SIDE }).metadata()
    } catch {
      return fail(id, 'media.unreadable', 'The image could not be read')
    }
    const rotated = (meta.orientation ?? 1) >= 5
    width = (rotated ? meta.height : meta.width) ?? null
    height = (rotated ? meta.width : meta.height) ?? null
    if (!width || !height || width > MAX_PIXELS_SIDE || height > MAX_PIXELS_SIDE) await fail(id, 'media.too_big_pixels', 'Image larger than 8000 px')

    // Master copy re-encoded without any metadata (no EXIF, no GPS), kept private.
    originalKey = `originals/${targetId}/${version}.webp`
    const master = await sharp(buf).rotate().webp({ quality: 92 }).toBuffer()
    await storage.putPrivate(originalKey, master, 'image/webp')

    const widths = [...new Set([...WIDTHS.filter((w) => w < width!), Math.min(width!, WIDTHS.at(-1)!)])].sort((a, b) => a - b)
    for (const w of widths) {
      const out = await sharp(buf).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true })
      const key = variantKey(targetId, w, version)
      await storage.putPrivate(key, out.data, 'image/webp')
      variants.push({ width: out.info.width, height: out.info.height, key, bytes: out.info.size })
    }
  }

  if (replaceOf) {
    const [old] = await db.select().from(media).where(eq(media.id, replaceOf)).limit(1)
    if (!old || old.deletedAt) await fail(id, 'media.not_found', 'Media to replace not found', 404)
    if (old!.kind !== row.kind) await fail(id, 'media.type_mismatch', 'A replacement must be the same kind of file', 415)
    const oldKeys = [old!.originalKey, ...old!.variants.map((v) => v.key)].filter((k): k is string => !!k)
    await db.transaction(async (tx) => {
      await tx.delete(media).where(eq(media.id, id))
      await tx
        .update(media)
        .set({ mime: real!, bytes: buf.length, width, height, sha256, originalKey, variants, replacedKeys: [...old!.replacedKeys, ...oldKeys], updatedAt: new Date() })
        .where(eq(media.id, replaceOf))
    })
    // Still published: the new files replace the public copies (old public copies are removed).
    if (old!.isPublic) {
      await publishFiles({ ...old!, originalKey, variants, kind: old!.kind })
      for (const k of oldKeys) await storage.deletePublic(k)
    }
    return { id: replaceOf, duplicate: false as const, replaced: true as const }
  }

  await db
    .update(media)
    .set({ status: 'ready', mime: real!, bytes: buf.length, width, height, sha256, originalKey, variants, error: null, updatedAt: new Date() })
    .where(eq(media.id, id))
  return { id, duplicate: false as const }
}

type MediaRow = typeof media.$inferSelect

async function publishFiles(m: Pick<MediaRow, 'kind' | 'originalKey' | 'variants'>) {
  const storage = getStorage()
  const keys = m.kind === 'pdf' ? [m.originalKey!] : m.variants.map((v) => v.key)
  for (const key of keys) {
    const body = await storage.getPrivate(key)
    if (!body) throw new Error(`Missing private file ${key}`)
    await storage.putPublic(key, body, m.kind === 'pdf' ? 'application/pdf' : 'image/webp')
  }
}

/**
 * Called by the publication workflow: a file is public only while a published content uses it.
 * Idempotent.
 */
export async function setMediaPublic(id: string, makePublic: boolean) {
  if (!db) throw new Error('No database')
  const [m] = await db.select().from(media).where(eq(media.id, id)).limit(1)
  if (!m || m.status !== 'ready') throw new MediaError('media.not_found', 'Media not found', 404)
  if (makePublic) await publishFiles(m)
  else {
    const storage = getStorage()
    for (const key of m.kind === 'pdf' ? [m.originalKey!] : m.variants.map((v) => v.key)) await storage.deletePublic(key)
  }
  await db.update(media).set({ isPublic: makePublic, updatedAt: new Date() }).where(eq(media.id, id))
}

/** Public URLs for a published media (largest variant first is not assumed: callers pick a width). */
export function publicUrls(m: Pick<MediaRow, 'kind' | 'originalKey' | 'variants'>) {
  const storage = getStorage()
  if (m.kind === 'pdf') return { file: storage.publicUrl(m.originalKey!), variants: [] }
  return { file: null, variants: m.variants.map((v) => ({ width: v.width, height: v.height, url: storage.publicUrl(v.key) })) }
}
