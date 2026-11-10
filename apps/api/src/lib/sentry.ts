import * as Sentry from '@sentry/node'

/**
 * Error reporting (docs/admin/05 §C): site, admin and API send to Sentry,
 * without IP addresses or personal data (v11 sends no PII by default; beforeSend also strips).
 * No DSN in development == no-op (nothing is the default error reporter).
 */
let started = false

export function initSentry() {
  if (started) return
  started = true
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return
  Sentry.init({
    dsn,
    // No PII by default in v11; beforeSend strips user/cookies as defence in depth.
    tracesSampleRate: 0,
    environment: process.env.NODE_ENV ?? 'development',
    beforeSend(event) {
      // Strip anything that could carry personal data (defence in depth).
      delete event.user
      delete event.request?.data
      if (event.request?.headers) {
        for (const k of Object.keys(event.request.headers)) {
          if (/cookie|authorization|token|secret/i.test(k)) delete event.request.headers[k]
        }
      }
      return event
    },
  })
}

export function captureError(error: unknown) {
  if (!process.env.SENTRY_DSN) return
  Sentry.captureException(error)
}
