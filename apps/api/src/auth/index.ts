import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError, createAuthMiddleware, isAPIError } from 'better-auth/api'
import { haveIBeenPwned } from 'better-auth/plugins/haveibeenpwned'
import { twoFactor } from 'better-auth/plugins/two-factor'
import { and, count, eq, gte, inArray } from 'drizzle-orm'
import { db } from '../db/client'
import * as schema from '../db/schema'
import { CLIENT_IP_HEADER, requestMeta } from '../lib/request-meta'
import { audit } from '../services/audit'
import { sendMail } from '../services/mail'
import { maybeNotifyNewDevice, raiseSecurityAlert } from '../services/monitoring'

/**
 * Authentication (docs/admin/04-securite-authentification.md), built on Better Auth 1.7.
 * Mounted on /api/auth/*, reached by the admin through its own /api proxy.
 */
export const ADMIN_ORIGIN = (process.env.BETTER_AUTH_URL ?? 'http://localhost:3002').replace(/\/$/, '')

const LOCK_WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES_PER_ACCOUNT = 5
const MAX_FAILURES_PER_IP = 20
const FAILED = ['failure', 'second_factor_failed'] as const

async function findUserByEmail(email: unknown) {
  if (!db || typeof email !== 'string') return null
  const rows = await db.select({ id: schema.user.id, role: schema.user.role }).from(schema.user).where(eq(schema.user.email, email.trim().toLowerCase())).limit(1)
  return rows[0] ?? null
}

async function recentFailures(where: { userId?: string; ipTrunc?: string }) {
  if (!db) return 0
  const since = new Date(Date.now() - LOCK_WINDOW_MS)
  const target = where.userId ? eq(schema.loginAttempt.userId, where.userId) : eq(schema.loginAttempt.ipTrunc, where.ipTrunc!)
  const [r] = await db
    .select({ n: count() })
    .from(schema.loginAttempt)
    .where(and(target, gte(schema.loginAttempt.at, since), inArray(schema.loginAttempt.result, [...FAILED])))
  return r?.n ?? 0
}

async function recordAttempt(headers: Headers, userId: string | null, result: (typeof schema.loginResult.enumValues)[number]) {
  if (!db) return
  const m = requestMeta(headers)
  await db.insert(schema.loginAttempt).values({ userId, ipTrunc: m.ipTrunc, ua: m.ua, result })
}

