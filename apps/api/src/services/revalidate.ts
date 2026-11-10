/**
 * Asks the public site to drop its cached content right after a publication, so the change shows
 * on the next page view instead of within 60 s. Never throws: a failed refresh is reported, and the
 * 60-second cache expiry remains the safety net (docs/admin/03 §Publication).
 * On Vercel each site instance has its own cache: the call reaches one instance, the others
 * refresh within 60 s.
 */
export async function revalidateSite(): Promise<'ok' | 'not_configured' | 'failed'> {
  const url = process.env.SITE_REVALIDATE_URL
  const token = process.env.REVALIDATE_TOKEN
  if (!url || !token) return 'not_configured'
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'x-revalidate-token': token }, signal: AbortSignal.timeout(5000) })
    return res.ok ? 'ok' : 'failed'
  } catch {
    return 'failed'
  }
}
