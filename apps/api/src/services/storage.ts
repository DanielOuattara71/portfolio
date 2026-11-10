import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, normalize, resolve } from 'node:path'

/**
 * File storage behind one interface (docs/admin/08 §1):
 * - "local" (development): two folders on disk, public files served by GET /media/*.
 * - "cloudinary" (production): two folder trees in one Cloudinary cloud (private originals,
 *   public published copies).
 * Uploads go from the browser to Cloudinary with a short-lived signed upload (POST multipart);
 * the API then checks the file before accepting it (services/media.ts).
 * Cloudinary "privacy" is by unguessable UUID public_id; public copies get guessable URLs only
 * when a published content uses them. Cloudinary delivery of PDFs (raw) requires
 * Settings > Security > "PDF and ZIP files delivery" enabled on the cloud.
 */
export interface UploadTarget {
  url: string
  method: 'PUT' | 'POST'
  headers: Record<string, string>
  /** POST multipart fields (Cloudinary signed upload). Absent for S3-style PUT. */
  fields?: Record<string, string>
  expiresAt: string
}

export interface Storage {
  readonly driver: 'local' | 'cloudinary'
  presignUpload(key: string, contentType: string, expiresSec: number): Promise<UploadTarget>
  getPrivate(key: string): Promise<Buffer | null>
  putPrivate(key: string, body: Buffer, contentType: string): Promise<void>
  deletePrivate(key: string): Promise<void>
  putPublic(key: string, body: Buffer, contentType: string): Promise<void>
  deletePublic(key: string): Promise<void>
  publicUrl(key: string): string
}

const KEY_RE = /^[a-z0-9][a-z0-9/_.-]{0,200}$/
function checkKey(key: string) {
  if (!KEY_RE.test(key) || key.includes('..')) throw new Error(`Invalid storage key: ${key}`)
}

/* ---------- Local driver ---------- */

const signingSecret = () => {
  const s = process.env.BETTER_AUTH_SECRET
  if (!s) throw new Error('BETTER_AUTH_SECRET is required to sign upload URLs')
  return s
}

/** Signature of a local upload URL: key + content type + expiry. */
export function signLocalUpload(key: string, contentType: string, exp: number) {
  return createHmac('sha256', signingSecret()).update(`${key}\n${contentType}\n${exp}`).digest('hex')
}

