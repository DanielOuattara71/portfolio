import { sql } from 'drizzle-orm'
import { bigint, bigserial, boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export const checkTarget = pgEnum('check_target', ['web', 'api', 'db', 'storage'])
export const alertSeverity = pgEnum('alert_severity', ['warning', 'critical'])
export const alertStatus = pgEnum('alert_status', ['open', 'acknowledged', 'resolved'])
export const incidentStatus = pgEnum('incident_status', ['open', 'acknowledged', 'resolved'])
export const backupTrigger = pgEnum('backup_trigger', ['scheduled', 'manual'])
export const backupResult = pgEnum('backup_result', ['success', 'failed', 'pending'])

/** Every 5-minute probe result (docs/admin/05 §C). */
export const serviceCheck = pgTable(
  'service_check',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    target: checkTarget('target').notNull(),
    ok: boolean('ok').notNull(),
    statusCode: integer('status_code'),
    ms: integer('ms'),
    error: text('error'),
  },
  (t) => [index('service_check_target_at_idx').on(t.target, t.at)],
)

export const alert = pgTable(
  'alert',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    rule: varchar('rule', { length: 80 }).notNull(),
    severity: alertSeverity('severity').notNull(),
    status: alertStatus('status').notNull().default('open'),
    firstAt: timestamp('first_at', { withTimezone: true }).notNull().defaultNow(),
    lastAt: timestamp('last_at', { withTimezone: true }).notNull().defaultNow(),
    count: integer('count').notNull().default(1),
    data: jsonb('data').notNull().default(sql`'{}'::jsonb`),
  },
  (t) => [index('alert_rule_status_idx').on(t.rule, t.status), index('alert_last_idx').on(t.lastAt)],
)

export const incident = pgTable(
  'incident',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    number: varchar('number', { length: 20 }).notNull().unique(),
    title: varchar('title', { length: 240 }).notNull(),
    severity: alertSeverity('severity').notNull(),
    status: incidentStatus('status').notNull().default('open'),
    alertId: bigint('alert_id', { mode: 'number' }),
    openedBy: text('opened_by'),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolution: text('resolution'),
  },
  (t) => [index('incident_status_idx').on(t.status, t.openedAt)],
)

export const incidentNote = pgTable(
  'incident_note',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    incidentId: bigint('incident_id', { mode: 'number' })
      .notNull()
      .references(() => incident.id, { onDelete: 'cascade' }),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    authorId: text('author_id'),
    text: text('text').notNull(),
  },
  (t) => [index('incident_note_incident_idx').on(t.incidentId, t.at)],
)

export const backup = pgTable(
  'backup',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    trigger: backupTrigger('trigger').notNull(),
    triggeredBy: text('triggered_by'),
    objectKey: text('object_key'),
    bytes: integer('bytes'),
    sha256: varchar('sha256', { length: 64 }),
    schemaVersion: varchar('schema_version', { length: 20 }),
    rowCounts: jsonb('row_counts'),
    result: backupResult('result').notNull().default('pending'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    restoreTestedAt: timestamp('restore_tested_at', { withTimezone: true }),
    error: text('error'),
  },
  (t) => [index('backup_started_idx').on(t.startedAt)],
)
