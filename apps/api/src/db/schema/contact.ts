import { sql } from 'drizzle-orm'
import { index, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const contactProfile = pgEnum('contact_profile', ['recruiter', 'client', 'other'])
export const contactStatus = pgEnum('contact_status', ['new', 'read', 'answered', 'archived'])

/**
 * Messages sent through the public contact form. No IP address or user agent is stored
 * (data minimisation); the admin will list and archive them.
 */
export const contactMessages = pgTable(
  'contact_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    profile: contactProfile('profile').notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    email: varchar('email', { length: 254 }).notNull(),
    company: varchar('company', { length: 160 }),
    role: varchar('role', { length: 160 }),
    projectTypes: text('project_types').array().notNull().default(sql`'{}'::text[]`),
    timeline: varchar('timeline', { length: 120 }),
    message: text('message').notNull(),
    locale: varchar('locale', { length: 5 }).notNull(),
    status: contactStatus('status').notNull().default('new'),
  },
  (t) => [index('contact_messages_created_at_idx').on(t.createdAt)],
)
