import type { PublishedContent } from '@portfolio/shared/content'

/**
 * Published content from the API, cached 60 s on this server.
 * One call feeds every page and the sitemap. After a publication the API calls
 * POST /api/_revalidate which empties the cache, so the next request waits for
 * fresh content instead of showing the stale copy for up to a minute.
 * When the next request cannot reach the API, the last known copy is served.
 * On Vercel each instance has its own cache: only the instance reached by the
 * revalidate call is emptied, the others refresh within 60 s.
 */
let cache: { data: PublishedContent; at: number } | null = null
let inflight: Promise<PublishedContent> | null = null

export async function getPublishedContent(): Promise<PublishedContent> {
  if (cache && Date.now() - cache.at < 60_000) return cache.data
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const base = useRuntimeConfig().public.apiBase.replace(/\/$/, '')
      const fresh = await $fetch<PublishedContent>(`${base}/public/content`, { timeout: 8000, retry: 1 })
      cache = { data: fresh, at: Date.now() }
      return fresh
    } catch (e) {
      // Stale is better than nothing: visitors keep seeing the last published copy.
      if (cache) return cache.data
      throw e
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/** Called by the admin revalidate endpoint after a publication. */
export function invalidatePublishedContent() {
  cache = null
}