export function verifyLocalUpload(key: string, contentType: string, exp: number, sig: string) {
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false
  const expected = Buffer.from(signLocalUpload(key, contentType, exp))
  const given = Buffer.from(sig)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

class LocalStorage implements Storage {
  readonly driver = 'local' as const
  constructor(
    private root: string,
    private publicBase: string,
  ) {}

  private path(area: 'private' | 'public', key: string) {
    checkKey(key)
    const base = resolve(this.root, area)
    const full = normalize(join(base, key))
    if (!full.startsWith(base)) throw new Error('Path escape refused')
    return full
  }

  async presignUpload(key: string, contentType: string, expiresSec: number): Promise<UploadTarget> {
    checkKey(key)
    const exp = Math.floor(Date.now() / 1000) + expiresSec
    const qs = new URLSearchParams({ ct: contentType, exp: String(exp), sig: signLocalUpload(key, contentType, exp) })
    // Relative URL: the browser sends it to the admin, whose /api proxy forwards it to this API.
    return { url: `/api/admin/media/local-upload/${key}?${qs}`, method: 'PUT', headers: { 'content-type': contentType }, expiresAt: new Date(exp * 1000).toISOString() }
  }

  async getPrivate(key: string) {
    try {
      return await readFile(this.path('private', key))
    } catch {
      return null
    }
  }

  async putPrivate(key: string, body: Buffer) {
    const p = this.path('private', key)
    await mkdir(dirname(p), { recursive: true })
    await writeFile(p, body)
  }

  async deletePrivate(key: string) {
    await rm(this.path('private', key), { force: true })
  }

  async putPublic(key: string, body: Buffer) {
    const p = this.path('public', key)
    await mkdir(dirname(p), { recursive: true })
    await writeFile(p, body)
  }

  async deletePublic(key: string) {
    await rm(this.path('public', key), { force: true })
  }

  /** Used by GET /media/* (local only). */
  async readPublic(key: string) {
    try {
      return await readFile(this.path('public', key))
    } catch {
      return null
    }
  }

  publicUrl(key: string) {
    return `${this.publicBase}/media/${key}`
  }
}

/* ---------- Cloudinary driver ---------- */

export function cloudinaryEnv() {
  const need = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const
  const missing = need.filter((k) => !process.env[k])
  if (missing.length) throw new Error(`Cloudinary storage misconfigured: ${missing.join(', ')}`)
  const e = process.env as Record<(typeof need)[number], string>
  return { cloud: e.CLOUDINARY_CLOUD_NAME, apiKey: e.CLOUDINARY_API_KEY, apiSecret: e.CLOUDINARY_API_SECRET }
}

/**
 * Cloudinary API signatures are SHA1(hex) over the lexicographically sorted
 * "k1=v1&k2=v2&..." string of the to-be-signed parameters, followed by the api_secret.
 */
export function cloudinarySign(params: Record<string, string>, secret: string): string {
  const text = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&') + secret
  return createHash('sha1').update(text).digest('hex')
}

function cloudinaryType(contentType: string): 'image' | 'raw' {
  return contentType === 'application/pdf' ? 'raw' : 'image'
}

function keyType(key: string): 'image' | 'raw' {
  return key.endsWith('.pdf') || key.endsWith('.json.enc') ? 'raw' : 'image'
}

function stripExt(key: string) {
  return key.replace(/\.(webp|pdf|json\.enc)$/, '')
}

function cloudinarySignedParams(publicId: string, resourceType: 'image' | 'raw', apiSecret: string, extra: Record<string, string> = {}) {
  const timestamp = String(Math.floor(Date.now() / 1000))
  // Cloudinary accepts a signature computed over public_id + timestamp; resource_type is
  // part of the URL path and excluded from the signing string (verified against the live cloud).
  const params = { public_id: publicId, timestamp, ...extra }
  return { ...params, resource_type: resourceType, signature: cloudinarySign(params, apiSecret) }
}

interface CloudinaryResource {
  public_id?: string
  secure_url?: string
  format?: string
  bytes?: number
  width?: number
  height?: number
}

async function cloudinaryUploadBuffer(body: Buffer, contentType: string, publicId: string): Promise<CloudinaryResource> {
  return cloudinaryUploadBufferAs(body, cloudinaryType(contentType), publicId)
}

/** Upload a buffer with signed params (browser-style signed upload, server-side). */
export async function cloudinaryUploadBufferAs(body: Buffer, type: 'image' | 'raw', publicId: string): Promise<CloudinaryResource> {
  const { cloud, apiKey, apiSecret } = cloudinaryEnv()
  const signed = cloudinarySignedParams(publicId, type, apiSecret, { overwrite: 'true' })
  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(body)], { type: 'application/octet-stream' }), stripExt(publicId))
  form.append('api_key', apiKey)
  for (const [k, v] of Object.entries(signed)) form.append(k, v)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${type}/upload`, { method: 'POST', body: form })
  const json = (await res.json().catch(() => null)) as CloudinaryResource & { error?: { message?: string } } | null
  if (!res.ok || !json) throw new Error(`Cloudinary upload failed (${res.status}): ${json?.error?.message ?? 'unknown'}`)
  return json
}

async function cloudinaryAdminGetResource(type: 'image' | 'raw', publicId: string): Promise<CloudinaryResource | null> {
  const { cloud, apiKey, apiSecret } = cloudinaryEnv()
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/${type}/upload?public_id=${encodeURIComponent(publicId)}`, {
    headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
  })
  if (!res.ok) return null
  const json = (await res.json()) as { resources?: CloudinaryResource[] } & CloudinaryResource
  // The Admin API returns a list ({ resources: [...] }) even when filtered by public_id.
  return json.resources?.[0] ?? null
}

