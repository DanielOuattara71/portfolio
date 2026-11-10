import type { PublishedContent } from '@portfolio/shared/content'

/**
 * Loads the published content once per visit: fetched during server rendering, then handed to the
 * browser in the page payload (no second request). Composables read it through usePublished().
 */
export default defineNuxtPlugin(async () => {
  const content = useState<PublishedContent | null>('published-content', () => null)
  if (content.value) return
  try {
    content.value = await $fetch<PublishedContent>('/api/content')
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Content temporarily unavailable', fatal: true })
  }
})
