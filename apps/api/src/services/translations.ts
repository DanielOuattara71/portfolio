import { contentDocSchema, type ContentType } from '@portfolio/shared/content'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { contentItems, media } from '../db/schema'

/**
 * Missing FR/EN fields per content (docs/admin/02 §H, prompt module 9).
 * Walks the working documents and reports bilingual paths empty in one language only
 * ("" whitespace or null vs filled in the other), plus fields empty in both as "to write".
 * The shape mirrors the Zod schemas: every {fr, en} object is a bilingual field.
 */

export interface MissingField {
  path: string
  locale: 'fr' | 'en'
  filledInOther: boolean
}
export interface TranslationItem {
  id: string
  type: ContentType
  key: string
  status: string
  missing: MissingField[]
}

function isEmptyValue(v: unknown): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === 'string') return !v.trim()
  if (Array.isArray(v)) {
    if (!v.length) return true
    // Segments / paragraphs: empty when every text is empty.
    return v.every((x) => {
      if (typeof x === 'string') return !x.trim()
      if (x && typeof x === 'object' && 'text' in (x as { text?: unknown })) return !(x as { text: string }).text.trim()
      if (Array.isArray(x)) return x.every((y) => typeof y === 'object' && y && 'text' in (y as { text?: unknown }) && !(y as { text: string }).text.trim())
      return false
    })
  }
  return false
}

function walk(path: string, value: unknown, out: MissingField[]) {
  if (!value || typeof value !== 'object') return
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj)
  const isLoc = keys.length === 2 && 'fr' in obj && 'en' in obj
  if (isLoc) {
    const fr = obj.fr
    const en = obj.en
    const frEmpty = isEmptyValue(fr)
    const enEmpty = isEmptyValue(en)
    if (frEmpty && !enEmpty) out.push({ path: path || '(document)', locale: 'fr', filledInOther: true })
    else if (enEmpty && !frEmpty) out.push({ path: path || '(document)', locale: 'en', filledInOther: true })
    else if (frEmpty && enEmpty) {
      // Both empty: still incomplete (to write in both), reported with filledInOther=false.
      out.push({ path: path || '(document)', locale: 'fr', filledInOther: false })
      out.push({ path: path || '(document)', locale: 'en', filledInOther: false })
    }
    return
  }
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') walk(path ? `${path}.${k}` : k, v, out)
    else if (Array.isArray(v)) {
      // Arrays of objects (links, gallery, techRoles…): walk each index for loc fields inside.
      v.forEach((item, i) => {
        if (item && typeof item === 'object') walk(path ? `${path}.${k}.${i}` : `${k}.${i}`, item, out)
      })
    }
  }
  // Arrays at this level (paragraphs are arrays of segment arrays).
  if (Array.isArray(value)) {
    // Already handled via parent object walk; nothing extra here.
  }
}

export async function listTranslations(): Promise<{ items: TranslationItem[]; totalMissing: number }> {
  if (!db) return { items: [], totalMissing: 0 }
  const rows = await db.select().from(contentItems)
  const items: TranslationItem[] = []
  let totalMissing = 0
  for (const item of rows.sort((a, b) => String(a.type).localeCompare(String(b.type)) || a.key.localeCompare(b.key))) {
    const missing: MissingField[] = []
    walk('', item.working, missing)
    if (!missing.length) continue
    // Media alternative texts (FR/EN) are translations too.
    if (item.type === 'project' || item.type === 'settings') {
      // Media alts are checked separately on the dashboard; keep translations to documents here.
    }
    // Skip the empty-draft noise for projects: only report up to 40 per content.
    items.push({ id: item.id, type: item.type, key: item.key, status: item.status, missing: missing.slice(0, 40) })
    totalMissing += missing.length
  }
  return { items, totalMissing }
}

/** Media files missing an alternative text in one language (dashboard "À compléter"). */
export async function missingAltMedia() {
  if (!db) return []
  const rows = await db.select().from(media).where(eq(media.status, 'ready'))
  return rows.filter((m) => m.kind === 'image' && (!m.alt.fr?.trim() || !m.alt.en?.trim()))
}
