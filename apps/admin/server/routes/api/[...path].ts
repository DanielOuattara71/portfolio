/**
 * /api/** → API, on the admin's own origin (session cookie stays first-party).
 * Adds the shared proxy secret (the API refuses /api/* without it) and the visitor's IP address,
 * which the API uses for rate limiting and, truncated, for the security log.
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const target = `${config.apiOrigin.replace(/\/$/, '')}${event.path}`
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  return proxyRequest(event, target, {
    headers: {
      'x-admin-proxy': config.adminProxySecret,
      'x-admin-client-ip': ip,
    },
  })
})