function createAuth() {
  if (!db) throw new Error('DATABASE_URL is not set: authentication needs the database')
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret || secret.length < 32) throw new Error('BETTER_AUTH_SECRET must be set (32+ random characters)')

  return betterAuth({
    appName: 'Portfolio · Administration',
    baseURL: ADMIN_ORIGIN,
    basePath: '/api/auth',
    secret,
    trustedOrigins: [ADMIN_ORIGIN],
    telemetry: { enabled: false },
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        twoFactor: schema.twoFactor,
        rateLimit: schema.rateLimit,
      },
    }),
    user: {
      additionalFields: {
        role: { type: 'string', required: false, defaultValue: 'viewer', input: false },
      },
    },
    emailAndPassword: {
      enabled: true,
      // No public sign-up: accounts are created from the command line, then by invitation.
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 30 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendMail({
          to: user.email,
          subject: 'Réinitialiser ton mot de passe',
          text: `Une réinitialisation du mot de passe a été demandée pour l'administration du portfolio.\n\nLien valable 30 minutes, à usage unique :\n${url}\n\nSi tu n'es pas à l'origine de cette demande, ignore ce message : ton mot de passe ne change pas.`,
        })
      },
      onPasswordReset: async ({ user }) => {
        await audit({ action: 'auth.password.reset', result: 'success', severity: 'warning', actorId: user.id, resourceType: 'user', resourceId: user.id })
        await sendMail({
          to: user.email,
          subject: 'Ton mot de passe a été modifié',
          text: "Le mot de passe de l'administration du portfolio vient d'être réinitialisé. Toutes les sessions ont été fermées.\n\nSi ce n'est pas toi, préviens immédiatement l'administrateur.",
        }).catch((e) => console.error('[mail] password reset notice', e))
      },
    },
    session: {
      // Idle timeout: 2 h. Activity extends it at most every 15 min. Absolute 7-day limit: admin middleware.
      expiresIn: 2 * 60 * 60,
      updateAge: 15 * 60,
      freshAge: 10 * 60,
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 900, max: MAX_FAILURES_PER_IP },
        '/two-factor/*': { window: 900, max: 20 },
        '/request-password-reset': { window: 3600, max: 3 },
        '/reset-password': { window: 900, max: 10 },
      },
    },
    advanced: {
      // Set by the API from the admin proxy (see index.ts); never trusted from a direct caller.
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
      cookiePrefix: 'pf-admin',
      useSecureCookies: ADMIN_ORIGIN.startsWith('https://'),
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax' },
    },
    disabledPaths: ['/sign-up/email', '/delete-user', '/change-email', '/update-user'],
    plugins: [
      twoFactor({
        issuer: 'Portfolio admin',
        backupCodeOptions: { amount: 10, storeBackupCodes: 'encrypted' },
        accountLockout: { enabled: true, maxFailedAttempts: MAX_FAILURES_PER_ACCOUNT, durationSeconds: LOCK_WINDOW_MS / 1000 },
      }),
      haveIBeenPwned({ customPasswordCompromisedMessage: 'Ce mot de passe figure dans une fuite de données connue. Choisis-en un autre.' }),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== '/sign-in/email') return
        const headers = ctx.headers ?? new Headers()
        const found = await findUserByEmail(ctx.body?.email)
        const m = requestMeta(headers)
        const accountLocked = found ? (await recentFailures({ userId: found.id })) >= MAX_FAILURES_PER_ACCOUNT : false
        const ipLocked = m.ipTrunc ? (await recentFailures({ ipTrunc: m.ipTrunc })) >= MAX_FAILURES_PER_IP : false
        if (accountLocked || ipLocked) {
          await recordAttempt(headers, found?.id ?? null, 'locked')
          await audit({ action: 'auth.sign_in.locked', result: 'denied', severity: 'warning', actorId: found?.id, ...m, meta: { scope: accountLocked ? 'account' : 'ip' } })
          throw new APIError('TOO_MANY_REQUESTS', { message: 'Trop de tentatives. Réessaie dans 15 minutes.', code: 'LOCKED' })
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        const headers = ctx.headers ?? new Headers()
        const m = requestMeta(headers)
        const returned = ctx.context.returned
        const failed = isAPIError(returned)
        const newSession = ctx.context.newSession

        if (ctx.path === '/sign-in/email') {
          if (failed && (returned as APIError).body?.code === 'LOCKED') return
          const found = await findUserByEmail(ctx.body?.email)
          if (failed) {
            await recordAttempt(headers, found?.id ?? null, 'failure')
            await audit({ action: 'auth.sign_in.failed', result: 'failure', severity: 'warning', actorId: found?.id, ...m, meta: { knownAccount: !!found } })
          } else if (newSession) {
            await recordAttempt(headers, newSession.user.id, 'success')
            await audit({ action: 'auth.sign_in', result: 'success', actorId: newSession.user.id, actorRole: found?.role, ...m, meta: { method: 'password' } })
            void maybeNotifyNewDevice(newSession.user.id, newSession.user.email, headers)
          } else {
            await recordAttempt(headers, found?.id ?? null, 'password_ok')
          }
          return
        }

        if (ctx.path === '/two-factor/verify-totp' || ctx.path === '/two-factor/verify-backup-code') {
          const method = ctx.path.endsWith('totp') ? 'totp' : 'backup_code'
          // Same endpoint for two cases: finishing a sign-in (no session cookie yet) or confirming
          // the setup of two-factor (already signed in).
          const settingUp = (headers.get('cookie') ?? '').includes('session_token=')
          if (settingUp && !failed) {
            await audit({ action: 'auth.mfa.enabled', result: 'success', severity: 'warning', actorId: newSession?.user.id ?? ctx.context.session?.user.id, ...m })
          } else if (failed) {
            await recordAttempt(headers, null, 'second_factor_failed')
            await audit({ action: 'auth.second_factor.failed', result: 'failure', severity: 'warning', ...m, meta: { method } })
          } else if (newSession) {
            await recordAttempt(headers, newSession.user.id, 'success')
            await audit({ action: 'auth.sign_in', result: 'success', actorId: newSession.user.id, ...m, meta: { method } })
            void maybeNotifyNewDevice(newSession.user.id, newSession.user.email, headers)
          }
          return
        }

        const userId = ctx.context.session?.user.id ?? newSession?.user.id ?? null
        const simple: Record<string, [string, 'info' | 'warning' | 'critical']> = {
          '/two-factor/enable': ['auth.mfa.setup_started', 'info'],
          '/two-factor/disable': ['auth.mfa.disabled', 'critical'],
          '/two-factor/generate-backup-codes': ['auth.mfa.backup_codes_regenerated', 'warning'],
          '/change-password': ['auth.password.changed', 'warning'],
          // Sign-out and revocations are logged once, by the session delete hook below.
          '/request-password-reset': ['auth.password.reset_requested', 'info'],
        }
        const entry = simple[ctx.path]
        if (entry) {
          await audit({ action: entry[0], result: failed ? 'failure' : 'success', severity: entry[1], actorId: userId, ...m })
          if (ctx.path === '/two-factor/disable' && !failed) {
            // Critical alert (docs/admin/05 §B): 2FA deactivated.
            void raiseSecurityAlert('security.mfa_disabled', 'critical', { userId }).catch(() => {})
          }
        }
      }),
    },
    databaseHooks: {
      session: {
        delete: {
          // Sign-out and revocations: logged with the owner of the session.
          after: async (s) => {
            await audit({ action: 'auth.session.ended', result: 'success', actorId: s.userId, resourceType: 'session' })
          },
        },
      },
    },
  })
}

let instance: ReturnType<typeof createAuth> | null = null
export function getAuth() {
  instance ??= createAuth()
  return instance
}
export type Auth = ReturnType<typeof createAuth>
