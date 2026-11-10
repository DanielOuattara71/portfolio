/**
 * Media library client: upload in three steps (ask → send the file to storage → server check),
 * so large files never go through the API functions (docs/admin/04 §5).
 */
export interface MediaItem {
  id: string
  status: 'uploading' | 'ready' | 'failed'
  kind: 'image' | 'pdf'
  folder: MediaFolder
  name: string
  mime: string
  bytes: number | null
  width: number | null
  height: number | null
  alt: { fr: string | null; en: string | null }
  caption: { fr: string | null; en: string | null }
  credit: string | null
  isPublic: boolean
  variants: { width: number; height: number }[]
  uploadedBy: string | null
  createdAt: string
  deletedAt: string | null
  usageCount: number
}

export const MEDIA_FOLDERS = [
  { value: 'projets', label: 'Projets' },
  { value: 'profil', label: 'Profil' },
  { value: 'cv', label: 'CV' },
  { value: 'logos', label: 'Logos' },
  { value: 'divers', label: 'Divers' },
] as const
export type MediaFolder = (typeof MEDIA_FOLDERS)[number]['value']

const TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', pdf: 'application/pdf' }
export const ACCEPT = '.jpg,.jpeg,.png,.webp,.avif,.pdf,image/jpeg,image/png,image/webp,image/avif,application/pdf'
const MB = 1024 * 1024

/** Same limits as the API, checked early to save a useless upload (the API checks again). */
export function precheck(file: File): { mime: string } | { error: string } {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const mime = Object.values(TYPES).includes(file.type) ? file.type : (TYPES[ext] ?? '')
  if (!mime) return { error: 'Type non accepté : JPEG, PNG, WebP, AVIF ou PDF.' }
  const max = mime === 'application/pdf' ? 15 * MB : 10 * MB
  if (file.size > max) return { error: `Fichier trop lourd : ${max / MB} Mo maximum.` }
  return { mime }
}

const MESSAGES: Record<string, string> = {
  'media.type_refused': 'Type non accepté : JPEG, PNG, WebP, AVIF ou PDF.',
  'media.type_mismatch': 'Le contenu du fichier ne correspond pas à son type.',
  'media.too_large': 'Fichier trop lourd (10 Mo par image, 15 Mo par PDF).',
  'media.too_big_pixels': 'Image trop grande (8 000 px maximum).',
  'media.unreadable': 'Image illisible ou endommagée.',
  'media.missing_file': 'Le fichier n’a pas été reçu. Réessaie.',
  'media.quota': 'Limite atteinte : 50 envois par heure.',
  'media.duplicate': 'Ce fichier est déjà dans la médiathèque.',
  'media.in_use': 'Utilisé par un contenu : retire-le d’abord de ce contenu.',
  'upload.signature': 'Lien d’envoi expiré. Réessaie.',
}
export function mediaError(e: unknown): string {
  const code = (e as { data?: { code?: string } })?.data?.code
  if (code === 'client') return (e as { message: string }).message
  return (code && MESSAGES[code]) || 'L’opération n’a pas abouti. Réessaie.'
}

/** Send with progress (fetch has no upload progress). PUT (local S3-style) or POST form (Cloudinary). */
function put(url: string, file: File, headers: Record<string, string>, onProgress: (p: number) => void, method = 'PUT', fields?: Record<string, string>) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, url)
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v)
    xhr.upload.onprogress = (ev) => ev.lengthComputable && onProgress(Math.round((ev.loaded / ev.total) * 100))
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject({ data: safeJson(xhr.responseText) }))
    xhr.onerror = () => reject(new Error('network'))
    if (method === 'POST' && fields) {
      const form = new FormData()
      for (const [k, v] of Object.entries(fields)) form.append(k, v)
      form.append('file', file)
      xhr.send(form)
    } else {
      xhr.send(file)
    }
  })
}
const safeJson = (t: string) => {
  try {
    return JSON.parse(t)
  } catch {
    return null
  }
}

export async function uploadMedia(file: File, opts: { folder: MediaFolder; replaceOf?: string; onProgress?: (p: number) => void; onStage?: (s: 'sending' | 'checking') => void }) {
  const pre = precheck(file)
  if ('error' in pre) throw { data: { code: 'client' }, message: pre.error }
  const start = await $fetch<{ id: string; upload: { url: string; method: 'PUT' | 'POST'; headers: Record<string, string>; fields?: Record<string, string> } }>('/api/admin/media/uploads', {
    method: 'POST',
    body: { name: file.name, mime: pre.mime, bytes: file.size, folder: opts.folder },
  })
  opts.onStage?.('sending')
  await put(start.upload.url, file, start.upload.headers, opts.onProgress ?? (() => {}), start.upload.method, start.upload.fields)
  opts.onStage?.('checking')
  return await $fetch<{ media: MediaItem; duplicate: boolean }>(`/api/admin/media/uploads/${start.id}/complete`, {
    method: 'POST',
    body: opts.replaceOf ? { replaceOf: opts.replaceOf } : {},
  })
}

export const previewUrl = (id: string, w = 480) => `/api/admin/media/${id}/file?w=${w}`

export function formatBytes(n: number | null) {
  if (!n) return '—'
  return n < MB ? `${Math.round(n / 1024)} Ko` : `${(n / MB).toFixed(1).replace('.', ',')} Mo`
}