async function cloudinaryDeleteResource(type: 'image' | 'raw', publicId: string) {
  const { cloud, apiKey, apiSecret } = cloudinaryEnv()
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
  const signed = cloudinarySignedParams(publicId, type, apiSecret)
  // Cloudinary DELETE expects public_ids[] (plural) and rejects the singular public_id.
  const qs = new URLSearchParams({ api_key: apiKey, public_ids: publicId, ...Object.fromEntries(Object.entries(signed).filter(([k]) => k !== 'public_id')), invalidate: 'true' })
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/${type}/upload?${qs}`, { method: 'DELETE', headers: { Authorization: `Basic ${auth}` } })
  if (!res.ok) throw new Error(`Cloudinary delete failed (${res.status})`)
  // NOTE: Cloudinary keeps serving the deleted file from CDN (default 30-day image cache);
  // the Public API /invalidate endpoint is unreachable on this cloud. The storage resource is
  // deleted, so the copy stops mattering once the cache expires (noted as a known limitation).
}

/** Shared by media and backup storage: list every resource of a type under a prefix. */
export async function cloudinaryList(type: 'image' | 'raw', prefix: string): Promise<{ publicId: string; secureUrl: string; createdAt: string }[]> {
  const { cloud, apiKey, apiSecret } = cloudinaryEnv()
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
  const qs = new URLSearchParams({ prefix, max_results: '100', direction: 'desc' })
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/${type}/upload?${qs}`, { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Cloudinary list failed (${res.status})`)
  const json = (await res.json()) as { resources?: { public_id: string; secure_url: string; created_at: string }[] }
  return (json.resources ?? []).map((r) => ({ publicId: r.public_id, secureUrl: r.secure_url, createdAt: r.created_at }))
}

export async function cloudinaryDeleteByPublicId(publicId: string, type: 'image' | 'raw') {
  await cloudinaryDeleteResource(type, publicId)
}

class CloudinaryStorage implements Storage {
  readonly driver = 'cloudinary' as const

  private publicId(area: 'private' | 'public', key: string) {
    checkKey(key)
    return `portfolio/${area}/${stripExt(key)}`
  }

  private async fetchResource(area: 'private' | 'public', key: string): Promise<Buffer | null> {
    const publicId = this.publicId(area, key)
    const types: ('image' | 'raw')[] = key.startsWith('uploads/') ? ['image', 'raw'] : [keyType(key), keyType(key) === 'image' ? 'raw' : 'image']
    for (const type of types) {
      const { cloud, apiKey, apiSecret } = cloudinaryEnv()
      const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
      // Browser uploads keep the file extension in the stored public_id (e.g. ".pdf" for raw),
      // so list by prefix rather than exact public_id.
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/${type}/upload?prefix=${encodeURIComponent(publicId)}&max_results=1`, {
        headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
      })
      if (!res.ok) continue
      const json = (await res.json()) as { resources?: { secure_url?: string }[] }
      const secureUrl = json.resources?.[0]?.secure_url
      if (!secureUrl) continue
      const got = await fetch(secureUrl)
      if (got.ok) return Buffer.from(await got.arrayBuffer())
    }
    return null
  }

  async presignUpload(key: string, contentType: string, expiresSec: number): Promise<UploadTarget> {
    checkKey(key)
    const { cloud, apiKey, apiSecret } = cloudinaryEnv()
    const type = cloudinaryType(contentType)
    const publicId = this.publicId('private', key)
    const timestamp = String(Math.floor(Date.now() / 1000)) // signature valid for the next hour
    const params = { public_id: publicId, timestamp }
    const signature = cloudinarySign(params, apiSecret)
    return {
      url: `https://api.cloudinary.com/v1_1/${cloud}/${type}/upload`,
      method: 'POST',
      headers: {},
      fields: { api_key: apiKey, signature, timestamp, public_id: publicId, resource_type: type },
      expiresAt: new Date(Date.now() + expiresSec * 1000).toISOString(),
    }
  }

  async getPrivate(key: string) {
    return this.fetchResource('private', key)
  }

  async putPrivate(key: string, body: Buffer, contentType: string) {
    await cloudinaryUploadBuffer(body, contentType, this.publicId('private', key))
  }

  async deletePrivate(key: string) {
    try {
      await cloudinaryDeleteResource(keyType(key), this.publicId('private', key))
    } catch {
      /* already gone */
    }
  }

  async putPublic(key: string, body: Buffer, contentType: string) {
    await cloudinaryUploadBuffer(body, contentType, this.publicId('public', key))
  }

  async deletePublic(key: string) {
    try {
      await cloudinaryDeleteResource(keyType(key), this.publicId('public', key))
    } catch {
      /* already gone */
    }
  }

  publicUrl(key: string) {
    const { cloud } = cloudinaryEnv()
    const type = keyType(key)
    const publicId = this.publicId('public', key)
    // Raw resources (PDF) 404 when the file extension is appended; image delivery needs no
    // format suffix either (Cloudinary serves the resource's own format).
    return `https://res.cloudinary.com/${cloud}/${type}/upload/${encodeURI(publicId)}`
  }
}

let instance: Storage | null = null
export function getStorage(): Storage {
  if (instance) return instance
  const driver = process.env.MEDIA_STORAGE ?? 'local'
  if (driver === 'cloudinary') {
    cloudinaryEnv()
    instance = new CloudinaryStorage()
  } else {
    if (process.env.NODE_ENV === 'production') throw new Error('Local media storage is for development only (set MEDIA_STORAGE=cloudinary)')
    const root = resolve(process.env.MEDIA_LOCAL_DIR ?? '.storage')
    const base = (process.env.MEDIA_PUBLIC_BASE_URL ?? `http://localhost:${process.env.API_PORT ?? 8787}`).replace(/\/$/, '')
    instance = new LocalStorage(root, base)
  }
  return instance
}

export function getLocalStorage(): LocalStorage | null {
  const s = getStorage()
  return s instanceof LocalStorage ? s : null
}

/** Test helper without touching the real Cloudinary cloud. */
export function _resetSingletons() {
  instance = null
}
