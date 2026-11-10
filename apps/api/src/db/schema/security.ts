import { bigserial, index, jsonb, pgEnum, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'

/**
 * Activity log and sign-in attempts (docs/admin/05-surveillance-journalisation.md).
 * audit_log is append-only: a trigger (migration 0002) refuses UPDATE and DELETE, except through
 * the purge function. Each row stores the SHA-256 of the previous one (tamper evidence).
 * Never store passwords, codes, cookies, tokens or message bodies here.
 */
export const auditResult = pgEnum('audit_result', ['success', 'failure', 'denied'])
export const auditSeverity = pgEnum('audit_severity', ['info', 'warning', 'critical'])

export const auditLog = pgTable(
  'audit_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    actorId: text('actor_id'),
    actorRole: varchar('actor_role', { length: 20 }),
    action: varchar('action', { length: 80 }).notNull(),
    resourceType: varchar('resource_type', { length: 40 }),
    resourceId: text('resource_id'),
    resourceLabel: varchar('resource_label', { length: 200 }),
    result: auditResult('result').notNull(),
    severity: auditSeverity('severity').notNull().default('info'),
    requestId: varchar('request_id', { length: 64 }),
    ipTrunc: varchar('ip_trunc', { length: 64 }),
    ua: varchar('ua', { length: 80 }),
    meta: jsonb('meta'),
    prevHash: varchar('prev_hash', { length: 64 }).notNull(),
    hash: varchar('hash', { length: 64 }).notNull(),
  },
  (t) => [
    index('audit_log_at_idx').on(t.at),
    index('audit_log_actor_idx').on(t.actorId, t.at),
    index('audit_log_action_idx').on(t.action, t.at),
  ],
)

export const loginResult = pgEnum('login_result', ['success', 'password_ok', 'failure', 'second_factor_failed', 'locked'])

/** Kept 90 days. The email itself is not stored: only the account id when the account exists. */
export const loginAttempt = pgTable(
  'login_attempt',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    userId: text('user_id'),
    ipTrunc: varchar('ip_trunc', { length: 64 }),
    ua: varchar('ua', { length: 80 }),
    result: loginResult('result').notNull(),
  },
  (t) => [index('login_attempt_user_idx').on(t.userId, t.at), index('login_attempt_ip_idx').on(t.ipTrunc, t.at)],
)
