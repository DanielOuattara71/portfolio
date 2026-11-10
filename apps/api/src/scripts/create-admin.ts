/**
 * Creates an administrator account (there is no public sign-up).
 *
 *   pnpm --filter @portfolio/api admin:create -- --email you@example.com --name "Your Name"
 *
 * The password is typed without being shown (or read from ADMIN_PASSWORD for automation).
 * Rules: 12+ characters, refused if it appears in a known data breach (Have I Been Pwned,
 * k-anonymity: only the first 5 characters of its SHA-1 leave this machine).
 * Two-factor authentication is set up at the first sign-in, before anything else is reachable.
 */
import { randomUUID } from 'node:crypto'
import { createInterface } from 'node:readline'
import { Writable } from 'node:stream'
import { hashPassword } from 'better-auth/crypto'
import { isPasswordCompromised } from 'better-auth/plugins/haveibeenpwned'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { account, user } from '../db/schema'
import { audit } from '../services/audit'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : undefined
}

function askHidden(question: string): Promise<string> {
  let muted = false
  const out = new Writable({
    write(chunk, _enc, cb) {
      if (!muted) process.stdout.write(chunk)
      cb()
    },
  })
  const rl = createInterface({ input: process.stdin, output: out, terminal: true })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      process.stdout.write('\n')
      resolve(answer)
    })
    muted = true
  })
}

async function main() {
  if (!db) throw new Error('DATABASE_URL is not set')
  const email = arg('email')?.trim().toLowerCase()
  const name = arg('name')?.trim()
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Give a valid --email')
  if (!name) throw new Error('Give a --name (shown in the activity log)')

  const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)
  if (existing.length) throw new Error(`An account already exists for ${email}`)

  let password = process.env.ADMIN_PASSWORD
  if (!password) {
    password = await askHidden('Mot de passe (12 caractères minimum, non affiché) : ')
    const again = await askHidden('Confirme le mot de passe : ')
    if (password !== again) throw new Error('The two passwords differ')
  }
  if (password.length < 12 || password.length > 128) throw new Error('Password must be 12 to 128 characters')
  if (await isPasswordCompromised(password)) throw new Error('This password appears in a known data breach: choose another one')

  // Same storage as Better Auth: scrypt hash in a "credential" account (done in one transaction).
  const id = randomUUID()
  const hash = await hashPassword(password)
  await db.transaction(async (tx) => {
    await tx.insert(user).values({ id, email, name, emailVerified: true, role: 'admin' })
    await tx.insert(account).values({ id: randomUUID(), userId: id, providerId: 'credential', accountId: id, password: hash })
  })
  await audit({ action: 'user.created', result: 'success', severity: 'warning', resourceType: 'user', resourceId: id, resourceLabel: email, meta: { role: 'admin', via: 'command line' } })

  console.log(`Administrator created: ${email}. Sign in to the admin, then set up two-factor authentication.`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
