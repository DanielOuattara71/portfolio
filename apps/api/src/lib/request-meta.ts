/**
 * Request context kept for security logs, minimised (docs/admin/05 §A):
 * truncated IP address and browser/OS family only, never the full user agent or address.
 */

/** Client IP forwarded by the admin proxy (x-admin-client-ip is only trusted after the proxy check). */
export const CLIENT_IP_HEADER = 'x-admin-client-ip'

export function clientIp(headers: Headers): string | null {
  const v = headers.get(CLIENT_IP_HEADER)?.trim()
  return v && v !== 'unknown' ? v : null
}

/** 41.202.17.9 → 41.202.17.x ; 2001:db8:abcd:12::1 → 2001:db8:abcd::/48 */
export function truncateIp(ip: string | null): string | null {
  if (!ip) return null
  const v4 = ip.replace(/^::ffff:/, '')
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v4)) return v4.split('.').slice(0, 3).join('.') + '.x'
  if (ip.includes(':')) return ip.split(':').slice(0, 3).join(':') + '::/48'
  return null
}

/** "Chrome · Windows" — family only, no version. */
export function uaFamily(ua: string | null | undefined): string | null {
  if (!ua) return null
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : /curl|node|undici|python|Go-http/i.test(ua)
              ? 'Script'
              : 'Autre navigateur'
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /iPhone|iPad|iOS/.test(ua)
      ? 'iOS'
      : /Android/.test(ua)
        ? 'Android'
        : /Mac OS X|Macintosh/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : null
  return os ? `${browser} · ${os}` : browser
}

export function requestMeta(headers: Headers) {
  return {
    ipTrunc: truncateIp(clientIp(headers)),
    ua: uaFamily(headers.get('user-agent')),
    requestId: headers.get('x-request-id'),
  }
}
