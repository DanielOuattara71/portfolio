import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const url = process.env.DATABASE_URL

/** Single connection pool per server instance. Null when DATABASE_URL is not set. */
const sql = url ? postgres(url, { max: 5, idle_timeout: 20, connect_timeout: 5 }) : null

export const db = sql ? drizzle(sql, { schema }) : null

export async function checkDatabase(): Promise<'up' | 'down' | 'not_configured'> {
  if (!sql) return 'not_configured'
  try {
    await sql`select 1`
    return 'up'
  } catch {
    return 'down'
  }
}
