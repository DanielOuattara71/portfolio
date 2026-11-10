import { CONTENT_STATUSES } from '@portfolio/shared/constants'
import { CONTENT_TYPES } from '@portfolio/shared/content'
import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { media } from './media'

/**
 * Versioned content (docs/admin/08-architecture-donnees.md §3).
 * - content_item: one row per content, with its WORKING copy (what the admin edits).
 * - content_version: frozen snapshots; the public site only ever reads the published one.
 */
export const contentType = pgEnum('content_type', CONTENT_TYPES)
export const contentStatus = pgEnum('content_status', CONTENT_STATUSES)
export const versionKind = pgEnum('content_version_kind', ['import', 'checkpoint', 'published', 'restored'])
export const localeEnum = pgEnum('locale', ['fr', 'en'])

export const contentItems = pgTable(
  'content_item',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: contentType('type').notNull(),
    key: varchar('key', { length: 80 }).notNull(),
    position: integer('position').notNull().default(0),
    status: contentStatus('status').notNull().default('draft'),
    featured: boolean('featured').notNull().default(false),
    working: jsonb('working').notNull(),
    workingRevision: integer('working_revision').notNull().default(1),
    workingUpdatedAt: timestamp('working_updated_at', { withTimezone: true }).notNull().defaultNow(),
    // Author ids point to admin accounts (added with authentication); null = import or system.
    workingUpdatedBy: text('working_updated_by'),
    // No foreign key here (circular with content_version); integrity is kept by the workflow service.
    publishedVersionId: uuid('published_version_id'),
    /** Fields drafted from what the owner said ("à valider"): block publishing until confirmed. */
    pendingFields: text('pending_fields').array().notNull().default(sql`'{}'::text[]`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('content_item_type_key_uq').on(t.type, t.key),
    index('content_item_list_idx').on(t.type, t.status, t.position),
    check('content_item_archived_unpublished', sql`${t.status} <> 'archived' or ${t.publishedVersionId} is null`),
  ],
)

export const contentVersions = pgTable(
  'content_version',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => contentItems.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    kind: versionKind('kind').notNull(),
    data: jsonb('data').notNull(),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('content_version_item_number_uq').on(t.itemId, t.number)],
)

/** Published addresses, one per language. Unique per content type and language. */
export const contentSlugs = pgTable(
  'content_slug',
  {
    itemId: uuid('item_id')
      .notNull()
      .references(() => contentItems.id, { onDelete: 'cascade' }),
    type: contentType('type').notNull(),
    locale: localeEnum('locale').notNull(),
    slug: varchar('slug', { length: 80 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.locale] }), uniqueIndex('content_slug_uq').on(t.type, t.locale, t.slug)],
)

/** Former addresses of a published item → 301 to its current address. */
export const redirects = pgTable(
  'redirect',
  {
    type: contentType('type').notNull(),
    locale: localeEnum('locale').notNull(),
    fromSlug: varchar('from_slug', { length: 80 }).notNull(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => contentItems.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.type, t.locale, t.fromSlug] })],
)

/**
 * What a content uses (media, skills, linked projects), rebuilt on every save and publish.
 * Used to block deleting something that is still in use and to list "where is it used".
 */
export const contentRefs = pgTable(
  'content_ref',
  {
    itemId: uuid('item_id')
      .notNull()
      .references(() => contentItems.id, { onDelete: 'cascade' }),
    /** Dotted path of the field, e.g. "stack", "gallery", "coverId". */
    field: varchar('field', { length: 80 }).notNull(),
    refItemId: uuid('ref_item_id').references(() => contentItems.id, { onDelete: 'restrict' }),
    // A media file still referenced cannot be removed (soft delete is refused first, see services/media).
    refMediaId: uuid('ref_media_id').references(() => media.id, { onDelete: 'restrict' }),
    /** true when the reference belongs to the published version (blocks deletion). */
    published: boolean('published').notNull(),
  },
  (t) => [
    index('content_ref_item_idx').on(t.itemId),
    index('content_ref_ref_item_idx').on(t.refItemId),
    index('content_ref_media_idx').on(t.refMediaId),
    check('content_ref_one_target', sql`(${t.refItemId} is null) <> (${t.refMediaId} is null)`),
  ],
)
