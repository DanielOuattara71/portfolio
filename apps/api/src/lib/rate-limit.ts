/**
 * Fixed-window rate limiter kept in memory.
 * Good enough for local development and a single instance; on Vercel each function instance has
 * its own memory, so production switches to Upstash Redis (docs/11-architecture-technique.md §4).
 */
const hits = new Map<string, number[]>()

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= limit) {
    const oldest = recent[0] ?? now
    hits.set(key, recent)
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - oldest)) / 1000) }
  }
  recent.push(now)
  hits.set(key, recent)
  return { ok: true, retryAfter: 0 }
}
