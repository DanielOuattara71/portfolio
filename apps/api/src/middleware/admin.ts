import { timingSafeEqual } from 'node:crypto'
import { can, ROLE_PERMISSIONS, type Permission } from '@portfolio/shared/permissions'
import type { Role } from '@portfolio/shared/constants'
import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import { ADMIN_ORIGIN, getAuth } from '../auth'
import { CLIENT_IP_HEADER, requestMeta } from '../lib/request-meta'
import { audit } from '../services/audit'

/**
 * Guards for /api/* (docs/admin/04-securite-authentification.md).
 * 1. proxyGuard: requests must come through the admin proxy (shared secret); the client IP it forwards
 *    is the only one trusted, any other value is overwritten.
 * 2. requireSession: valid session, 7-day absolute limit, two-factor mandatory for administrators.
 * 3. requirePermission: named right checked in every route.
 */
export const MAX_SESSION_AGE_MS = 7 * 24 * 60 * 60 * 1000

export interface AdminUser {
  id: string
  email: string
  name: string
  role: Role
  twoFactorEnabled: boolean
}
export interface AdminEnv {
  Variables: {
    headers: Headers
    user: AdminUser
    session: { id: string; token: string; createdAt: Date; expiresAt: Date }
  }
}

type ProblemStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500

/** RFC 9457 error body with a stable `code` (docs/admin/08 §4). */
export function problem<S extends ProblemStatus>(c: Context, status: S, code: string, title: string, detail?: string) {
  return c.json({ title, status: status as number, code, ...(detail ? { detail } : {}) }, status, { 'Content-Type': 'application/problem+json' })
}

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export const proxyGuard = createMiddleware<AdminEnv>(async (c, next) => {
  const expected = process.env.ADMIN_PROXY_SECRET
  const given = c.req.header('x-admin-proxy') ?? ''
  if (!expected) {
    if (process.env.NODE_ENV === 'production') return problem(c, 500, 'config.proxy_secret', 'Server misconfigured')
  } else if (!sameSecret(given, expected)) {
    return problem(c, 403, 'proxy.required', 'Forbidden', 'This API is only reachable through the admin.')
  }
  const headers = new Headers(c.req.raw.headers)
  headers.delete('x-admin-proxy')
  if (!expected || !sameSecret(given, expected)) headers.set(CLIENT_IP_HEADER, 'unknown')
  const requestId = crypto.randomUUID()
  headers.set('x-request-id', requestId)
  c.set('headers', headers)
  await next()
  c.res.headers.set('X-Request-Id', requestId)
})

/** Refuses state-changing requests that do not come from the admin's own pages (CSRF). */
export const originGuard = createMiddleware<AdminEnv>(async (c, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method) && c.req.header('origin') !== ADMIN_ORIGIN) {
    return problem(c, 403, 'origin.invalid', 'Forbidden', 'Request origin not allowed.')
  }
  await next()
})

/** `allowWithoutMfa`: routes an administrator needs before enabling two-factor (e.g. /me). */
export function requireSession(opts: { allowWithoutMfa?: boolean } = {}) {
  return createMiddleware<AdminEnv>(async (c, next) => {
    const headers = c.get('headers') ?? c.req.raw.headers
    const auth = getAuth()
    const { headers: authHeaders, response } = await auth.api.getSession({ headers, returnHeaders: true })
    if (!response) return problem(c, 401, 'auth.required', 'Unauthorized', 'Sign in again.')

    const { session, user } = response
    if (Date.now() - new Date(session.createdAt).getTime() > MAX_SESSION_AGE_MS) {
      const ctx = await auth.$context
      await ctx.internalAdapter.deleteSession(session.token)
      return problem(c, 401, 'auth.session_too_old', 'Unauthorized', 'Sessions last 7 days at most. Sign in again.')
    }
    const role = (user as { role?: string }).role as Role
    if (!ROLE_PERMISSIONS[role]) return problem(c, 403, 'auth.role_invalid', 'Forbidden')
    const twoFactorEnabled = !!(user as { twoFactorEnabled?: boolean | null }).twoFactorEnabled
    if (role === 'admin' && !twoFactorEnabled && !opts.allowWithoutMfa) {
      return problem(c, 403, 'mfa.setup_required', 'Two-factor authentication required', 'Enable two-factor authentication to continue.')
    }

    c.set('user', { id: user.id, email: user.email, name: user.name, role, twoFactorEnabled })
    c.set('session', { id: session.id, token: session.token, createdAt: new Date(session.createdAt), expiresAt: new Date(session.expiresAt) })
    await next()
    // Sliding expiry: forward the refreshed session cookie, if any.
    authHeaders?.getSetCookie?.().forEach((cookie) => c.res.headers.append('Set-Cookie', cookie))
    c.res.headers.set('Cache-Control', 'no-store')
  })
}

export const FRESH_SESSION_MAX_MS = 10 * 60 * 1000

/** True when the current session was created within the last `maxAgeMs` (default 10 min). */
export function isSessionFresh(session: { createdAt: Date }, maxAgeMs = FRESH_SESSION_MAX_MS): boolean {
  return Date.now() - new Date(session.createdAt).getTime() <= maxAgeMs
}

/**
 * Recent-identity check for sensitive operations (docs/admin/04 §2, 🔐).
 * Must run after requireSession(): it reads the session createdAt.
 * Beyond the limit the caller must re-authenticate (password, then TOTP),
 * which creates a new session, then retry the original action.
 */
export function requireFreshSession(maxAgeMs = FRESH_SESSION_MAX_MS) {
  return createMiddleware<AdminEnv>(async (c, next) => {
    const session = c.get('session')
    if (!session || !isSessionFresh(session, maxAgeMs)) {
      return problem(c, 403, 'auth.reauth_required', 'Recent sign-in required', 'Confirm your identity and retry.')
    }
    await next()
  })
}

export function requirePermission(permission: Permission) {
  return createMiddleware<AdminEnv>(async (c, next) => {
    const user = c.get('user')
    if (!can(user.role, permission)) {
      await audit({ action: 'access.denied', result: 'denied', severity: 'warning', actorId: user.id, actorRole: user.role, ...requestMeta(c.get('headers')), meta: { permission, path: c.req.path } })
      return problem(c, 403, 'permission.denied', 'Forbidden', 'Your role does not allow this action.')
    }
    await next()
  })
}
