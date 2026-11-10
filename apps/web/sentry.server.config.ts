import * as Sentry from '@sentry/nuxt'

// Server side: same privacy rules as the client (no IP, no personal data).
Sentry.init({
  dsn: process.env.SENTRY_DSN || undefined,
  // No PII by default in v11; beforeSend strips user/cookies as defence in depth.
  tracesSampleRate: 0,
  beforeSend(event) {
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
