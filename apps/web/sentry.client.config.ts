import * as Sentry from '@sentry/nuxt'

// Error reporting without IP or personal data (docs/admin/05 §C). No DSN in dev = no-op? The SDK
// still initialises without a DSN and drops events, which is the desired dev behaviour.
Sentry.init({
  dsn: useRuntimeConfig().public.sentryDsn || undefined,
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
