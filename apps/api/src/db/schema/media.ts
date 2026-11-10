import { sql } from 'drizzle-orm'
import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'

/**
 * Media library (docs/admin/02 §G, 04 §5, 08 §3).
 * - Files are stored privately; a copy goes to public storage only while a PUBLISHED content uses it.
 * - Files are never overwritten: a replacement gets new keys, the old ones are listed in replaced_keys.
 * - Deletion is soft first (trash, 30 days), and refused while a content uses the file.
 */
export const mediaKind = pgEnum('media_kind', ['image', 'pdf'])
export const mediaStatus = pgEnum('media_status', ['uploading', 'ready', 'failed'])
export const mediaFolder = pgEnum('media_folder', ['projets', 'profil', 'cv', 'logos', 'divers'])

export interface MediaVariant {
  width: number
  height: number
  key: string
  bytes: number
}

export const media = pgTable(
  'media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    status: mediaStatus('status').notNull().default('uploading'),
    kind: mediaKind('kind').notNull(),
    folder: mediaFolder('folder').notNull().default('divers'),
    /** Display name (sanitised from the uploaded file name, never used as a storage path). */
    name: varchar('name', { length: 160 }).notNull(),
    /** Type declared at upload time; checked against the real file signature on completion. */
    mime: varchar('mime', { length: 80 }).notNull(),
    bytes: integer('bytes'),
    width: integer('width'),
    height: integer('height'),
    sha256: varchar('sha256', { length: 64 }),
    uploadKey: text('upload_key').notNull(),
    originalKey: text('original_key'),
    variants: jsonb('variants').$type<MediaVariant[]>().notNull().default(sql`'[]'::jsonb`),
    alt: jsonb('alt').$type<{ fr: string | null; en: string | null }>().notNull().default(sql`'{"fr":null,"en":null}'::jsonb`),
    caption: jsonb('caption').$type<{ fr: string | null; en: string | null }>().notNull().default(sql`'{"fr":null,"en":null}'::jsonb`),
    credit: varchar('credit', { length: 160 }),
    /** true while a copy is in public storage (used by a published content). */
    isPublic: boolean('is_public').notNull().default(false),
    replacedKeys: jsonb('replaced_keys').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    error: varchar('error', { length: 200 }),
    uploadedBy: text('uploaded_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('media_list_idx').on(t.status, t.folder, t.createdAt),
    index('media_uploader_idx').on(t.uploadedBy, t.createdAt),
    // Same file twice is refused (points to the existing one); trashed files do not count.
    uniqueIndex('media_sha256_uq').on(t.sha256).where(sql`${t.status} = 'ready' and ${t.deletedAt} is null`),
  ],
)
